#!/usr/bin/env node
/**
 * Universal Multi-Player Plugin Test Suite Runner
 *
 * Discovers and executes automated test suites across all player plugins (plugins/*\/test/test-runner.js).
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const PLUGINS_DIR = join(REPO_ROOT, 'plugins');

function main() {
  console.log('🧪 [Ecosystem] Running tests for all player plugins...');

  if (!existsSync(PLUGINS_DIR)) {
    console.log('ℹ No plugins directory found.');
    return;
  }

  const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let passed = 0;
  let failed = 0;

  for (const dirName of pluginDirs) {
    const pluginPath = join(PLUGINS_DIR, dirName);
    const testScript = join(pluginPath, 'test', 'test-runner.js');

    if (existsSync(testScript)) {
      console.log(`\n▶ [${dirName}] Executing test suite: ${relative(REPO_ROOT, testScript)}`);
      try {
        execFileSync(process.execPath, [testScript], {
          cwd: pluginPath,
          stdio: 'inherit',
        });
        passed++;
      } catch (err) {
        console.error(`❌ [${dirName}] Test suite failed!`);
        failed++;
      }
    }
  }

  console.log('\n========================================');
  console.log(`📊 Ecosystem Test Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
