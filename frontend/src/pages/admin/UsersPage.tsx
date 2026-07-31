import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
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
import { adminApi } from '@/lib/services';
import { formatDateTime, humanise, initials } from '@/lib/format';
import type { User } from '@/types';

const EMPTY = {
  username: '',
  email: '',
  full_name: '',
  password: '',
  password_confirmation: '',
  role_id: '',
};

/**
 * S-17 + S-18 — User account management and the role/permission matrix.
 */
export default function UsersPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ user: User; password: string } | null>(null);

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: adminApi.roles });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, term],
    queryFn: () => adminApi.users({ page, per_page: 25, q: term || undefined }),
    enabled: tab === 'users',
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['users'] });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        ...form,
        role_id: Number(form.role_id),
        must_change_password: true,
      }),
    onSuccess: () => {
      toast.success('Account created.');
      setCreating(false);
      setForm(EMPTY);
      setErrors({});
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.setUserStatus(id, status),
    onSuccess: () => {
      toast.success('Account status updated.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const resetPassword = useMutation({
    mutationFn: (user: User) =>
      adminApi.resetPassword(user.user_id).then((result) => ({ user, result })),
    onSuccess: ({ user, result }) => {
      setResetResult({ user, password: result.temporary_password });
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const err = (key: string) => errors[key]?.[0];

  // Collect every permission code for the matrix header.
  const allPermissions = Array.from(
    new Set((roles ?? []).flatMap((role) => role.permissions)),
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage staff and student accounts, and review what each role can do."
        action={
          tab === 'users' && (
            <Button icon="person_add" onClick={() => setCreating(true)}>
              Create account
            </Button>
          )
        }
      />

      <Card padded={false}>
        <div className="flex gap-1 border-b border-outline-variant px-4 pt-3">
          {(
            [
              ['users', 'User accounts', 'group'],
              ['roles', 'Role & permission matrix', 'shield_person'],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                'flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-body-md transition-colors',
                tab === key
                  ? 'border-b-2 border-primary-container font-semibold text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              <Icon name={icon} className="text-[18px]" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <>
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
                  placeholder="Search by name, username or email…"
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <SkeletonRows rows={6} cols={5} />
            ) : rows.length === 0 ? (
              <EmptyState icon="group" title="No accounts found" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-body-md">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                        <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">User</th>
                        <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Role</th>
                        <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Last sign-in</th>
                        <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Status</th>
                        <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((user) => (
                        <tr
                          key={user.user_id}
                          className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-md font-bold text-on-secondary-container">
                                {initials(user.full_name)}
                              </span>
                              <div className="min-w-0">
                                <span className="block font-medium text-on-surface">
                                  {user.full_name}
                                </span>
                                <span className="block font-mono text-body-sm text-on-surface-variant">
                                  {user.username} · {user.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-surface-container px-3 py-1 text-label-md capitalize text-on-surface-variant">
                              {user.role?.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                            {user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="lock_reset"
                                loading={
                                  resetPassword.isPending &&
                                  resetPassword.variables?.user_id === user.user_id
                                }
                                onClick={() => resetPassword.mutate(user)}
                                aria-label={`Reset password for ${user.full_name}`}
                              />
                              <Select
                                value={user.status}
                                onChange={(e) =>
                                  setStatus.mutate({ id: user.user_id, status: e.target.value })
                                }
                                className="w-auto"
                                aria-label={`Status for ${user.full_name}`}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="locked">Locked</option>
                              </Select>
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
          </>
        ) : (
          /* ---- S-18: role & permission matrix -------------------------- */
          <div className="overflow-x-auto p-4">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th className="sticky left-0 bg-surface-container-lowest px-3 py-2.5 text-label-md uppercase text-on-surface-variant">
                    Permission
                  </th>
                  {roles?.map((role) => (
                    <th
                      key={role.role_id}
                      className="px-3 py-2.5 text-center text-label-md uppercase text-on-surface-variant"
                    >
                      <span className="block capitalize text-on-surface">{role.name}</span>
                      <span className="block text-[10px] font-normal">
                        {role.users_count} user(s)
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPermissions.map((permission) => (
                  <tr key={permission} className="border-b border-surface-container last:border-0">
                    <td className="sticky left-0 bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface">
                      {permission}
                    </td>
                    {roles?.map((role) => {
                      const granted = role.permissions.includes(permission);

                      return (
                        <td key={role.role_id} className="px-3 py-2 text-center">
                          <Icon
                            name={granted ? 'check_circle' : 'remove'}
                            className={clsx(
                              'text-[18px]',
                              granted ? 'text-success' : 'text-outline-variant',
                            )}
                            filled={granted}
                          />
                          <span className="sr-only">
                            {granted ? 'Granted' : 'Not granted'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 flex items-start gap-2 text-body-sm text-on-surface-variant">
              <Icon name="info" className="mt-0.5 text-[16px]" />
              Role permissions are seeded from the RBAC matrix in the architecture document and
              are enforced on every API route, not just in the interface.
            </p>
          </div>
        )}
      </Card>

      {/* ---- Create account modal ---------------------------------------- */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a user account"
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button icon="person_add" loading={create.isPending} onClick={() => create.mutate()}>
              Create account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full_name" required error={err('full_name')}>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                autoFocus
                invalid={Boolean(err('full_name'))}
              />
            </Field>

            <Field label="Role" htmlFor="role_id" required error={err('role_id')}>
              <Select
                id="role_id"
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                invalid={Boolean(err('role_id'))}
              >
                <option value="">Select a role…</option>
                {roles?.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {humanise(role.name)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Username" htmlFor="username" required error={err('username')}>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                mono
                invalid={Boolean(err('username'))}
              />
            </Field>

            <Field label="Email" htmlFor="email" required error={err('email')}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                invalid={Boolean(err('email'))}
              />
            </Field>

            <Field
              label="Temporary password"
              htmlFor="password"
              required
              error={err('password')}
              hint="At least 8 characters with letters and numbers."
            >
              <Input
                id="password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                mono
                invalid={Boolean(err('password'))}
              />
            </Field>

            <Field label="Confirm password" htmlFor="password_confirmation" required>
              <Input
                id="password_confirmation"
                type="text"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                mono
              />
            </Field>
          </div>

          <Alert tone="info">
            The user will be required to change this password the first time they sign in.
          </Alert>
        </div>
      </Modal>

      {/* ---- Reset password result --------------------------------------- */}
      <Modal
        open={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Temporary password generated"
        footer={
          <Button onClick={() => setResetResult(null)}>Done</Button>
        }
      >
        {resetResult && (
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              A temporary password has been generated for{' '}
              <span className="font-semibold">{resetResult.user.full_name}</span>. All their active
              sessions have been signed out.
            </p>

            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-center">
              <p className="text-label-md uppercase tracking-wide text-on-surface-variant">
                Temporary password
              </p>
              <p className="mt-1 select-all font-mono text-headline-md text-primary">
                {resetResult.password}
              </p>
            </div>

            <Alert tone="warning" title="Share this securely">
              This password is shown once and cannot be retrieved later. The user must change it at
              their next sign-in.
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}
