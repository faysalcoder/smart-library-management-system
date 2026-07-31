<?php

namespace App\Services\Circulation;

use App\Exceptions\DomainException;
use App\Models\Circulation;
use App\Models\User;
use App\Repositories\Contracts\BookCopyRepositoryInterface;
use App\Repositories\Contracts\CirculationRepositoryInterface;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\Member\IdVerificationService;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Support\AuditAction;
use App\Support\Status;
use Illuminate\Support\Facades\DB;

/**
 * FR-03 — Book borrowing.
 *
 * Enforces BR-01 … BR-05 inside a single database transaction.
 */
class BorrowService
{
    public function __construct(
        private StudentRepositoryInterface $students,
        private BookCopyRepositoryInterface $copies,
        private CirculationRepositoryInterface $circulations,
        private IdVerificationService $verifier,
        private SettingService $settings,
        private AuditLogService $audit,
    ) {}

    public function issue(string $cardUid, string $barcode, User $librarian): Circulation
    {
        return DB::transaction(function () use ($cardUid, $barcode, $librarian) {

            // FR-10 — resolve and verify the student ID card.
            $student = $this->verifier->resolveByCard($cardUid, $librarian);

            // BR-01 / BR-02 / BR-03 — eligibility.
            $eligibility = $this->verifier->evaluateEligibility($student);

            if (! $eligibility['eligible']) {
                throw new DomainException(
                    'Cannot issue this book. '.implode(' ', $eligibility['reasons']),
                    ['student_no' => $student->student_no, 'reasons' => $eligibility['reasons']]
                );
            }

            // BR-04 — the copy must exist and be available. The row lock closes
            // the race between two librarians scanning the same copy (ADR-12).
            $copy = $this->copies->lockByBarcode(trim($barcode));

            if (! $copy) {
                throw new DomainException(
                    'Barcode not recognised. Check the label or add this copy in Catalog Management.',
                    ['barcode' => $barcode],
                    404
                );
            }

            if (! $copy->isAvailable()) {
                $holder = $this->circulations->findOpenByCopy($copy->copy_id);

                $detail = $holder
                    ? sprintf(
                        'It is on loan to %s (%s) and is due %s.',
                        $holder->student->full_name,
                        $holder->student->student_no,
                        $holder->due_date->format('d M Y')
                    )
                    : sprintf('Its current status is "%s".', $copy->status);

                throw new DomainException(
                    "This copy is not available for issue. {$detail}",
                    ['barcode' => $barcode, 'copy_status' => $copy->status]
                );
            }

            // BR-05 — due date derives from the configurable loan period.
            $loanDays = $this->settings->int('loan_period_days', 14);

            $circulation = $this->circulations->create([
                'student_id' => $student->student_id,
                'copy_id' => $copy->copy_id,
                'issued_by' => $librarian->user_id,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays($loanDays)->toDateString(),
                'status' => Status::CIRC_ISSUED,
            ]);

            $this->copies->markIssued($copy);
            $this->students->incrementLoans($student);

            $this->audit->record(
                $librarian,
                AuditAction::BOOK_ISSUED,
                'circulation',
                $circulation->circulation_id,
                sprintf(
                    'Copy %s ("%s") issued to %s; due %s',
                    $copy->accession_no,
                    $copy->book->title,
                    $student->student_no,
                    $circulation->due_date->format('d M Y')
                )
            );

            return $circulation->load(['student', 'copy.book.category', 'copy.book.author', 'issuedBy']);
        });
    }

    /**
     * BR-14 — a loan may be renewed at most max_renewals times, and never
     * while it is already overdue.
     */
    public function renew(Circulation $circulation, User $librarian): Circulation
    {
        return DB::transaction(function () use ($circulation, $librarian) {
            if (! $circulation->isOpen()) {
                throw new DomainException('Only an active loan can be renewed.');
            }

            if ($circulation->is_overdue) {
                throw new DomainException(
                    'An overdue loan cannot be renewed. Return the book and settle the fine first.'
                );
            }

            $max = $this->settings->int('max_renewals', 1);

            if ($circulation->renewal_count >= $max) {
                throw new DomainException("This loan has already been renewed the maximum of {$max} time(s).");
            }

            $loanDays = $this->settings->int('loan_period_days', 14);

            $circulation->forceFill([
                'due_date' => now()->addDays($loanDays)->toDateString(),
                'renewal_count' => $circulation->renewal_count + 1,
            ])->save();

            $this->audit->record(
                $librarian,
                AuditAction::LOAN_RENEWED,
                'circulation',
                $circulation->circulation_id,
                sprintf('Renewed to %s', $circulation->due_date->format('d M Y'))
            );

            return $circulation->load(['student', 'copy.book.author']);
        });
    }
}
