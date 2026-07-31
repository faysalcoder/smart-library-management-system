<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * DFD Level-0 "Author Management" · DFD Level-1 data store "List of Authors".
 */
class Author extends Model
{
    use HasFactory;

    protected $primaryKey = 'author_id';

    protected $fillable = ['name', 'nationality', 'biography'];

    public function books(): HasMany
    {
        return $this->hasMany(Book::class, 'author_id');
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where('name', 'like', '%'.trim($term).'%');
    }
}
