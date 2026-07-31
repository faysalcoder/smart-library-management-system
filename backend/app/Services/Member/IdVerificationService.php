<?php

namespace App\Services\Member;

use App\Exceptions\DomainException;
use App\Models\Student;
use App\Models\User;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Support\AuditAction;

/**
 * FR-10 — Student ID card verification.
 */
class IdVerificationService
{
    public function __construct(
        private StudentRepositoryInterface $students,
        private AuditLogService $audit,
        private SettingService $settings,
    ) {}

    /**
     * Resolves a scanned card UID (or a manually keyed student number) to a
     * member record, and throws if the card is not registered.
     */
    public function resolveByCard(string $cardUid, ?User $actor = null): Student
    {
        $student = $this->students->findByCardUid(trim($cardUid));

        if (! $student) {
            $this->audit->record(
                $actor,
                AuditAction::CARD_VERIFY_FAILED,
                'student',
                null,
                "Unrecognised card/ID '{$cardUid}'"
            );

            throw new DomainException(
                'Card not recognised. Register this card against a student in Student Management.',
                ['card_uid' => $cardUid],
                404
            );
        }

        $this->audit->record(
            $actor,
            AuditAction::CARD_VERIFIED,
            'student',
            $student->student_id,
            "Card verified for {$student->student_no}"
        );

        return $student;
    }

    /**
     * Full eligibility picture for the Issue screen. Returns the reasons a
     * student cannot borrow rather than throwing, so the UI can show the
     * student panel and the blocking reason together.
     *
     * @return array{eligible: bool, reasons: array<int,string>, limit: int, open_loans: int}
     */
    public function evaluateEligibility(Student $student): array
    {
        $reasons = [];

        // BR-01 — membership must be active.
        if (! $student->isActiveMember()) {
            $reasons[] = "Membership is {$student->membership_status}.";
        }

        // BR-02 — loan limit.
        $limit = $this->settings->int('max_books_per_student', 3);
        $open = $student->open_loans_count;

        if ($open >= $limit) {
            $reasons[] = "Borrowing limit reached ({$open} of {$limit} books on loan).";
        }

        // BR-03 — outstanding fine block.
        $threshold = $this->settings->decimal('fine_block_threshold', 100.00);
        $outstanding = (float) $student->outstanding_fine;

        if ($outstanding > $threshold) {
            $reasons[] = sprintf(
                'Outstanding fine of %s%.2f exceeds the %s%.2f limit.',
                config('library.currency.symbol'),
                $outstanding,
                config('library.currency.symbol'),
                $threshold
            );
        }

        return [
            'eligible' => $reasons === [],
            'reasons' => $reasons,
            'limit' => $limit,
            'open_loans' => $open,
        ];
    }
}
