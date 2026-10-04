#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const REPO_ROOT = resolve(import.meta.dirname, '..');
export const PLUGINS_DIR = join(REPO_ROOT, 'plugins');
export const WEB_PUBLIC_PLUGINS = join(REPO_ROOT, 'web', 'public', 'plugins');
export const PUBLIC_PLUGIN_BASE_URL = (
  process.env.PLAYLISTOUT_PLUGIN_BASE_URL ||
  'https://playlistout.lengxiqwq.com/plugins'
).replace(/\/+$/, '');

const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const CONFIG_FILE = 'plugin.config.json';
const ALLOWED_ROLES = new Set(['entrypoint', 'subscription', 'asset']);

function fail(message) {
  throw new Error(`[plugin-architecture] ${message}`);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`${label} must be a non-empty string`);
  }
}

function assertSafeRelativePath(value, label) {
  assertNonEmptyString(value, label);

  if (value.includes('\\') || value.startsWith('/')) {
    fail(`${label} must use a forward-slash relative path`);
  }

  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    fail(`${label} contains an unsafe path segment`);
  }
}

function validateWebMetadata(web, pluginId) {
  if (web === undefined) return;
  if (!web || typeof web !== 'object' || Array.isArray(web)) {
    fail(`${pluginId}: web must be an object when provided`);
  }

  for (const key of ['homepageUrl', 'repositoryUrl', 'guideUrl', 'logoUrl']) {
    if (web[key] !== undefined) {
      assertNonEmptyString(web[key], `${pluginId}: web.${key}`);
    }
  }

  if (web.summary !== undefined) {
    if (!web.summary || typeof web.summary !== 'object' || Array.isArray(web.summary)) {
      fail(`${pluginId}: web.summary must be an object`);
    }

    for (const [locale, summary] of Object.entries(web.summary)) {
      assertNonEmptyString(summary, `${pluginId}: web.summary.${locale}`);
    }
  }
}

function validatePluginConfig(config, dirName) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    fail(`${dirName}: ${CONFIG_FILE} must contain an object`);
  }

  if (config.schemaVersion !== 1) {
    fail(`${dirName}: unsupported plugin config schemaVersion ${String(config.schemaVersion)}`);
  }

  assertNonEmptyString(config.id, `${dirName}: id`);
  if (config.id !== dirName) {
    fail(`${dirName}: config id must exactly match its directory name`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.id)) {
    fail(`${dirName}: id must use lowercase kebab-case`);
  }

  assertNonEmptyString(config.displayName, `${dirName}: displayName`);

  const artifacts = config.distribution?.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    fail(`${dirName}: distribution.artifacts must contain at least one artifact`);
  }

  const publicPaths = new Set();
  let entrypointCount = 0;
  let subscriptionCount = 0;

  for (const [index, artifact] of artifacts.entries()) {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      fail(`${dirName}: artifact #${index + 1} must be an object`);
    }

    assertNonEmptyString(artifact.role, `${dirName}: artifact #${index + 1} role`);
    if (!ALLOWED_ROLES.has(artifact.role)) {
      fail(`${dirName}: artifact #${index + 1} has unsupported role "${artifact.role}"`);
    }

    assertSafeRelativePath(artifact.source, `${dirName}: artifact #${index + 1} source`);
    if (!artifact.source.startsWith('dist/')) {
      fail(`${dirName}: artifact #${index + 1} source must live under dist/`);
    }

    assertSafeRelativePath(artifact.publicPath, `${dirName}: artifact #${index + 1} publicPath`);
    if (publicPaths.has(artifact.publicPath)) {
      fail(`${dirName}: duplicate publicPath "${artifact.publicPath}"`);
    }
    publicPaths.add(artifact.publicPath);

    if (artifact.role === 'entrypoint') entrypointCount += 1;
    if (artifact.role === 'subscription') subscriptionCount += 1;
  }

  if (entrypointCount !== 1) {
    fail(`${dirName}: exactly one artifact must use role "entrypoint"`);
  }
  if (subscriptionCount > 1) {
    fail(`${dirName}: at most one artifact may use role "subscription"`);
  }

  validateWebMetadata(config.web, dirName);
}

