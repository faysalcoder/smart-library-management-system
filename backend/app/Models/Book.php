<?php

namespace App\Models;

use App\Support\Status;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    use HasFactory;

    protected $primaryKey = 'book_id';

    protected $fillable = [
        'isbn', 'title', 'author_id', 'publisher_id', 'publication_year', 'edition',
        'category_id', 'shelf_no', 'language', 'description', 'cover_image',
    ];

    protected function casts(): array
    {
        return [
            'publication_year' => 'integer',
            'total_copies' => 'integer',
            'available_copies' => 'integer',
            'borrow_count' => 'integer',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class, 'author_id');
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function copies(): HasMany
    {
        return $this->hasMany(BookCopy::class, 'book_id');
    }

    // ---- Scopes ----------------------------------------------------------

    /**
     * FR-02 / §3.5.1 — search by title, author name, ISBN or publisher name.
     *
     * Author and publisher now live in their own tables (DFD L-0 "Author
     * Management" / "Publisher Management"), so those two terms match through
     * the relation rather than a column on this table.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        $term = trim($term);

        return $query->where(function (Builder $q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
                ->orWhere('isbn', 'like', "%{$term}%")
                ->orWhereHas('author', fn (Builder $a) => $a->where('name', 'like', "%{$term}%"))
                ->orWhereHas('publisher', fn (Builder $p) => $p->where('name', 'like', "%{$term}%"));
        });
    }

    public function scopeInCategory(Builder $query, $categoryId): Builder
    {
        return $categoryId ? $query->where('category_id', $categoryId) : $query;
    }

    public function scopeByAuthor(Builder $query, $authorId): Builder
    {
        return $authorId ? $query->where('author_id', $authorId) : $query;
    }

    public function scopeByPublisher(Builder $query, $publisherId): Builder
    {
        return $publisherId ? $query->where('publisher_id', $publisherId) : $query;
    }

    public function scopeAvailableOnly(Builder $query, bool $only = true): Builder
    {
        return $only ? $query->where('available_copies', '>', 0) : $query;
    }

    // ---- Domain helpers --------------------------------------------------

    public function getIsAvailableAttribute(): bool
    {
        return $this->available_copies > 0;
    }

    /** Recomputes the denormalised counters from the copies table (ADR-09). */
    public function recalculateCopyCounters(): void
    {
        $total = $this->copies()->whereIn('status', Status::COPY_ACTIVE)->count();
        $available = $this->copies()->where('status', Status::COPY_AVAILABLE)->count();

        $this->forceFill([
            'total_copies' => $total,
            'available_copies' => $available,
        ])->save();
    }
}
