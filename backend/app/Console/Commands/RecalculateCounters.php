<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Student;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Support\Status;
use Illuminate\Console\Command;

/**
 * Reconciliation job for the denormalised counters (ADR-09).
 *
 * available_copies, total_copies, active_loans and outstanding_fine are all
 * caches over authoritative tables. This command recomputes them from source
 * so that any drift — from a crash, a manual DB edit, or a bug — self-heals.
 */
class RecalculateCounters extends Command
{
    protected $signature = 'slms:recalculate-counters';

    protected $description = 'Recompute denormalised counters from source tables';

    public function handle(StudentRepositoryInterface $students): int
    {
        $this->info('Recalculating book copy counters…');

        Book::chunkById(200, function ($books) {
            foreach ($books as $book) {
                $book->recalculateCopyCounters();
            }
        }, 'book_id');

        $this->info('Recalculating student loan counters and balances…');

        Student::chunkById(200, function ($chunk) use ($students) {
            foreach ($chunk as $student) {
                $open = $student->circulations()
                    ->whereIn('status', Status::CIRC_OPEN)
                    ->count();

                $student->forceFill(['active_loans' => $open])->save();

                $students->refreshFinancials($student);
            }
        }, 'student_id');

        $this->info('Counters reconciled.');

        return self::SUCCESS;
    }
}
