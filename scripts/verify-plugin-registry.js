#!/usr/bin/env node
/**
 * Verifies that the committed Analytics V2 plugin registry matches the plugins
 * currently discovered under the plugins directory.
 *
 * The check compares the blob committed at HEAD (not the working tree, which
 * build:plugins may have just rewritten) against freshly generated content.
 *
 * Run automatically inside the pre-push gate (Web/plugins step).
 */

import { spawnSync } from 'node:child_process';
import { relative, sep } from 'node:path';
import {
  REPO_ROOT,
  GENERATED_REGISTRY_PATH,
  discoverPlugins,
  generateRegisteredPluginsModule,
} from './plugin-utils.js';

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

const plugins = discoverPlugins();
const expected = generateRegisteredPluginsModule(plugins);

const gitPath = relative(REPO_ROOT, GENERATED_REGISTRY_PATH).split(sep).join('/');

const headResult = spawnSync('git', ['show', `HEAD:${gitPath}`], {
  cwd: REPO_ROOT,
  encoding: 'utf-8',
});

if (headResult.status !== 0) {
  fail(
    `The generated plugin registry is not committed at ${gitPath}.\n` +
    '  Run "npm run build:plugins" and commit the generated file.',
  );
}

if (headResult.stdout !== expected) {
  fail(
    `The committed plugin registry is stale: ${gitPath}\n` +
    '  Run "npm run build:plugins" and commit the regenerated file.',
  );
}

console.log('✔ Registered plugin registry matches discovered plugins');
