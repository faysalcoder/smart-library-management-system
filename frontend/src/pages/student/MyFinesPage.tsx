import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Spinner,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { fineApi } from '@/lib/services';
import { formatDate, formatMoney } from '@/lib/format';
import { useAuth } from '@/store/auth';

/**
 * S-06 — My Fines (student self-service).
 */
export default function MyFinesPage() {
  const settings = useAuth((s) => s.settings);

  const { data, isLoading } = useQuery({
    queryKey: ['my-fines'],
    queryFn: fineApi.myFines,
  });

  if (isLoading) return <Spinner label="Loading your fines…" />;

  const fines = data?.fines ?? [];
  const summary = data?.summary;
  const outstanding = summary?.outstanding ?? 0;
  const threshold = settings?.fine_block_threshold ?? 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Fines"
        subtitle="Overdue charges on your account, and everything you have already settled."
      />

      {outstanding > threshold && (
        <Alert tone="danger" title="Borrowing is blocked">
          Your outstanding fine of {formatMoney(outstanding)} exceeds the{' '}
          {formatMoney(threshold)} limit. Settle it at the circulation desk to borrow again.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Outstanding"
          value={formatMoney(outstanding)}
          icon="account_balance_wallet"
          tone={outstanding > 0 ? 'danger' : 'success'}
        />
        <StatTile
          label="Total paid"
          value={formatMoney(summary?.paid ?? 0)}
          icon="check_circle"
          tone="success"
        />
        <StatTile label="Fine records" value={summary?.count ?? 0} icon="receipt_long" tone="neutral" />
      </div>

      <Card padded={false}>
        {fines.length === 0 ? (
          <EmptyState
            icon="celebration"
            title="You have no fines"
            description="Keep returning your books on time and this page will stay empty."
          />
        ) : (
          <ul className="divide-y divide-surface-container">
            {fines.map((fine) => (
              <li key={fine.fine_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span
                  className={
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' +
                    (fine.status === 'paid' || fine.status === 'waived'
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-danger-container text-on-danger-container')
                  }
                >
                  <Icon name="payments" className="text-[20px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-body-lg font-medium text-on-surface">
                    {fine.book_title ?? 'Overdue fine'}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {fine.overdue_days} day(s) overdue × {formatMoney(fine.rate_per_day)} per day
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    Raised {formatDate(fine.created_at)}
                    {fine.settled_at && ` · Settled ${formatDate(fine.settled_at)}`}
                  </p>
                  {fine.waive_reason && (
                    <p className="mt-1 text-body-sm italic text-on-surface-variant">
                      Waived: {fine.waive_reason}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-headline-md font-bold text-on-surface tabular">
                    {formatMoney(fine.amount)}
                  </p>
                  {fine.balance > 0 && fine.balance !== fine.amount && (
                    <p className="text-body-sm text-on-danger-container">
                      {formatMoney(fine.balance)} remaining
                    </p>
                  )}
                  <div className="mt-1">
                    <StatusBadge status={fine.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {outstanding > 0 && (
        <Alert tone="info" title="How to pay">
          Fines are settled in person at the library circulation desk. A librarian will record
          your payment and your account will be updated immediately.
        </Alert>
      )}
    </div>
  );
}
