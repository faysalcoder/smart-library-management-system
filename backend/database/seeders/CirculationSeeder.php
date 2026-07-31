<?php

namespace Database\Seeders;

use App\Models\BookCopy;
use App\Models\Circulation;
use App\Models\Student;
use App\Models\User;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\Fine\FineCalculationService;
use App\Support\Status;
use Illuminate\Database\Seeder;

/**
 * Demo circulation history so the dashboards, overdue monitor and reports
 * have something meaningful to show immediately after setup.
 */
class CirculationSeeder extends Seeder
{
    public function run(): void
    {
        $librarian = User::where('username', 'librarian')->first();
        $students = Student::orderBy('student_id')->get();
        $copies = BookCopy::where('status', Status::COPY_AVAILABLE)->get();

        if (! $librarian || $students->isEmpty() || $copies->count() < 12) {
            $this->command->warn('Skipping circulation demo data — prerequisites missing.');

            return;
        }

        $fines = app(FineCalculationService::class);
        $studentRepo = app(StudentRepositoryInterface::class);

        $copyIndex = 0;
        $next = fn () => $copies[$copyIndex++];

        // ---- 1. Returned on time (history) ---------------------------------
        for ($i = 0; $i < 5; $i++) {
            $copy = $next();
            $student = $students[$i % $students->count()];
            $issued = now()->subDays(40 - $i * 3);

            Circulation::create([
                'student_id' => $student->student_id,
                'copy_id' => $copy->copy_id,
                'issued_by' => $librarian->user_id,
                'returned_to' => $librarian->user_id,
                'issue_date' => $issued->toDateString(),
                'due_date' => $issued->copy()->addDays(14)->toDateString(),
                'return_date' => $issued->copy()->addDays(rand(7, 13))->toDateString(),
                'status' => Status::CIRC_RETURNED,
            ]);

            $copy->book()->increment('borrow_count');
        }

        // ---- 2. Currently on loan, not yet due -----------------------------
        for ($i = 0; $i < 4; $i++) {
            $copy = $next();
            $student = $students[$i % $students->count()];
            $issued = now()->subDays(rand(1, 8));

            Circulation::create([
                'student_id' => $student->student_id,
                'copy_id' => $copy->copy_id,
                'issued_by' => $librarian->user_id,
                'issue_date' => $issued->toDateString(),
                'due_date' => $issued->copy()->addDays(14)->toDateString(),
                'status' => Status::CIRC_ISSUED,
            ]);

            $copy->update(['status' => Status::COPY_ISSUED]);
            $copy->book()->decrement('available_copies');
            $copy->book()->increment('borrow_count');
            $student->increment('active_loans');
        }

        // ---- 3. Overdue loans (drives the overdue monitor + fines) ---------
        $overdueDays = [3, 9, 21, 35];

        foreach ($overdueDays as $i => $days) {
            $copy = $next();
            $student = $students[($i + 1) % $students->count()];
            $issued = now()->subDays(14 + $days);

            $circulation = Circulation::create([
                'student_id' => $student->student_id,
                'copy_id' => $copy->copy_id,
                'issued_by' => $librarian->user_id,
                'issue_date' => $issued->toDateString(),
                'due_date' => $issued->copy()->addDays(14)->toDateString(),
                'status' => Status::CIRC_OVERDUE,
            ]);

            $copy->update(['status' => Status::COPY_ISSUED]);
            $copy->book()->decrement('available_copies');
            $copy->book()->increment('borrow_count');
            $student->increment('active_loans');

            // Accrue the fine so the balance and block rules are exercised.
            $fines->assess($circulation->fresh(['student']));
        }

        // ---- 4. A settled overdue fine (history for the fines report) ------
        $copy = $next();
        $student = $students[2];
        $issued = now()->subDays(30);

        $circulation = Circulation::create([
            'student_id' => $student->student_id,
            'copy_id' => $copy->copy_id,
            'issued_by' => $librarian->user_id,
            'returned_to' => $librarian->user_id,
            'issue_date' => $issued->toDateString(),
            'due_date' => $issued->copy()->addDays(14)->toDateString(),
            'return_date' => $issued->copy()->addDays(20)->toDateString(),
            'status' => Status::CIRC_RETURNED,
        ]);

        $copy->book()->increment('borrow_count');

        $fine = $fines->assess($circulation->fresh(['student']));

        if ($fine) {
            $fine->update([
                'paid_amount' => $fine->amount,
                'status' => Status::FINE_PAID,
                'collected_by' => $librarian->user_id,
                'settled_at' => now()->subDays(9),
            ]);
        }

        // Reconcile every student's derived balances.
        foreach ($students as $student) {
            $studentRepo->refreshFinancials($student->fresh());
        }

        $this->command->info('Seeded demo circulation history (returns, active loans, overdue loans and fines).');
    }
}
