<?php

namespace App\Services\Report;

use App\Models\Book;
use App\Models\Circulation;
use App\Models\Fine;
use App\Models\Student;
use App\Support\Status;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * FR-08 — Report generation.
 *
 * BR-15: this service is strictly READ-ONLY. It must never mutate state.
 */
class ReportingService
{
    /** Report catalogue exposed to the client (Reports Hub). */
    public function catalogue(): array
    {
        return [
            ['key' => 'circulation', 'name' => 'Circulation Summary', 'description' => 'Issues, returns and active loans over a date range.', 'icon' => 'swap_horiz', 'params' => ['from', 'to']],
            ['key' => 'overdue', 'name' => 'Overdue Books', 'description' => 'Every loan past its due date, with accrued fines.', 'icon' => 'warning', 'params' => ['as_of']],
            ['key' => 'fines', 'name' => 'Fine Collection', 'description' => 'Fines raised, collected, waived and outstanding.', 'icon' => 'payments', 'params' => ['from', 'to']],
            ['key' => 'inventory', 'name' => 'Book Inventory', 'description' => 'Full holdings with copy counts and availability.', 'icon' => 'inventory_2', 'params' => ['category_id']],
            ['key' => 'popular', 'name' => 'Most Borrowed Books', 'description' => 'Ranked borrowing frequency by title.', 'icon' => 'trending_up', 'params' => ['from', 'to', 'limit']],
            ['key' => 'student-activity', 'name' => 'Student Activity', 'description' => 'Complete borrowing history for one student.', 'icon' => 'person_search', 'params' => ['student_id', 'from', 'to']],
            ['key' => 'department', 'name' => 'Department Usage', 'description' => 'Library usage aggregated by department.', 'icon' => 'apartment', 'params' => ['from', 'to']],
            ['key' => 'daily', 'name' => 'Daily Circulation', 'description' => 'Every issue and return on a single day.', 'icon' => 'today', 'params' => ['date']],
        ];
    }

