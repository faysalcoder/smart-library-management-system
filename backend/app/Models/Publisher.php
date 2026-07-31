<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * DFD Level-0 "Publisher Management".
 */
class Publisher extends Model
{
    use HasFactory;

    protected $primaryKey = 'publisher_id';

    protected $fillable = ['name', 'address', 'contact_email', 'contact_phone', 'website'];

    public function books(): HasMany
    {
        return $this->hasMany(Book::class, 'publisher_id');
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where('name', 'like', '%'.trim($term).'%');
    }
}
