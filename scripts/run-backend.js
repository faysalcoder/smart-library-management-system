#!/usr/bin/env node
/**
 * Starts `php artisan serve` for the backend, resolving the PHP binary
 * explicitly instead of trusting the caller's PATH.
 *
 * Why: on Windows, PATH changes made via setx / [Environment]::SetEnvironment-
 * Variable(... "User") only apply to processes started *after* the change —
 * a terminal that was already open keeps its stale PATH. Rather than make
 * "restart your terminal first" a precondition for `npm run dev`, this script
 * falls back to the common install locations directly.
 */

const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');

const CANDIDATES = [
  'php', // resolved via PATH, if it's current in this process
  'C:\\xampp\\php\\php.exe',
  'C:\\php\\php.exe',
  'C:\\php8\\php.exe',
  '/usr/bin/php',
  '/usr/local/bin/php',
];

function resolvePhp() {
  for (const candidate of CANDIDATES) {
    try {
      if (candidate === 'php') {
        execFileSync(candidate, ['--version'], { stdio: 'ignore' });
        return candidate;
      }
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Not resolvable this way — try the next candidate.
    }
  }
  return null;
}

const php = resolvePhp();

if (!php) {
  console.error(
    [
      '\x1b[31mCould not find a PHP executable.\x1b[0m',
      '',
      'Checked PATH and these common locations:',
      ...CANDIDATES.slice(1).map((c) => `  - ${c}`),
      '',
      'Install PHP 8.2+ (e.g. via XAMPP: https://www.apachefriends.org/) and',
      'either add it to your PATH or edit scripts/run-backend.js to add its',
      'location to the CANDIDATES list.',
    ].join('\n')
  );
  process.exit(1);
}

console.log(`\x1b[90mUsing PHP: ${php}\x1b[0m`);

const child = spawn(php, ['artisan', 'serve'], {
  cwd: BACKEND_DIR,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
