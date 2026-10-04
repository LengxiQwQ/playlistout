#!/usr/bin/env node
/**
 * Universal Multi-Player Plugin Build Runner for PlaylistOut
 *
 * Discovers and builds all player plugins located under plugins/* (e.g. plugins/musicfree, plugins/lx-music, plugins/moosync).
 * Also generates the global ecosystem manifest (web/public/plugins/index.json).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const PLUGINS_DIR = join(REPO_ROOT, 'plugins');
const WEB_PUBLIC_PLUGINS = join(REPO_ROOT, 'web', 'public', 'plugins');

function main() {
  console.log('🌐 [Ecosystem] Building all player plugins across PlaylistOut...');

  if (!existsSync(PLUGINS_DIR)) {
    console.log('ℹ No plugins directory found.');
    return;
  }

  const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const manifest = {
    name: 'PlaylistOut Multi-Platform Plugin Ecosystem',
    homepage: 'https://playlistout.lengxiqwq.com',
    updatedAt: new Date().toISOString(),
    platforms: [],
  };

  for (const dirName of pluginDirs) {
    const pluginPath = join(PLUGINS_DIR, dirName);
    const buildScript = join(pluginPath, 'scripts', 'build.js');

    if (existsSync(buildScript)) {
      console.log(`\n🔨 [${dirName}] Executing plugin build pipeline: ${relative(REPO_ROOT, buildScript)}`);
      execFileSync(process.execPath, [buildScript], {
        cwd: pluginPath,
        stdio: 'inherit',
      });

      // Gather metadata from plugin package.json if present
      const pkgPath = join(pluginPath, 'package.json');
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          manifest.platforms.push({
            id: dirName,
            name: pkg.displayName || dirName,
            version: pkg.version || '1.0.0',
            description: pkg.description || '',
            entrypoint: `https://playlistout.lengxiqwq.com/plugins/${dirName}/把你的歌单带走-PlaylistOut.js`,
            subscriptionUrl: `https://playlistout.lengxiqwq.com/plugins/${dirName}/plugins.json`,
          });
        } catch (_) {}
      }
    }
  }

  // Write universal ecosystem manifest
  mkdirSync(WEB_PUBLIC_PLUGINS, { recursive: true });
  const manifestPath = join(WEB_PUBLIC_PLUGINS, 'index.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`\n✔ Universal ecosystem manifest generated: ${relative(REPO_ROOT, manifestPath)}`);
  console.log('🎉 All ecosystem player plugins built successfully!\n');
}

main();
