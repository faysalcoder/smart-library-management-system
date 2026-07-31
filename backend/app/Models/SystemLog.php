<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit trail (ADR-10 / Security Feasibility §2.10).
 *
 * There is deliberately no update or delete path for this model.
 */
class SystemLog extends Model
{
    use HasFactory;

    protected $primaryKey = 'log_id';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'actor_name', 'action', 'entity_type', 'entity_id',
        'detail', 'ip_address', 'user_agent', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (! empty($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }

        if (! empty($filters['q'])) {
            $term = $filters['q'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('detail', 'like', "%{$term}%")
                    ->orWhere('actor_name', 'like', "%{$term}%")
                    ->orWhere('action', 'like', "%{$term}%");
            });
        }

        return $query;
    }
}
