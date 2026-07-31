<?php

namespace App\Services\Catalog;

use App\Exceptions\DomainException;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use App\Support\Status;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-06 — Book management.
 */
class BookCatalogService
{
    public function __construct(private AuditLogService $audit) {}

    public function create(array $data, User $actor): Book
    {
        return DB::transaction(function () use ($data, $actor) {
            $copyCount = (int) ($data['initial_copies'] ?? 0);
            unset($data['initial_copies']);

            $book = Book::create($data);

            if ($copyCount > 0) {
                $this->addCopies($book, $copyCount, $actor, silent: true);
            }

            $book->recalculateCopyCounters();

            $this->audit->record(
                $actor,
                AuditAction::BOOK_CREATED,
                'book',
                $book->book_id,
                sprintf('Created "%s" (ISBN %s) with %d copy/copies', $book->title, $book->isbn, $copyCount)
            );

            return $book->fresh(['category', 'copies']);
        });
    }

    public function update(Book $book, array $data, User $actor): Book
    {
        $book->update($data);

        $this->audit->record(
            $actor,
            AuditAction::BOOK_UPDATED,
            'book',
            $book->book_id,
            sprintf('Updated "%s"', $book->title)
        );

        return $book->fresh(['category', 'copies']);
    }

    /**
     * BR-10 — a title that still holds non-withdrawn copies cannot be deleted.
     */
    public function delete(Book $book, User $actor): void
    {
        $liveCopies = $book->copies()->whereIn('status', Status::COPY_ACTIVE)->count();

        if ($liveCopies > 0) {
            throw new DomainException(
                sprintf(
                    'Cannot delete "%s" — it still has %d active copy/copies. Withdraw the copies first.',
                    $book->title,
                    $liveCopies
                ),
                ['active_copies' => $liveCopies]
            );
        }

        $onLoan = $book->copies()
            ->whereHas('circulations', fn ($q) => $q->whereIn('status', Status::CIRC_OPEN))
            ->count();

        if ($onLoan > 0) {
            throw new DomainException('Cannot delete a title that has copies currently on loan.');
        }

        $title = $book->title;
        $id = $book->book_id;

        DB::transaction(function () use ($book) {
            $book->copies()->delete();
            $book->delete();
        });

        $this->audit->record($actor, AuditAction::BOOK_DELETED, 'book', $id, "Deleted \"{$title}\"");
    }

    /**
     * Adds physical copies, auto-generating sequential accession numbers and
     * barcodes. BR-11 — both must be globally unique.
     *
     * @return array<int,BookCopy>
     */
    public function addCopies(Book $book, int $quantity, User $actor, bool $silent = false): array
    {
        if ($quantity < 1 || $quantity > 100) {
            throw new DomainException('Copy quantity must be between 1 and 100.', [], 422);
        }

        $created = [];

        DB::transaction(function () use ($book, $quantity, &$created) {
            // The accession sequence is a persisted counter rather than a
            // MAX() over the table: it stays correct when copies are deleted
            // and it avoids dialect-specific string/cast SQL.
            $start = $this->nextAccessionSequence($quantity);

            for ($i = 0; $i < $quantity; $i++) {
                $accession = 'ACC-'.str_pad((string) ($start + $i), 5, '0', STR_PAD_LEFT);

                $created[] = BookCopy::create([
                    'book_id' => $book->book_id,
                    'accession_no' => $accession,
                    'barcode' => $accession,
                    'status' => Status::COPY_AVAILABLE,
                    'condition' => 'good',
                    'acquired_on' => now()->toDateString(),
                ]);
            }

            $book->recalculateCopyCounters();
        });

        if (! $silent) {
            $this->audit->record(
                $actor,
                AuditAction::COPY_ADDED,
                'book',
                $book->book_id,
                sprintf('Added %d copy/copies to "%s"', $quantity, $book->title)
            );
        }

        return $created;
    }

    public function updateCopy(BookCopy $copy, array $data, User $actor): BookCopy
    {
        $wasAvailable = $copy->isAvailable();

        if (isset($data['status']) && $data['status'] !== $copy->status) {
            // A copy that is on loan cannot be silently re-statused.
            if ($copy->isOnLoan() && $data['status'] !== Status::COPY_LOST) {
                throw new DomainException(
                    'This copy is currently on loan. Process the return before changing its status.'
                );
            }
        }

        $copy->update($data);
        $copy->book->recalculateCopyCounters();

        $action = ($data['status'] ?? null) === Status::COPY_WITHDRAWN
            ? AuditAction::COPY_WITHDRAWN
            : AuditAction::COPY_UPDATED;

        $this->audit->record(
            $actor,
            $action,
            'book_copy',
            $copy->copy_id,
            sprintf('Copy %s set to "%s"', $copy->accession_no, $copy->status)
        );

        return $copy->fresh('book');
    }

    public function deleteCopy(BookCopy $copy, User $actor): void
    {
        if ($copy->isOnLoan()) {
            throw new DomainException('Cannot delete a copy that is currently on loan.');
        }

        if ($copy->circulations()->exists()) {
            throw new DomainException(
                'This copy has circulation history and cannot be deleted. Withdraw it instead.'
            );
        }

        $accession = $copy->accession_no;
        $book = $copy->book;
        $id = $copy->copy_id;

        $copy->delete();
        $book->recalculateCopyCounters();

        $this->audit->record($actor, AuditAction::COPY_WITHDRAWN, 'book_copy', $id, "Deleted copy {$accession}");
    }

    /** Generates a URL-safe slug used for cover image filenames. */
    public function coverFilename(Book $book, string $extension): string
    {
        return Str::slug($book->title).'-'.$book->book_id.'.'.$extension;
    }

    /**
     * Reserves `$count` accession numbers and returns the first one.
     * The row is locked so two concurrent "add copies" calls cannot both
     * claim the same block (BR-11 uniqueness).
     */
    private function nextAccessionSequence(int $count): int
    {
        $row = SystemSetting::where('key', 'accession_sequence')->lockForUpdate()->first();

        if (! $row) {
            $row = SystemSetting::create([
                'key' => 'accession_sequence',
                'value' => '1',
                'type' => 'int',
                'group' => 'internal',
                'label' => 'Accession number sequence',
                'description' => 'Internal counter for generating accession numbers.',
            ]);
        }

        $start = max(1, (int) $row->value);

        $row->update(['value' => (string) ($start + $count)]);

        return $start;
    }
}
