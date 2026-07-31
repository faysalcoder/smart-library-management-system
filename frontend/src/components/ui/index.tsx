import clsx from 'clsx';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export { ScannerInput, type ScannerState } from './ScannerInput';
export { StatusBadge } from './StatusBadge';

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

export function Icon({
  name,
  className,
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={clsx('material-symbols-outlined', filled && 'icon-filled', className)}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary hover:bg-primary disabled:bg-primary-container/40',
  secondary:
    'bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low',
  danger: 'bg-danger text-white hover:bg-on-danger-container',
  success: 'bg-success text-white hover:bg-on-success-container',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-label-md gap-1',
  md: 'h-10 px-4 text-body-md gap-2',
  lg: 'h-12 px-6 text-headline-md gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Icon name="progress_activity" className="animate-spin text-[18px]" />
      ) : (
        icon && <Icon name={icon} className="text-[18px]" />
      )}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, error, hint, required, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-label-md text-on-surface-variant">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-body-sm text-on-danger-container" role="alert">
          <Icon name="error" className="text-[14px]" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-body-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface ' +
  'placeholder:text-on-surface-variant transition-colors focus:outline-none focus:ring-4 ' +
  'focus:ring-primary-container/15 disabled:cursor-not-allowed disabled:bg-surface-container';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, mono, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid}
      className={clsx(
        CONTROL_BASE,
        'h-10',
        mono && 'font-mono',
        invalid ? 'border-danger focus:border-danger' : 'border-outline-variant focus:border-primary-container',
        className,
      )}
      {...props}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid}
      className={clsx(
        CONTROL_BASE,
        'h-10 appearance-none bg-[length:16px] bg-[right:0.75rem_center] bg-no-repeat pr-9',
        "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%23434655'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3e%3c/svg%3e\")]",
        invalid ? 'border-danger' : 'border-outline-variant focus:border-primary-container',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx(CONTROL_BASE, 'min-h-[80px] border-outline-variant focus:border-primary-container', className)}
        {...props}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={clsx(
        'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4 border-b border-surface-container pb-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
            <Icon name={icon} className="text-[20px]" />
          </span>
        )}
        <div>
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

type AlertTone = 'success' | 'warning' | 'danger' | 'info';

const ALERT_TONES: Record<AlertTone, { wrapper: string; icon: string }> = {
  success: { wrapper: 'bg-success-container/50 border-l-4 border-success text-on-success-container', icon: 'check_circle' },
  warning: { wrapper: 'bg-warning-container/50 border-l-4 border-warning text-on-warning-container', icon: 'warning' },
  danger: { wrapper: 'bg-danger-container/50 border-l-4 border-danger text-on-danger-container', icon: 'error' },
  info: { wrapper: 'bg-info-container/50 border-l-4 border-info text-on-info-container', icon: 'info' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  onDismiss,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  const config = ALERT_TONES[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={clsx('flex items-start gap-3 rounded-lg p-4', config.wrapper)}
    >
      <Icon name={config.icon} className="mt-0.5 shrink-0 text-[20px]" filled />
      <div className="min-w-0 flex-1">
        {title && <p className="text-body-md font-semibold">{title}</p>}
        {children && <div className="text-body-md">{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  icon,
  tone = 'info',
  onClick,
  hint,
}: {
  label: string;
  value: string | number;
  icon: string;
  tone?: AlertTone | 'neutral';
  onClick?: () => void;
  hint?: string;
}) {
  const tones = {
    success: 'bg-success-container text-on-success-container',
    warning: 'bg-warning-container text-on-warning-container',
    danger: 'bg-danger-container text-on-danger-container',
    info: 'bg-info-container text-on-info-container',
    neutral: 'bg-neutral-container text-on-neutral-container',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={clsx(
        'flex w-full items-start justify-between gap-3 rounded-xl border border-outline-variant',
        'bg-surface-container-lowest p-5 text-left shadow-card transition-all',
        onClick && 'hover:border-primary-container hover:shadow-dropdown active:scale-[0.99]',
      )}
    >
      <div className="min-w-0">
        <p className="text-label-md uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="mt-1 text-[30px] font-bold leading-none text-on-surface tabular">{value}</p>
        {hint && <p className="mt-1.5 text-body-sm text-on-surface-variant">{hint}</p>}
      </div>
      <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon name={icon} className="text-[20px]" />
      </span>
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Empty / loading states
// ---------------------------------------------------------------------------

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} className="text-[28px]" />
      </span>
      <p className="text-headline-md text-on-surface">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-body-md text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-on-surface-variant" role="status">
      <Icon name="progress_activity" className="animate-spin text-[22px]" />
      <span className="text-body-md">{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-6 flex-1 rounded bg-surface-container" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx(
          'w-full animate-fade-in rounded-2xl bg-surface-container-lowest shadow-modal',
          widths[width],
        )}
      >
        <header className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-outline-variant px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-6">
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="mb-2 flex items-center gap-1 text-label-md text-primary-container hover:underline"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          {back.label}
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-xl text-on-surface">{title}</h1>
          {subtitle && (
            <div className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</div>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({
  page,
  lastPage,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  from?: number | null;
  to?: number | null;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-4 py-3">
      <p className="text-body-sm text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{from ?? 0}</span>–
        <span className="font-semibold text-on-surface">{to ?? 0}</span> of{' '}
        <span className="font-semibold text-on-surface">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          icon="chevron_left"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-3 text-body-sm text-on-surface-variant tabular">
          Page {page} of {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Next
          <Icon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </div>
  );
}
