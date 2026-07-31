import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Spinner,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { dashboardApi } from '@/lib/services';
import { dueLabel, dueTone, formatDate, formatDateTime, formatMoney, humanise } from '@/lib/format';
import { useAuth } from '@/store/auth';
import type { Dashboard, StaffDashboard, StudentDashboard } from '@/types';

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, error } = useQuery<Dashboard>({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  });

  if (isLoading) return <Spinner label="Loading your dashboard…" />;

  if (error || !data) {
    return (
      <EmptyState
        icon="cloud_off"
        title="Could not load the dashboard"
        description="The library server did not respond. Check that the API is running and refresh the page."
      />
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.full_name?.split(' ')[0] ?? '';

  return data.type === 'student' ? (
    <StudentDashboardView data={data} greeting={greeting} name={firstName} />
  ) : (
    <StaffDashboardView data={data} greeting={greeting} name={firstName} />
  );
}

// ---------------------------------------------------------------------------
// S-07 — Librarian / Admin dashboard
// ---------------------------------------------------------------------------

function StaffDashboardView({
  data,
  greeting,
  name,
}: {
  data: StaffDashboard;
  greeting: string;
  name: string;
}) {
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-xl text-on-surface">
          {greeting}, {name}
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {formatDate(new Date().toISOString().slice(0, 10))} · Here is what needs your
          attention today.
        </p>
      </header>

      {data.alert && (
        <Alert tone="warning" title="Attention needed">
          <div className="flex flex-wrap items-center gap-3">
            <span>{data.alert}</span>
            <Link
              to="/circulation/overdue"
              className="font-semibold underline underline-offset-2"
            >
              Review overdue loans
            </Link>
          </div>
        </Alert>
      )}

      {/* The two oversized action tiles — the librarian's real work. */}
      {can('circulate') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/circulation/issue')}
            className="group flex items-center gap-4 rounded-xl bg-primary-container p-6 text-left text-on-primary transition-all hover:opacity-95 active:scale-[0.99]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon name="arrow_circle_right" className="text-[32px]" filled />
            </span>
            <span className="min-w-0">
              <span className="block text-headline-lg font-bold">Issue Book</span>
              <span className="block text-body-md text-white/80">
                Scan a student card, then a book
              </span>
            </span>
            <kbd className="ml-auto hidden rounded border border-white/30 px-2 py-1 font-mono text-[11px] text-white/80 sm:block">
              Alt+I
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => navigate('/circulation/return')}
            className="group flex items-center gap-4 rounded-xl bg-success p-6 text-left text-white transition-all hover:opacity-95 active:scale-[0.99]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon name="arrow_circle_left" className="text-[32px]" filled />
            </span>
            <span className="min-w-0">
              <span className="block text-headline-lg font-bold">Return Book</span>
              <span className="block text-body-md text-white/80">
                Scan the returned book barcode
              </span>
            </span>
            <kbd className="ml-auto hidden rounded border border-white/30 px-2 py-1 font-mono text-[11px] text-white/80 sm:block">
              Alt+R
            </kbd>
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Issued today"
          value={data.stats.issued_today}
          icon="arrow_circle_right"
          tone="info"
        />
        <StatTile
          label="Returned today"
          value={data.stats.returned_today}
          icon="arrow_circle_left"
          tone="success"
        />
        <StatTile
          label="Currently overdue"
          value={data.stats.overdue}
          icon="warning"
          tone={data.stats.overdue > 0 ? 'danger' : 'neutral'}
          onClick={() => navigate('/circulation/overdue')}
        />
        <StatTile
          label="Pending fines"
          value={formatMoney(data.stats.pending_fines)}
          icon="payments"
          tone={data.stats.pending_fines > 0 ? 'warning' : 'neutral'}
          onClick={can('fine.view') ? () => navigate('/fines') : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" padded={false}>
          <div className="p-6">
            <CardHeader title="Recent activity" icon="history" />
            {data.recent_activity.length === 0 ? (
              <EmptyState
                icon="history"
                title="No activity yet"
                description="Issues, returns and fine payments will appear here as they happen."
              />
            ) : (
              <ul className="divide-y divide-surface-container">
                {data.recent_activity.map((item) => (
                  <li key={item.log_id} className="flex items-start gap-3 py-3">
                    <span
                      className={clsx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        item.action === 'BOOK_ISSUED'
                          ? 'bg-info-container text-on-info-container'
                          : item.action === 'BOOK_RETURNED'
                            ? 'bg-success-container text-on-success-container'
                            : 'bg-neutral-container text-on-neutral-container',
                      )}
                    >
                      <Icon
                        name={
                          item.action === 'BOOK_ISSUED'
                            ? 'arrow_circle_right'
                            : item.action === 'BOOK_RETURNED'
                              ? 'arrow_circle_left'
                              : 'payments'
                        }
                        className="text-[18px]"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md text-on-surface">{humanise(item.action)}</p>
                      <p className="truncate text-body-sm text-on-surface-variant">
                        {item.detail}
                      </p>
                    </div>
                    <p className="shrink-0 text-body-sm text-on-surface-variant">
                      {formatDateTime(item.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Due back today" icon="today" />
            {data.due_today.length === 0 ? (
              <p className="py-6 text-center text-body-md text-on-surface-variant">
                Nothing is due back today.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.due_today.map((item) => (
                  <li key={item.circulation_id} className="min-w-0">
                    <p className="truncate text-body-md text-on-surface">{item.title}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-mono">{item.student_no}</span> · {item.student_name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Most overdue" icon="priority_high" />
            {data.most_overdue.length === 0 ? (
              <p className="py-6 text-center text-body-md text-on-surface-variant">
                No overdue loans. Well done.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.most_overdue.map((item) => (
                  <li key={item.circulation_id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-on-surface">{item.title}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        <span className="font-mono">{item.student_no}</span> · {item.student_name}
                      </p>
                    </div>
                    <StatusBadge
                      status="overdue"
                      tone="danger"
                      label={`${item.overdue_days}d`}
                      icon="warning"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S-02 — Student dashboard
// ---------------------------------------------------------------------------

function StudentDashboardView({
  data,
  greeting,
  name,
}: {
  data: StudentDashboard;
  greeting: string;
  name: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-xl text-on-surface">
          {greeting}, {name}
        </h1>
        {data.profile && (
          <p className="mt-1 text-body-md text-on-surface-variant">
            <span className="font-mono">{data.profile.student_no}</span> ·{' '}
            {data.profile.department}
            {data.profile.batch && ` · Batch ${data.profile.batch}`}
          </p>
        )}
      </header>

      <Card className="bg-primary-container/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-headline-md text-on-surface">Looking for a book?</p>
            <p className="text-body-md text-on-surface-variant">
              Search the catalog by title, author, ISBN or category.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 rounded-lg bg-primary-container px-5 py-3 text-body-md font-semibold text-on-primary hover:opacity-90"
          >
            <Icon name="search" className="text-[20px]" />
            Search the catalog
          </button>
        </div>
      </Card>

      {(data.stats.overdue ?? 0) > 0 && (
        <Alert tone="danger" title="You have overdue books">
          Return them as soon as possible — a fine accrues for every day past the due date.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Books on loan" value={data.stats.on_loan} icon="menu_book" tone="info" />
        <StatTile
          label="Due soon"
          value={data.stats.due_soon}
          icon="schedule"
          tone={data.stats.due_soon > 0 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Outstanding fine"
          value={formatMoney(data.stats.outstanding_fine)}
          icon="payments"
          tone={data.stats.outstanding_fine > 0 ? 'danger' : 'success'}
          onClick={() => navigate('/my/fines')}
        />
      </div>

      <Card>
        <CardHeader
          title="My current loans"
          icon="menu_book"
          action={
            <Link to="/my/loans" className="text-label-md text-primary-container hover:underline">
              View all
            </Link>
          }
        />

        {data.current_loans.length === 0 ? (
          <EmptyState
            icon="menu_book"
            title="You have no books on loan"
            description="Books you borrow will appear here with their due dates."
          />
        ) : (
          <ul className="divide-y divide-surface-container">
            {data.current_loans.map((loan) => (
              <li key={loan.circulation_id} className="flex items-center gap-4 py-4">
                <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-surface-container text-on-surface-variant">
                  <Icon name="book_2" className="text-[20px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-lg font-medium text-on-surface">{loan.title}</p>
                  <p className="truncate text-body-sm text-on-surface-variant">
                    {loan.author} · <span className="font-mono">{loan.accession_no}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge
                    status={loan.is_overdue ? 'overdue' : 'issued'}
                    tone={dueTone(loan.due_date, loan.overdue_days)}
                    label={dueLabel(loan.due_date, loan.overdue_days)}
                    icon={loan.is_overdue ? 'warning' : 'schedule'}
                  />
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Due {formatDate(loan.due_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.recently_returned.length > 0 && (
        <Card>
          <CardHeader title="Recently returned" icon="history" />
          <ul className="divide-y divide-surface-container">
            {data.recently_returned.map((item) => (
              <li key={item.circulation_id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-md text-on-surface">{item.title}</p>
                  <p className="truncate text-body-sm text-on-surface-variant">{item.author}</p>
                </div>
                <p className="shrink-0 text-body-sm text-on-surface-variant">
                  Returned {formatDate(item.return_date)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
