<?php

namespace App\Services\Member;

use App\Exceptions\DomainException;
use App\Models\Student;
use App\Models\User;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use App\Support\Status;
use Illuminate\Support\Facades\DB;

/**
 * FR-07 — Student management.
 */
class StudentService
{
    public function __construct(private AuditLogService $audit) {}

    public function create(array $data, User $actor): Student
    {
        $student = Student::create($data + [
            'membership_status' => Status::MEMBER_ACTIVE,
            'borrow_status' => Status::BORROW_ELIGIBLE,
            'enrolled_on' => $data['enrolled_on'] ?? now()->toDateString(),
        ]);

        $this->audit->record(
            $actor,
            AuditAction::STUDENT_CREATED,
            'student',
            $student->student_id,
            sprintf('Registered %s (%s)', $student->full_name, $student->student_no)
        );

        return $student;
    }

    public function update(Student $student, array $data, User $actor): Student
    {
        $student->update($data);

        $this->audit->record(
            $actor,
            AuditAction::STUDENT_UPDATED,
            'student',
            $student->student_id,
            sprintf('Updated %s (%s)', $student->full_name, $student->student_no)
        );

        return $student->fresh();
    }

    /** Binds a scanned physical card to a member (FR-10 registration step). */
    public function bindCard(Student $student, string $cardUid, User $actor): Student
    {
        $cardUid = trim($cardUid);

        $existing = Student::where('card_uid', $cardUid)
            ->where('student_id', '!=', $student->student_id)
            ->first();

        if ($existing) {
            throw new DomainException(
                sprintf('That card is already registered to %s (%s).', $existing->full_name, $existing->student_no),
                ['card_uid' => $cardUid]
            );
        }

        $student->update(['card_uid' => $cardUid]);

        $this->audit->record(
            $actor,
            AuditAction::STUDENT_UPDATED,
            'student',
            $student->student_id,
            sprintf('Bound ID card %s to %s', $cardUid, $student->student_no)
        );

        return $student->fresh();
    }

    public function setMembershipStatus(Student $student, string $status, User $actor): Student
    {
        if (! in_array($status, Status::MEMBER_ALL, true)) {
            throw new DomainException('Invalid membership status.', [], 422);
        }

        if ($status !== Status::MEMBER_ACTIVE && $student->open_loans_count > 0) {
            throw new DomainException(
                sprintf(
                    'Cannot suspend %s while %d book(s) are still on loan.',
                    $student->full_name,
                    $student->open_loans_count
                )
            );
        }

        $student->update(['membership_status' => $status]);

        $this->audit->record(
            $actor,
            AuditAction::STUDENT_SUSPENDED,
            'student',
            $student->student_id,
            sprintf('Membership for %s set to "%s"', $student->student_no, $status)
        );

        return $student->fresh();
    }

    public function delete(Student $student, User $actor): void
    {
        if ($student->circulations()->exists()) {
            throw new DomainException(
                'This student has borrowing history and cannot be deleted. Suspend the membership instead.'
            );
        }

        $label = sprintf('%s (%s)', $student->full_name, $student->student_no);
        $id = $student->student_id;

        DB::transaction(fn () => $student->delete());

        $this->audit->record($actor, AuditAction::STUDENT_DELETED, 'student', $id, "Deleted {$label}");
    }
}
