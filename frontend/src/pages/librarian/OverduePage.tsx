import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Pagination,
  Select,
  SkeletonRows,
  StatTile,
} from '@/components/ui';
import { circulationApi, studentApi } from '@/lib/services';
import { formatDate, formatMoney } from '@/lib/format';
import type { Circulation } from '@/types';

/**
 * S-14 — Overdue Monitor.
 *
 * Dense and scannable: compact rows, and severity-tinted backgrounds so the
 * worst cases are visible without reading a single number.
 */
export default function OverduePage() {
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState('');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: studentApi.departments,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['overdue', page, department],
    queryFn: () =>
      circulationApi.overdue({ page, per_page: 50, department: department || undefined }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const totalAccrued = rows.reduce((sum, row) => sum + (row.fine?.amount ?? 0), 0);
  const critical = rows.filter((row) => row.overdue_days > 30).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue Monitor"
        subtitle="Every loan that is past its due date, worst first."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Overdue loans"
          value={meta?.total ?? 0}
          icon="warning"
          tone={(meta?.total ?? 0) > 0 ? 'danger' : 'success'}
        />
        <StatTile
          label="Accrued fines (this page)"
          value={formatMoney(totalAccrued)}
          icon="payments"
          tone="warning"
        />
        <StatTile
          label="Over 30 days"
          value={critical}
          icon="priority_high"
          tone={critical > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
          <p className="text-body-md text-on-surface-variant">
            As of <span className="font-semibold text-on-surface">{formatDate(new Date().toISOString().slice(0, 10))}</span>
          </p>

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
        </div>

        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="check_circle"
            title="No overdue loans"
            description="Every book currently on loan is within its due date."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                    <Th>Student</Th>
                    <Th>Department</Th>
                    <Th>Contact</Th>
                    <Th>Book</Th>
                    <Th>Due date</Th>
                    <Th align="right">Days overdue</Th>
                    <Th align="right">Accrued fine</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <OverdueRow key={row.circulation_id} row={row} />
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

function OverdueRow({ row }: { row: Circulation }) {
  const days = row.overdue_days;

  // Severity tint — 1–7 amber, 8–30 red, 30+ red with a heavy left border.
  const tint =
    days > 30
      ? 'bg-danger-container/50 border-l-4 border-l-danger'
      : days > 7
        ? 'bg-danger-container/25'
        : 'bg-warning-container/25';

  return (
    <tr className={clsx('border-b border-surface-container last:border-0', tint)}>
      <Td>
        <Link
          to={`/students/${row.student?.student_id}`}
          className="block hover:underline"
        >
          <span className="block font-mono text-primary">{row.student?.student_no}</span>
          <span className="block text-on-surface">{row.student?.full_name}</span>
        </Link>
      </Td>
      <Td className="text-on-surface-variant">{row.student?.department}</Td>
      <Td className="text-on-surface-variant">
        {row.student?.phone && <span className="block font-mono">{row.student.phone}</span>}
        {row.student?.email && <span className="block truncate text-[11px]">{row.student.email}</span>}
      </Td>
      <Td>
        <span className="block text-on-surface">{row.copy?.title}</span>
        <span className="block font-mono text-[11px] text-on-surface-variant">
          {row.copy?.accession_no}
        </span>
      </Td>
      <Td className="whitespace-nowrap text-on-surface-variant">{formatDate(row.due_date)}</Td>
      <Td align="right">
        <span className="font-bold text-danger tabular">{days}</span>
      </Td>
      <Td align="right">
        <span className="font-semibold text-on-surface tabular">
          {row.fine ? formatMoney(row.fine.amount) : '—'}
        </span>
      </Td>
    </tr>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={clsx(
        'px-3 py-2.5 text-label-md uppercase tracking-wide text-on-surface-variant',
        align === 'right' && 'text-right',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'right';
}) {
  return (
    <td className={clsx('px-3 py-2.5 align-top', align === 'right' && 'text-right', className)}>
      {children}
    </td>
  );
}
