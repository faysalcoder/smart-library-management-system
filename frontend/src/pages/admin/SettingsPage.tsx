import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError } from '@/lib/api';
import { adminApi } from '@/lib/services';
import { humanise } from '@/lib/format';
import { useAuth } from '@/store/auth';

const GROUP_META: Record<string, { title: string; icon: string; description: string }> = {
  circulation: {
    title: 'Circulation policy',
    icon: 'swap_horiz',
    description: 'Loan duration, borrowing limits and renewals.',
  },
  fines: {
    title: 'Fine policy',
    icon: 'payments',
    description: 'How overdue charges are calculated and when borrowing is blocked.',
  },
  hours: {
    title: 'Library hours',
    icon: 'schedule',
    description: 'Opening and closing times shown to members.',
  },
  security: {
    title: 'Security',
    icon: 'shield',
    description: 'Session timeout and sign-in lockout thresholds.',
  },
};

/**
 * S-19 — System Settings (FR-09).
 */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const loadSettings = useAuth((s) => s.loadSettings);

  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: groups, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: adminApi.settings,
  });

  // Seed the draft from the server values once they arrive.
  useEffect(() => {
    if (!groups) return;

    const initial: Record<string, string> = {};

    Object.values(groups).forEach((items) => {
      items.forEach((item) => {
        initial[item.key] = String(item.value ?? '');
      });
    });

    setDraft(initial);
  }, [groups]);

  const save = useMutation({
    mutationFn: () => adminApi.updateSettings(draft),
    onSuccess: () => {
      toast.success('Settings saved. Changes apply to new transactions only.');
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void loadSettings();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (isLoading) return <Spinner label="Loading settings…" />;

  // Detect unsaved changes so the save bar only appears when it is needed.
  const original: Record<string, string> = {};
  Object.values(groups ?? {}).forEach((items) => {
    items.forEach((item) => {
      original[item.key] = String(item.value ?? '');
    });
  });

  const dirty = Object.keys(draft).some((key) => draft[key] !== original[key]);

  const fineKeysChanged = ['fine_rate_per_day', 'fine_grace_days', 'fine_max_cap'].some(
    (key) => draft[key] !== original[key],
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="System Settings"
        subtitle="Library policy values. Changes take effect immediately for new transactions."
      />

      {fineKeysChanged && (
        <Alert tone="info" title="Fine changes apply to new fines only">
          Existing fines keep the rate that was recorded when they were assessed, so historical
          records never change retroactively.
        </Alert>
      )}

      {Object.entries(groups ?? {}).map(([group, items]) => {
        const meta = GROUP_META[group] ?? {
          title: humanise(group),
          icon: 'tune',
          description: '',
        };

        return (
          <Card key={group}>
            <CardHeader title={meta.title} subtitle={meta.description} icon={meta.icon} />

            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <Field
                  key={item.key}
                  label={item.label ?? humanise(item.key)}
                  htmlFor={item.key}
                  hint={
                    item.default !== null && item.default !== undefined
                      ? `${item.description ?? ''} Default: ${item.default}`.trim()
                      : (item.description ?? undefined)
                  }
                >
                  <Input
                    id={item.key}
                    type={
                      item.type === 'int' || item.type === 'decimal'
                        ? 'number'
                        : item.key.includes('time')
                          ? 'time'
                          : 'text'
                    }
                    step={item.type === 'decimal' ? '0.01' : undefined}
                    min={item.type === 'int' || item.type === 'decimal' ? '0' : undefined}
                    value={draft[item.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                    mono={item.type === 'int' || item.type === 'decimal'}
                  />
                </Field>
              ))}
            </div>
          </Card>
        );
      })}

      {/* ---- Sticky save bar (only when dirty) --------------------------- */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-modal">
          <span className="flex items-center gap-2 px-2 text-body-md text-on-surface-variant">
            <Icon name="edit_note" className="text-[18px]" />
            You have unsaved changes
          </span>
          <Button variant="ghost" onClick={() => setDraft(original)}>
            Discard
          </Button>
          <Button icon="save" loading={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
