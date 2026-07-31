import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  ImageUpload,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { authorApi, bookApi, categoryApi, publisherApi } from '@/lib/services';
import { formatDate } from '@/lib/format';

interface FormState {
  isbn: string;
  title: string;
  author_id: string;
  publisher_id: string;
  publication_year: string;
  edition: string;
  category_id: string;
  shelf_no: string;
  language: string;
  description: string;
  initial_copies: string;
}

const EMPTY: FormState = {
  isbn: '',
  title: '',
  author_id: '',
  publisher_id: '',
  publication_year: '',
  edition: '',
  category_id: '',
  shelf_no: '',
  language: 'English',
  description: '',
  initial_copies: '1',
};

/**
 * S-12 — Add / Edit Book, with the copies panel (FR-06).
 */
export default function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addingCopies, setAddingCopies] = useState(false);
  const [copyQuantity, setCopyQuantity] = useState('1');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.list });
  const { data: authors } = useQuery({ queryKey: ['authors-all'], queryFn: authorApi.all });
  const { data: publishers } = useQuery({ queryKey: ['publishers-all'], queryFn: publisherApi.all });

  const { data: bookPayload, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookApi.get(id!),
    enabled: isEdit,
  });

  const book = bookPayload?.book;

  useEffect(() => {
    if (book) {
      setForm({
        isbn: book.isbn,
        title: book.title,
        author_id: String(book.author_id ?? ''),
        publisher_id: book.publisher_id ? String(book.publisher_id) : '',
        publication_year: book.publication_year?.toString() ?? '',
        edition: book.edition ?? '',
        category_id: String(book.category_id),
        shelf_no: book.shelf_no ?? '',
        language: book.language,
        description: book.description ?? '',
        initial_copies: '0',
      });
    }
  }, [book]);

  const patch = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: [] }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        isbn: form.isbn.trim(),
        title: form.title.trim(),
        author_id: Number(form.author_id),
        publisher_id: form.publisher_id ? Number(form.publisher_id) : null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        edition: form.edition.trim() || null,
        category_id: Number(form.category_id),
        shelf_no: form.shelf_no.trim() || null,
        language: form.language.trim() || 'English',
        description: form.description.trim() || null,
      };

      if (isEdit) {
        return bookApi.update(Number(id), payload);
      }

      payload.initial_copies = Number(form.initial_copies || 0);
      return bookApi.create(payload);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? 'Book updated.' : 'Book added to the catalog.');
      void queryClient.invalidateQueries({ queryKey: ['books-admin'] });
      void queryClient.invalidateQueries({ queryKey: ['book', String(saved.book_id)] });
      navigate(`/books/${saved.book_id}`);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
    },
  });

  const addCopies = useMutation({
    mutationFn: () => bookApi.addCopies(Number(id), Number(copyQuantity)),
    onSuccess: (created) => {
      toast.success(`${created.length} copy/copies added.`);
      setAddingCopies(false);
      setCopyQuantity('1');
      void queryClient.invalidateQueries({ queryKey: ['book', id] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const updateCopy = useMutation({
    mutationFn: ({ copyId, status }: { copyId: number; status: string }) =>
      bookApi.updateCopy(copyId, { status }),
    onSuccess: () => {
      toast.success('Copy updated.');
      void queryClient.invalidateQueries({ queryKey: ['book', id] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    save.mutate();
  };

  if (isEdit && isLoading) return <Spinner label="Loading book…" />;

  const err = (key: keyof FormState) => errors[key]?.[0];

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title={isEdit ? 'Edit book' : 'Add a new book'}
        back={{ label: 'Back to catalog', onClick: () => navigate('/books') }}
        subtitle={isEdit ? book?.title : 'Enter the bibliographic details and add physical copies.'}
      />

      {formError && (
        <div className="mb-4">
          <Alert tone="danger" title="Could not save this book">
            {formError}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader title="Bibliographic details" icon="menu_book" />

          {isEdit && book ? (
            <div className="mb-5 flex items-start gap-4">
              <ImageUpload
                label="Cover image"
                value={book.cover_image}
                shape="portrait"
                hint="JPEG, PNG or WebP, up to 5 MB."
                onUpload={async (file: File) => {
                  const updated = await bookApi.uploadCover(book.book_id, file);
                  toast.success('Cover image updated.');
                  queryClient.setQueryData(['book', id], (prev: typeof bookPayload) =>
                    prev ? { ...prev, book: updated } : prev,
                  );
                  return updated;
                }}
              />
            </div>
          ) : (
            !isEdit && (
              <div className="mb-5">
                <Alert tone="info">Save the book first, then you can add a cover image.</Alert>
              </div>
            )
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ISBN" htmlFor="isbn" required error={err('isbn')}>
              <Input
                id="isbn"
                value={form.isbn}
                onChange={(e) => patch('isbn', e.target.value)}
                placeholder="978-0-07-352332-3"
                mono
                required
                invalid={Boolean(err('isbn'))}
              />
            </Field>

            <Field label="Category" htmlFor="category_id" required error={err('category_id')}>
              <Select
                id="category_id"
                value={form.category_id}
                onChange={(e) => patch('category_id', e.target.value)}
                required
                invalid={Boolean(err('category_id'))}
              >
                <option value="">Select a category…</option>
                {categories?.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="title" required error={err('title')}>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => patch('title', e.target.value)}
                  placeholder="Database System Concepts"
                  required
                  invalid={Boolean(err('title'))}
                />
              </Field>
            </div>

            {/*
              Authors and publishers are entities (DFD L-0 "Author Management"
              / "Publisher Management"), so these are selects over those lists
              rather than free text — which also stops the same author being
              spelled three different ways across the catalog.
            */}
            <Field
              label="Author"
              htmlFor="author_id"
              required
              error={err('author_id')}
              hint="Not listed? Add them in Author Management first."
            >
              <Select
                id="author_id"
                value={form.author_id}
                onChange={(e) => patch('author_id', e.target.value)}
                required
                invalid={Boolean(err('author_id'))}
              >
                <option value="">Select an author…</option>
                {authors?.map((author) => (
                  <option key={author.author_id} value={author.author_id}>
                    {author.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Publisher" htmlFor="publisher_id" error={err('publisher_id')}>
              <Select
                id="publisher_id"
                value={form.publisher_id}
                onChange={(e) => patch('publisher_id', e.target.value)}
                invalid={Boolean(err('publisher_id'))}
              >
                <option value="">No publisher recorded</option>
                {publishers?.map((publisher) => (
                  <option key={publisher.publisher_id} value={publisher.publisher_id}>
                    {publisher.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Publication year" htmlFor="publication_year" error={err('publication_year')}>
              <Input
                id="publication_year"
                type="number"
                value={form.publication_year}
                onChange={(e) => patch('publication_year', e.target.value)}
                placeholder="2019"
                min={1400}
                max={new Date().getFullYear() + 1}
              />
            </Field>

            <Field label="Edition" htmlFor="edition" error={err('edition')}>
              <Input
                id="edition"
                value={form.edition}
                onChange={(e) => patch('edition', e.target.value)}
                placeholder="7th"
              />
            </Field>

            <Field label="Shelf number" htmlFor="shelf_no" error={err('shelf_no')} hint="Physical location in the library.">
              <Input
                id="shelf_no"
                value={form.shelf_no}
                onChange={(e) => patch('shelf_no', e.target.value)}
                placeholder="C-14"
                mono
              />
            </Field>

            <Field label="Language" htmlFor="language" error={err('language')}>
              <Input
                id="language"
                value={form.language}
                onChange={(e) => patch('language', e.target.value)}
                placeholder="English"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="description" error={err('description')}>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => patch('description', e.target.value)}
                  placeholder="A short summary of the book…"
                />
              </Field>
            </div>

            {!isEdit && (
              <Field
                label="Initial copies"
                htmlFor="initial_copies"
                error={err('initial_copies')}
                hint="Accession numbers and barcodes are generated automatically."
              >
                <Input
                  id="initial_copies"
                  type="number"
                  min={0}
                  max={100}
                  value={form.initial_copies}
                  onChange={(e) => patch('initial_copies', e.target.value)}
                />
              </Field>
            )}
          </div>
        </Card>

        {/* ---- Copies panel (edit mode only) ---------------------------- */}
        {isEdit && book && (
          <Card padded={false}>
            <div className="p-6 pb-0">
              <CardHeader
                title="Physical copies"
                subtitle={`${book.available_copies} of ${book.total_copies} available`}
                icon="inventory_2"
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="add"
                    onClick={() => setAddingCopies(true)}
                  >
                    Add copies
                  </Button>
                }
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Accession</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Barcode</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Acquired</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Status</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {book.copies?.map((copy) => (
                    <tr key={copy.copy_id} className="border-b border-surface-container last:border-0">
                      <td className="px-4 py-3 font-mono text-primary">{copy.accession_no}</td>
                      <td className="px-4 py-3 font-mono text-body-sm text-on-surface-variant">
                        {copy.barcode}
                      </td>
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                        {formatDate(copy.acquired_on)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={copy.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Select
                          value={copy.status}
                          onChange={(e) =>
                            updateCopy.mutate({ copyId: copy.copy_id, status: e.target.value })
                          }
                          disabled={copy.status === 'issued'}
                          className="ml-auto w-auto"
                          aria-label={`Status for copy ${copy.accession_no}`}
                        >
                          <option value="available">Available</option>
                          <option value="issued" disabled>
                            Issued
                          </option>
                          <option value="damaged">Damaged</option>
                          <option value="lost">Lost</option>
                          <option value="withdrawn">Withdrawn</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ---- Sticky action bar ---------------------------------------- */}
        <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-dropdown">
          <Button type="button" variant="ghost" onClick={() => navigate('/books')}>
            Cancel
          </Button>
          <Button type="submit" icon="save" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Add book'}
          </Button>
        </div>
      </form>

      <Modal
        open={addingCopies}
        onClose={() => setAddingCopies(false)}
        title="Add physical copies"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddingCopies(false)}>
              Cancel
            </Button>
            <Button icon="add" loading={addCopies.isPending} onClick={() => addCopies.mutate()}>
              Add copies
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Accession numbers and barcodes are generated automatically in sequence.
          </p>
          <Field label="How many copies?" htmlFor="quantity" required>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={100}
              value={copyQuantity}
              onChange={(e) => setCopyQuantity(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
