import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatTile,
} from '@/components/ui';
import { reportApi } from '@/lib/services';
import { formatMoney, humanise } from '@/lib/format';
import { tokenStore } from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * S-16 — Reports Hub + rendered report (FR-08).
 */
export default function ReportsPage() {
  const can = useAuth((s) => s.can);

  const [active, setActive] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const { data: catalogue, isLoading: loadingCatalogue } = useQuery({
    queryKey: ['reports'],
    queryFn: reportApi.catalogue,
  });

  const { data: report, isFetching } = useQuery({
    queryKey: ['report', active, params],
    queryFn: () => reportApi.run(active!, params),
    enabled: Boolean(active),
  });

  const definition = catalogue?.find((item) => item.key === active);

  const download = async () => {
    if (!active) return;

    // The export is a streamed file, so fetch it with the bearer token and
    // hand the browser a blob rather than navigating away.
    const url = reportApi.exportUrl(active, params);

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` },
      });

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `slms-${active}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // Silent: the button simply does nothing if the network is down.
    }
  };

  if (loadingCatalogue) return <Spinner label="Loading reports…" />;

  // ---- Hub view ---------------------------------------------------------
  if (!active) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Generate operational and management reports, then print or export them."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalogue?.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActive(item.key);
                setParams({});
              }}
              className="flex flex-col items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-left shadow-card transition-all hover:border-primary-container hover:shadow-dropdown"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                <Icon name={item.icon} className="text-[22px]" />
              </span>
              <div>
                <p className="text-headline-md text-on-surface">{item.name}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">{item.description}</p>
              </div>
              <span className="mt-auto flex items-center gap-1 pt-2 text-label-md text-primary-container">
                Generate
                <Icon name="arrow_forward" className="text-[16px]" />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Rendered report --------------------------------------------------
  const rows = report?.rows ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={definition?.name ?? humanise(active)}
        back={{ label: 'All reports', onClick: () => setActive(null) }}
        subtitle={definition?.description}
        action={
          <div className="flex gap-2 no-print">
            <Button variant="secondary" icon="print" onClick={() => window.print()}>
              Print
            </Button>
            {can('report.export') && (
              <Button icon="download" onClick={download}>
                Export CSV
              </Button>
            )}
          </div>
        }
      />

      {/* ---- Parameters -------------------------------------------------- */}
      {definition && definition.params.length > 0 && (
        <Card className="no-print">
          <div className="flex flex-wrap items-end gap-4">
            {definition.params.includes('from') && (
              <Field label="From date" htmlFor="from">
                <Input
                  id="from"
                  type="date"
                  value={params.from ?? ''}
                  onChange={(e) => setParams({ ...params, from: e.target.value })}
                />
              </Field>
            )}
            {definition.params.includes('to') && (
              <Field label="To date" htmlFor="to">
                <Input
                  id="to"
                  type="date"
                  value={params.to ?? ''}
                  onChange={(e) => setParams({ ...params, to: e.target.value })}
                />
              </Field>
            )}
            {definition.params.includes('as_of') && (
              <Field label="As of date" htmlFor="as_of">
                <Input
                  id="as_of"
                  type="date"
                  value={params.as_of ?? ''}
                  onChange={(e) => setParams({ ...params, as_of: e.target.value })}
                />
              </Field>
            )}
            {definition.params.includes('date') && (
              <Field label="Date" htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  value={params.date ?? ''}
                  onChange={(e) => setParams({ ...params, date: e.target.value })}
                />
              </Field>
            )}
            {definition.params.includes('limit') && (
              <Field label="Top N" htmlFor="limit">
                <Select
                  id="limit"
                  value={params.limit ?? '20'}
                  onChange={(e) => setParams({ ...params, limit: e.target.value })}
                >
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                  <option value="50">Top 50</option>
                </Select>
              </Field>
            )}
            {definition.params.includes('student_id') && (
              <Field label="Student ID" htmlFor="student_id" hint="Internal student record ID.">
                <Input
                  id="student_id"
                  value={params.student_id ?? ''}
                  onChange={(e) => setParams({ ...params, student_id: e.target.value })}
                  placeholder="1"
                  mono
                />
              </Field>
            )}

            <Button variant="secondary" icon="restart_alt" onClick={() => setParams({})}>
              Reset
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Print header ------------------------------------------------ */}
      <div className="print-only mb-4">
        <p className="text-[16px] font-bold uppercase">World University of Bangladesh</p>
        <p className="text-[13px] uppercase tracking-widest">Central Library</p>
        <p className="mt-2 text-[15px] font-bold">{definition?.name}</p>
        <p className="text-[11px]">Generated {new Date().toLocaleString()}</p>
      </div>

      {/* ---- Summary tiles ---------------------------------------------- */}
      {report?.summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(report.summary).map(([key, value]) => {
            const isMoney = /amount|fine|collected|raised|waived|outstanding|total_accrued/.test(key);

            return (
              <StatTile
                key={key}
                label={humanise(key)}
                value={isMoney ? formatMoney(Number(value)) : String(value)}
                icon="analytics"
                tone={/overdue|outstanding/.test(key) ? 'danger' : 'info'}
              />
            );
          })}
        </div>
      )}

      {/* ---- Table -------------------------------------------------------- */}
      <Card padded={false}>
        {isFetching ? (
          <Spinner label="Generating report…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="bar_chart"
            title="No data for these parameters"
            description="Adjust the date range or filters and try again."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className={clsx(
                        'whitespace-nowrap px-3 py-2.5 text-label-md uppercase tracking-wide text-on-surface-variant',
                        /amount|fine|days|count|copies|total/.test(column) && 'text-right',
                      )}
                    >
                      {humanise(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                  >
                    {columns.map((column) => {
                      const value = (row as Record<string, unknown>)[column];
                      const isNumeric = typeof value === 'number';
                      const isMoney = /amount|fine|rate|balance|paid/.test(column) && isNumeric;

                      return (
                        <td
                          key={column}
                          className={clsx(
                            'px-3 py-2.5 text-on-surface',
                            (isNumeric || isMoney) && 'text-right tabular',
                            /_no|isbn|accession/.test(column) && 'font-mono text-primary',
                          )}
                        >
                          {value === null || value === undefined || value === ''
                            ? '—'
                            : isMoney
                              ? formatMoney(value as number)
                              : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
