import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SkeletonRows,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { publisherApi } from '@/lib/services';
import { useAuth } from '@/store/auth';
import type { Publisher } from '@/types';

const EMPTY = { name: '', address: '', contact_email: '', contact_phone: '', website: '' };

/**
 * Publisher Management — DFD Level-0 module.
 */
export default function PublishersPage() {
  const queryClient = useQueryClient();
  const can = useAuth((s) => s.can);

  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);
  const [deleting, setDeleting] = useState<Publisher | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['publishers', page, term],
    queryFn: () => publisherApi.list({ page, per_page: 25, q: term || undefined }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['publishers'] });
    void queryClient.invalidateQueries({ queryKey: ['publishers-all'] });
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setFormError(null);
  };

  const save = useMutation({
    mutationFn: () =>
      editing ? publisherApi.update(editing.publisher_id, form) : publisherApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Publisher updated.' : 'Publisher added.');
      closeForm();
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
    },
  });

  const remove = useMutation({
    mutationFn: (publisher: Publisher) => publisherApi.remove(publisher.publisher_id),
    onSuccess: () => {
      toast.success('Publisher deleted.');
      setDeleting(null);
      refresh();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
      setDeleting(null);
    },
  });

  const openEdit = (publisher: Publisher) => {
    setEditing(publisher);
    setForm({
      name: publisher.name,
      address: publisher.address ?? '',
      contact_email: publisher.contact_email ?? '',
      contact_phone: publisher.contact_phone ?? '',
      website: publisher.website ?? '',
    });
  };

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const err = (key: string) => errors[key]?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publishers"
        subtitle="Publishing houses the library sources books from, with their contact details."
        action={
          can('publisher.manage') && (
            <Button icon="add_business" onClick={() => setCreating(true)}>
              Add publisher
            </Button>
          )
        }
      />

      <Card padded={false}>
        <div className="border-b border-outline-variant p-4">
          <div className="relative max-w-md">
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
              placeholder="Search publishers by name…"
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="apartment"
            title="No publishers found"
            description="Publishers are created here, then selected when cataloguing a book."
            action={
              can('publisher.manage') && (
                <Button icon="add_business" onClick={() => setCreating(true)}>
                  Add publisher
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Name</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">
                      Website
                    </th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">
                      Books
                    </th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((publisher) => (
                    <tr
                      key={publisher.publisher_id}
                      className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
                            <Icon name="apartment" className="text-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <span className="block font-medium text-on-surface">
                              {publisher.name}
                            </span>
                            {publisher.address && (
                              <span className="block truncate text-body-sm text-on-surface-variant">
                                {publisher.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                        {publisher.contact_email && (
                          <span className="block truncate">{publisher.contact_email}</span>
                        )}
                        {publisher.contact_phone && (
                          <span className="block font-mono">{publisher.contact_phone}</span>
                        )}
                        {!publisher.contact_email && !publisher.contact_phone && '—'}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        {publisher.website ? (
                          <a
                            href={publisher.website}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block truncate text-body-sm text-primary hover:underline"
                          >
                            {publisher.website}
                          </a>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <Link
                          to={`/search?publisher_id=${publisher.publisher_id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {publisher.books_count}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {can('publisher.manage') && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="edit"
                              onClick={() => openEdit(publisher)}
                              aria-label={`Edit ${publisher.name}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="delete"
                              onClick={() => setDeleting(publisher)}
                              aria-label={`Delete ${publisher.name}`}
                            />
                          </div>
                        )}
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
        open={creating || Boolean(editing)}
        onClose={closeForm}
        title={editing ? 'Edit publisher' : 'Add a publisher'}
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button icon="save" loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save changes' : 'Add publisher'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <Field label="Publisher name" htmlFor="name" required error={err('name')}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="McGraw-Hill"
              autoFocus
              invalid={Boolean(err('name'))}
            />
          </Field>

          <Field label="Address" htmlFor="address" error={err('address')}>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, city, country"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" htmlFor="contact_email" error={err('contact_email')}>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="orders@publisher.com"
                invalid={Boolean(err('contact_email'))}
              />
            </Field>

            <Field label="Contact phone" htmlFor="contact_phone" error={err('contact_phone')}>
              <Input
                id="contact_phone"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+880 1711-000000"
                mono
              />
            </Field>
          </div>

          <Field label="Website" htmlFor="website" error={err('website')}>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://www.publisher.com"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this publisher?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="delete"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting)}
            >
              Delete publisher
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface">
              Delete <span className="font-semibold">“{deleting.name}”</span>?
            </p>
            {deleting.books_count > 0 && (
              <Alert tone="warning" title="This publisher has books in the catalog">
                <span className="font-semibold">{deleting.books_count}</span> book(s) are published
                by them. Reassign those books first — the system will refuse the delete otherwise.
              </Alert>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
