<?php

namespace App\Models;

use App\Support\Status;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'username', 'email', 'full_name', 'password', 'role_id',
        'status', 'must_change_password', 'avatar_url',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'must_change_password' => 'boolean',
            'failed_attempts' => 'integer',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class, 'user_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(SystemLog::class, 'user_id');
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', Status::USER_ACTIVE);
    }

    // ---- Authorization helpers ------------------------------------------

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role?->name, $roles, true);
    }

    public function hasPermission(string $code): bool
    {
        return $this->role
            ?->permissions
            ->contains(fn (Permission $p) => $p->code === $code) ?? false;
    }

    /** @return array<int,string> */
    public function permissionCodes(): array
    {
        return $this->role?->permissions->pluck('code')->all() ?? [];
    }

    public function isLocked(): bool
    {
        if ($this->status === Status::USER_LOCKED) {
            return true;
        }

        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function isActive(): bool
    {
        return $this->status === Status::USER_ACTIVE && ! $this->isLocked();
    }
}
