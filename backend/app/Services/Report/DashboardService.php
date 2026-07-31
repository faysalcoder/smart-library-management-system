<?php

namespace App\Services\Report;

use App\Models\Book;
use App\Models\Circulation;
use App\Models\Fine;
use App\Models\Student;
use App\Models\SystemLog;
use App\Models\User;
use App\Support\Roles;
use App\Support\Status;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /** Dispatches to the right dashboard payload for the signed-in role. */
    public function forUser(User $user): array
    {
        if ($user->hasRole(Roles::STUDENT)) {
            return $this->student($user);
        }

        return $this->staff($user);
    }

    private function staff(User $user): array
    {
        $today = now()->toDateString();

        $overdue = Circulation::overdue()->count();
        $pendingFines = (float) Fine::outstanding()->sum(DB::raw('amount - paid_amount'));

        $recent = SystemLog::with('user')
            ->whereIn('action', [
                'BOOK_ISSUED', 'BOOK_RETURNED', 'FINE_COLLECTED', 'FINE_WAIVED',
                'BOOK_CREATED', 'STUDENT_CREATED',
            ])
            ->orderByDesc('log_id')
            ->limit(10)
            ->get()
            ->map(fn (SystemLog $l) => [
                'log_id' => $l->log_id,
                'action' => $l->action,
                'detail' => $l->detail,
                'actor' => $l->actor_name,
                'at' => $l->created_at?->toDateTimeString(),
            ]);

        $dueToday = Circulation::with(['student', 'copy.book.author'])
            ->open()
            ->whereDate('due_date', $today)
            ->limit(10)
            ->get()
            ->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'student_name' => $c->student->full_name,
                'student_no' => $c->student->student_no,
                'title' => $c->copy->book->title,
            ]);

        $mostOverdue = Circulation::with(['student', 'copy.book.author'])
            ->overdue()
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'student_name' => $c->student->full_name,
                'student_no' => $c->student->student_no,
                'title' => $c->copy->book->title,
                'overdue_days' => $c->overdue_days,
            ]);

        return [
            'type' => 'staff',
            'stats' => [
                'issued_today' => Circulation::whereDate('issue_date', $today)->count(),
                'returned_today' => Circulation::whereDate('return_date', $today)->count(),
                'overdue' => $overdue,
                'pending_fines' => round($pendingFines, 2),
                'total_titles' => Book::count(),
                'total_students' => Student::count(),
                'active_loans' => Circulation::open()->count(),
            ],
            'recent_activity' => $recent,
            'due_today' => $dueToday,
            'most_overdue' => $mostOverdue,
            'alert' => $overdue > 0
                ? sprintf('%d loan(s) are currently overdue.', $overdue)
                : null,
        ];
    }

    private function student(User $user): array
    {
        $student = $user->student;

        if (! $student) {
            return [
                'type' => 'student',
                'stats' => ['on_loan' => 0, 'due_soon' => 0, 'outstanding_fine' => 0.0],
                'current_loans' => [],
                'recently_returned' => [],
                'profile' => null,
            ];
        }

        $loans = Circulation::with(['copy.book.category', 'copy.book.author', 'fine'])
            ->where('student_id', $student->student_id)
            ->open()
            ->orderBy('due_date')
            ->get();

        $recentlyReturned = Circulation::with('copy.book.author')
            ->where('student_id', $student->student_id)
            ->returned()
            ->orderByDesc('return_date')
            ->limit(5)
            ->get()
            ->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'title' => $c->copy->book->title,
                'author' => $c->copy->book->author?->name,
                'return_date' => $c->return_date?->toDateString(),
            ]);

        return [
            'type' => 'student',
            'profile' => [
                'student_no' => $student->student_no,
                'full_name' => $student->full_name,
                'department' => $student->department,
                'batch' => $student->batch,
                'membership_status' => $student->membership_status,
                'borrow_status' => $student->borrow_status,
            ],
            'stats' => [
                'on_loan' => $loans->count(),
                'due_soon' => $loans->filter(fn (Circulation $c) => ! $c->is_overdue && $c->due_date->diffInDays(now()) <= 2)->count(),
                'overdue' => $loans->filter(fn (Circulation $c) => $c->is_overdue)->count(),
                'outstanding_fine' => (float) $student->outstanding_fine,
            ],
            'current_loans' => $loans->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'title' => $c->copy->book->title,
                'author' => $c->copy->book->author?->name,
                'category' => $c->copy->book->category?->name,
                'accession_no' => $c->copy->accession_no,
                'issue_date' => $c->issue_date?->toDateString(),
                'due_date' => $c->due_date?->toDateString(),
                'overdue_days' => $c->overdue_days,
                'is_overdue' => $c->is_overdue,
                'renewal_count' => $c->renewal_count,
            ]),
            'recently_returned' => $recentlyReturned,
        ];
    }
}
