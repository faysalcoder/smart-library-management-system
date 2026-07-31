import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  PageHeader,
  Spinner,
  StatusBadge,
} from '@/components/ui';
import { bookApi } from '@/lib/services';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/store/auth';

/**
 * S-04 — Book Detail & Availability (FR-02).
 */
export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);

  const { data, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookApi.get(id!),
    enabled: Boolean(id),
  });

  const book = data?.book;
  const related = data?.related ?? [];

  if (isLoading) return <Spinner label="Loading book details…" />;

  if (!book) {
    return (
      <EmptyState
        icon="menu_book"
        title="Book not found"
        description="This title is not in the catalog."
        action={
          <Button icon="search" onClick={() => navigate('/search')}>
            Back to search
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={book.title}
        back={{ label: 'Back to search', onClick: () => navigate('/search') }}
        subtitle={
          <span>
            {book.author}
            {book.publisher && ` · ${book.publisher}`}
            {book.publication_year && ` · ${book.publication_year}`}
          </span>
        }
        action={
          can('book.manage') && (
            <Button
              variant="secondary"
              icon="edit"
              onClick={() => navigate(`/books/${book.book_id}/edit`)}
            >
              Edit book
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-col gap-6 sm:flex-row">
              {book.cover_image ? (
                <img
                  src={book.cover_image}
                  alt=""
                  className="h-[200px] w-[140px] shrink-0 self-center rounded-xl object-cover sm:self-start"
                />
              ) : (
                <span className="flex h-[200px] w-[140px] shrink-0 items-center justify-center self-center rounded-xl bg-surface-container text-on-surface-variant sm:self-start">
                  <Icon name="book_2" className="text-[48px]" />
                </span>
              )}

              <dl className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2">
                <Detail label="ISBN" value={book.isbn} mono />
                <Detail label="Category" value={book.category?.name ?? '—'} />
                <Detail label="Author" value={book.author ?? '—'} />
                <Detail label="Publisher" value={book.publisher ?? '—'} />
                <Detail label="Edition" value={book.edition ?? '—'} />
                <Detail label="Published" value={book.publication_year?.toString() ?? '—'} />
                <Detail label="Language" value={book.language} />
                <Detail label="Shelf location" value={book.shelf_no ?? '—'} mono />
              </dl>
            </div>

            {book.description && (
              <div className="mt-6 border-t border-surface-container pt-4">
                <p className="text-label-md uppercase tracking-wide text-on-surface-variant">
                  Description
                </p>
                <p className="mt-1 text-body-md text-on-surface">{book.description}</p>
              </div>
            )}
          </Card>

          {can('copy.manage') && book.copies && book.copies.length > 0 && (
            <Card padded={false}>
              <div className="p-6 pb-0">
                <CardHeader title="Physical copies" icon="inventory_2" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                      <Th>Accession no.</Th>
                      <Th>Barcode</Th>
                      <Th>Condition</Th>
                      <Th>Acquired</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.copies.map((copy) => (
                      <tr
                        key={copy.copy_id}
                        className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                      >
                        <Td>
                          <span className="font-mono text-primary">{copy.accession_no}</span>
                        </Td>
                        <Td>
                          <span className="font-mono text-on-surface-variant">{copy.barcode}</span>
                        </Td>
                        <Td className="capitalize">{copy.condition}</Td>
                        <Td>{formatDate(copy.acquired_on)}</Td>
                        <Td>
                          <StatusBadge status={copy.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* ---- Availability panel ---------------------------------------- */}
        <div className="space-y-4">
          <Card
            className={clsx(
              book.is_available
                ? 'border-success bg-success-container/20'
                : 'border-warning bg-warning-container/20',
            )}
          >
            <div className="text-center">
              <span
                className={clsx(
                  'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full',
                  book.is_available
                    ? 'bg-success text-white'
                    : 'bg-warning text-white',
                )}
              >
                <Icon
                  name={book.is_available ? 'check_circle' : 'schedule'}
                  className="text-[30px]"
                  filled
                />
              </span>

              <p className="text-[30px] font-bold leading-none text-on-surface tabular">
                {book.available_copies}
                <span className="text-body-lg font-normal text-on-surface-variant">
                  {' '}
                  / {book.total_copies}
                </span>
              </p>
              <p className="mt-1 text-body-md font-semibold text-on-surface">
                {book.is_available ? 'Copies available now' : 'All copies are on loan'}
              </p>

              {!book.is_available && (
                <p className="mt-2 text-body-sm text-on-warning-container">
                  Check back soon, or ask a librarian when the next copy is due.
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-2 border-t border-outline-variant pt-4 text-body-md">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Total copies</dt>
                <dd className="font-semibold text-on-surface tabular">{book.total_copies}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">On loan</dt>
                <dd className="font-semibold text-on-surface tabular">{book.on_loan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Times borrowed</dt>
                <dd className="font-semibold text-on-surface tabular">{book.borrow_count}</dd>
              </div>
            </dl>
          </Card>

          {book.is_available ? (
            <Alert tone="info" title="How to borrow">
              Take this book to the circulation desk with your student ID card. A librarian
              will scan both to issue it to you.
            </Alert>
          ) : (
            <Alert tone="warning" title="Currently unavailable">
              Every copy of this title is on loan. Ask a librarian about the next expected
              return date.
            </Alert>
          )}

          {can('circulate') && book.is_available && (
            <Button
              fullWidth
              size="lg"
              icon="arrow_circle_right"
              onClick={() => navigate('/circulation/issue')}
            >
              Go to Issue Book
            </Button>
          )}
        </div>
      </div>

      {/*
        §3.5.1 — "if unavailable, the system informs the student and may show
        alternative available books or related suggestions". When every copy is
        out, these become the primary call to action.
      */}
      {related.length > 0 && (
        <Card padded={false}>
          <div className="p-6 pb-0">
            <CardHeader
              title={book.is_available ? 'Related books' : 'Available alternatives'}
              subtitle={
                book.is_available
                  ? 'Other titles in this category or by the same author.'
                  : 'Every copy of this title is on loan — these similar books are available now.'
              }
              icon={book.is_available ? 'auto_stories' : 'lightbulb'}
            />
          </div>

          <div className="grid gap-4 p-6 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.book_id}
                to={`/books/${item.book_id}`}
                className="group flex gap-3 rounded-xl border border-outline-variant p-3 transition-all hover:border-primary-container hover:shadow-card"
              >
                {item.cover_image ? (
                  <img
                    src={item.cover_image}
                    alt=""
                    className="h-[84px] w-[60px] shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-[84px] w-[60px] shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                    <Icon name="book_2" className="text-[22px]" />
                  </span>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-body-md font-medium text-on-surface group-hover:text-primary">
                    {item.title}
                  </p>
                  <p className="truncate text-body-sm text-on-surface-variant">{item.author}</p>

                  <p
                    className={clsx(
                      'mt-auto flex items-center gap-1.5 pt-1 text-body-sm font-medium',
                      item.is_available ? 'text-success' : 'text-on-warning-container',
                    )}
                  >
                    <span
                      className={clsx(
                        'h-2 w-2 rounded-full',
                        item.is_available ? 'bg-success' : 'bg-warning',
                      )}
                    />
                    {item.is_available
                      ? `${item.available_copies} available`
                      : 'All copies issued'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className={clsx('mt-0.5 text-body-lg text-on-surface', mono && 'font-mono text-body-md')}>
        {value}
      </dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-label-md uppercase tracking-wide text-on-surface-variant">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 text-on-surface', className)}>{children}</td>;
}
