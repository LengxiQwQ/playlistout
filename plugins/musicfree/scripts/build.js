#!/usr/bin/env node
/**
 * PlaylistOut MusicFree Plugin Build & Distribution Script
 * 
 * Copies and bundles the plugin into:
 * - plugins/musicfree/dist/把你的歌单带走-PlaylistOut.js (local release artifact)
 * - web/public/plugins/把你的歌单带走-PlaylistOut.js (production static distribution)
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PLUGIN_ROOT, '../..');

const SRC_FILE = path.join(PLUGIN_ROOT, 'src', 'index.js');
const DIST_DIR = path.join(PLUGIN_ROOT, 'dist');
const DIST_FILE = path.join(DIST_DIR, '把你的歌单带走-PlaylistOut.js');
const WEB_PLUGINS_ROOT = path.join(REPO_ROOT, 'web', 'public', 'plugins');
const WEB_MUSICFREE_DIR = path.join(WEB_PLUGINS_ROOT, 'musicfree');
const WEB_PUBLIC_FILE = path.join(WEB_MUSICFREE_DIR, '把你的歌单带走-PlaylistOut.js');

function build() {
  console.log('📦 Building PlaylistOut MusicFree Plugin...');

  if (!fs.existsSync(SRC_FILE)) {
    console.error(`❌ Source file not found: ${SRC_FILE}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf-8'));
  const rawCode = fs.readFileSync(SRC_FILE, 'utf-8');

  const banner = `/**
 * PlaylistOut Official MusicFree Plugin
 * Version: ${pkg.version}
 * Author: ${pkg.author}
 * Built: ${new Date().toISOString()}
 * Homepage: https://playlistout.lengxiqwq.com
 * Source: https://github.com/LengxiQwQ/playlistout
 */
`;

  const finalCode = banner + '\n' + rawCode.trim() + '\n';

  // Ensure directories exist
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(WEB_PLUGINS_ROOT, { recursive: true });
  fs.mkdirSync(WEB_MUSICFREE_DIR, { recursive: true });

  // Write targets
  fs.writeFileSync(DIST_FILE, finalCode, 'utf-8');
  fs.writeFileSync(WEB_PUBLIC_FILE, finalCode, 'utf-8');
  const versionedArchive = path.join(DIST_DIR, `musicfree-v${pkg.version}.js`);
  fs.writeFileSync(versionedArchive, finalCode, 'utf-8');

  // Generate MusicFree standard subscription descriptor (plugins.json)
  const subscriptionDescriptor = JSON.stringify(
    {
      desc: '把你的歌单带走 官方 MusicFree 歌单导入与原版音源桥接插件订阅源',
      plugins: [
        {
          name: '把你的歌单带走 (PlaylistOut)',
          url: 'https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js',
          version: pkg.version,
        },
      ],
    },
    null,
    2
  ) + '\n';
  fs.writeFileSync(path.join(DIST_DIR, 'plugins.json'), subscriptionDescriptor, 'utf-8');
  fs.writeFileSync(path.join(WEB_MUSICFREE_DIR, 'plugins.json'), subscriptionDescriptor, 'utf-8');
  fs.writeFileSync(path.join(WEB_PLUGINS_ROOT, 'plugins.json'), subscriptionDescriptor, 'utf-8');

  // Sync historical archives (e.g. musicfree-v1.0.0.js, musicfree-v1.1.0.js)
  const distFiles = fs.readdirSync(DIST_DIR);
  for (const file of distFiles) {
    if (file.startsWith('musicfree-v') && file.endsWith('.js')) {
      const srcArchive = path.join(DIST_DIR, file);
      const destArchive = path.join(WEB_PLUGINS_ROOT, file);
      fs.copyFileSync(srcArchive, destArchive);
      console.log(`✔ Synced archive:    ${file} -> ${path.relative(REPO_ROOT, destArchive)}`);
    }
  }

  const distStat = fs.statSync(DIST_FILE);
  const webStat = fs.statSync(WEB_PUBLIC_FILE);

  console.log(`✔ Dist build created: ${path.relative(REPO_ROOT, DIST_FILE)} (${distStat.size} bytes)`);
  console.log(`✔ Web public sync:   ${path.relative(REPO_ROOT, WEB_PUBLIC_FILE)} (${webStat.size} bytes)`);
  console.log(`✔ Subscription JSON: ${path.relative(REPO_ROOT, path.join(WEB_MUSICFREE_DIR, 'plugins.json'))}`);
  console.log('🎉 MusicFree plugin built and deployed to web public directory successfully!\n');
}

build();
