<?php

namespace App\Console\Commands;

use App\Models\Circulation;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\Fine\FineCalculationService;
use App\Support\Status;
use Illuminate\Console\Command;

/**
 * Nightly sweep: marks open loans past their due date as overdue and accrues
 * the running fine so that a student's outstanding balance is accurate even
 * before the book comes back.
 */
class SweepOverdueLoans extends Command
{
    protected $signature = 'slms:sweep-overdue';

    protected $description = 'Flag overdue loans and accrue their fines';

    public function handle(
        FineCalculationService $fines,
        StudentRepositoryInterface $students,
    ): int {
        $overdue = Circulation::with('student')
            ->where('status', Status::CIRC_ISSUED)
            ->whereDate('due_date', '<', now()->toDateString())
            ->get();

        $this->info("Found {$overdue->count()} newly overdue loan(s).");

        foreach ($overdue as $loan) {
            $loan->update(['status' => Status::CIRC_OVERDUE]);
        }

        // Accrue (or refresh) fines on every still-open overdue loan.
        $accrued = 0;

        Circulation::with('student')
            ->where('status', Status::CIRC_OVERDUE)
            ->whereNull('return_date')
            ->chunkById(200, function ($loans) use ($fines, &$accrued) {
                foreach ($loans as $loan) {
                    if ($fines->assess($loan)) {
                        $accrued++;
                    }
                }
            }, 'circulation_id');

        $this->info("Accrued fines on {$accrued} loan(s).");

        return self::SUCCESS;
    }
}
