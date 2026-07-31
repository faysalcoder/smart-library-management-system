<?php

namespace App\Repositories;

use App\Models\Fine;
use App\Models\Student;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\System\SettingService;
use App\Support\Status;

class StudentRepository implements StudentRepositoryInterface
{
    public function __construct(private SettingService $settings) {}

    public function findByCardUid(string $cardUid): ?Student
    {
        // A librarian may scan the physical card OR key the student number.
        return Student::where('card_uid', $cardUid)
            ->orWhere('student_no', $cardUid)
            ->first();
    }

    public function findByStudentNo(string $studentNo): ?Student
    {
        return Student::where('student_no', $studentNo)->first();
    }

    public function incrementLoans(Student $student): void
    {
        $student->increment('active_loans');
    }

    public function decrementLoans(Student $student): void
    {
        if ($student->active_loans > 0) {
            $student->decrement('active_loans');
        }
    }

    public function refreshFinancials(Student $student): void
    {
        $outstanding = Fine::where('student_id', $student->student_id)
            ->whereIn('status', Status::FINE_OUTSTANDING)
            ->get()
            ->sum(fn (Fine $fine) => $fine->balance);

        $threshold = $this->settings->decimal('fine_block_threshold', 100.00);

        $student->forceFill([
            'outstanding_fine' => round($outstanding, 2),
            'borrow_status' => $outstanding > $threshold
                ? Status::BORROW_BLOCKED
                : Status::BORROW_ELIGIBLE,
        ])->save();
    }
}
