import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { circulationApi } from '@/lib/services';
import { dueLabel, dueTone, formatDate, formatMoney } from '@/lib/format';
import { useAuth } from '@/store/auth';
import type { Circulation } from '@/types';

/**
 * S-05 — My Loans & Borrowing History (student self-service).
 */
export default function MyLoansPage() {
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const queryClient = useQueryClient();
  const settings = useAuth((s) => s.settings);

  const { data, isLoading } = useQuery({
    queryKey: ['my-loans'],
    queryFn: circulationApi.myLoans,
  });

  const renew = useMutation({
    mutationFn: (id: number) => circulationApi.renew(id),
    onSuccess: () => {
      toast.success('Loan renewed.');
      void queryClient.invalidateQueries({ queryKey: ['my-loans'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (isLoading) return <Spinner label="Loading your loans…" />;

  const current = data?.current ?? [];
  const history = data?.history ?? [];
  const overdueCount = current.filter((loan) => loan.is_overdue).length;
  const rows = tab === 'current' ? current : history;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Loans"
        subtitle="Books you currently have, and everything you have borrowed before."
      />

      {overdueCount > 0 && (
        <Alert tone="danger" title={`You have ${overdueCount} overdue book(s)`}>
          A fine of {formatMoney(settings?.fine_rate_per_day ?? 5)} accrues for each day past the
          due date. Please return them as soon as possible.
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex gap-1 border-b border-outline-variant px-4 pt-3">
          {(
            [
              ['current', 'Currently on loan', current.length],
              ['history', 'Borrowing history', history.length],
            ] as const
          ).map(([key, label, count]) => (
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
              {label}
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                {count}
              </span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={tab === 'current' ? 'menu_book' : 'history'}
            title={tab === 'current' ? 'You have no books on loan' : 'No borrowing history yet'}
            description={
              tab === 'current'
                ? 'Books you borrow will appear here with their due dates.'
                : 'Books you return will be listed here.'
            }
            action={
              tab === 'current' && (
                <Button icon="search" onClick={() => (window.location.href = '/search')}>
                  Search the catalog
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-surface-container">
            {rows.map((loan) => (
              <LoanRow
                key={loan.circulation_id}
                loan={loan}
                showRenew={tab === 'current'}
                maxRenewals={settings?.max_renewals ?? 1}
                onRenew={() => renew.mutate(loan.circulation_id)}
                renewing={renew.isPending && renew.variables === loan.circulation_id}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function LoanRow({
  loan,
  showRenew,
  maxRenewals,
  onRenew,
  renewing,
}: {
  loan: Circulation;
  showRenew: boolean;
  maxRenewals: number;
  onRenew: () => void;
  renewing: boolean;
}) {
  const canRenew = showRenew && !loan.is_overdue && loan.renewal_count < maxRenewals;

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
        <Icon name="book_2" className="text-[22px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-body-lg font-medium text-on-surface">{loan.copy?.title}</p>
        <p className="text-body-sm text-on-surface-variant">
          {loan.copy?.author} · <span className="font-mono">{loan.copy?.accession_no}</span>
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Issued {formatDate(loan.issue_date)}
          {loan.return_date && ` · Returned ${formatDate(loan.return_date)}`}
          {loan.renewal_count > 0 && ` · Renewed ${loan.renewal_count}×`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          {showRenew ? (
            <>
              <StatusBadge
                status={loan.is_overdue ? 'overdue' : 'issued'}
                tone={dueTone(loan.due_date, loan.overdue_days)}
                label={dueLabel(loan.due_date, loan.overdue_days)}
                icon={loan.is_overdue ? 'warning' : 'schedule'}
              />
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Due {formatDate(loan.due_date)}
              </p>
            </>
          ) : (
            <>
              <StatusBadge status={loan.status} />
              {loan.fine && loan.fine.amount > 0 && (
                <p className="mt-1 text-body-sm text-on-danger-container">
                  Fine {formatMoney(loan.fine.amount)}
                </p>
              )}
            </>
          )}
        </div>

        {canRenew && (
          <Button variant="secondary" size="sm" icon="autorenew" loading={renewing} onClick={onRenew}>
            Renew
          </Button>
        )}
      </div>
    </li>
  );
}
