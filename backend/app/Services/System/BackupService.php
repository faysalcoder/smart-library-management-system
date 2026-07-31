<?php

namespace App\Services\System;

use App\Exceptions\DomainException;
use App\Models\User;
use App\Support\AuditAction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * FR-09 / §1.4 — "Manage database backup and recovery".
 * Security Feasibility §2.10 — "Regular backups … to protect against data loss
 * due to system failure, accidental deletion, or cyber incidents."
 *
 * This is a DATA-ONLY backup: it dumps every row from every application table
 * as portable, driver-agnostic INSERT statements. It deliberately does NOT
 * dump or restore schema (CREATE TABLE / DROP TABLE) — restoring assumes the
 * target database's schema already matches (i.e. `php artisan migrate` has
 * been run), which is guaranteed on this project since both environments run
 * off the same migrations.
 *
 * That trade-off is what makes the same code work unmodified against MySQL
 * and PostgreSQL (Supabase): there is no `mysqldump`/`pg_dump` shell-out (often
 * unavailable in the PHP runtime a host gives you) and no vendor-specific DDL
 * introspection (`SHOW CREATE TABLE` has no Postgres equivalent).
 */
class BackupService
{
    private const DISK = 'local';

    private const DIR = 'backups';

    /**
     * Explicit parent-before-child order. Backups are written in this order;
     * restores TRUNCATE in the *reverse* of this order (children first, so no
     * foreign key ever points at a row that has already been removed) and then
     * re-insert in this order (parents first, so every foreign key target
     * exists before the row that references it is inserted).
     */
    private const TABLE_ORDER = [
        'roles', 'permissions', 'role_permission',
        'users', 'personal_access_tokens',
        'authors', 'publishers', 'categories',
        'students',
        'books', 'book_copies',
        'circulations', 'fines',
        'system_settings', 'system_logs',
    ];

    public function __construct(private AuditLogService $audit) {}

    /** @return array<int,array{name:string,size:int,size_label:string,created_at:string}> */
    public function list(): array
    {
        $disk = Storage::disk(self::DISK);

        if (! $disk->exists(self::DIR)) {
            return [];
        }

        $files = collect($disk->files(self::DIR))
            ->filter(fn (string $path) => str_ends_with($path, '.sql'))
            ->map(function (string $path) use ($disk) {
                $size = $disk->size($path);

                return [
                    'name' => basename($path),
                    'size' => $size,
                    'size_label' => $this->humanSize($size),
                    'created_at' => date('Y-m-d H:i:s', $disk->lastModified($path)),
                ];
            })
            ->sortByDesc('created_at')
            ->values()
            ->all();

        return $files;
    }

    /** Creates a full data backup of every application table that currently exists. */
    public function create(?User $actor = null): array
    {
        $tables = array_values(array_filter(self::TABLE_ORDER, fn ($t) => Schema::hasTable($t)));

        if ($tables === []) {
            throw new DomainException('There are no tables to back up. Have migrations been run?');
        }

        $sql = $this->header($tables);
        $rowCount = 0;

        foreach ($tables as $table) {
            [$chunkSql, $count] = $this->dumpTableData($table);
            $sql .= $chunkSql;
            $rowCount += $count;
        }

        $filename = sprintf('slms-backup-%s.sql', now()->format('Ymd-His'));
        $path = self::DIR.'/'.$filename;

        Storage::disk(self::DISK)->put($path, $sql);

        $size = Storage::disk(self::DISK)->size($path);

        $this->audit->record(
            $actor,
            AuditAction::BACKUP_CREATED,
            'backup',
            null,
            sprintf(
                'Created backup "%s" (%s, %d table(s), %d row(s))',
                $filename,
                $this->humanSize($size),
                count($tables),
                $rowCount
            )
        );

        return [
            'name' => $filename,
            'size' => $size,
            'size_label' => $this->humanSize($size),
            'tables' => count($tables),
            'created_at' => now()->toDateTimeString(),
        ];
    }

    public function path(string $filename): string
    {
        $this->guardFilename($filename);

        $path = self::DIR.'/'.$filename;

        if (! Storage::disk(self::DISK)->exists($path)) {
            throw new DomainException('That backup file no longer exists.', [], 404);
        }

        return Storage::disk(self::DISK)->path($path);
    }

