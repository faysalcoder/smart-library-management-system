<?php

namespace App\Models;

use App\Support\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fine extends Model
{
    use HasFactory;

    protected $primaryKey = 'fine_id';

    protected $fillable = [
        'circulation_id', 'student_id', 'overdue_days', 'rate_per_day',
        'amount', 'paid_amount', 'status', 'collected_by', 'waived_by',
        'waive_reason', 'settled_at',
    ];

    protected function casts(): array
    {
        return [
            'rate_per_day' => 'decimal:2',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'overdue_days' => 'integer',
            'settled_at' => 'datetime',
        ];
    }

    protected $appends = ['balance'];

    // ---- Relationships ---------------------------------------------------

    public function circulation(): BelongsTo
    {
        return $this->belongsTo(Circulation::class, 'circulation_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function collectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function waivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'waived_by');
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->whereIn('status', Status::FINE_OUTSTANDING);
    }

    public function scopeSettled(Builder $query): Builder
    {
        return $query->whereIn('status', [Status::FINE_PAID, Status::FINE_WAIVED]);
    }

    // ---- Domain accessors ------------------------------------------------

    public function getBalanceAttribute(): float
    {
        if (in_array($this->status, [Status::FINE_PAID, Status::FINE_WAIVED], true)) {
            return 0.0;
        }

        return round((float) $this->amount - (float) $this->paid_amount, 2);
    }

    public function isOutstanding(): bool
    {
        return in_array($this->status, Status::FINE_OUTSTANDING, true);
    }
}
