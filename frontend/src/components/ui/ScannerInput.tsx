import { useEffect, useRef, type FormEvent } from 'react';
import clsx from 'clsx';

export type ScannerState = 'idle' | 'scanning' | 'success' | 'error';

interface ScannerInputProps {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  state: ScannerState;
  message?: string | null;
  disabled?: boolean;
  /** Pulls keyboard focus as soon as the field becomes usable. */
  autoFocus?: boolean;
}

/**
 * The signature component of the system.
 *
 * The scanners are keyboard-wedge devices: they type the barcode characters
 * rapidly and then send Enter. So this is simply a text input that
 *   1. auto-focuses whenever it becomes the active step,
 *   2. submits on Enter, and
 *   3. re-focuses itself after every result.
 *
 * That is what makes a complete issue possible with two scans and one Enter,
 * with the librarian's hands never leaving the scanner gun.
 */
export function ScannerInput({
  label,
  hint,
  placeholder = 'Waiting for scan…',
  value,
  onChange,
  onSubmit,
  state,
  message,
  disabled = false,
  autoFocus = true,
}: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-arm the field whenever it becomes enabled or a result comes back, so
  // the next scan always lands somewhere.
  useEffect(() => {
    if (!disabled && autoFocus) {
      inputRef.current?.focus();
    }
  }, [disabled, autoFocus, state]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !disabled) onSubmit(trimmed);
  };

  const tone = {
    idle: {
      wrapper: 'border-2 border-dashed border-primary-container bg-primary-container/5',
      icon: 'barcode_scanner',
      iconClass: 'text-primary-container',
    },
    scanning: {
      wrapper: 'border-2 border-primary-container bg-surface-container-lowest',
      icon: 'barcode_scanner',
      iconClass: 'text-primary-container animate-pulse',
    },
    success: {
      wrapper: 'border-2 border-success bg-success-container/40',
      icon: 'check_circle',
      iconClass: 'text-success icon-filled',
    },
    error: {
      wrapper: 'border-2 border-danger bg-danger-container/40',
      icon: 'cancel',
      iconClass: 'text-danger icon-filled',
    },
  }[state];

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={clsx(
          'rounded-xl p-6 transition-colors',
          tone.wrapper,
          state === 'idle' && !disabled && 'scanner-glow',
          disabled && 'opacity-40 grayscale',
        )}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={clsx('material-symbols-outlined text-[56px] mb-3', tone.iconClass)}
            aria-hidden="true"
          >
            {tone.icon}
          </span>

          <p className="text-headline-md text-on-surface mb-1">{label}</p>

          {hint && (
            <p className="text-body-sm text-on-surface-variant max-w-md mb-4">{hint}</p>
          )}

          <div className="w-full max-w-md">
            <label htmlFor={`scanner-${label}`} className="sr-only">
              {label}
            </label>
            <input
              id={`scanner-${label}`}
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-describedby={message ? `scanner-msg-${label}` : undefined}
              aria-invalid={state === 'error'}
              className={clsx(
                'w-full rounded-lg border px-4 py-3 text-center font-mono text-scan-display tracking-[0.15em]',
                'bg-surface-container-lowest placeholder:tracking-normal placeholder:font-sans',
                'placeholder:text-body-md placeholder:text-on-surface-variant',
                'focus:outline-none focus:ring-4 focus:ring-primary-container/20',
                state === 'error'
                  ? 'border-danger text-on-danger-container focus:border-danger'
                  : state === 'success'
                    ? 'border-success text-success focus:border-success'
                    : 'border-outline-variant focus:border-primary-container',
                'disabled:cursor-not-allowed',
              )}
            />

            <div className="mt-3 flex items-center justify-center gap-4 text-label-md text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  keyboard
                </span>
                MANUAL ENTRY
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  bolt
                </span>
                AUTO-SCAN
              </span>
            </div>
          </div>

          {message && (
            <p
              id={`scanner-msg-${label}`}
              role={state === 'error' ? 'alert' : 'status'}
              aria-live={state === 'error' ? 'assertive' : 'polite'}
              className={clsx(
                'mt-4 max-w-md text-body-md font-medium',
                state === 'error' ? 'text-on-danger-container' : 'text-success',
              )}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
