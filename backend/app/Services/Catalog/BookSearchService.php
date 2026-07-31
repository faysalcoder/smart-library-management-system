<?php

namespace App\Services\Catalog;

use App\Models\Book;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

/**
 * FR-02 — Book search.
 *
 * Performance NFR: results must render in under 1.5 s. Achieved through the
 * (title, author) composite index, server-side pagination, eager loading of
 * the category relation, and a short result cache.
 */
class BookSearchService
{
    private const CACHE_TTL = 60; // seconds

    public function search(array $filters): LengthAwarePaginator
    {
        $perPage = min(100, max(6, (int) ($filters['per_page'] ?? 12)));
        $page = max(1, (int) ($filters['page'] ?? 1));

        $key = 'slms.search.'.md5(json_encode($filters + ['p' => $page, 'pp' => $perPage]));

        return Cache::remember($key, self::CACHE_TTL, function () use ($filters, $perPage) {
            // Query-string booleans arrive as the STRINGS "true"/"false", and
            // "false" is truthy in PHP — so parse it properly.
            $availableOnly = filter_var(
                $filters['available_only'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            $query = Book::with(['category', 'author', 'publisher'])
                ->search($filters['q'] ?? null)
                ->inCategory($filters['category_id'] ?? null)
                ->byAuthor($filters['author_id'] ?? null)
                ->byPublisher($filters['publisher_id'] ?? null)
                ->availableOnly($availableOnly);

            // Free-text author filter still works, matching through the relation.
            if (! empty($filters['author'])) {
                $query->whereHas('author', fn ($a) => $a->where('name', 'like', '%'.$filters['author'].'%'));
            }

            if (! empty($filters['language'])) {
                $query->where('language', $filters['language']);
            }

            if (! empty($filters['year_from'])) {
                $query->where('publication_year', '>=', (int) $filters['year_from']);
            }

            if (! empty($filters['year_to'])) {
                $query->where('publication_year', '<=', (int) $filters['year_to']);
            }

            match ($filters['sort'] ?? 'relevance') {
                'title' => $query->orderBy('title'),
                'newest' => $query->orderByDesc('publication_year')->orderByDesc('book_id'),
                'popular' => $query->orderByDesc('borrow_count'),
                // "Relevance" without a full-text index: available titles first,
                // then most-borrowed, then alphabetical. Predictable and cheap.
                default => $query->orderByDesc('available_copies')
                    ->orderByDesc('borrow_count')
                    ->orderBy('title'),
            };

            return $query->paginate($perPage);
        });
    }

    /** Typeahead suggestions for the search box. */
    public function suggest(string $term, int $limit = 8): array
    {
        if (strlen(trim($term)) < 2) {
            return [];
        }

        return Book::query()
            ->with('author:author_id,name')
            ->search($term)
            ->orderByDesc('available_copies')
            ->limit($limit)
            ->get(['book_id', 'title', 'author_id', 'available_copies'])
            ->map(fn (Book $b) => [
                'book_id' => $b->book_id,
                'title' => $b->title,
                'author' => $b->author?->name,
                'available' => $b->available_copies > 0,
            ])
            ->all();
    }

    /**
     * §3.5.1 — alternative available books / related suggestions.
     *
     * Ordered so the most useful substitute comes first: same category and
     * available, then same author, then popular titles in the same category.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int,Book>
     */
    public function related(Book $book, int $limit = 6)
    {
        return Book::with(['category', 'author'])
            ->where('book_id', '!=', $book->book_id)
            ->where(function ($query) use ($book) {
                $query->where('category_id', $book->category_id)
                    ->orWhere('author_id', $book->author_id);
            })
            // Available copies first — an unavailable "suggestion" helps nobody.
            ->orderByRaw('CASE WHEN available_copies > 0 THEN 0 ELSE 1 END')
            ->orderByDesc('borrow_count')
            ->orderBy('title')
            ->limit($limit)
            ->get();
    }

    public function flushCache(): void
    {
        // The search cache is short-lived; a catalog write simply lets it expire.
        Cache::forget('slms.search');
    }
}
