/**
 * Display formatting rules from DESIGN_PROMPT.txt §6.
 *
 * Dates are always "13 Aug 2026" — never 13/08/26, which is ambiguous.
 * Currency is always the symbol followed by two decimals.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const CURRENCY = '৳';

export function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '—';

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${formatDate(value)}, ${hour12}:${minutes} ${period}`;
}

export function formatMoney(value?: number | string | null, symbol = CURRENCY): string {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
  if (Number.isNaN(amount)) return `${symbol}0.00`;

  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value?: number | null): string {
  return (value ?? 0).toLocaleString('en-US');
}

/**
 * Relative due-date language. Always paired with the absolute date in the UI
 * so "Due in 3 days" is never the only information available.
 */
export function dueLabel(dueDate?: string | null, overdueDays = 0): string {
  if (!dueDate) return '—';
  if (overdueDays > 0) return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;

  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';

  return `Due in ${days} days`;
}

/** Severity band used to colour overdue rows and pills. */
export function dueTone(
  dueDate?: string | null,
  overdueDays = 0,
): 'danger' | 'warning' | 'success' {
  if (overdueDays > 0) return 'danger';
  if (!dueDate) return 'success';

  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return 'danger';
  if (days <= 2) return 'warning';

  return 'success';
}

/** Turns AUDIT_ACTION_CODES into "Audit Action Codes". */
export function humanise(value?: string | null): string {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function initials(name?: string | null): string {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
