#!/usr/bin/env node
/**
 * Install Git Pre-Push Hook for PlaylistOut
 * Ensures local pre-push CI gate runs before any git push.
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const HOOKS_DIR = join(REPO_ROOT, '.git', 'hooks');

if (!existsSync(join(REPO_ROOT, '.git'))) {
  console.log('[setup-hooks] Not a git repository. Skipping hook installation.');
  process.exit(0);
}

mkdirSync(HOOKS_DIR, { recursive: true });

const prePushScript = `#!/bin/sh
# PlaylistOut Git Pre-Push Hook
# Runs the exact local CI gate before pushing to remote.

echo "[git pre-push] Running PlaylistOut Pre-Push CI Gate..."
node scripts/ci-gate.js
status=$?

if [ $status -ne 0 ]; then
  echo ""
  echo "[git pre-push] ❌ Pre-push gate failed. Aborting push to protect remote CI."
  echo "[git pre-push] Fix the errors above and try again."
  exit 1
fi

echo "[git pre-push] ✔ Gate passed. Proceeding with push."
exit 0
`;

const hookPath = join(HOOKS_DIR, 'pre-push');
writeFileSync(hookPath, prePushScript, { encoding: 'utf-8' });

try {
  chmodSync(hookPath, 0o755);
} catch {
  // Ignored on Windows
}

console.log('[setup-hooks] ✔ Git pre-push hook installed at .git/hooks/pre-push');
