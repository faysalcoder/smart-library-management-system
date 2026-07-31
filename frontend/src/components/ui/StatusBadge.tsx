import clsx from 'clsx';

/**
 * The fixed status vocabulary from DESIGN_PROMPT.txt §3.4.
 *
 * Every badge carries an icon AND a text label — colour is never the only
 * carrier of meaning (WCAG 1.4.1).
 */
const VARIANTS: Record<
  string,
  { label: string; icon: string; className: string }
> = {
  // Copy status
  available: { label: 'Available', icon: 'check_circle', className: 'bg-success-container text-on-success-container' },
  issued: { label: 'Issued', icon: 'arrow_circle_right', className: 'bg-warning-container text-on-warning-container' },
  reserved: { label: 'Reserved', icon: 'bookmark', className: 'bg-info-container text-on-info-container' },
  lost: { label: 'Lost', icon: 'cancel', className: 'bg-neutral-container text-on-neutral-container' },
  damaged: { label: 'Damaged', icon: 'report', className: 'bg-neutral-container text-on-neutral-container' },
  withdrawn: { label: 'Withdrawn', icon: 'archive', className: 'bg-neutral-container text-on-neutral-container' },

  // Circulation status
  returned: { label: 'Returned', icon: 'check_circle', className: 'bg-success-container text-on-success-container' },
  overdue: { label: 'Overdue', icon: 'warning', className: 'bg-danger-container text-on-danger-container' },

  // Eligibility
  eligible: { label: 'Eligible', icon: 'verified', className: 'bg-success-container text-on-success-container' },
  blocked: { label: 'Blocked', icon: 'block', className: 'bg-danger-container text-on-danger-container' },

  // Fine status
  pending: { label: 'Pending', icon: 'schedule', className: 'bg-warning-container text-on-warning-container' },
  partial: { label: 'Partial', icon: 'incomplete_circle', className: 'bg-warning-container text-on-warning-container' },
  paid: { label: 'Paid', icon: 'check_circle', className: 'bg-success-container text-on-success-container' },
  waived: { label: 'Waived', icon: 'do_not_disturb_on', className: 'bg-neutral-container text-on-neutral-container' },

  // Membership / account
  active: { label: 'Active', icon: 'check_circle', className: 'bg-success-container text-on-success-container' },
  suspended: { label: 'Suspended', icon: 'pause_circle', className: 'bg-danger-container text-on-danger-container' },
  expired: { label: 'Expired', icon: 'event_busy', className: 'bg-neutral-container text-on-neutral-container' },
  inactive: { label: 'Inactive', icon: 'cancel', className: 'bg-neutral-container text-on-neutral-container' },
  locked: { label: 'Locked', icon: 'lock', className: 'bg-danger-container text-on-danger-container' },
};

const TONES = {
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  danger: 'bg-danger-container text-on-danger-container',
  info: 'bg-info-container text-on-info-container',
  neutral: 'bg-neutral-container text-on-neutral-container',
} as const;

interface StatusBadgeProps {
  status: string;
  /** Overrides the label from the vocabulary (e.g. "3 days overdue"). */
  label?: string;
  /** Overrides the colour band from the vocabulary. */
  tone?: keyof typeof TONES;
  icon?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, tone, icon, size = 'sm' }: StatusBadgeProps) {
  const variant = VARIANTS[status] ?? {
    label: status,
    icon: 'info',
    className: TONES.neutral,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide whitespace-nowrap',
        tone ? TONES[tone] : variant.className,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-label-md',
      )}
    >
      <span
        className={clsx('material-symbols-outlined icon-filled', size === 'sm' ? 'text-[13px]' : 'text-[16px]')}
        aria-hidden="true"
      >
        {icon ?? variant.icon}
      </span>
      {label ?? variant.label}
    </span>
  );
}
