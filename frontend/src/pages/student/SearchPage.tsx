import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  Pagination,
  Select,
  SkeletonRows,
  StatusBadge,
} from '@/components/ui';
import { bookApi, categoryApi, type BookQuery } from '@/lib/services';
import { formatNumber } from '@/lib/format';

/**
 * S-03 — Book Search & Results (FR-02).
 */
export default function SearchPage() {
  // Author Management and Publisher Management link here with a preset filter,
  // e.g. /search?author_id=4 from the author's book count.
  const [searchParams, setSearchParams] = useSearchParams();

  const [term, setTerm] = useState('');
  const [filters, setFilters] = useState<BookQuery>(() => ({
    page: 1,
    per_page: 12,
    sort: 'relevance',
    category_id: searchParams.get('category') ?? undefined,
    author_id: searchParams.get('author_id') ?? undefined,
    publisher_id: searchParams.get('publisher_id') ?? undefined,
  }));
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => bookApi.list(filters),
  });

  const books = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilters((f) => ({ ...f, q: term.trim() || undefined, page: 1 }));
  };

  const patch = (changes: Partial<BookQuery>) =>
    setFilters((f) => ({ ...f, ...changes, page: 1 }));

  const clearAll = () => {
    setTerm('');
    setFilters({ page: 1, per_page: 12, sort: 'relevance' });
    setSearchParams({});
  };

  const activeFilters = [
    filters.category_id && {
      key: 'category_id',
      label: categories?.find((c) => c.category_id === Number(filters.category_id))?.name,
    },
    filters.author_id && {
      key: 'author_id',
      label: `Author: ${books.find((b) => b.author_id === Number(filters.author_id))?.author ?? filters.author_id}`,
    },
    filters.publisher_id && {
      key: 'publisher_id',
      label: `Publisher: ${books.find((b) => b.publisher_id === Number(filters.publisher_id))?.publisher ?? filters.publisher_id}`,
    },
    filters.available_only && { key: 'available_only', label: 'Available now' },
    filters.author && { key: 'author', label: `Author: ${filters.author}` },
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  return (
    <div className="space-y-6">
      {/* ---- Search hero ------------------------------------------------ */}
      <Card className="bg-primary-container/5">
        <h1 className="text-headline-lg text-on-surface">What are you looking for today?</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Search the catalog by title, author, ISBN or publisher.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by title, author, ISBN or keyword…"
              className="h-14 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-lg text-on-surface placeholder:text-on-surface-variant focus:border-primary-container focus:outline-none focus:ring-4 focus:ring-primary-container/15"
            />
          </div>
          <Button type="submit" size="lg" icon="search" loading={isFetching && !isLoading}>
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'All books', active: !filters.available_only && !filters.sort?.includes('popular'), onClick: () => patch({ available_only: false, sort: 'relevance' }) },
            { label: 'Available now', active: Boolean(filters.available_only), onClick: () => patch({ available_only: !filters.available_only }) },
            { label: 'Newly added', active: filters.sort === 'newest', onClick: () => patch({ sort: 'newest' }) },
            { label: 'Most borrowed', active: filters.sort === 'popular', onClick: () => patch({ sort: 'popular' }) },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClick}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-label-md transition-colors',
                chip.active
                  ? 'border-primary-container bg-primary-container text-on-primary'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary-container',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-6">
        {/* ---- Filter sidebar ------------------------------------------- */}
        <aside
          className={clsx(
            'w-[260px] shrink-0 space-y-4',
            showFilters ? 'block' : 'hidden lg:block',
          )}
        >
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-headline-md text-on-surface">Filters</h2>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-label-md text-primary-container hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              <Field label="Category" htmlFor="category">
                <Select
                  id="category"
                  value={filters.category_id ?? ''}
                  onChange={(e) => patch({ category_id: e.target.value || undefined })}
                >
                  <option value="">All categories</option>
                  {categories?.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name} ({category.books_count ?? 0})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Author" htmlFor="author">
                <Input
                  id="author"
                  value={filters.author ?? ''}
                  onChange={(e) => patch({ author: e.target.value || undefined })}
                  placeholder="Filter by author"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Year from" htmlFor="year_from">
                  <Input
                    id="year_from"
                    type="number"
                    value={filters.year_from ?? ''}
                    onChange={(e) =>
                      patch({ year_from: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="1990"
                  />
                </Field>
                <Field label="Year to" htmlFor="year_to">
                  <Input
                    id="year_to"
                    type="number"
                    value={filters.year_to ?? ''}
                    onChange={(e) =>
                      patch({ year_to: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="2026"
                  />
                </Field>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={Boolean(filters.available_only)}
                  onChange={(e) => patch({ available_only: e.target.checked })}
                  className="h-4 w-4 rounded border-outline-variant text-primary-container focus:ring-primary-container"
                />
                Available copies only
              </label>
            </div>
          </Card>
        </aside>

        {/* ---- Results --------------------------------------------------- */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="tune"
                className="lg:hidden"
                onClick={() => setShowFilters((v) => !v)}
              >
                Filters
              </Button>
              <p className="text-body-md text-on-surface-variant">
                {isLoading ? (
                  'Searching…'
                ) : (
                  <>
                    <span className="font-semibold text-on-surface">
                      {formatNumber(meta?.total ?? 0)}
                    </span>{' '}
                    result{(meta?.total ?? 0) === 1 ? '' : 's'}
                    {filters.q && (
                      <>
                        {' '}
                        for “<span className="font-semibold text-on-surface">{filters.q}</span>”
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            <Select
              value={filters.sort ?? 'relevance'}
              onChange={(e) => patch({ sort: e.target.value as BookQuery['sort'] })}
              className="w-auto"
              aria-label="Sort results"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="title">Sort: Title A–Z</option>
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Most borrowed</option>
            </Select>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter.key}
                  className="flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 text-label-md text-on-secondary-container"
                >
                  {filter.label}
                  <button
                    type="button"
                    onClick={() => patch({ [filter.key]: undefined } as Partial<BookQuery>)}
                    aria-label={`Remove ${filter.label} filter`}
                  >
                    <Icon name="close" className="text-[14px]" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {isLoading ? (
            <Card padded={false}>
              <SkeletonRows rows={6} cols={3} />
            </Card>
          ) : books.length === 0 ? (
            <Card>
              <EmptyState
                icon="search_off"
                title={filters.q ? `No books match “${filters.q}”` : 'No books found'}
                description="Try a different spelling, or search by author or ISBN instead."
                action={
                  <Button variant="secondary" icon="filter_alt_off" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {books.map((book) => (
                  <Link
                    key={book.book_id}
                    to={`/books/${book.book_id}`}
                    className="group flex gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card transition-all hover:border-primary-container hover:shadow-dropdown"
                  >
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt=""
                        className="h-[112px] w-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-[112px] w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                        <Icon name="book_2" className="text-[28px]" />
                      </span>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="line-clamp-2 text-body-lg font-semibold text-on-surface group-hover:text-primary">
                        {book.title}
                      </h3>
                      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                        {book.author}
                      </p>

                      {book.category && (
                        <span className="mt-2 w-fit rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                          {book.category.name}
                        </span>
                      )}

                      <div className="mt-auto pt-2">
                        {book.shelf_no && (
                          <p className="font-mono text-[11px] text-on-surface-variant">
                            Shelf {book.shelf_no}
                          </p>
                        )}
                        <p
                          className={clsx(
                            'mt-1 flex items-center gap-1.5 text-body-sm font-medium',
                            book.is_available ? 'text-success' : 'text-on-warning-container',
                          )}
                        >
                          <span
                            className={clsx(
                              'h-2 w-2 rounded-full',
                              book.is_available ? 'bg-success' : 'bg-warning',
                            )}
                          />
                          {book.is_available
                            ? `${book.available_copies} of ${book.total_copies} available`
                            : 'All copies issued'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {meta && (
                <Card padded={false}>
                  <Pagination
                    page={meta.current_page}
                    lastPage={meta.last_page}
                    total={meta.total}
                    from={meta.from}
                    to={meta.to}
                    onChange={(page) => setFilters((f) => ({ ...f, page }))}
                  />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
