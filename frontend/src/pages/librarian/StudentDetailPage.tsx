import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Select,
  Spinner,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { studentApi } from '@/lib/services';
import { dueLabel, dueTone, formatDate, formatMoney, initials } from '@/lib/format';
import { useAuth } from '@/store/auth';

/**
 * S-13 (detail) — Student profile with loans and fines.
 */
export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const can = useAuth((s) => s.can);

  const [bindingCard, setBindingCard] = useState(false);
  const [cardUid, setCardUid] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentApi.get(id!),
    enabled: Boolean(id),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['student', id] });

  const bindCard = useMutation({
    mutationFn: () => studentApi.bindCard(Number(id), cardUid.trim()),
    onSuccess: () => {
      toast.success('ID card registered to this student.');
      setBindingCard(false);
      setCardUid('');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const setMembership = useMutation({
    mutationFn: (status: string) => studentApi.setMembership(Number(id), status),
    onSuccess: () => {
      toast.success('Membership status updated.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (isLoading) return <Spinner label="Loading student…" />;

  if (!data) {
    return (
      <EmptyState
        icon="person_off"
        title="Student not found"
        description="This member record does not exist."
        action={
          <Button icon="arrow_back" onClick={() => navigate('/students')}>
            Back to students
          </Button>
        }
      />
    );
  }

  const { student, loans, fines, summary } = data;
  const openLoans = loans.filter((loan) => loan.status === 'issued' || loan.status === 'overdue');

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.full_name}
        back={{ label: 'Back to students', onClick: () => navigate('/students') }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-primary">{student.student_no}</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span>{student.department}</span>
            {student.batch && (
              <>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span>Batch {student.batch}</span>
              </>
            )}
          </span>
        }
        action={
          can('student.manage') && (
            <div className="flex gap-2">
              <Button variant="secondary" icon="badge" onClick={() => setBindingCard(true)}>
                {student.has_card ? 'Re-register card' : 'Register ID card'}
              </Button>
              <Select
                value={student.membership_status}
                onChange={(e) => setMembership.mutate(e.target.value)}
                className="w-auto"
                aria-label="Membership status"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </Select>
            </div>
          )
        }
      />

      {student.borrow_status === 'blocked' && (
        <Alert tone="danger" title="This student cannot borrow">
          Outstanding fines of {formatMoney(student.outstanding_fine)} exceed the borrowing limit.
          Collect payment to restore borrowing privileges.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Profile ---------------------------------------------------- */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary-container text-headline-lg font-bold text-on-secondary-container">
              {initials(student.full_name)}
            </span>
            <p className="text-headline-md text-on-surface">{student.full_name}</p>
            <p className="font-mono text-body-md text-primary">{student.student_no}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <StatusBadge status={student.membership_status} />
              <StatusBadge status={student.borrow_status} />
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-surface-container pt-4 text-body-md">
            <Row label="Department" value={student.department} />
            <Row label="Batch" value={student.batch ?? '—'} />
            <Row label="Email" value={student.email ?? '—'} />
            <Row label="Phone" value={student.phone ?? '—'} mono />
            <Row label="ID card" value={student.card_uid ?? 'Not registered'} mono />
            <Row label="Member since" value={formatDate(student.enrolled_on)} />
          </dl>
        </Card>

        {/* ---- Activity --------------------------------------------------- */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="On loan now" value={openLoans.length} icon="menu_book" tone="info" />
            <StatTile label="Total borrowed" value={summary.total_loans} icon="history" tone="neutral" />
            <StatTile
              label="Outstanding fine"
              value={formatMoney(summary.outstanding_fine)}
              icon="payments"
              tone={summary.outstanding_fine > 0 ? 'danger' : 'success'}
            />
          </div>

          <Card padded={false}>
            <div className="p-6 pb-0">
              <CardHeader title="Borrowing history" icon="menu_book" />
            </div>

            {loans.length === 0 ? (
              <EmptyState
                icon="menu_book"
                title="No borrowing history"
                description="This student has not borrowed any books yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                      <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Book</th>
                      <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Issued</th>
                      <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Due</th>
                      <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Returned</th>
                      <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr
                        key={loan.circulation_id}
                        className={clsx(
                          'border-b border-surface-container last:border-0',
                          loan.is_overdue && 'bg-danger-container/25',
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="block text-on-surface">{loan.copy?.title}</span>
                          <span className="block font-mono text-[11px] text-on-surface-variant">
                            {loan.copy?.accession_no}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                          {formatDate(loan.issue_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                          {formatDate(loan.due_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                          {loan.return_date ? formatDate(loan.return_date) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {loan.status === 'returned' ? (
                            <StatusBadge status="returned" />
                          ) : (
                            <StatusBadge
                              status={loan.is_overdue ? 'overdue' : 'issued'}
                              tone={dueTone(loan.due_date, loan.overdue_days)}
                              label={dueLabel(loan.due_date, loan.overdue_days)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {fines.length > 0 && (
            <Card padded={false}>
              <div className="p-6 pb-0">
                <CardHeader title="Fines" icon="payments" />
              </div>
              <ul className="divide-y divide-surface-container">
                {fines.map((fine) => (
                  <li key={fine.fine_id} className="flex items-center justify-between gap-4 px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-on-surface">
                        {fine.book_title ?? 'Overdue fine'}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {fine.overdue_days} day(s) × {formatMoney(fine.rate_per_day)} ·{' '}
                        {formatDate(fine.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-on-surface tabular">
                        {formatMoney(fine.amount)}
                      </p>
                      <StatusBadge status={fine.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* ---- Bind card modal --------------------------------------------- */}
      <Modal
        open={bindingCard}
        onClose={() => setBindingCard(false)}
        title="Register ID card"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBindingCard(false)}>
              Cancel
            </Button>
            <Button
              icon="badge"
              loading={bindCard.isPending}
              disabled={!cardUid.trim()}
              onClick={() => bindCard.mutate()}
            >
              Register card
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Scan the student's physical ID card now, or type the card UID manually. This card will
            then identify {student.full_name} at the circulation desk.
          </p>

          <Field label="Card UID" htmlFor="card_uid" required>
            <Input
              id="card_uid"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              placeholder="Waiting for scan…"
              mono
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && cardUid.trim()) {
                  e.preventDefault();
                  bindCard.mutate();
                }
              }}
            />
          </Field>

          {student.has_card && (
            <Alert tone="warning" title="This student already has a card">
              Registering a new card replaces{' '}
              <span className="font-mono">{student.card_uid}</span>. The old card will stop working
              immediately.
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={clsx('text-right text-on-surface', mono && 'font-mono text-body-sm')}>
        {value}
      </dd>
    </div>
  );
}
