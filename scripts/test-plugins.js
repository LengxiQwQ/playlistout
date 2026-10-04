#!/usr/bin/env node
/**
 * Runs every plugin's own test script.
 *
 * Discovery is driven by plugin.config.json/package.json rather than a hardcoded
 * player name or test filename, so different player SDKs can use different layouts.
 */

import {
  discoverPlugins,
  ensurePluginDependencies,
  runPluginScript,
} from './plugin-utils.js';

function main() {
  console.log('🧪 [Ecosystem] Running player plugin test suites...');

  const plugins = discoverPlugins();
  let passed = 0;
  let failed = 0;

  for (const plugin of plugins) {
    ensurePluginDependencies(plugin);

    console.log(`\n▶ [${plugin.id}] npm test`);
    try {
      runPluginScript(plugin, 'test');
      passed += 1;
    } catch {
      console.error(`❌ [${plugin.id}] Test suite failed.`);
      failed += 1;
    }
  }

  console.log('\n========================================');
  console.log(`📊 Ecosystem Test Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

main();
