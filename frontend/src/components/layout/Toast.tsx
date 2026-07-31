import { create } from 'zustand';
import clsx from 'clsx';
import { Icon } from '@/components/ui';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  push(tone, message) {
    const id = nextId++;

    // Keep at most three visible, newest last.
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }].slice(-3) }));

    // Errors never auto-dismiss — the user must acknowledge them.
    if (tone !== 'error') {
      setTimeout(() => get().dismiss(id), 4000);
    }
  },

  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (message: string) => useToast.getState().push('success', message),
  error: (message: string) => useToast.getState().push('error', message),
  info: (message: string) => useToast.getState().push('info', message),
  warning: (message: string) => useToast.getState().push('warning', message),
};

const TONES: Record<ToastTone, { className: string; icon: string }> = {
  success: { className: 'bg-success text-white', icon: 'check_circle' },
  error: { className: 'bg-danger text-white', icon: 'error' },
  warning: { className: 'bg-warning text-white', icon: 'warning' },
  info: { className: 'bg-primary-container text-on-primary', icon: 'info' },
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 no-print"
      aria-live="polite"
    >
      {toasts.map((item) => {
        const tone = TONES[item.tone];

        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={clsx(
              'flex animate-fade-in items-start gap-3 rounded-lg p-4 shadow-dropdown',
              tone.className,
            )}
          >
            <Icon name={tone.icon} className="mt-0.5 shrink-0 text-[20px]" filled />
            <p className="min-w-0 flex-1 text-body-md">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
