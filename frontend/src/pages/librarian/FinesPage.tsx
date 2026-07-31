import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
  StatTile,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { fineApi } from '@/lib/services';
import { formatDate, formatMoney } from '@/lib/format';
import { useAuth } from '@/store/auth';
import type { Fine } from '@/types';

/**
 * S-15 — Fine Collection (FR-05).
 */
export default function FinesPage() {
  const queryClient = useQueryClient();
  const can = useAuth((s) => s.can);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [collecting, setCollecting] = useState<Fine | null>(null);
  const [waiving, setWaiving] = useState<Fine | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fines', page, status, term],
    queryFn: () =>
      fineApi.list({ page, per_page: 25, status: status || undefined, q: term || undefined }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['fines'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const collect = useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) => fineApi.collect(id, value),
    onSuccess: () => {
      toast.success('Payment recorded.');
      setCollecting(null);
      setAmount('');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const waive = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => fineApi.waive(id, text),
    onSuccess: () => {
      toast.success('Fine waived.');
      setWaiving(null);
      setReason('');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const summary = meta?.summary;

  const openCollect = (fine: Fine) => {
    setCollecting(fine);
    setAmount(fine.balance.toFixed(2));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Fines" subtitle="Collect payments, review balances and waive charges." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Outstanding total"
          value={formatMoney(summary?.outstanding_total ?? 0)}
          icon="account_balance_wallet"
          tone={(summary?.outstanding_total ?? 0) > 0 ? 'danger' : 'success'}
        />
        <StatTile
          label="Unsettled fines"
          value={summary?.outstanding_count ?? 0}
          icon="pending_actions"
          tone="warning"
        />
        <StatTile
          label="Collected all-time"
          value={formatMoney(summary?.collected_total ?? 0)}
          icon="savings"
          tone="success"
        />
      </div>

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
              placeholder="Search by student name or ID…"
              className="pl-10"
            />
          </div>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="celebration"
            title="No fines to show"
            description="Fines appear here automatically when a book is returned after its due date."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Student</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Book</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Raised</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Amount</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Balance</th>
                    <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">Status</th>
                    <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((fine) => (
                    <tr
                      key={fine.fine_id}
                      className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3">
                        <span className="block font-mono text-body-sm text-primary">
                          {fine.student?.student_no}
                        </span>
                        <span className="block text-on-surface">{fine.student?.full_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-on-surface">{fine.book_title ?? '—'}</span>
                        <span className="block text-body-sm text-on-surface-variant">
                          {fine.overdue_days} day(s) × {formatMoney(fine.rate_per_day)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                        {formatDate(fine.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-on-surface tabular">
                        {formatMoney(fine.amount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span
                          className={
                            fine.balance > 0 ? 'font-semibold text-danger' : 'text-on-surface-variant'
                          }
                        >
                          {formatMoney(fine.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={fine.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {fine.balance > 0 && can('fine.collect') && (
                            <Button size="sm" icon="payments" onClick={() => openCollect(fine)}>
                              Collect
                            </Button>
                          )}
                          {fine.balance > 0 && can('fine.waive') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="do_not_disturb_on"
                              onClick={() => setWaiving(fine)}
                            >
                              Waive
                            </Button>
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

      {/* ---- Collect payment modal --------------------------------------- */}
      <Modal
        open={Boolean(collecting)}
        onClose={() => setCollecting(null)}
        title="Collect fine payment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCollecting(null)}>
              Cancel
            </Button>
            <Button
              icon="check"
              loading={collect.isPending}
              onClick={() =>
                collecting &&
                collect.mutate({ id: collecting.fine_id, value: Number.parseFloat(amount) })
              }
            >
              Record payment
            </Button>
          </>
        }
      >
        {collecting && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-body-md text-on-surface">
                <span className="font-mono text-primary">{collecting.student?.student_no}</span> ·{' '}
                {collecting.student?.full_name}
              </p>
              <p className="text-body-sm text-on-surface-variant">{collecting.book_title}</p>
              <p className="mt-2 text-headline-md font-bold text-on-surface">
                Balance due: {formatMoney(collecting.balance)}
              </p>
            </div>

            <Field
              label="Amount received"
              htmlFor="amount"
              required
              hint={`Partial payments are allowed. Maximum ${formatMoney(collecting.balance)}.`}
            >
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={collecting.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                mono
                autoFocus
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ---- Waive modal -------------------------------------------------- */}
      <Modal
        open={Boolean(waiving)}
        onClose={() => setWaiving(null)}
        title="Waive this fine"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWaiving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="do_not_disturb_on"
              loading={waive.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => waiving && waive.mutate({ id: waiving.fine_id, text: reason })}
            >
              Waive fine
            </Button>
          </>
        }
      >
        {waiving && (
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              Waiving cancels the outstanding balance of{' '}
              <span className="font-semibold">{formatMoney(waiving.balance)}</span> for{' '}
              {waiving.student?.full_name}. This is recorded in the audit log and cannot be undone.
            </p>

            <Field label="Reason for waiving" htmlFor="reason" required>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Book was returned during the library closure period."
                autoFocus
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
