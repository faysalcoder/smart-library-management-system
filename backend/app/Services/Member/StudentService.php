<?php

namespace App\Services\Member;

use App\Exceptions\DomainException;
use App\Models\Student;
use App\Models\SystemSetting;
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

    /**
     * Public self-registration. Unlike `create()` (a librarian entering a
     * known member), a self-registered student has no institutional roll
     * number on file yet — one is generated here, prefixed "REG-" so it is
     * visually distinguishable from a real student number until a librarian
     * issues a physical card and binds it via `bindCard()`.
     */
    public function registerSelf(User $user, array $data): Student
    {
        $student = Student::create([
            'student_no' => $this->nextSelfRegisteredNo(),
            'user_id' => $user->user_id,
            'full_name' => $data['full_name'],
            'department' => $data['department'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'membership_status' => Status::MEMBER_ACTIVE,
            'borrow_status' => Status::BORROW_ELIGIBLE,
            'enrolled_on' => now()->toDateString(),
        ]);

        $this->audit->record(
            $user,
            AuditAction::USER_SELF_REGISTERED,
            'student',
            $student->student_id,
            sprintf('Self-registered as %s (%s)', $student->full_name, $student->student_no)
        );

        return $student;
    }

    /**
     * Self-service profile edit. Deliberately narrower than `update()`: a
     * student may correct their own name/contact details, but never their
     * own student_no, card_uid, membership_status or fines.
     */
    public function updateOwnProfile(Student $student, array $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            $student->update([
                'full_name' => $data['full_name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'department' => $data['department'],
            ]);

            // Keep the linked login account's identity fields in sync.
            $student->user?->update([
                'full_name' => $data['full_name'],
                'email' => $data['email'],
            ]);

            $this->audit->record(
                $student->user,
                AuditAction::PROFILE_UPDATED,
                'student',
                $student->student_id,
                sprintf('%s updated their own profile', $student->student_no)
            );

            return $student->fresh();
        });
    }

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

    /**
     * Reserves the next "REG-#####" number via a locked counter row — the
     * same pattern BookCatalogService uses for accession numbers, so a burst
     * of concurrent registrations can never collide (BR-11 uniqueness).
     */
    private function nextSelfRegisteredNo(): string
    {
        $row = SystemSetting::where('key', 'student_no_sequence')->lockForUpdate()->first();

        if (! $row) {
            $row = SystemSetting::create([
                'key' => 'student_no_sequence',
                'value' => '1',
                'type' => 'int',
                'group' => 'internal',
                'label' => 'Self-registration student number sequence',
            ]);
        }

        $next = max(1, (int) $row->value);
        $row->update(['value' => (string) ($next + 1)]);

        return 'REG-'.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }
}
