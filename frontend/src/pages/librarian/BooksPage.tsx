import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  SkeletonRows,
  StatusBadge,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { bookApi, categoryApi } from '@/lib/services';
import { formatNumber } from '@/lib/format';
import type { Book } from '@/types';

/**
 * S-11 — Book List / Catalog Management (FR-06).
 */
export default function BooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [deleting, setDeleting] = useState<Book | null>(null);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.list });

  const { data, isLoading } = useQuery({
    queryKey: ['books-admin', page, term, categoryId],
    queryFn: () =>
      bookApi.list({
        page,
        per_page: 25,
        q: term || undefined,
        category_id: categoryId || undefined,
        sort: 'title',
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => bookApi.remove(id),
    onSuccess: () => {
      toast.success('Book deleted.');
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['books-admin'] });
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
      setDeleting(null);
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog"
        subtitle={`${formatNumber(meta?.total ?? 0)} title(s) in the library`}
        action={
          <Button icon="add" onClick={() => navigate('/books/new/edit')}>
            Add book
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant p-4">
          <div className="relative min-w-[220px] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            />
            <Input
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, author or ISBN…"
              className="pl-10"
            />
          </div>

          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories?.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="library_books"
            title="No books found"
            description="Add your first title, or adjust the search and filters."
            action={
              <Button icon="add" onClick={() => navigate('/books/new/edit')}>
                Add book
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Title</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">ISBN</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Category</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Shelf</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Copies</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Availability</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((book) => (
                    <tr
                      key={book.book_id}
                      className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/books/${book.book_id}`}
                          className="block font-medium text-on-surface hover:text-primary hover:underline"
                        >
                          {book.title}
                        </Link>
                        <span className="block text-body-sm text-on-surface-variant">
                          {book.author}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-body-sm text-on-surface-variant">
                        {book.isbn}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {book.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-body-sm text-on-surface-variant">
                        {book.shelf_no ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span className="font-semibold text-on-surface">
                          {book.available_copies}
                        </span>
                        <span className="text-on-surface-variant"> / {book.total_copies}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={book.is_available ? 'available' : 'issued'}
                          label={book.is_available ? 'Available' : 'All on loan'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            onClick={() => navigate(`/books/${book.book_id}/edit`)}
                            aria-label={`Edit ${book.title}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => setDeleting(book)}
                            aria-label={`Delete ${book.title}`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <Pagination
                page={meta.current_page}
                lastPage={meta.last_page}
                total={meta.total}
                from={meta.from}
                to={meta.to}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this book?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="delete"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.book_id)}
            >
              Delete book
            </Button>
          </>
        }
      >
        {deleting && (
          <p className="text-body-md text-on-surface">
            Delete <span className="font-semibold">“{deleting.title}”</span>? It currently has{' '}
            <span className="font-semibold">{deleting.total_copies}</span> physical copy/copies.
            A title with active copies cannot be deleted — withdraw the copies first. This action
            cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
}
