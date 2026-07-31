import { useState, type FormEvent } from 'react';
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
  Select,
  SkeletonRows,
  StatusBadge,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { studentApi } from '@/lib/services';
import { formatMoney, formatNumber } from '@/lib/format';
import { useAuth } from '@/store/auth';

const EMPTY_FORM = {
  student_no: '',
  full_name: '',
  department: '',
  batch: '',
  email: '',
  phone: '',
  card_uid: '',
};

/**
 * S-13 — Student List (FR-07).
 */
export default function StudentsPage() {
  const queryClient = useQueryClient();
  const can = useAuth((s) => s.can);

  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: studentApi.departments,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, term, department, status],
    queryFn: () =>
      studentApi.list({
        page,
        per_page: 25,
        q: term || undefined,
        department: department || undefined,
        membership_status: status || undefined,
      }),
  });

  const create = useMutation({
    mutationFn: () =>
      studentApi.create({
        ...form,
        batch: form.batch || null,
        email: form.email || null,
        phone: form.phone || null,
        card_uid: form.card_uid || null,
      }),
    onSuccess: () => {
      toast.success('Student registered.');
      setCreating(false);
      setForm(EMPTY_FORM);
      setErrors({});
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    create.mutate();
  };

  const err = (key: string) => errors[key]?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${formatNumber(meta?.total ?? 0)} registered member(s)`}
        action={
          can('student.manage') && (
            <Button icon="person_add" onClick={() => setCreating(true)}>
              Register student
            </Button>
          )
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
              placeholder="Search by name, student ID or department…"
              className="pl-10"
            />
          </div>

          <Select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {departments?.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            aria-label="Filter by membership status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="group"
            title="No students found"
            description="Register your first member, or adjust the search and filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Student</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Department</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Contact</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">ID card</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">On loan</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Fine due</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <tr
                      key={student.student_id}
                      className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3">
                        <Link to={`/students/${student.student_id}`} className="block hover:underline">
                          <span className="block font-mono text-body-sm text-primary">
                            {student.student_no}
                          </span>
                          <span className="block font-medium text-on-surface">
                            {student.full_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {student.department}
                        {student.batch && (
                          <span className="block text-body-sm">Batch {student.batch}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                        {student.phone && <span className="block font-mono">{student.phone}</span>}
                        {student.email && <span className="block truncate">{student.email}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {student.has_card ? (
                          <span className="flex items-center gap-1 font-mono text-body-sm text-success">
                            <Icon name="badge" className="text-[16px]" />
                            {student.card_uid}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-body-sm text-on-warning-container">
                            <Icon name="warning" className="text-[16px]" />
                            Not registered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular text-on-surface">
                        {student.active_loans}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span
                          className={
                            student.outstanding_fine > 0
                              ? 'font-semibold text-danger'
                              : 'text-on-surface-variant'
                          }
                        >
                          {formatMoney(student.outstanding_fine)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={student.membership_status} />
                          {student.borrow_status === 'blocked' && (
                            <StatusBadge status="blocked" />
                          )}
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

      {/* ---- Register student modal -------------------------------------- */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Register a new student"
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              icon="person_add"
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Register student
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student number" htmlFor="student_no" required error={err('student_no')}>
              <Input
                id="student_no"
                value={form.student_no}
                onChange={(e) => setForm({ ...form, student_no: e.target.value })}
                placeholder="4018"
                mono
                required
                autoFocus
                invalid={Boolean(err('student_no'))}
              />
            </Field>

            <Field label="ID card UID" htmlFor="card_uid" error={err('card_uid')} hint="Scan the card, or leave blank to register later.">
              <Input
                id="card_uid"
                value={form.card_uid}
                onChange={(e) => setForm({ ...form, card_uid: e.target.value })}
                placeholder="WUB-4018"
                mono
                invalid={Boolean(err('card_uid'))}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Full name" htmlFor="full_name" required error={err('full_name')}>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Sowmika Islam Suchi"
                  required
                  invalid={Boolean(err('full_name'))}
                />
              </Field>
            </div>

            <Field label="Department" htmlFor="department" required error={err('department')}>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Computer Science & Engineering"
                required
                list="department-options"
                invalid={Boolean(err('department'))}
              />
              <datalist id="department-options">
                {departments?.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </Field>

            <Field label="Batch" htmlFor="batch" error={err('batch')}>
              <Input
                id="batch"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                placeholder="66A"
              />
            </Field>

            <Field label="Email" htmlFor="email" error={err('email')}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@wub.edu.bd"
                invalid={Boolean(err('email'))}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={err('phone')}>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01711-000000"
                mono
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
