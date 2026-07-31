import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { initials } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Permission required to see this item; undefined = always visible. */
  permission?: string;
  roles?: string[];
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'Library',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard' },
      { to: '/search', label: 'Search Books', icon: 'search', permission: 'book.search' },
    ],
  },
  {
    label: 'My Library',
    items: [
      { to: '/my/loans', label: 'My Loans', icon: 'menu_book', roles: ['student'] },
      { to: '/my/fines', label: 'My Fines', icon: 'payments', roles: ['student'] },
      { to: '/my/profile', label: 'My Account', icon: 'manage_accounts', roles: ['student'] },
    ],
  },
  {
    label: 'Circulation',
    items: [
      { to: '/circulation/issue', label: 'Issue Book', icon: 'arrow_circle_right', permission: 'circulate', shortcut: 'Alt+I' },
      { to: '/circulation/return', label: 'Return Book', icon: 'arrow_circle_left', permission: 'circulate', shortcut: 'Alt+R' },
      { to: '/circulation/overdue', label: 'Overdue', icon: 'warning', permission: 'loan.view' },
      { to: '/fines', label: 'Fines', icon: 'payments', permission: 'fine.view' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/books', label: 'Books', icon: 'library_books', permission: 'book.manage' },
      { to: '/authors', label: 'Authors', icon: 'groups', permission: 'author.manage' },
      { to: '/publishers', label: 'Publishers', icon: 'apartment', permission: 'publisher.manage' },
      { to: '/categories', label: 'Categories', icon: 'category', permission: 'category.manage' },
      { to: '/students', label: 'Students', icon: 'group', permission: 'student.view' },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: 'bar_chart', permission: 'report.view' }],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users & Roles', icon: 'admin_panel_settings', permission: 'user.manage' },
      { to: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'setting.manage' },
      { to: '/admin/logs', label: 'Audit Log', icon: 'receipt_long', permission: 'log.view' },
      { to: '/admin/backups', label: 'Backup & Restore', icon: 'database', permission: 'backup.manage' },
    ],
  },
];

export function AppShell() {
  const { user, logout, can, hasRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keyboard shortcuts — the librarian never has to reach for the mouse.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === 'i' && can('circulate')) {
        event.preventDefault();
        navigate('/circulation/issue');
      } else if (key === 'r' && can('circulate')) {
        event.preventDefault();
        navigate('/circulation/return');
      } else if (key === 's' && can('book.search')) {
        event.preventDefault();
        navigate('/search');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, can]);

  const visibleGroups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.roles) return hasRole(...(item.roles as never[]));
      if (item.permission) return can(item.permission);
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-container focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Skip to main content
      </a>

      {/* ---- Sidebar ---------------------------------------------------- */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-outline-variant bg-surface transition-all no-print',
          collapsed ? 'w-[72px]' : 'w-sidebar',
          'max-lg:-translate-x-full',
          menuOpen && 'max-lg:translate-x-0',
        )}
      >
        <div className="flex h-topbar items-center gap-3 px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
            <Icon name="local_library" className="text-[20px]" filled />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-headline-md font-bold text-primary">La librería</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                WUB · SLMS
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMenuOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-colors',
                          isActive
                            ? 'bg-secondary-container font-semibold text-on-secondary-container'
                            : 'text-on-surface-variant hover:bg-surface-container-low',
                        )
                      }
                    >
                      <Icon name={item.icon} className="shrink-0 text-[20px]" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="ml-auto rounded border border-outline-variant bg-surface-container px-1 font-mono text-[10px] text-on-surface-variant">
                              {item.shortcut}
                            </kbd>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-outline-variant p-3">
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-lowest p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary">
              {initials(user?.full_name)}
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md text-on-surface">{user?.full_name}</p>
                  <p className="truncate text-[10px] capitalize text-on-surface-variant">
                    {user?.role?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  title="Sign out"
                  className="shrink-0 rounded p-1 text-on-surface-variant hover:text-danger"
                >
                  <Icon name="logout" className="text-[20px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ---- Mobile overlay --------------------------------------------- */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-inverse-surface/40 lg:hidden no-print"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---- Topbar ------------------------------------------------------ */}
      <header
        className={clsx(
          'fixed right-0 top-0 z-20 flex h-topbar items-center justify-between gap-4 border-b border-outline-variant bg-surface-container-lowest px-6 transition-all no-print',
          collapsed ? 'left-[72px]' : 'left-sidebar',
          'max-lg:left-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.innerWidth < 1024 ? setMenuOpen((v) => !v) : setCollapsed((v) => !v))}
            aria-label="Toggle navigation"
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="menu" className="text-[22px]" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          {can('circulate') && (
            <>
              <NavLink
                to="/circulation/issue"
                className="hidden items-center gap-1.5 rounded-lg bg-primary-container px-3 py-2 text-label-md text-on-primary hover:opacity-90 sm:flex"
              >
                <Icon name="arrow_circle_right" className="text-[18px]" />
                Issue
              </NavLink>
              <NavLink
                to="/circulation/return"
                className="hidden items-center gap-1.5 rounded-lg bg-success px-3 py-2 text-label-md text-white hover:opacity-90 sm:flex"
              >
                <Icon name="arrow_circle_left" className="text-[18px]" />
                Return
              </NavLink>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container-low"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-md font-bold text-on-secondary-container">
                {initials(user?.full_name)}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-label-md text-on-surface">{user?.full_name}</span>
                <span className="block text-[10px] capitalize text-on-surface-variant">
                  {user?.role?.name}
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ---- Content ----------------------------------------------------- */}
      <main
        id="main"
        className={clsx(
          'min-h-screen pt-topbar transition-all',
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-sidebar',
        )}
      >
        <div className="mx-auto max-w-container-max px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