    public function circulationSummary(?string $from, ?string $to): array
    {
        $issued = Circulation::between($from, $to, 'issue_date')->count();
        $returned = Circulation::between($from, $to, 'return_date')->whereNotNull('return_date')->count();
        $active = Circulation::open()->count();
        $overdue = Circulation::overdue()->count();

        $rows = Circulation::with(['student', 'copy.book.author', 'issuedBy'])
            ->between($from, $to, 'issue_date')
            ->orderByDesc('issue_date')
            ->orderByDesc('circulation_id')
            ->limit(500)
            ->get()
            ->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'issue_date' => $c->issue_date?->toDateString(),
                'due_date' => $c->due_date?->toDateString(),
                'return_date' => $c->return_date?->toDateString(),
                'student_no' => $c->student->student_no,
                'student_name' => $c->student->full_name,
                'department' => $c->student->department,
                'accession_no' => $c->copy->accession_no,
                'title' => $c->copy->book->title,
                'status' => $c->status,
                'overdue_days' => $c->overdue_days,
                'issued_by' => $c->issuedBy?->full_name,
            ]);

        return [
            'summary' => compact('issued', 'returned', 'active', 'overdue'),
            'rows' => $rows,
        ];
    }

    public function overdue(?string $asOf = null): array
    {
        $date = $asOf ? Carbon::parse($asOf) : Carbon::today();

        $rows = Circulation::with(['student', 'copy.book.author', 'fine'])
            ->overdue($date)
            ->orderBy('due_date')
            ->get()
            ->map(function (Circulation $c) {
                $days = $c->overdue_days;

                return [
                    'circulation_id' => $c->circulation_id,
                    'student_no' => $c->student->student_no,
                    'student_name' => $c->student->full_name,
                    'department' => $c->student->department,
                    'phone' => $c->student->phone,
                    'email' => $c->student->email,
                    'accession_no' => $c->copy->accession_no,
                    'title' => $c->copy->book->title,
                    'author' => $c->copy->book->author?->name,
                    'issue_date' => $c->issue_date?->toDateString(),
                    'due_date' => $c->due_date?->toDateString(),
                    'overdue_days' => $days,
                    'severity' => $days > 30 ? 'critical' : ($days > 7 ? 'high' : 'low'),
                    'accrued_fine' => $c->fine?->amount,
                ];
            });

        return [
            'as_of' => $date->toDateString(),
            'summary' => [
                'count' => $rows->count(),
                'total_accrued' => round((float) $rows->sum('accrued_fine'), 2),
            ],
            'rows' => $rows,
        ];
    }

    public function fineCollection(?string $from, ?string $to): array
    {
        $base = fn () => Fine::query()->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to));

        $raised = (float) $base()->sum('amount');
        $collected = (float) $base()->sum('paid_amount');
        $waived = (float) $base()->where('status', Status::FINE_WAIVED)->sum('amount');
        $outstanding = (float) Fine::outstanding()->sum(DB::raw('amount - paid_amount'));

        $rows = Fine::with(['student', 'circulation.copy.book.author', 'collectedBy', 'waivedBy'])
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->orderByDesc('fine_id')
            ->limit(500)
            ->get()
            ->map(fn (Fine $f) => [
                'fine_id' => $f->fine_id,
                'student_no' => $f->student->student_no,
                'student_name' => $f->student->full_name,
                'title' => $f->circulation?->copy?->book?->title,
                'overdue_days' => $f->overdue_days,
                'rate_per_day' => (float) $f->rate_per_day,
                'amount' => (float) $f->amount,
                'paid_amount' => (float) $f->paid_amount,
                'balance' => $f->balance,
                'status' => $f->status,
                'created_at' => $f->created_at?->toDateTimeString(),
                'settled_at' => $f->settled_at?->toDateTimeString(),
            ]);

        return [
            'summary' => [
                'raised' => round($raised, 2),
                'collected' => round($collected, 2),
                'waived' => round($waived, 2),
                'outstanding' => round($outstanding, 2),
            ],
            'rows' => $rows,
        ];
    }

    public function inventory($categoryId = null): array
    {
        $rows = Book::with(['category', 'author'])
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->orderBy('title')
            ->get()
            ->map(fn (Book $b) => [
                'book_id' => $b->book_id,
                'isbn' => $b->isbn,
                'title' => $b->title,
                'author' => $b->author?->name,
                'category' => $b->category?->name,
                'shelf_no' => $b->shelf_no,
                'total_copies' => $b->total_copies,
                'available_copies' => $b->available_copies,
                'on_loan' => max(0, $b->total_copies - $b->available_copies),
            ]);

        return [
            'summary' => [
                'titles' => $rows->count(),
                'copies' => (int) $rows->sum('total_copies'),
                'available' => (int) $rows->sum('available_copies'),
                'on_loan' => (int) $rows->sum('on_loan'),
            ],
            'rows' => $rows,
        ];
    }

    public function mostBorrowed(?string $from, ?string $to, int $limit = 20): array
    {
        $rows = Circulation::query()
            ->join('book_copies', 'circulations.copy_id', '=', 'book_copies.copy_id')
            ->join('books', 'book_copies.book_id', '=', 'books.book_id')
            ->leftJoin('categories', 'books.category_id', '=', 'categories.category_id')
            // Authors are their own entity (DFD L-0 "Author Management"), so the
            // report joins the list of authors rather than reading a column.
            ->leftJoin('authors', 'books.author_id', '=', 'authors.author_id')
            ->when($from, fn ($q) => $q->whereDate('circulations.issue_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('circulations.issue_date', '<=', $to))
            ->groupBy('books.book_id', 'books.title', 'authors.name', 'categories.name')
            ->orderByDesc(DB::raw('COUNT(circulations.circulation_id)'))
            ->limit($limit)
            ->get([
                'books.book_id',
                'books.title',
                'authors.name as author',
                'categories.name as category',
                DB::raw('COUNT(circulations.circulation_id) as borrow_count'),
            ]);

        return ['rows' => $rows];
    }

    public function studentActivity($studentId, ?string $from, ?string $to): array
    {
        $student = Student::findOrFail($studentId);

        $loans = Circulation::with(['copy.book.author', 'fine'])
            ->where('student_id', $studentId)
            ->between($from, $to, 'issue_date')
            ->orderByDesc('issue_date')
            ->get()
            ->map(fn (Circulation $c) => [
                'circulation_id' => $c->circulation_id,
                'title' => $c->copy->book->title,
                'accession_no' => $c->copy->accession_no,
                'issue_date' => $c->issue_date?->toDateString(),
                'due_date' => $c->due_date?->toDateString(),
                'return_date' => $c->return_date?->toDateString(),
                'status' => $c->status,
                'overdue_days' => $c->overdue_days,
                'fine_amount' => $c->fine?->amount,
            ]);

        return [
            'student' => [
                'student_no' => $student->student_no,
                'full_name' => $student->full_name,
                'department' => $student->department,
                'batch' => $student->batch,
                'membership_status' => $student->membership_status,
                'outstanding_fine' => (float) $student->outstanding_fine,
            ],
            'summary' => [
                'total_loans' => $loans->count(),
                'active' => $loans->whereIn('status', Status::CIRC_OPEN)->count(),
                'total_fines' => round((float) $loans->sum('fine_amount'), 2),
            ],
            'rows' => $loans,
        ];
    }

    public function departmentUsage(?string $from, ?string $to): array
    {
        $rows = Circulation::query()
            ->join('students', 'circulations.student_id', '=', 'students.student_id')
            ->when($from, fn ($q) => $q->whereDate('circulations.issue_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('circulations.issue_date', '<=', $to))
            ->groupBy('students.department')
            ->orderByDesc(DB::raw('COUNT(circulations.circulation_id)'))
            ->get([
                'students.department',
                DB::raw('COUNT(circulations.circulation_id) as loans'),
                DB::raw('COUNT(DISTINCT students.student_id) as active_members'),
            ]);

        return ['rows' => $rows];
    }

    public function dailyCirculation(?string $date = null): array
    {
        $day = $date ? Carbon::parse($date) : Carbon::today();

        $issued = Circulation::with(['student', 'copy.book.author', 'issuedBy'])
            ->whereDate('issue_date', $day)
            ->get()
            ->map(fn (Circulation $c) => [
                'time' => $c->created_at?->format('H:i'),
                'type' => 'issued',
                'student_no' => $c->student->student_no,
                'student_name' => $c->student->full_name,
                'title' => $c->copy->book->title,
                'accession_no' => $c->copy->accession_no,
                'staff' => $c->issuedBy?->full_name,
            ]);

        $returned = Circulation::with(['student', 'copy.book.author', 'returnedTo'])
            ->whereDate('return_date', $day)
            ->get()
            ->map(fn (Circulation $c) => [
                'time' => $c->updated_at?->format('H:i'),
                'type' => 'returned',
                'student_no' => $c->student->student_no,
                'student_name' => $c->student->full_name,
                'title' => $c->copy->book->title,
                'accession_no' => $c->copy->accession_no,
                'staff' => $c->returnedTo?->full_name,
            ]);

        $rows = $issued->concat($returned)->sortBy('time')->values();

        return [
            'date' => $day->toDateString(),
            'summary' => [
                'issued' => $issued->count(),
                'returned' => $returned->count(),
            ],
            'rows' => $rows,
        ];
    }
}
