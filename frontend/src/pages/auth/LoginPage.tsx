import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Icon, Input } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * S-01 — Login.
 *
 * Split-screen: brand panel on the left, sign-in card on the right.
 */
export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ---- Brand panel ------------------------------------------------ */}
      <div className="relative hidden w-2/5 flex-col justify-between bg-primary p-10 text-on-primary lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Icon name="local_library" className="text-[24px]" filled />
          </span>
          <div>
            <p className="text-headline-md font-bold">La librería</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
              World University of Bangladesh
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-[38px] font-bold leading-tight tracking-tight">
            Smart Library
            <br />
            Management System
          </h1>
          <p className="mt-4 max-w-md text-body-lg text-white/80">
            Search the catalog, issue and return books in seconds, and keep accurate
            records of every loan, fine and member — all in one place.
          </p>

          <ul className="mt-8 space-y-3 text-body-md text-white/80">
            {[
              ['bolt', 'Two scans and one keypress to issue a book'],
              ['inventory_2', 'Live availability across every copy'],
              ['payments', 'Automatic, accurate overdue fine calculation'],
              ['bar_chart', 'Reports ready for management at any time'],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3">
                <Icon name={icon} className="text-[20px] text-white/60" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-body-sm text-white/50">
          © {new Date().getFullYear()} World University of Bangladesh · Central Library
        </p>
      </div>

      {/* ---- Sign-in panel ---------------------------------------------- */}
      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-3/5">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary">
              <Icon name="local_library" className="text-[22px]" filled />
            </span>
            <div>
              <p className="text-headline-md font-bold text-primary">La librería</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                WUB · SLMS
              </p>
            </div>
          </div>

          <h2 className="text-headline-xl text-on-surface">Sign in</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Use your library account to continue.
          </p>

          {error && (
            <div className="mt-5">
              <Alert tone="danger" title="Could not sign in">
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Username or email" htmlFor="username" required>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. librarian"
                invalid={Boolean(error)}
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  invalid={Boolean(error)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-on-surface-variant hover:bg-surface-container-low"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" fullWidth loading={submitting} icon="login">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            New student?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <p className="mt-6 text-center text-body-sm text-on-surface-variant">
            Library support: ext. 214
          </p>
        </div>
      </div>
    </div>
  );
}
