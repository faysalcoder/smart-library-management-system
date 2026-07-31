import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Alert,
  Button,
  Card,
  Icon,
  PageHeader,
  ScannerInput,
  StatusBadge,
  type ScannerState,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { bookApi, circulationApi } from '@/lib/services';
import { formatDate, formatMoney, initials } from '@/lib/format';
import { useAuth } from '@/store/auth';
import type { BookCopy, VerifiedStudent } from '@/types';

/**
 * S-08 — Issue Book. The highest-traffic screen in the system.
 *
 * Designed so a complete issue takes two scans and one Enter press, with the
 * librarian's hands never leaving the scanner gun:
 *   Step 1 field auto-focuses → scan card → Enter → student resolves
 *   Step 2 field auto-focuses → scan book → Enter → book resolves
 *   Enter again (button is focused) → issued.
 */
export default function IssueBookPage() {
  const navigate = useNavigate();
  const { user, settings } = useAuth();

  // Step 1 — student
  const [cardInput, setCardInput] = useState('');
  const [cardState, setCardState] = useState<ScannerState>('idle');
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedStudent | null>(null);

  // Step 2 — book
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeState, setBarcodeState] = useState<ScannerState>('idle');
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [copy, setCopy] = useState<BookCopy | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const eligible = verified?.eligibility.eligible ?? false;
  const bookReady = copy?.status === 'available';
  const canConfirm = Boolean(verified) && eligible && bookReady && !submitting;

  const loanDays = settings?.loan_period_days ?? 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  // ---- Step 1: verify the student card --------------------------------
  const handleVerifyCard = async (value: string) => {
    setCardState('scanning');
    setCardMessage(null);
    setIssueError(null);

    try {
      const result = await circulationApi.verifyCard(value);
      setVerified(result);
      setCardState('success');
      setCardMessage(null);
    } catch (err) {
      const apiError = toApiError(err);
      setVerified(null);
      setCardState('error');
      setCardMessage(apiError.message);

      // Clear and re-arm so the next scan lands cleanly.
      setTimeout(() => {
        setCardInput('');
        setCardState('idle');
        setCardMessage(null);
      }, 3500);
    }
  };

  // ---- Step 2: resolve the book barcode --------------------------------
  const handleLookupBook = async (value: string) => {
    setBarcodeState('scanning');
    setBarcodeMessage(null);
    setIssueError(null);

    try {
      const result = await bookApi.lookupBarcode(value);

      if (!result) {
        throw new Error('not-found');
      }

      setCopy(result);

      if (result.status === 'available') {
        setBarcodeState('success');
        setBarcodeMessage(null);
      } else {
        setBarcodeState('error');
        setBarcodeMessage(
          `This copy is not available — its status is "${result.status}". Scan a different copy.`,
        );
      }
    } catch (err) {
      setCopy(null);
      setBarcodeState('error');
      setBarcodeMessage(
        toApiError(err).message ||
          'Barcode not recognised. Check the label or add this copy in Catalog Management.',
      );

      setTimeout(() => {
        setBarcodeInput('');
        setBarcodeState('idle');
        setBarcodeMessage(null);
      }, 3500);
    }
  };

  // ---- Confirm ---------------------------------------------------------
  const handleConfirm = async () => {
    if (!verified || !copy) return;

    setSubmitting(true);
    setIssueError(null);

    try {
      const circulation = await circulationApi.issue(cardInput.trim(), barcodeInput.trim());
      toast.success('Book issued successfully.');
      navigate(`/circulation/${circulation.circulation_id}/receipt`);
    } catch (err) {
      setIssueError(toApiError(err).message);
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setCardInput('');
    setCardState('idle');
    setCardMessage(null);
    setVerified(null);
    setBarcodeInput('');
    setBarcodeState('idle');
    setBarcodeMessage(null);
    setCopy(null);
    setIssueError(null);
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title="Issue Book"
        back={{ label: 'Back to dashboard', onClick: () => navigate('/') }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatDate(new Date().toISOString().slice(0, 10))}</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span>
              Issued by <span className="font-semibold text-on-surface">{user?.full_name}</span>
            </span>
          </span>
        }
      />

      <div className="space-y-4">
        {/* ---- Step 1 ---------------------------------------------------- */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-surface-container px-5 py-4">
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-label-md font-bold',
                  verified
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-primary-container text-on-primary',
                )}
              >
                {verified ? <Icon name="check" className="text-[18px]" /> : '1'}
              </span>
              <h2 className="text-headline-md text-on-surface">Scan Student ID Card</h2>
            </div>
            {verified && (
              <Button variant="ghost" size="sm" icon="refresh" onClick={resetAll}>
                Change student
              </Button>
            )}
          </div>

          {!verified ? (
            <div className="p-5">
              <ScannerInput
                label="Scan the student ID card"
                hint="Present the card to the scanner, or type the student number and press Enter."
                value={cardInput}
                onChange={setCardInput}
                onSubmit={handleVerifyCard}
                state={cardState}
                message={cardMessage}
              />
            </div>
          ) : (
            <div className="p-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-headline-lg font-bold text-on-secondary-container">
                  {initials(verified.student.full_name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Student name
                      </p>
                      <p className="text-headline-md text-on-surface">
                        {verified.student.full_name}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Student ID
                      </p>
                      <p className="font-mono text-headline-md text-primary">
                        {verified.student.student_no}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Department
                      </p>
                      <p className="text-body-lg text-on-surface">{verified.student.department}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Batch
                      </p>
                      <p className="text-body-lg text-on-surface">
                        {verified.student.batch ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={eligible ? 'eligible' : 'blocked'}
                      size="md"
                      label={eligible ? 'ELIGIBLE TO BORROW' : 'CANNOT BORROW'}
                    />
                    <span className="rounded-full bg-surface-container px-3 py-1 text-label-md text-on-surface-variant">
                      {verified.eligibility.open_loans} of {verified.eligibility.limit} books on loan
                    </span>
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-label-md',
                        verified.student.outstanding_fine > 0
                          ? 'bg-warning-container text-on-warning-container'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      Fine due {formatMoney(verified.student.outstanding_fine)}
                    </span>
                  </div>
                </div>
              </div>

              {!eligible && (
                <div className="mt-4">
                  <Alert tone="danger" title="This student cannot borrow right now">
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {verified.eligibility.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ---- Step 2 ---------------------------------------------------- */}
        <Card padded={false} className={clsx('overflow-hidden', (!verified || !eligible) && 'opacity-40')}>
          <div className="flex items-center gap-3 border-b border-surface-container px-5 py-4">
            <span
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-label-md font-bold',
                bookReady
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-primary-container text-on-primary',
              )}
            >
              {bookReady ? <Icon name="check" className="text-[18px]" /> : '2'}
            </span>
            <h2 className="text-headline-md text-on-surface">Scan Book Barcode</h2>
            {verified && eligible && !copy && (
              <span className="ml-auto flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-primary-container opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-container" />
              </span>
            )}
          </div>

          <div className="p-5">
            {!copy || barcodeState === 'error' ? (
              <ScannerInput
                label="Scan the book barcode"
                hint="Scan the barcode on the book, or type the accession number and press Enter."
                value={barcodeInput}
                onChange={setBarcodeInput}
                onSubmit={handleLookupBook}
                state={barcodeState}
                message={barcodeMessage}
                disabled={!verified || !eligible}
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                  <Icon name="book_2" className="text-[28px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-mono text-data-mono text-primary">{copy.accession_no}</p>
                  <p className="text-headline-md text-on-surface">{copy.book?.title}</p>
                  <p className="text-body-md text-on-surface-variant">
                    {copy.book?.author}
                    {copy.book?.shelf_no && ` · Shelf ${copy.book.shelf_no}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={copy.status} size="md" />
                    {copy.book?.category && (
                      <span className="rounded-full bg-surface-container px-3 py-1 text-label-md text-on-surface-variant">
                        {copy.book.category}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  icon="refresh"
                  onClick={() => {
                    setCopy(null);
                    setBarcodeInput('');
                    setBarcodeState('idle');
                    setBarcodeMessage(null);
                  }}
                >
                  Change book
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ---- Summary --------------------------------------------------- */}
        <Card className={clsx(!canConfirm && 'opacity-40')}>
          <div className="flex items-center gap-3">
            <Icon name="summarize" className="text-[22px] text-on-surface-variant" />
            <h2 className="text-headline-md text-on-surface">Loan summary</h2>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                Issue date
              </dt>
              <dd className="text-body-lg text-on-surface">
                {formatDate(new Date().toISOString().slice(0, 10))}
              </dd>
            </div>
            <div>
              <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                Due date
              </dt>
              <dd className="text-headline-md font-bold text-primary">
                {formatDate(dueDate.toISOString().slice(0, 10))}
              </dd>
            </div>
            <div>
              <dt className="text-label-md uppercase tracking-wide text-on-surface-variant">
                Loan period
              </dt>
              <dd className="text-body-lg text-on-surface">{loanDays} days</dd>
            </div>
          </dl>

          <p className="mt-3 text-body-sm text-on-surface-variant">
            After the due date a fine of {formatMoney(settings?.fine_rate_per_day ?? 5)} per day
            applies.
          </p>
        </Card>

        {issueError && <Alert tone="danger" title="Could not issue this book">{issueError}</Alert>}

        {/* ---- Action bar ------------------------------------------------ */}
        <div className="sticky bottom-4 space-y-2">
          <div className="flex gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-dropdown">
            <Button variant="ghost" size="lg" onClick={resetAll}>
              Cancel
            </Button>
            <Button
              size="lg"
              icon="check_circle"
              className="flex-1"
              disabled={!canConfirm}
              loading={submitting}
              onClick={handleConfirm}
              autoFocus={canConfirm}
            >
              {submitting ? 'Issuing…' : 'Confirm Issue'}
            </Button>
          </div>
          <p className="text-center text-body-sm text-on-surface-variant">
            Press{' '}
            <kbd className="rounded border border-outline-variant bg-surface-container px-1.5 py-0.5 font-mono text-[11px]">
              Enter ↵
            </kbd>{' '}
            after each scan to continue
          </p>
        </div>
      </div>
    </div>
  );
}
