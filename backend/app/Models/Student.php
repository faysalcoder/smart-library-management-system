<?php

namespace App\Models;

use App\Support\Status;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $primaryKey = 'student_id';

    protected $fillable = [
        'student_no', 'user_id', 'full_name', 'department', 'batch',
        'email', 'phone', 'card_uid', 'membership_status', 'borrow_status',
        'enrolled_on', 'photo_url',
    ];

    protected function casts(): array
    {
        return [
            'enrolled_on' => 'date',
            'outstanding_fine' => 'decimal:2',
            'active_loans' => 'integer',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function circulations(): HasMany
    {
        return $this->hasMany(Circulation::class, 'student_id');
    }

    public function fines(): HasMany
    {
        return $this->hasMany(Fine::class, 'student_id');
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeActiveMembers($query)
    {
        return $query->where('membership_status', Status::MEMBER_ACTIVE);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('full_name', 'like', "%{$term}%")
                ->orWhere('student_no', 'like', "%{$term}%")
                ->orWhere('department', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%");
        });
    }

    // ---- Domain helpers --------------------------------------------------

    /** BR-01 — only an active member may borrow. */
    public function isActiveMember(): bool
    {
        return $this->membership_status === Status::MEMBER_ACTIVE;
    }

    public function isBlocked(): bool
    {
        return $this->borrow_status === Status::BORROW_BLOCKED;
    }

    public function getOpenLoansCountAttribute(): int
    {
        return $this->circulations()
            ->whereIn('status', Status::CIRC_OPEN)
            ->count();
    }
}
