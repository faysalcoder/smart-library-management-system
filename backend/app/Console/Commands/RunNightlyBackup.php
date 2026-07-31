<?php

namespace App\Console\Commands;

use App\Services\System\BackupService;
use Illuminate\Console\Command;

/**
 * Security Feasibility §2.10 — "Regular backups and proper monitoring systems
 * are also necessary to protect against data loss due to system failure,
 * accidental deletion, or cyber incidents."
 *
 * Retention matches SYSTEM_ARCHITECTURE.md §13.3: 30 daily copies.
 */
class RunNightlyBackup extends Command
{
    protected $signature = 'slms:backup {--keep=30 : Days of backups to retain}';

    protected $description = 'Create a database backup and prune old ones';

    public function handle(BackupService $backups): int
    {
        $this->info('Creating database backup…');

        try {
            $result = $backups->create();
        } catch (\Throwable $e) {
            $this->error('Backup failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Created {$result['name']} ({$result['size_label']}, {$result['tables']} tables).");

        $removed = $backups->prune((int) $this->option('keep'));

        if ($removed > 0) {
            $this->info("Pruned {$removed} backup(s) older than {$this->option('keep')} days.");
        }

        return self::SUCCESS;
    }
}
