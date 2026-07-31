<?php

namespace App\Services\Fine;

use App\Exceptions\DomainException;
use App\Models\Fine;
use App\Models\User;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use App\Support\Status;
use Illuminate\Support\Facades\DB;

class FineSettlementService
{
    public function __construct(
        private StudentRepositoryInterface $students,
        private AuditLogService $audit,
    ) {}

    /** Collects a full or partial payment against a fine. */
    public function collect(Fine $fine, float $amount, User $collector): Fine
    {
        return DB::transaction(function () use ($fine, $amount, $collector) {
            if (! $fine->isOutstanding()) {
                throw new DomainException('This fine has already been settled.');
            }

            if ($amount <= 0) {
                throw new DomainException('The payment amount must be greater than zero.', [], 422);
            }

            $balance = $fine->balance;

            if ($amount > $balance + 0.001) {
                throw new DomainException(
                    sprintf(
                        'The payment of %s%.2f exceeds the outstanding balance of %s%.2f.',
                        config('library.currency.symbol'), $amount,
                        config('library.currency.symbol'), $balance
                    ),
                    [],
                    422
                );
            }

            $paid = round((float) $fine->paid_amount + $amount, 2);
            $isFullySettled = $paid >= (float) $fine->amount - 0.001;

            $fine->forceFill([
                'paid_amount' => $paid,
                'status' => $isFullySettled ? Status::FINE_PAID : Status::FINE_PARTIAL,
                'collected_by' => $collector->user_id,
                'settled_at' => $isFullySettled ? now() : null,
            ])->save();

            $this->students->refreshFinancials($fine->student);

            $this->audit->record(
                $collector,
                AuditAction::FINE_COLLECTED,
                'fine',
                $fine->fine_id,
                sprintf(
                    'Collected %s%.2f from %s (%s)',
                    config('library.currency.symbol'),
                    $amount,
                    $fine->student->student_no,
                    $isFullySettled ? 'settled in full' : 'partial payment'
                )
            );

            return $fine->fresh(['student', 'circulation.copy.book.author', 'collectedBy']);
        });
    }

    /**
     * BR-09 — only an Administrator may waive a fine, and a reason is
     * mandatory. Role enforcement happens in the route middleware; this
     * method guards the data requirements.
     */
    public function waive(Fine $fine, string $reason, User $admin): Fine
    {
        return DB::transaction(function () use ($fine, $reason, $admin) {
            if (! $fine->isOutstanding()) {
                throw new DomainException('This fine has already been settled.');
            }

            if (trim($reason) === '') {
                throw new DomainException('A reason is required in order to waive a fine.', [], 422);
            }

            $fine->forceFill([
                'status' => Status::FINE_WAIVED,
                'waived_by' => $admin->user_id,
                'waive_reason' => trim($reason),
                'settled_at' => now(),
            ])->save();

            $this->students->refreshFinancials($fine->student);

            $this->audit->record(
                $admin,
                AuditAction::FINE_WAIVED,
                'fine',
                $fine->fine_id,
                sprintf(
                    'Waived %s%.2f for %s — reason: %s',
                    config('library.currency.symbol'),
                    $fine->amount,
                    $fine->student->student_no,
                    trim($reason)
                )
            );

            return $fine->fresh(['student', 'circulation.copy.book.author', 'waivedBy']);
        });
    }
}
