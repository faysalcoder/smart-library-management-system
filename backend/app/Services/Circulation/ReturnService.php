<?php

namespace App\Services\Circulation;

use App\Exceptions\DomainException;
use App\Models\Circulation;
use App\Models\Student;
use App\Models\User;
use App\Repositories\Contracts\BookCopyRepositoryInterface;
use App\Repositories\Contracts\CirculationRepositoryInterface;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\Fine\FineCalculationService;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Support\Facades\DB;

/**
 * FR-04 — Book returning. Enforces BR-06 and BR-08, and triggers BR-07.
 */
class ReturnService
{
    public function __construct(
        private BookCopyRepositoryInterface $copies,
        private CirculationRepositoryInterface $circulations,
        private StudentRepositoryInterface $students,
        private FineCalculationService $fines,
        private AuditLogService $audit,
    ) {}

    /**
     * Look up the open loan for a scanned barcode without mutating anything,
     * so the Return screen can preview the outcome (and any fine) first.
     */
    public function lookup(string $barcode): array
    {
        $copy = $this->copies->findByBarcode(trim($barcode));

        if (! $copy) {
            throw new DomainException(
                'Barcode not recognised. Check the label on the book.',
                ['barcode' => $barcode],
                404
            );
        }

        // BR-06 — a return is only valid against an open circulation record.
        $circulation = $this->circulations->findOpenByCopy($copy->copy_id);

        if (! $circulation) {
            throw new DomainException(
                'This copy is not currently on loan, so there is nothing to return.',
                ['barcode' => $barcode, 'copy_status' => $copy->status]
            );
        }

        return [
            'circulation' => $circulation,
            'fine_preview' => $this->fines->preview($circulation),
        ];
    }

    /**
     * DFD Level-2 shows a second input into process 5.0 Return Books:
     * "Student Id + book title". This is the fallback the diagram describes —
     * used when a barcode label is torn, smudged or missing, which is common
     * on older stock.
     *
     * Returns every open loan for the student, optionally narrowed by title,
     * so the librarian can pick the right one rather than guessing.
     *
     * @return array{student: Student, loans: array<int,array<string,mixed>>}
     */
    public function lookupByStudent(string $identifier, ?string $titleQuery = null): array
    {
        $student = $this->students->findByCardUid(trim($identifier));

        if (! $student) {
            throw new DomainException(
                'No student matches that ID card or student number.',
                ['identifier' => $identifier],
                404
            );
        }

        $loans = Circulation::with(['copy.book.author', 'student'])
            ->where('student_id', $student->student_id)
            ->open()
            ->when($titleQuery, fn ($q, $term) => $q->whereHas(
                'copy.book',
                fn ($b) => $b->where('title', 'like', '%'.$term.'%')
            ))
            ->orderBy('due_date')
            ->get();

        if ($loans->isEmpty()) {
            throw new DomainException(
                $titleQuery
                    ? sprintf('%s has no book on loan matching "%s".', $student->full_name, $titleQuery)
                    : sprintf('%s has no books currently on loan.', $student->full_name),
                ['student_no' => $student->student_no]
            );
        }

        return [
            'student' => $student,
            'loans' => $loans->map(fn (Circulation $c) => [
                'circulation' => $c,
                'fine_preview' => $this->fines->preview($c),
            ])->all(),
        ];
    }

    /**
     * Completes the return.
     *
     * @return array{circulation: \App\Models\Circulation, fine: ?\App\Models\Fine}
     */
    public function return(string $barcode, User $librarian): array
    {
        return DB::transaction(function () use ($barcode, $librarian) {
            $copy = $this->copies->lockByBarcode(trim($barcode));

            if (! $copy) {
                throw new DomainException('Barcode not recognised.', ['barcode' => $barcode], 404);
            }

            $circulation = $this->circulations->findOpenByCopy($copy->copy_id);

            if (! $circulation) {
                throw new DomainException('This copy is not currently on loan.', ['barcode' => $barcode]);
            }

            $overdueDays = $circulation->overdue_days;

            // Close the loan first so the fine is assessed against a frozen
            // return date rather than a moving "today".
            $this->circulations->markReturned($circulation, $librarian->user_id);
            $circulation->refresh();

            // BR-08 — the copy becomes available again and the counter drops.
            $this->copies->markAvailable($copy);
            $this->students->decrementLoans($circulation->student);

            // BR-07 — assess the overdue fine, if any.
            $fine = $overdueDays > 0
                ? $this->fines->assess($circulation, $librarian)
                : null;

            $this->audit->record(
                $librarian,
                AuditAction::BOOK_RETURNED,
                'circulation',
                $circulation->circulation_id,
                sprintf(
                    'Copy %s ("%s") returned by %s%s',
                    $copy->accession_no,
                    $copy->book->title,
                    $circulation->student->student_no,
                    $overdueDays > 0 ? " — {$overdueDays} day(s) overdue" : ' on time'
                )
            );

            return [
                'circulation' => $circulation->load(['student', 'copy.book.category', 'copy.book.author', 'returnedTo']),
                'fine' => $fine,
            ];
        });
    }
}
