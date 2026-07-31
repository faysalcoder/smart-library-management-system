<?php

namespace App\Services\Fine;

use App\Models\Circulation;
use App\Models\Fine;
use App\Models\User;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Support\AuditAction;
use App\Support\Status;

/**
 * FR-05 — fine calculation.
 *
 * BR-07: fine = max(0, overdue_days − grace_days) × rate_per_day,
 *        capped at fine_max_cap.
 */
class FineCalculationService
{
    public function __construct(
        private SettingService $settings,
        private StudentRepositoryInterface $students,
        private AuditLogService $audit,
    ) {}

    /**
     * Pure calculation — no persistence. Kept separate so it is trivially
     * unit-testable against the matrix in SYSTEM_ARCHITECTURE.md §16.1.
     *
     * @return array{overdue_days:int, chargeable_days:int, rate:float, amount:float, capped:bool}
     */
    public function compute(int $overdueDays): array
    {
        $grace = $this->settings->int('fine_grace_days', 0);
        $rate = $this->settings->decimal('fine_rate_per_day', 5.00);
        $cap = $this->settings->decimal('fine_max_cap', 500.00);

        $chargeable = max(0, $overdueDays - $grace);
        $raw = round($chargeable * $rate, 2);
        $amount = min($raw, $cap);

        return [
            'overdue_days' => $overdueDays,
            'chargeable_days' => $chargeable,
            'rate' => $rate,
            'amount' => $amount,
            'capped' => $raw > $cap,
        ];
    }

    /** Preview for the Return screen — shows the fine before it is committed. */
    public function preview(Circulation $circulation): array
    {
        return $this->compute($circulation->overdue_days);
    }

    /**
     * Creates (or refreshes) the fine attached to a circulation record.
     * Returns null when nothing is owed.
     */
    public function assess(Circulation $circulation, ?User $actor = null): ?Fine
    {
        $result = $this->compute($circulation->overdue_days);

        if ($result['amount'] <= 0) {
            return null;
        }

        $fine = Fine::updateOrCreate(
            ['circulation_id' => $circulation->circulation_id],
            [
                'student_id' => $circulation->student_id,
                'overdue_days' => $result['overdue_days'],
                // The rate is snapshot here (ADR-08) — a later policy change
                // must never alter an already-assessed fine.
                'rate_per_day' => $result['rate'],
                'amount' => $result['amount'],
                'status' => Status::FINE_PENDING,
            ]
        );

        $this->students->refreshFinancials($circulation->student);

        $this->audit->record(
            $actor,
            AuditAction::FINE_CREATED,
            'fine',
            $fine->fine_id,
            sprintf(
                'Fine of %s%.2f assessed (%d overdue day(s) x %s%.2f) on circulation #%d',
                config('library.currency.symbol'),
                $result['amount'],
                $result['chargeable_days'],
                config('library.currency.symbol'),
                $result['rate'],
                $circulation->circulation_id
            )
        );

        return $fine;
    }
}
