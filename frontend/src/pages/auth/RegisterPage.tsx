import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Icon, Input } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

const EMPTY = {
  full_name: '',
  email: '',
  phone: '',
  department: '',
  password: '',
  password_confirmation: '',
};

/**
 * Public student self-registration. Mirrors LoginPage's split-screen layout
 * so moving between the two feels like the same product, not a bolted-on
 * form.
 */
export default function RegisterPage() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: [] }));
  };

  const err = (key: string) => errors[key]?.[0];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (form.password !== form.password_confirmation) {
      setErrors((e) => ({ ...e, password_confirmation: ['The two passwords do not match.'] }));
      return;
    }

    setSubmitting(true);

    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.errors);
      setFormError(apiError.message);
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
            Join the
            <br />
            Central Library
          </h1>
          <p className="mt-4 max-w-md text-body-lg text-white/80">
            Create an account to search the catalog, track your loans and fines, and keep
            your details up to date — no need to visit the desk first.
          </p>

          <ul className="mt-8 space-y-3 text-body-md text-white/80">
            {[
              ['bolt', 'Instant account — start searching right away'],
              ['badge', 'Bring your student card to the desk to activate borrowing'],
              ['manage_accounts', 'Update your own contact details any time'],
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

      {/* ---- Registration panel ------------------------------------------ */}
      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-3/5">
        <div className="w-full max-w-[420px]">
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

          <h2 className="text-headline-xl text-on-surface">Create your account</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Registration is free and instant. Bring your student ID card to the library desk
            afterwards so a librarian can activate borrowing.
          </p>

          {formError && (
            <div className="mt-5">
              <Alert tone="danger" title="Could not create your account">
                {formError}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Full name" htmlFor="full_name" required error={err('full_name')}>
              <Input
                id="full_name"
                autoComplete="name"
                autoFocus
                required
                value={form.full_name}
                onChange={set('full_name')}
                placeholder="Sowmika Islam Suchi"
                invalid={Boolean(err('full_name'))}
              />
            </Field>

            <Field label="Email" htmlFor="email" required error={err('email')}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                invalid={Boolean(err('email'))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" htmlFor="phone" error={err('phone')}>
                <Input
                  id="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="01711-000000"
                  mono
                />
              </Field>

              <Field
                label="Institute / Department"
                htmlFor="department"
                required
                error={err('department')}
              >
                <Input
                  id="department"
                  required
                  value={form.department}
                  onChange={set('department')}
                  placeholder="Computer Science & Engineering"
                  invalid={Boolean(err('department'))}
                />
              </Field>
            </div>

            <Field
              label="Password"
              htmlFor="password"
              required
              error={err('password')}
              hint="At least 8 characters, with letters and numbers."
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                invalid={Boolean(err('password'))}
              />
            </Field>

            <Field
              label="Confirm password"
              htmlFor="password_confirmation"
              required
              error={err('password_confirmation')}
            >
              <Input
                id="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
                value={form.password_confirmation}
                onChange={set('password_confirmation')}
                placeholder="••••••••"
                invalid={Boolean(err('password_confirmation'))}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={submitting} icon="person_add">
              {submitting ? 'Creating your account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