function validatePackage(pkg, dirName) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    fail(`${dirName}: package.json must contain an object`);
  }
  assertNonEmptyString(pkg.name, `${dirName}: package.json name`);
  assertNonEmptyString(pkg.version, `${dirName}: package.json version`);

  for (const scriptName of ['build', 'test']) {
    assertNonEmptyString(pkg.scripts?.[scriptName], `${dirName}: package.json scripts.${scriptName}`);
  }
}

export function discoverPlugins() {
  if (!existsSync(PLUGINS_DIR)) return [];

  const directories = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return directories.map((dirName) => {
    const pluginPath = join(PLUGINS_DIR, dirName);
    const configPath = join(pluginPath, CONFIG_FILE);
    const packagePath = join(pluginPath, 'package.json');

    if (!existsSync(configPath)) {
      fail(`${dirName}: missing ${CONFIG_FILE}; every plugin directory must be self-describing`);
    }
    if (!existsSync(packagePath)) {
      fail(`${dirName}: missing package.json`);
    }

    const config = readJson(configPath, `${dirName}/${CONFIG_FILE}`);
    const pkg = readJson(packagePath, `${dirName}/package.json`);

    validatePluginConfig(config, dirName);
    validatePackage(pkg, dirName);

    return {
      id: config.id,
      dirName,
      pluginPath,
      configPath,
      packagePath,
      config,
      pkg,
    };
  });
}

function dependencyCount(pkg) {
  return ['dependencies', 'devDependencies', 'optionalDependencies']
    .map((key) => Object.keys(pkg[key] || {}).length)
    .reduce((sum, count) => sum + count, 0);
}

export function ensurePluginDependencies(plugin) {
  if (dependencyCount(plugin.pkg) === 0) return;

  const lockCandidates = ['package-lock.json', 'npm-shrinkwrap.json'];
  const lockName = lockCandidates.find((name) => existsSync(join(plugin.pluginPath, name)));
  if (!lockName) {
    fail(
      `${plugin.id}: plugin has npm dependencies but no package-lock.json/npm-shrinkwrap.json; ` +
      'commit a plugin-local lockfile so clean CI builds remain deterministic',
    );
  }

  const lockPath = join(plugin.pluginPath, lockName);
  const packageBytes = readFileSync(plugin.packagePath);
  const lockBytes = readFileSync(lockPath);
  const digest = createHash('sha256')
    .update(packageBytes)
    .update(lockBytes)
    .digest('hex');

  const nodeModulesDir = join(plugin.pluginPath, 'node_modules');
  const stampPath = join(nodeModulesDir, '.playlistout-plugin-deps.sha256');
  if (existsSync(stampPath) && readFileSync(stampPath, 'utf-8').trim() === digest) {
    return;
  }

  console.log(`📦 [${plugin.id}] Installing plugin-local dependencies with npm ci...`);
  execFileSync(NPM_COMMAND, ['ci'], {
    cwd: plugin.pluginPath,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  mkdirSync(nodeModulesDir, { recursive: true });
  writeFileSync(stampPath, `${digest}\n`, 'utf-8');
}

export function runPluginScript(plugin, scriptName, extraEnv = {}) {
  execFileSync(NPM_COMMAND, ['run', scriptName], {
    cwd: plugin.pluginPath,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
}

export function resolvePluginPath(plugin, relativePath) {
  const resolved = resolve(plugin.pluginPath, relativePath);
  const prefix = plugin.pluginPath.endsWith(sep) ? plugin.pluginPath : `${plugin.pluginPath}${sep}`;
  if (!resolved.startsWith(prefix)) {
    fail(`${plugin.id}: resolved path escapes plugin directory: ${relativePath}`);
  }
  return resolved;
}

export function publicPluginUrl(pluginId, publicPath) {
  return `${PUBLIC_PLUGIN_BASE_URL}/${pluginId}/${publicPath}`;
}
