import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  SkeletonRows,
  StatTile,
} from '@/components/ui';
import { toast } from '@/components/layout/Toast';
import { toApiError, tokenStore } from '@/lib/api';
import { adminApi } from '@/lib/services';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/store/auth';
import type { BackupFile } from '@/types';

/**
 * S-21 — Backup & Restore.
 *
 * §1.4 Administrator Requirements: "Manage database backup and recovery".
 * §2.10 Security Feasibility: "Regular backups … to protect against data loss
 * due to system failure, accidental deletion, or cyber incidents."
 */
export default function BackupPage() {
  const queryClient = useQueryClient();
  const logout = useAuth((s) => s.logout);

  const [restoring, setRestoring] = useState<BackupFile | null>(null);
  const [deleting, setDeleting] = useState<BackupFile | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: adminApi.backups,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['backups'] });

  const create = useMutation({
    mutationFn: adminApi.createBackup,
    onSuccess: (result) => {
      toast.success(`Backup created (${result.size_label}, ${result.tables} tables).`);
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const restore = useMutation({
    mutationFn: (file: BackupFile) => adminApi.restoreBackup(file.name),
    onSuccess: async () => {
      setRestoring(null);
      setConfirmText('');
      toast.success('Database restored. Signing you out…');

      // The restored database contains the token table as it was AT BACKUP
      // TIME, so the current session almost certainly no longer exists.
      setTimeout(async () => {
        await logout();
        window.location.href = '/login';
      }, 1800);
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const remove = useMutation({
    mutationFn: (file: BackupFile) => adminApi.deleteBackup(file.name),
    onSuccess: () => {
      toast.success('Backup deleted.');
      setDeleting(null);
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const download = async (file: BackupFile) => {
    try {
      const response = await fetch(adminApi.backupDownloadUrl(file.name), {
        headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` },
      });

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error('Could not download that backup.');
    }
  };

  const backups = data?.backups ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Restore"
        subtitle="Protect library data against hardware failure, accidental deletion and cyber incidents."
        action={
          <Button icon="backup" loading={create.isPending} onClick={() => create.mutate()}>
            Create backup now
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Backups stored"
          value={summary?.count ?? 0}
          icon="database"
          tone={(summary?.count ?? 0) > 0 ? 'success' : 'danger'}
        />
        <StatTile
          label="Most recent"
          value={summary?.latest ? formatDateTime(summary.latest) : 'None yet'}
          icon="schedule"
          tone={summary?.latest ? 'info' : 'danger'}
        />
        <StatTile
          label="Total size"
          value={
            summary?.total_size
              ? `${(summary.total_size / 1048576).toFixed(2)} MB`
              : '0 MB'
          }
          icon="storage"
          tone="neutral"
        />
      </div>

      {backups.length === 0 && !isLoading && (
        <Alert tone="danger" title="No backups exist yet">
          The library database is currently unprotected. Create a backup now, and make sure the
          nightly scheduled backup is running.
        </Alert>
      )}

      <Alert tone="info" title="Automated nightly backups">
        A backup runs automatically at 02:00 each night and 30 days are retained. That requires
        Laravel's scheduler to be registered on the server:
        <code className="mt-1 block rounded bg-surface-container px-2 py-1 font-mono text-body-sm">
          * * * * * cd /path/to/backend &amp;&amp; php artisan schedule:run
        </code>
        You can also run <code className="font-mono">php artisan slms:backup</code> manually at any
        time.
      </Alert>

      <Card padded={false}>
        <div className="p-6 pb-0">
          <CardHeader
            title="Stored backups"
            subtitle="Newest first. Download a copy off this machine for true off-site safety."
            icon="database"
          />
        </div>

        {isLoading ? (
          <SkeletonRows rows={4} cols={4} />
        ) : backups.length === 0 ? (
          <EmptyState
            icon="database"
            title="No backups yet"
            description="Create your first backup to protect the catalog, member records and circulation history."
            action={
              <Button icon="backup" loading={create.isPending} onClick={() => create.mutate()}>
                Create backup now
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-md">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-left">
                  <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">
                    Backup file
                  </th>
                  <th className="px-4 py-3 text-label-md uppercase text-on-surface-variant">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">
                    Size
                  </th>
                  <th className="px-4 py-3 text-right text-label-md uppercase text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((file, index) => (
                  <tr
                    key={file.name}
                    className="border-b border-surface-container last:border-0 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon name="description" className="text-[18px] text-on-surface-variant" />
                        <span className="font-mono text-body-sm text-on-surface">{file.name}</span>
                        {index === 0 && (
                          <span className="rounded-full bg-success-container px-2 py-0.5 text-[11px] font-semibold uppercase text-on-success-container">
                            Latest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                      {formatDateTime(file.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right tabular text-on-surface">
                      {file.size_label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="download"
                          onClick={() => download(file)}
                          aria-label={`Download ${file.name}`}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon="restore"
                          onClick={() => {
                            setRestoring(file);
                            setConfirmText('');
                          }}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="delete"
                          onClick={() => setDeleting(file)}
                          aria-label={`Delete ${file.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Restore confirmation (destructive) -------------------------- */}
      <Modal
        open={Boolean(restoring)}
        onClose={() => {
          setRestoring(null);
          setConfirmText('');
        }}
        title="Restore the database?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRestoring(null);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="restore"
              disabled={confirmText !== 'RESTORE'}
              loading={restore.isPending}
              onClick={() => restoring && restore.mutate(restoring)}
            >
              Restore database
            </Button>
          </>
        }
      >
        {restoring && (
          <div className="space-y-4">
            <Alert tone="danger" title="This replaces the entire database">
              Every table is dropped and rebuilt from{' '}
              <span className="font-mono">{restoring.name}</span> (taken{' '}
              {formatDateTime(restoring.created_at)}).
              <strong className="mt-1 block">
                All books, members, loans and fines recorded since that moment will be lost.
              </strong>
            </Alert>

            <p className="text-body-md text-on-surface-variant">
              Consider creating a fresh backup first, so you can undo this if it turns out to be
              the wrong file. Everyone will be signed out when the restore finishes.
            </p>

            <Field label="Type RESTORE to confirm" htmlFor="confirm" required>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                mono
                autoFocus
                invalid={confirmText.length > 0 && confirmText !== 'RESTORE'}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ---- Delete confirmation ------------------------------------------ */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this backup?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="delete"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting)}
            >
              Delete backup
            </Button>
          </>
        }
      >
        {deleting && (
          <p className="text-body-md text-on-surface">
            Permanently delete <span className="font-mono">{deleting.name}</span> (
            {deleting.size_label}, taken {formatDateTime(deleting.created_at)})? If this is your
            only backup, the database will be left unprotected.
          </p>
        )}
      </Modal>
    </div>
  );
}
