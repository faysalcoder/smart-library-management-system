#!/usr/bin/env node
/**
 * One-command deploy: stage everything, write a commit message describing
 * what actually changed (derived from the real diff, not a placeholder),
 * commit, push to GitHub, then redeploy the backend (Railway) and frontend
 * (Vercel) so the live URLs match what was just pushed.
 *
 * Usage: npm run deploy
 *        npm run deploy -- --message "custom message"   (skip auto-generation)
 *        npm run deploy -- --skip-backend
 *        npm run deploy -- --skip-frontend
 *        npm run deploy -- --no-push                    (commit only, local)
 */

const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function section(title) {
  console.log(`\n\x1b[36m${'─'.repeat(2)} ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}\x1b[0m`);
}

/**
 * Runs a command with inherited stdio (so the user sees live output), and
 * throws with a clear label on non-zero exit rather than a raw stack trace.
 */
function run(label, command, cmdArgs, cwd) {
  console.log(`\x1b[90m$ ${command} ${cmdArgs.join(' ')}\x1b[0m`);
  const result = spawnSync(command, cmdArgs, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status}).`);
  }
}

// ---------------------------------------------------------------------------
// 1. Stage everything and describe what changed
// ---------------------------------------------------------------------------

function bucketOf(filePath) {
  const top = filePath.split('/')[0];
  if (['backend', 'frontend', 'docs', 'scripts'].includes(top)) return top;
  if (top === 'stitch_la_librer_a_slms') return 'design';
  return 'root';
}

const STATUS_LABEL = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
  C: 'copied',
};

/** Builds a commit message purely from `git diff --cached --name-status`. */
function buildCommitMessage() {
  const raw = git(['diff', '--cached', '--name-status']).trim();

  if (!raw) return null;

  /** @type {Record<string, {added:string[], modified:string[], deleted:string[], renamed:string[], copied:string[]}>} */
  const buckets = {};
  const allFiles = [];

  for (const line of raw.split('\n')) {
    const parts = line.split('\t');
    const statusCode = parts[0][0]; // R100 -> R, M -> M, etc.
    const filePath = statusCode === 'R' || statusCode === 'C' ? parts[2] : parts[1];
    const label = STATUS_LABEL[statusCode] ?? 'changed';

    const bucket = bucketOf(filePath);
    buckets[bucket] ??= { added: [], modified: [], deleted: [], renamed: [], copied: [] };
    buckets[bucket][label]?.push(filePath);
    allFiles.push(filePath);
  }

  const bucketNames = Object.keys(buckets);

  // ---- Title -------------------------------------------------------------
  let title;
  if (allFiles.length <= 3) {
    // Few enough files to name them directly — more useful than a bucket summary.
    const names = allFiles.map((f) => path.basename(f)).join(', ');
    title = `Update ${names}`;
  } else if (bucketNames.length === 1) {
    title = `Update ${bucketNames[0]} (${allFiles.length} file${allFiles.length === 1 ? '' : 's'})`;
  } else {
    title = `Update ${bucketNames.join(', ')} (${allFiles.length} files)`;
  }

  if (title.length > 72) {
    title = `Update ${allFiles.length} file(s) across ${bucketNames.join(', ')}`;
  }

  // ---- Body: one line per bucket ------------------------------------------
  const bodyLines = bucketNames.map((name) => {
    const b = buckets[name];
    const parts = [];
    if (b.added.length) parts.push(`${b.added.length} added`);
    if (b.modified.length) parts.push(`${b.modified.length} modified`);
    if (b.deleted.length) parts.push(`${b.deleted.length} deleted`);
    if (b.renamed.length) parts.push(`${b.renamed.length} renamed`);
    if (b.copied.length) parts.push(`${b.copied.length} copied`);
    return `- ${name}: ${parts.join(', ')}`;
  });

  return [title, '', ...bodyLines, '', 'Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>'].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  section('Staging changes');
  git(['add', '-A']);

  const customMessage = value('message');
  const message = customMessage ?? buildCommitMessage();

  if (message === null) {
    console.log('Nothing to commit — working tree matches the last commit.');
  } else {
    section('Committing');
    console.log(message.split('\n').map((l) => `  ${l}`).join('\n'));
    git(['commit', '-m', message]);

    if (!flag('no-push')) {
      section('Pushing to GitHub');
      run('git push', 'git', ['push'], ROOT);
    } else {
      console.log('(--no-push given — skipping push)');
    }
  }

  if (!flag('skip-backend')) {
    section('Redeploying backend (Railway)');
    run('railway up', 'npx', ['--yes', '@railway/cli', 'up', '--detach'], BACKEND);
  } else {
    console.log('\n(--skip-backend given — leaving Railway as-is)');
  }

  if (!flag('skip-frontend')) {
    section('Rebuilding frontend for production');
    run('vercel pull', 'npx', ['--yes', 'vercel', 'pull', '--yes', '--environment', 'production'], FRONTEND);
    run('vercel build', 'npx', ['--yes', 'vercel', 'build', '--prod'], FRONTEND);

    section('Deploying frontend (Vercel)');
    run('vercel deploy', 'npx', ['--yes', 'vercel', 'deploy', '--prebuilt', '--prod'], FRONTEND);
  } else {
    console.log('\n(--skip-frontend given — leaving Vercel as-is)');
  }

  section('Done');
  console.log('Backend : https://slms-backend-production.up.railway.app');
  console.log('Frontend: https://slms-frontend-ashy.vercel.app');
}

try {
  main();
} catch (err) {
  console.error(`\n\x1b[31mDeploy stopped: ${err.message}\x1b[0m`);
  process.exit(1);
}
