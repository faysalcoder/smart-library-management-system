import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, Icon, Spinner } from '@/components/ui';
import { circulationApi } from '@/lib/services';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useAuth } from '@/store/auth';

/**
 * S-10 — Borrowing receipt, sized for an 80mm thermal printer.
 *
 * Rendered outside the app shell so it prints without navigation chrome.
 */
export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = useAuth((s) => s.settings);

  const { data: circulation, isLoading } = useQuery({
    queryKey: ['circulation', id],
    queryFn: () => circulationApi.get(id!),
    enabled: Boolean(id),
  });

  // Open the print dialog automatically — the librarian wants paper, now.
  useEffect(() => {
    if (circulation) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [circulation]);

  if (isLoading) return <Spinner label="Preparing receipt…" />;

  if (!circulation) {
    return (
      <EmptyState
        icon="receipt_long"
        title="Receipt not found"
        description="This circulation record does not exist."
        action={
          <Button icon="arrow_back" onClick={() => navigate('/circulation/issue')}>
            Back to Issue Book
          </Button>
        }
      />
    );
  }

  const receiptNo = `CIR-${String(circulation.circulation_id).padStart(6, '0')}`;

  return (
    <div className="min-h-screen bg-background py-8">
      {/* ---- Screen-only action bar ------------------------------------- */}
      <div className="no-print mx-auto mb-6 flex max-w-[420px] flex-wrap justify-center gap-3 px-4">
        <Button icon="print" onClick={() => window.print()}>
          Print receipt
        </Button>
        <Button
          variant="secondary"
          icon="arrow_circle_right"
          onClick={() => navigate('/circulation/issue')}
        >
          Issue another book
        </Button>
        <Button variant="ghost" icon="dashboard" onClick={() => navigate('/')}>
          Dashboard
        </Button>
      </div>

      {/* ---- The receipt ------------------------------------------------ */}
      <div className="mx-auto w-[80mm] max-w-full bg-white p-5 font-mono text-[12px] leading-relaxed text-black shadow-card print:shadow-none">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-wide">
            World University of Bangladesh
          </p>
          <p className="text-[12px] uppercase tracking-widest">Central Library</p>
        </div>

        <Divider />

        <p className="text-center text-[12px] font-bold uppercase tracking-wide">
          Borrowing Receipt
        </p>

        <Divider />

        <Row label="Receipt No" value={receiptNo} />
        <Row label="Date" value={formatDateTime(new Date().toISOString())} />

        <Divider />

        <p className="font-bold">STUDENT</p>
        <p>
          {circulation.student?.student_no} · {circulation.student?.full_name}
        </p>
        <p className="text-[11px]">
          {circulation.student?.department}
          {circulation.student?.batch && ` · Batch ${circulation.student.batch}`}
        </p>

        <Divider />

        <p className="font-bold">BOOK</p>
        <p>{circulation.copy?.accession_no}</p>
        <p className="whitespace-pre-wrap">{circulation.copy?.title}</p>
        <p className="text-[11px]">{circulation.copy?.author}</p>
        {circulation.copy?.shelf_no && (
          <p className="text-[11px]">Shelf {circulation.copy.shelf_no}</p>
        )}

        <Divider />

        <Row label="Issue Date" value={formatDate(circulation.issue_date)} />
        <div className="flex justify-between font-bold">
          <span>DUE DATE</span>
          <span>{formatDate(circulation.due_date)}</span>
        </div>

        <Divider />

        <p className="text-[11px]">
          Overdue fine: {formatMoney(settings?.fine_rate_per_day ?? 5)} per day
        </p>
        <p className="text-[11px]">Please return on or before the due date.</p>

        <Divider />

        <Row label="Issued by" value={circulation.issued_by ?? '—'} />

        <div className="mt-4 text-center">
          {/* A simple visual barcode stand-in for the receipt number. */}
          <div className="flex h-10 items-end justify-center gap-[2px]" aria-hidden="true">
            {receiptNo.split('').map((char, index) => (
              <span
                key={index}
                className="bg-black"
                style={{
                  width: (char.charCodeAt(0) % 3) + 1,
                  height: 24 + (char.charCodeAt(0) % 12),
                }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] tracking-widest">{receiptNo}</p>
        </div>

        <p className="mt-3 text-center text-[10px]">Thank you for using the library.</p>
      </div>

      <div className="no-print mt-6 text-center text-body-sm text-on-surface-variant">
        <Icon name="info" className="mr-1 align-middle text-[16px]" />
        The print dialog opens automatically. Set paper size to 80mm for thermal printers.
      </div>
    </div>
  );
}

function Divider() {
  return <p className="my-2 overflow-hidden whitespace-nowrap">{'-'.repeat(42)}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
