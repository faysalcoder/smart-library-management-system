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
  SkeletonRows,
  Textarea,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { categoryApi } from '@/lib/services';
import { useAuth } from '@/store/auth';
import type { Category } from '@/types';

const EMPTY = { name: '', code: '', description: '' };

/**
 * Category management — the Category Table from Data Dictionary §3.6,
 * supporting "book classifications" and the category filter in FR-02.
 */
export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const can = useAuth((s) => s.can);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
    void queryClient.invalidateQueries({ queryKey: ['books-admin'] });
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
      editing
        ? categoryApi.update(editing.category_id, form)
        : categoryApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Category updated.' : 'Category created.');
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
    mutationFn: (category: Category) => categoryApi.remove(category.category_id),
    onSuccess: () => {
      toast.success('Category deleted.');
      setDeleting(null);
      refresh();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
      setDeleting(null);
    },
  });

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      code: category.code,
      description: category.description ?? '',
    });
  };

  const err = (key: string) => errors[key]?.[0];
  const formOpen = creating || Boolean(editing);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Book classifications used for shelving, searching and inventory reports."
        action={
          can('category.manage') && (
            <Button icon="add" onClick={() => setCreating(true)}>
              Add category
            </Button>
          )
        }
      />

      <Card padded={false}>
        {isLoading ? (
          <SkeletonRows rows={5} cols={4} />
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="No categories yet"
            description="Categories classify every book in the catalog. Create your first one to get started."
            action={
              can('category.manage') && (
                <Button icon="add" onClick={() => setCreating(true)}>
                  Add category
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-md">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                  <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Code</th>
                  <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Name</th>
                  <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">
                    Description
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
                {categories.map((category) => (
                  <tr
                    key={category.category_id}
                    className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded bg-secondary-container px-2 py-0.5 font-mono text-body-sm text-on-secondary-container">
                        {category.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">{category.name}</td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {category.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      <Link
                        to={`/search?category=${category.category_id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {category.books_count ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {can('category.manage') && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            onClick={() => openEdit(category)}
                            aria-label={`Edit ${category.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => setDeleting(category)}
                            aria-label={`Delete ${category.name}`}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Create / edit modal ------------------------------------------ */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit category' : 'Add a category'}
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button icon="save" loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <Field
            label="Code"
            htmlFor="code"
            required
            error={err('code')}
            hint="A short unique classification code, e.g. CS or DB."
          >
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="CS"
              mono
              autoFocus
              invalid={Boolean(err('code'))}
            />
          </Field>

          <Field label="Name" htmlFor="name" required error={err('name')}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Computer Science"
              invalid={Boolean(err('name'))}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={err('description')}>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Computing, programming and software engineering"
            />
          </Field>
        </div>
      </Modal>

      {/* ---- Delete confirmation ------------------------------------------ */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this category?"
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
              Delete category
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface">
              Delete <span className="font-semibold">“{deleting.name}”</span>?
            </p>
            {(deleting.books_count ?? 0) > 0 && (
              <Alert tone="warning" title="This category is in use">
                <span className="font-semibold">{deleting.books_count}</span> book(s) are classified
                under it. Reassign them to another category first — the system will refuse the
                delete otherwise.
              </Alert>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
