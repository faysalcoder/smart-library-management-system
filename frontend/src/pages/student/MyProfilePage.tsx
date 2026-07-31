import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  PageHeader,
  Spinner,
  StatusBadge,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { profileApi } from '@/lib/services';
import { formatDate, formatMoney, initials } from '@/lib/format';

/**
 * Self-service account maintenance — a student's own "name, email, phone,
 * institute" record, editable at any time. Student number, ID card, and
 * membership status stay read-only here; those change at the circulation
 * desk, not from this page.
 */
export default function MyProfilePage() {
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.get,
  });

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', department: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name,
        email: student.email ?? '',
        phone: student.phone ?? '',
        department: student.department,
      });
    }
  }, [student]);

  const save = useMutation({
    mutationFn: () => profileApi.update(form),
    onSuccess: () => {
      toast.success('Profile updated.');
      setErrors({});
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
    },
  });

  const err = (key: string) => errors[key]?.[0];
  const dirty =
    student &&
    (form.full_name !== student.full_name ||
      form.email !== (student.email ?? '') ||
      form.phone !== (student.phone ?? '') ||
      form.department !== student.department);

  if (isLoading) return <Spinner label="Loading your profile…" />;

  if (!student) {
    return (
      <Alert tone="danger" title="Could not load your profile">
        Try refreshing the page.
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <PageHeader title="My Account" subtitle="Keep your contact details up to date." />

      <Card>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-headline-lg font-bold text-on-secondary-container">
            {initials(student.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-headline-md text-on-surface">{student.full_name}</p>
            <p className="font-mono text-body-md text-primary">{student.student_no}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={student.membership_status} />
            <StatusBadge status={student.borrow_status} />
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-surface-container pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
              ID card
            </dt>
            <dd className="font-mono text-body-md text-on-surface">
              {student.card_uid ?? 'Not yet registered'}
            </dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
              Member since
            </dt>
            <dd className="text-body-md text-on-surface">{formatDate(student.enrolled_on)}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
              Books on loan
            </dt>
            <dd className="text-body-md text-on-surface">{student.active_loans}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
              Outstanding fine
            </dt>
            <dd className="text-body-md text-on-surface">
              {formatMoney(student.outstanding_fine)}
            </dd>
          </div>
        </dl>

        {!student.has_card && (
          <div className="mt-4">
            <Alert tone="info" title="Activate borrowing">
              Bring your student ID card to the circulation desk — a librarian will register
              it to your account so you can borrow books.
            </Alert>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Edit your details" icon="manage_accounts" />

        {formError && (
          <div className="mb-4">
            <Alert tone="danger">{formError}</Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Full name" htmlFor="full_name" required error={err('full_name')}>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              invalid={Boolean(err('full_name'))}
            />
          </Field>

          <Field label="Email" htmlFor="email" required error={err('email')}>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              invalid={Boolean(err('email'))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" htmlFor="phone" error={err('phone')}>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                mono
              />
            </Field>

            <Field
              label="Institute / Department"
              htmlFor="department"
              required
              error={err('department')}
            >
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
                invalid={Boolean(err('department'))}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-container pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty}
              onClick={() =>
                setForm({
                  full_name: student.full_name,
                  email: student.email ?? '',
                  phone: student.phone ?? '',
                  department: student.department,
                })
              }
            >
              Discard changes
            </Button>
            <Button type="submit" icon="save" loading={save.isPending} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
