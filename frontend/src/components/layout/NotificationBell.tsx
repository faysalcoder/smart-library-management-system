import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Icon } from '@/components/ui';
import { dashboardApi } from '@/lib/services';

/**
 * §3.3 Context Diagram — students "receive … fine notifications";
 * librarians "receive circulation reports".
 *
 * The feed is derived server-side from live state, so an item disappears the
 * moment the underlying condition is resolved.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: dashboardApi.notifications,
    refetchInterval: 60_000,
  });

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = data?.items ?? [];
  const count = data?.count ?? 0;
  const urgent = data?.urgent ?? 0;

  const tones = {
    danger: 'bg-danger-container text-on-danger-container',
    warning: 'bg-warning-container text-on-warning-container',
    info: 'bg-info-container text-on-info-container',
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
      >
        <Icon name="notifications" className="text-[22px]" />
        {count > 0 && (
          <span
            className={clsx(
              'absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
              urgent > 0 ? 'bg-danger' : 'bg-warning',
            )}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] animate-fade-in overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-dropdown">
          <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <p className="text-body-md font-semibold text-on-surface">Notifications</p>
            {count > 0 && (
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                {count}
              </span>
            )}
          </header>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Icon name="check_circle" className="text-[32px] text-success" />
              <p className="mt-2 text-body-md font-medium text-on-surface">All clear</p>
              <p className="text-body-sm text-on-surface-variant">
                Nothing needs your attention right now.
              </p>
            </div>
          ) : (
            <ul className="max-h-[400px] divide-y divide-surface-container overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(item.link);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span
                      className={clsx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        tones[item.tone],
                      )}
                    >
                      <Icon name={item.icon} className="text-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-md font-medium text-on-surface">
                        {item.title}
                      </span>
                      <span className="block text-body-sm text-on-surface-variant">
                        {item.message}
                      </span>
                    </span>
                    <Icon
                      name="chevron_right"
                      className="mt-1 shrink-0 text-[18px] text-on-surface-variant"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
