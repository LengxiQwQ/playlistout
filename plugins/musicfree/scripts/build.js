#!/usr/bin/env node
/**
 * MusicFree-specific build.
 *
 * This script owns only plugins/musicfree/dist. Publishing into web/public/plugins
 * is intentionally handled by the repository-level scripts/build-plugins.js.
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf-8'));
const config = JSON.parse(
  fs.readFileSync(path.join(PLUGIN_ROOT, 'plugin.config.json'), 'utf-8'),
);

const sourceFile = path.resolve(PLUGIN_ROOT, pkg.main || 'src/index.js');
const distDir = path.join(PLUGIN_ROOT, 'dist');
const entryArtifact = config.distribution.artifacts.find((item) => item.role === 'entrypoint');
const subscriptionArtifact = config.distribution.artifacts.find(
  (item) => item.role === 'subscription',
);

if (!entryArtifact) {
  throw new Error('plugin.config.json must declare an entrypoint artifact');
}

const publicBaseUrl = (
  process.env.PLAYLISTOUT_PLUGIN_PUBLIC_BASE_URL ||
  `https://playlistout.lengxiqwq.com/plugins/${config.id}`
).replace(/\/+$/, '');

function resolveDistArtifact(artifact) {
  const resolved = path.resolve(PLUGIN_ROOT, artifact.source);
  const expectedPrefix = distDir.endsWith(path.sep) ? distDir : `${distDir}${path.sep}`;
  if (!resolved.startsWith(expectedPrefix)) {
    throw new Error(`Artifact source must live under dist/: ${artifact.source}`);
  }
  return resolved;
}

function build() {
  console.log(`📦 Building PlaylistOut ${config.displayName} plugin...`);

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }

  // A clean dist prevents old versions or renamed artifacts from leaking into releases.
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const rawCode = fs.readFileSync(sourceFile, 'utf-8');
  const banner = `/**
 * PlaylistOut Official ${config.displayName} Plugin
 * Version: ${pkg.version}
 * Author: ${pkg.author}
 * Built: ${new Date().toISOString()}
 * Homepage: https://playlistout.lengxiqwq.com
 * Source: https://github.com/LengxiQwQ/playlistout
 */
`;

  const entryPath = resolveDistArtifact(entryArtifact);
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, banner + '\n' + rawCode.trim() + '\n', 'utf-8');

  if (subscriptionArtifact) {
    const subscriptionPath = resolveDistArtifact(subscriptionArtifact);
    const entryUrl = `${publicBaseUrl}/${entryArtifact.publicPath}`;
    const descriptor = {
      desc: `把你的歌单带走 官方 ${config.displayName} 歌单导入与原版音源桥接插件订阅源`,
      plugins: [
        {
          name: '把你的歌单带走 (PlaylistOut)',
          url: entryUrl,
          version: pkg.version,
        },
      ],
    };

    fs.mkdirSync(path.dirname(subscriptionPath), { recursive: true });
    fs.writeFileSync(
      subscriptionPath,
      JSON.stringify(descriptor, null, 2) + '\n',
      'utf-8',
    );
  }

  const stat = fs.statSync(entryPath);
  console.log(
    `✔ Build artifact: ${path.relative(PLUGIN_ROOT, entryPath)} (${stat.size} bytes)`,
  );
  if (subscriptionArtifact) {
    console.log(`✔ Subscription:   ${subscriptionArtifact.source}`);
  }
  console.log('🎉 MusicFree plugin build completed.\n');
}

build();