    /**
     * Restores a backup. Destructive: every table listed in TABLE_ORDER that
     * exists in the current schema is emptied and repopulated, so the caller
     * must confirm explicitly (enforced in BackupController via a typed
     * "RESTORE" confirmation).
     */
    public function restore(string $filename, ?User $actor = null): array
    {
        $this->guardFilename($filename);

        $path = self::DIR.'/'.$filename;
        $disk = Storage::disk(self::DISK);

        if (! $disk->exists($path)) {
            throw new DomainException('That backup file no longer exists.', [], 404);
        }

        $sql = $disk->get($path);
        $statements = $this->splitStatements($sql);

        if ($statements === []) {
            throw new DomainException('That backup file is empty or unreadable.');
        }

        $existingTables = array_values(array_filter(self::TABLE_ORDER, fn ($t) => Schema::hasTable($t)));
        $executed = 0;
        $driver = DB::connection()->getDriverName();

        DB::transaction(function () use ($statements, $existingTables, $driver, &$executed) {
            // MySQL's TRUNCATE is rejected outright if *any* table still holds a
            // foreign key pointing at the one being truncated — reverse order
            // alone is not enough, since the constraint exists structurally
            // whether or not the referencing table currently has rows. Disable
            // the check for the duration of the restore instead.
            //
            // Postgres needs no equivalent: Laravel's postgres query grammar
            // appends CASCADE to TRUNCATE automatically, which both satisfies
            // the constraint and empties any dependent table early — harmless
            // here since a full restore was going to empty every table anyway.
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0');
            }

            // Empty every table first, children before parents.
            foreach (array_reverse($existingTables) as $table) {
                DB::table($table)->truncate();
            }

            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            }

            // Re-insert in parent-before-child order.
            foreach ($statements as $statement) {
                DB::unprepared($statement);
                $executed++;
            }
        });

        $this->audit->record(
            $actor,
            AuditAction::BACKUP_RESTORED,
            'backup',
            null,
            sprintf('Restored the database from "%s" (%d statement(s))', $filename, $executed)
        );

        return ['statements' => $executed, 'file' => $filename];
    }

    public function delete(string $filename, ?User $actor = null): void
    {
        $this->guardFilename($filename);

        $path = self::DIR.'/'.$filename;

        if (! Storage::disk(self::DISK)->exists($path)) {
            throw new DomainException('That backup file no longer exists.', [], 404);
        }

        Storage::disk(self::DISK)->delete($path);

        $this->audit->record(
            $actor,
            AuditAction::BACKUP_DELETED,
            'backup',
            null,
            "Deleted backup \"{$filename}\""
        );
    }

    /** Removes backups older than the retention window. */
    public function prune(int $keepDays = 30): int
    {
        $cutoff = now()->subDays($keepDays)->timestamp;
        $disk = Storage::disk(self::DISK);
        $removed = 0;

        foreach ($disk->files(self::DIR) as $path) {
            if (str_ends_with($path, '.sql') && $disk->lastModified($path) < $cutoff) {
                $disk->delete($path);
                $removed++;
            }
        }

        return $removed;
    }

    // -----------------------------------------------------------------------

    /** @param array<int,string> $tables */
    private function header(array $tables): string
    {
        return implode("\n", [
            '-- Smart Library Management System — database backup (data only)',
            '-- Driver    : '.DB::connection()->getDriverName(),
            '-- Generated : '.now()->toDateTimeString(),
            '-- Tables    : '.implode(', ', $tables),
            '-- WARNING   : restoring this file empties and repopulates every table',
            '--             above. It assumes the schema already matches (run',
            '--             `php artisan migrate` first) — no CREATE/DROP TABLE',
            '--             statements are included, by design, so this file works',
            '--             identically on MySQL and PostgreSQL.',
            '',
            '',
        ]);
    }

    /** @return array{0:string, 1:int} [sql, row count] */
    private function dumpTableData(string $table): array
    {
        $rows = DB::table($table)->get();

        $sql = "-- ----------------------------------------------------------\n";
        $sql .= "-- Table: {$table} ({$rows->count()} row(s))\n";
        $sql .= "-- ----------------------------------------------------------\n";

        if ($rows->isEmpty()) {
            return [$sql."\n", 0];
        }

        $columns = array_keys((array) $rows->first());
        $columnList = '"'.implode('", "', $columns).'"';

        // Batch inserts so a large table does not produce one statement per row.
        foreach ($rows->chunk(100) as $chunk) {
            $values = [];

            foreach ($chunk as $row) {
                $cells = array_map(
                    fn ($value) => $this->quote($value),
                    array_values((array) $row)
                );

                $values[] = '('.implode(', ', $cells).')';
            }

            $sql .= "INSERT INTO \"{$table}\" ({$columnList}) VALUES\n";
            $sql .= implode(",\n", $values).";\n";
        }

        return [$sql."\n", $rows->count()];
    }

    /**
     * Standard-SQL value quoting (a single quote escapes as two single
     * quotes), valid on both MySQL and PostgreSQL. Deliberately does NOT use
     * backslash-escaping — Postgres treats backslash as a literal character
     * inside a plain quoted string, so MySQL-style `\'` escaping would corrupt
     * the value or break the statement outright.
     */
    private function quote(mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return "'".str_replace("'", "''", (string) $value)."'";
    }

    /**
     * Splits a dump into executable statements. Comment lines are dropped, and
     * a statement ends at a semicolon that closes an even number of quotes.
     *
     * @return array<int,string>
     */
    private function splitStatements(string $sql): array
    {
        $statements = [];
        $buffer = '';
        $inString = false;
        $length = strlen($sql);

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];

            if ($inString) {
                $buffer .= $char;

                // A doubled quote ('') is an escaped quote, not the end of the
                // string — skip the pair so it is not mistaken for a close.
                if ($char === "'") {
                    if (($sql[$i + 1] ?? '') === "'") {
                        $buffer .= "'";
                        $i++;

                        continue;
                    }

                    $inString = false;
                }

                continue;
            }

            if ($char === "'") {
                $inString = true;
                $buffer .= $char;

                continue;
            }

            // Strip full-line comments only when we are not mid-statement.
            if ($char === '-' && substr($sql, $i, 2) === '--' && trim($buffer) === '') {
                $newline = strpos($sql, "\n", $i);
                $i = $newline === false ? $length : $newline;

                continue;
            }

            if ($char === ';') {
                $trimmed = trim($buffer);

                if ($trimmed !== '') {
                    $statements[] = $trimmed;
                }

                $buffer = '';

                continue;
            }

            $buffer .= $char;
        }

        $trailing = trim($buffer);

        if ($trailing !== '') {
            $statements[] = $trailing;
        }

        return $statements;
    }

    /** Blocks path traversal — the filename must be a plain backup name. */
    private function guardFilename(string $filename): void
    {
        if (! preg_match('/^slms-backup-\d{8}-\d{6}\.sql$/', $filename)) {
            throw new DomainException('That is not a valid backup filename.', [], 422);
        }
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1048576) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / 1048576, 2).' MB';
    }
}
