import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Alert,
  Button,
  Card,
  Field,
  Icon,
  Input,
  PageHeader,
  ScannerInput,
  StatusBadge,
  type ScannerState,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { circulationApi, fineApi } from '@/lib/services';
import { formatDate, formatMoney } from '@/lib/format';
import type { ReturnLookup, ReturnLookupByStudent, ReturnResult } from '@/types';

/**
 * S-09 — Return Book.
 *
 * Single-step and faster than issuing: the librarian scans only the book; the
 * system finds the loan record, previews any fine, and commits on confirm.
 */
export default function ReturnBookPage() {
  const navigate = useNavigate();

  const [barcode, setBarcode] = useState('');
  const [state, setState] = useState<ScannerState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ReturnLookup | null>(null);
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [collectNow, setCollectNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- DFD L-2 fallback: "Student Id + book title" when the barcode label
  // on the book is torn, smudged or missing (common on older stock). -------
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackId, setFallbackId] = useState('');
  const [fallbackTitle, setFallbackTitle] = useState('');
  const [fallbackSearching, setFallbackSearching] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [fallbackResult, setFallbackResult] = useState<ReturnLookupByStudent | null>(null);

  const handleLookup = async (value: string) => {
    setState('scanning');
    setMessage(null);
    setError(null);

    try {
      const found = await circulationApi.returnLookup(value);
      setLookup(found);
      setState('success');
    } catch (err) {
      setLookup(null);
      setState('error');
      setMessage(toApiError(err).message);

      setTimeout(() => {
        setBarcode('');
        setState('idle');
        setMessage(null);
      }, 3500);
    }
  };

  const handleFallbackSearch = async () => {
    if (!fallbackId.trim()) return;

    setFallbackSearching(true);
    setFallbackError(null);
    setFallbackResult(null);

    try {
      const found = await circulationApi.returnLookupByStudent(
        fallbackId.trim(),
        fallbackTitle.trim() || undefined,
      );
      setFallbackResult(found);
    } catch (err) {
      setFallbackError(toApiError(err).message);
    } finally {
      setFallbackSearching(false);
    }
  };

  /** Picking a loan from the fallback list feeds it into the normal flow. */
  const selectFallbackLoan = (row: ReturnLookupByStudent['loans'][number]) => {
    const resolvedBarcode = row.circulation.copy?.barcode;

    if (!resolvedBarcode) return;

    setBarcode(resolvedBarcode);
    setLookup({ circulation: row.circulation, fine_preview: row.fine_preview });
    setState('success');
    setShowFallback(false);
    setFallbackResult(null);
    setFallbackId('');
    setFallbackTitle('');
  };

  const handleConfirm = async () => {
    if (!lookup) return;

    setSubmitting(true);
    setError(null);

    try {
      const returned = await circulationApi.return(barcode.trim());

      // Optionally settle the fine immediately at the desk.
      if (returned.fine && collectNow) {
        try {
          await fineApi.collect(returned.fine.fine_id, returned.fine.amount);
          toast.success('Book returned and fine collected.');
        } catch {
          toast.warning('Book returned, but the fine payment could not be recorded.');
        }
      } else {
        toast.success(
          returned.fine ? 'Book returned. Fine recorded as pending.' : 'Book returned on time.',
        );
      }

      setResult(returned);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setBarcode('');
    setState('idle');
    setMessage(null);
    setLookup(null);
    setResult(null);
    setCollectNow(true);
    setError(null);
    setShowFallback(false);
    setFallbackId('');
    setFallbackTitle('');
    setFallbackError(null);
    setFallbackResult(null);
  };

  // ---- Success view ----------------------------------------------------
  if (result) {
    const overdue = result.circulation.overdue_days > 0;

    return (
      <div className="mx-auto max-w-[760px]">
        <PageHeader title="Return Book" />

        <Card className="text-center">
          <span
            className={clsx(
              'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
              overdue
                ? 'bg-warning-container text-on-warning-container'
                : 'bg-success-container text-on-success-container',
            )}
          >
            <Icon name="check_circle" className="text-[36px]" filled />
          </span>

          <h2 className="text-headline-lg text-on-surface">Book returned</h2>
          <p className="mt-1 text-body-lg text-on-surface-variant">
            {result.circulation.copy?.title}
          </p>
          <p className="text-body-md text-on-surface-variant">
            Returned by {result.circulation.student?.full_name} (
            <span className="font-mono">{result.circulation.student?.student_no}</span>)
          </p>

          {result.fine ? (
            <div className="mx-auto mt-5 max-w-sm rounded-xl bg-danger-container/40 p-4">
              <p className="text-label-md uppercase tracking-wide text-on-danger-container">
                Overdue fine
              </p>
              <p className="mt-1 text-[30px] font-bold text-danger">
                {formatMoney(result.fine.amount)}
              </p>
              <p className="text-body-sm text-on-danger-container">
                {result.fine.overdue_days} day(s) × {formatMoney(result.fine.rate_per_day)} per day
                {' · '}
                {result.fine.status === 'paid' ? 'Paid in full' : 'Pending payment'}
              </p>
            </div>
          ) : (
            <div className="mx-auto mt-5 max-w-sm rounded-xl bg-success-container/40 p-4">
              <p className="text-body-md font-semibold text-on-success-container">
                Returned on time — no fine.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" icon="arrow_circle_left" onClick={reset}>
              Return another book
            </Button>
            <Button variant="secondary" size="lg" icon="dashboard" onClick={() => navigate('/')}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Scan / confirm view ---------------------------------------------
  const overdueDays = lookup?.fine_preview.overdue_days ?? 0;
  const fineAmount = lookup?.fine_preview.amount ?? 0;

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title="Return Book"
        back={{ label: 'Back to dashboard', onClick: () => navigate('/') }}
        subtitle="Scan the barcode on the returned book — the system finds the loan automatically."
      />

      <div className="space-y-4">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-surface-container px-5 py-4">
            <span
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-label-md font-bold',
                lookup
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-primary-container text-on-primary',
              )}
            >
              {lookup ? <Icon name="check" className="text-[18px]" /> : '1'}
            </span>
            <h2 className="text-headline-md text-on-surface">Scan Returned Book</h2>
            {lookup && (
              <Button variant="ghost" size="sm" icon="refresh" className="ml-auto" onClick={reset}>
                Scan a different book
              </Button>
            )}
          </div>

          {!lookup && (
            <div className="p-5">
              <ScannerInput
                label="Scan the returned book"
                hint="Scan the barcode, or type the accession number and press Enter."
                value={barcode}
                onChange={setBarcode}
                onSubmit={handleLookup}
                state={state}
                message={message}
              />

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowFallback((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary hover:underline"
                >
                  <Icon name="help" className="text-[16px]" />
                  Can't scan the barcode? Look up by student instead
                </button>
              </div>

              {showFallback && (
                <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <p className="mb-3 text-body-sm text-on-surface-variant">
                    Identify the student and pick the correct book from their loans — useful
                    when the barcode label is torn, smudged, or missing.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Field label="Student ID card or student number" htmlFor="fallback-id" required>
                        <Input
                          id="fallback-id"
                          value={fallbackId}
                          onChange={(e) => setFallbackId(e.target.value)}
                          placeholder="e.g. WUB-4018 or 4018"
                          mono
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleFallbackSearch();
                            }
                          }}
                        />
                      </Field>
                    </div>
                    <div className="flex-1">
                      <Field label="Book title (optional)" htmlFor="fallback-title">
                        <Input
                          id="fallback-title"
                          value={fallbackTitle}
                          onChange={(e) => setFallbackTitle(e.target.value)}
                          placeholder="Narrow down by title"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleFallbackSearch();
                            }
                          }}
                        />
                      </Field>
                    </div>
                    <Button
                      icon="search"
                      loading={fallbackSearching}
                      disabled={!fallbackId.trim()}
                      onClick={handleFallbackSearch}
                    >
                      Find loans
                    </Button>
                  </div>

                  {fallbackError && (
                    <div className="mt-3">
                      <Alert tone="danger">{fallbackError}</Alert>
                    </div>
                  )}

                  {fallbackResult && (
                    <div className="mt-4">
                      <p className="mb-2 text-body-sm font-medium text-on-surface">
                        {fallbackResult.student.full_name}{' '}
                        <span className="font-mono text-primary">
                          ({fallbackResult.student.student_no})
                        </span>{' '}
                        — {fallbackResult.loans.length} book(s) on loan
                      </p>
                      <ul className="space-y-2">
                        {fallbackResult.loans.map((row) => (
                          <li key={row.circulation.circulation_id}>
                            <button
                              type="button"
                              onClick={() => selectFallbackLoan(row)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-left transition-colors hover:border-primary-container"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-body-md text-on-surface">
                                  {row.circulation.copy?.title}
                                </p>
                                <p className="text-body-sm text-on-surface-variant">
                                  Due {formatDate(row.circulation.due_date)}
                                  {row.fine_preview.overdue_days > 0 &&
                                    ` · ${row.fine_preview.overdue_days} day(s) overdue`}
                                </p>
                              </div>
                              <Icon name="chevron_right" className="shrink-0 text-[20px] text-on-surface-variant" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {lookup && (
          <>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row">
                <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                  <Icon name="book_2" className="text-[28px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-mono text-data-mono text-primary">
                    {lookup.circulation.copy?.accession_no}
                  </p>
                  <p className="text-headline-md text-on-surface">
                    {lookup.circulation.copy?.title}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {lookup.circulation.copy?.author}
                  </p>

                  <div className="mt-3 rounded-lg bg-surface-container-low p-3">
                    <p className="text-label-md uppercase tracking-wide text-on-surface-variant">
                      Borrower
                    </p>
                    <p className="text-body-lg text-on-surface">
                      {lookup.circulation.student?.full_name}{' '}
                      <span className="font-mono text-body-md text-primary">
                        ({lookup.circulation.student?.student_no})
                      </span>
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {lookup.circulation.student?.department}
                    </p>
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-surface-container pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                    Issued
                  </dt>
                  <dd className="text-body-lg text-on-surface">
                    {formatDate(lookup.circulation.issue_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                    Due
                  </dt>
                  <dd className="text-body-lg text-on-surface">
                    {formatDate(lookup.circulation.due_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                    Returning
                  </dt>
                  <dd className="text-body-lg text-on-surface">
                    {formatDate(new Date().toISOString().slice(0, 10))}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* The outcome block — large and unmissable. */}
            {overdueDays > 0 ? (
              <Card className="border-danger bg-danger-container/30">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                    <Icon name="warning" className="text-[26px]" filled />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-headline-lg font-bold text-on-danger-container">
                      {overdueDays} day{overdueDays === 1 ? '' : 's'} overdue
                    </p>
                    <p className="mt-1 text-[30px] font-bold leading-none text-danger">
                      {formatMoney(fineAmount)}
                    </p>
                    <p className="mt-1 text-body-md text-on-danger-container">
                      {lookup.fine_preview.chargeable_days} chargeable day(s) ×{' '}
                      {formatMoney(lookup.fine_preview.rate)} per day
                      {lookup.fine_preview.capped && ' (capped at the maximum)'}
                    </p>

                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-body-md text-on-danger-container">
                      <input
                        type="checkbox"
                        checked={collectNow}
                        onChange={(e) => setCollectNow(e.target.checked)}
                        className="h-4 w-4 rounded border-outline-variant text-primary-container focus:ring-primary-container"
                      />
                      Collect this fine now
                    </label>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border-success bg-success-container/30">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Icon name="check_circle" className="text-[26px]" filled />
                  </span>
                  <div>
                    <p className="text-headline-md font-bold text-on-success-container">
                      Returned on time
                    </p>
                    <p className="text-body-md text-on-success-container">No fine is due.</p>
                  </div>
                </div>
              </Card>
            )}

            {error && (
              <Alert tone="danger" title="Could not complete the return">
                {error}
              </Alert>
            )}

            <div className="sticky bottom-4 flex gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-dropdown">
              <Button variant="ghost" size="lg" onClick={reset}>
                Cancel
              </Button>
              <Button
                size="lg"
                icon="check_circle"
                className="flex-1"
                loading={submitting}
                onClick={handleConfirm}
                autoFocus
              >
                {submitting ? 'Processing…' : 'Confirm Return'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
