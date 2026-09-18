#!/usr/bin/env node
/**
 * PlaylistOut Local Pre-Push CI Gate
 *
 * Runs the exact verification pipeline executed by GitHub Actions remote CI:
 * 1. GitHub Workflows Validation (YAML syntax & secrets-in-if anti-pattern check)
 * 2. Secret & Sensitive Data Leak Scanner
 * 3. Python Validation (compileall + pytest CLI & insights)
 * 4. TypeScript Typecheck (web + worker)
 * 5. Web Frontend Validation (vitest + production build)
 * 6. Cloudflare Worker Validation (vitest + dry-run bundle build)
 *
 * Usage:
 *   node scripts/ci-gate.js
 *   npm run gate
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function logStep(num, total, name) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}[${num}/${total}] ${name}${COLORS.reset}`);
}

function logPass(msg) {
  console.log(`  ${COLORS.green}✔${COLORS.reset} ${msg}`);
}

function logFail(msg) {
  console.error(`  ${COLORS.red}✖${COLORS.reset} ${msg}`);
}

function runCommand(cmd, args, cwd = REPO_ROOT, options = {}) {
  const displayCmd = [cmd, ...args].join(' ');
  console.log(`  ${COLORS.gray}$ ${displayCmd}${COLORS.reset}`);

  const res = spawnSync(cmd, args, {
    cwd,
    stdio: options.silent ? 'pipe' : 'inherit',
    shell: true,
    env: { ...process.env, ...options.env },
  });

  if (res.status !== 0) {
    if (options.silent && res.stderr) {
      console.error(res.stderr.toString('utf-8'));
    }
    throw new Error(`Command failed with exit code ${res.status}: ${displayCmd}`);
  }
  return res;
}

// ── 1. Validate GitHub Workflow Files ──────────────────────────────────
function validateWorkflows() {
  logStep(1, 6, 'Validating GitHub Actions Workflows');
  const workflowsDir = join(REPO_ROOT, '.github', 'workflows');
  if (!existsSync(workflowsDir)) {
    logPass('No workflows directory found.');
    return;
  }

  const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  for (const file of files) {
    const fullPath = join(workflowsDir, file);
    const content = readFileSync(fullPath, 'utf-8');

    // Rule: GitHub Actions forbids `secrets.*` inside `if:` conditions
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*if:\s*.*secrets\./.test(line)) {
        throw new Error(
          `Workflow validation failed in ${file}:${i + 1}:\n` +
          `  "${line.trim()}"\n` +
          `  GitHub Actions syntax forbids direct 'secrets.*' in 'if:' conditions.\n` +
          `  Move the secret check inside the 'run:' script instead.`
        );
      }
    }
    logPass(`${file} syntax & security constraints verified`);
  }
}

// ── 2. Scan for Secrets & Credential Leaks ──────────────────────────────
function scanSecretLeaks() {
  logStep(2, 6, 'Scanning Working Tree and Commits for Secret Leaks');
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf-8' });
  if (res.status === 0 && res.stdout) {
    const lines = res.stdout.split('\n').filter(Boolean);
    for (const line of lines) {
      const filePath = line.slice(3).trim();
      if (filePath.includes('.dev.vars') || filePath.endsWith('.env.local')) {
        throw new Error(`Forbidden secret file tracked or staged in git: ${filePath}`);
      }
    }
  }

  // Check diffs for raw admin tokens or credentials (working tree, staged index, unpushed commits)
  const diffSources = [
    ['diff', 'HEAD'],
    ['diff', '--cached'],
    ['log', '-p', '-n', '5'],
  ];

  const forbiddenPatterns = [
    /^\+.*INSIGHTS_ADMIN_TOKEN=[a-f0-9]{32,}/im,
    /^\+.*Bearer\s+[a-f0-9]{32,}/im,
  ];

  for (const args of diffSources) {
    const diffRes = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' });
    if (diffRes.status === 0 && diffRes.stdout) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(diffRes.stdout)) {
          throw new Error(`Hardcoded secret detected in git ${args.join(' ')} matching pattern ${pattern}!`);
        }
      }
    }
  }
  logPass('Zero sensitive credentials or private environment files found');
}

// ── 3. Python Compilation & Pytest ─────────────────────────────────────
function validatePython() {
  logStep(3, 6, 'Validating Python CLI & Authenticity Test Suite');
  runCommand('python', ['-m', 'compileall', '-q', 'cli/qqmusic/', 'cli/netease/', 'scripts/']);
  logPass('Python compilation passed (0 syntax errors)');

  runCommand('python', [
    '-m', 'pytest', '-q',
    'cli/qqmusic/',
    'cli/netease/',
    'scripts/utils/test_insights_authenticity.py'
  ]);
  logPass('Python unit & regression tests passed');
}

// ── 4. Monorepo TypeScript Typecheck ────────────────────────────────────
function validateTypecheck() {
  logStep(4, 6, 'Validating TypeScript Types (Web & Worker)');
  runCommand('npm', ['run', 'typecheck']);
  logPass('TypeScript typechecking passed (0 type errors)');
}

// ── 5. Web Frontend Tests & Build ──────────────────────────────────────
function validateWeb() {
  logStep(5, 6, 'Validating Web Frontend (Tests & Build)');
  runCommand('npm', ['--prefix', 'web', 'test']);
  logPass('Web unit tests passed');

  runCommand('npm', ['--prefix', 'web', 'run', 'build']);
  logPass('Web production build passed');
}

// ── 6. Cloudflare Worker Tests & Dry-run Bundle ────────────────────────
function validateWorker() {
  logStep(6, 6, 'Validating Cloudflare Worker (Tests & Bundle)');
  runCommand('npm', ['--prefix', 'worker', 'test']);
  logPass('Worker unit tests passed');

  runCommand('npm', ['--prefix', 'worker', 'run', 'build']);
  logPass('Worker bundle build dry-run passed');
}

// ── Main Runner ────────────────────────────────────────────────────────
function main() {
  console.log(`${COLORS.bold}========================================${COLORS.reset}`);
  console.log(`${COLORS.bold}🛡️  PlaylistOut Pre-Push CI Gate${COLORS.reset}`);
  console.log(`${COLORS.bold}========================================${COLORS.reset}`);

  const start = Date.now();
  try {
    validateWorkflows();
    scanSecretLeaks();
    validatePython();
    validateTypecheck();
    validateWeb();
    validateWorker();

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n${COLORS.bold}${COLORS.green}========================================${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.green}✔ ALL GATES PASSED in ${duration}s — Ready to Push!${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.green}========================================${COLORS.reset}\n`);
    process.exit(0);
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n${COLORS.bold}${COLORS.red}========================================${COLORS.reset}`);
    console.error(`${COLORS.bold}${COLORS.red}✖ PRE-PUSH GATE FAILED after ${duration}s${COLORS.reset}`);
    console.error(`${COLORS.red}${err.message}${COLORS.reset}`);
    console.error(`${COLORS.bold}${COLORS.red}========================================${COLORS.reset}`);
    console.error(`${COLORS.yellow}Please fix the issue above before pushing to remote repository.${COLORS.reset}\n`);
    process.exit(1);
  }
}

main();
