import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Alert,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  PageHeader,
  Pagination,
  Select,
  SkeletonRows,
} from '@/components/ui';
import { adminApi } from '@/lib/services';
import { formatDateTime, humanise } from '@/lib/format';

/** Colour band per action family, so the log scans quickly. */
function toneFor(action: string): string {
  if (action.includes('FAILED') || action.includes('LOCKED') || action.includes('DELETED')) {
    return 'bg-danger-container text-on-danger-container';
  }
  if (action.includes('ISSUED') || action.includes('CREATED')) {
    return 'bg-info-container text-on-info-container';
  }
  if (action.includes('RETURNED') || action.includes('COLLECTED') || action.includes('SUCCESS')) {
    return 'bg-success-container text-on-success-container';
  }
  if (action.includes('WAIVED') || action.includes('UPDATED') || action.includes('SETTING')) {
    return 'bg-warning-container text-on-warning-container';
  }
  return 'bg-neutral-container text-on-neutral-container';
}

/**
 * S-20 — Audit Log Viewer.
 *
 * Read-only by design: the underlying table is append-only, which is what
 * makes the trail trustworthy (Security Feasibility §2.10).
 */
export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [term, setTerm] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: actions } = useQuery({
    queryKey: ['log-actions'],
    queryFn: adminApi.logActions,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, action, term, from, to],
    queryFn: () =>
      adminApi.logs({
        page,
        per_page: 50,
        action: action || undefined,
        q: term || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const resetFilters = () => {
    setAction('');
    setTerm('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Every significant action in the system, with who performed it and when."
      />

      <Alert tone="info" title="This log is append-only">
        Entries can never be edited or deleted — not even by an administrator. That is what makes
        the trail usable as evidence.
      </Alert>

      <Card padded={false}>
        <div className="grid gap-3 border-b border-outline-variant p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Field label="Search" htmlFor="q">
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                />
                <Input
                  id="q"
                  value={term}
                  onChange={(e) => {
                    setTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search details or actor…"
                  className="pl-10"
                />
              </div>
            </Field>
          </div>

          <Field label="Action" htmlFor="action">
            <Select
              id="action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              {actions?.map((item) => (
                <option key={item} value={item}>
                  {humanise(item)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From" htmlFor="from">
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>

          <Field label="To" htmlFor="to">
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>

        {(action || term || from || to) && (
          <div className="border-b border-outline-variant px-4 py-2">
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-label-md text-primary-container hover:underline"
            >
              <Icon name="filter_alt_off" className="text-[16px]" />
              Clear all filters
            </button>
          </div>
        )}

        {isLoading ? (
          <SkeletonRows rows={10} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="No log entries match these filters"
            description="Adjust the date range, action or search term."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <th className="whitespace-nowrap px-3 py-2.5 text-label-md uppercase text-on-surface-variant">
                      When
                    </th>
                    <th className="px-3 py-2.5 text-label-md uppercase text-on-surface-variant">Action</th>
                    <th className="px-3 py-2.5 text-label-md uppercase text-on-surface-variant">Actor</th>
                    <th className="px-3 py-2.5 text-label-md uppercase text-on-surface-variant">Detail</th>
                    <th className="px-3 py-2.5 text-label-md uppercase text-on-surface-variant">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr
                      key={entry.log_id}
                      className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-on-surface-variant">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                            toneFor(entry.action),
                          )}
                        >
                          {humanise(entry.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-on-surface">
                        {entry.actor}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant">{entry.detail ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-on-surface-variant">
                        {entry.ip_address ?? '—'}
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
    </div>
  );
}
