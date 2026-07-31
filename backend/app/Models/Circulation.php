<?php

namespace App\Models;

use App\Support\Status;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Circulation extends Model
{
    use HasFactory;

    protected $primaryKey = 'circulation_id';

    protected $fillable = [
        'student_id', 'copy_id', 'issued_by', 'returned_to',
        'issue_date', 'due_date', 'return_date', 'renewal_count', 'status', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'return_date' => 'date',
            'renewal_count' => 'integer',
        ];
    }

    protected $appends = ['overdue_days', 'is_overdue'];

    // ---- Relationships ---------------------------------------------------

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function copy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class, 'copy_id');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function returnedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_to');
    }

    public function fine(): HasOne
    {
        return $this->hasOne(Fine::class, 'circulation_id');
    }

    // ---- Scopes ----------------------------------------------------------

    /** Loans still out with a borrower. */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', Status::CIRC_OPEN);
    }

    public function scopeOverdue(Builder $query, ?Carbon $asOf = null): Builder
    {
        $asOf = $asOf ?? now();

        return $query->whereIn('status', Status::CIRC_OPEN)
            ->whereDate('due_date', '<', $asOf->toDateString());
    }

    public function scopeReturned(Builder $query): Builder
    {
        return $query->where('status', Status::CIRC_RETURNED);
    }

    public function scopeBetween(Builder $query, ?string $from, ?string $to, string $column = 'issue_date'): Builder
    {
        if ($from) {
            $query->whereDate($column, '>=', $from);
        }
        if ($to) {
            $query->whereDate($column, '<=', $to);
        }

        return $query;
    }

    // ---- Domain accessors ------------------------------------------------

    /**
     * Days past the due date. For an open loan this accrues against today;
     * for a returned loan it is frozen at the actual return date.
     */
    public function getOverdueDaysAttribute(): int
    {
        if (! $this->due_date) {
            return 0;
        }

        $reference = $this->return_date ?? Carbon::today();

        return $this->due_date->lt($reference)
            ? $this->due_date->diffInDays($reference)
            : 0;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->overdue_days > 0;
    }

    public function isOpen(): bool
    {
        return in_array($this->status, Status::CIRC_OPEN, true);
    }
}
