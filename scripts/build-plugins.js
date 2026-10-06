#!/usr/bin/env node
/**
 * Builds every self-described player plugin and publishes only declared artifacts.
 *
 * Plugin build scripts are isolated: they may write inside their own plugin directory,
 * but MUST NOT write to web/public/plugins. This root publisher owns that namespace.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import {
  GENERATED_REGISTRY_PATH,
  PUBLIC_PLUGIN_BASE_URL,
  REPO_ROOT,
  WEB_PUBLIC_PLUGINS,
  discoverPlugins,
  ensurePluginDependencies,
  generateRegisteredPluginsModule,
  publicPluginUrl,
  resolvePluginPath,
  runPluginScript,
} from './plugin-utils.js';

function buildAllPlugins() {
  console.log('🌐 [Ecosystem] Building all player plugins...');

  const plugins = discoverPlugins();

  // Generated public output is never source-of-truth. Start from a clean namespace
  // so removed/renamed plugins cannot leave stale deployable files behind.
  rmSync(WEB_PUBLIC_PLUGINS, { recursive: true, force: true });

  for (const plugin of plugins) {
    ensurePluginDependencies(plugin);

    console.log(`\n🔨 [${plugin.id}] Running plugin build...`);
    runPluginScript(plugin, 'build', {
      PLAYLISTOUT_PLUGIN_PUBLIC_BASE_URL: `${PUBLIC_PLUGIN_BASE_URL}/${plugin.id}`,
    });
  }

  // A plugin-specific build writing here would be able to overwrite another plugin.
  // Treat that as an architecture violation instead of silently accepting it.
  if (existsSync(WEB_PUBLIC_PLUGINS)) {
    const unexpectedEntries = readdirSync(WEB_PUBLIC_PLUGINS);
    if (unexpectedEntries.length > 0) {
      throw new Error(
        'Plugin build scripts must not write to web/public/plugins. ' +
        `Unexpected entries: ${unexpectedEntries.join(', ')}`,
      );
    }
  }

  mkdirSync(WEB_PUBLIC_PLUGINS, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    name: 'PlaylistOut Multi-Platform Plugin Ecosystem',
    homepage: 'https://playlistout.lengxiqwq.com',
    updatedAt: new Date().toISOString(),
    platforms: [],
  };

  for (const plugin of plugins) {
    const publicDir = join(WEB_PUBLIC_PLUGINS, plugin.id);
    mkdirSync(publicDir, { recursive: true });

    const publishedArtifacts = [];
    let entrypoint;
    let subscriptionUrl;

    for (const artifact of plugin.config.distribution.artifacts) {
      const sourcePath = resolvePluginPath(plugin, artifact.source);
      if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
        throw new Error(
          `[${plugin.id}] Declared artifact was not produced by its build: ${artifact.source}`,
        );
      }

      const destinationPath = join(publicDir, ...artifact.publicPath.split('/'));
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);

      const url = publicPluginUrl(plugin.id, artifact.publicPath);
      publishedArtifacts.push({
        role: artifact.role,
        publicPath: artifact.publicPath,
        url,
      });

      if (artifact.role === 'entrypoint') entrypoint = url;
      if (artifact.role === 'subscription') subscriptionUrl = url;

      console.log(
        `✔ [${plugin.id}] ${relative(REPO_ROOT, sourcePath)} -> ` +
        `${relative(REPO_ROOT, destinationPath)}`,
      );
    }

    const web = plugin.config.web || {};
    manifest.platforms.push({
      id: plugin.id,
      name: plugin.config.displayName,
      status: 'available',
      version: plugin.pkg.version,
      description: plugin.pkg.description || '',
      summary: web.summary || {},
      entrypoint,
      subscriptionUrl,
      homepageUrl: web.homepageUrl,
      repositoryUrl: web.repositoryUrl,
      guideUrl: web.guideUrl,
      logoUrl: web.logoUrl,
      artifacts: publishedArtifacts,
    });
  }

  const manifestPath = join(WEB_PUBLIC_PLUGINS, 'index.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(
    `\n✔ Ecosystem manifest generated: ${relative(REPO_ROOT, manifestPath)}`,
  );

  // The publisher is also the single owner of the Worker-side registry:
  // discovery from plugin manifests is the registration, so new plugins are
  // attributed without hand-editing Worker constants.
  mkdirSync(dirname(GENERATED_REGISTRY_PATH), { recursive: true });
  writeFileSync(GENERATED_REGISTRY_PATH, generateRegisteredPluginsModule(plugins), 'utf-8');
  console.log(
    `✔ Registered plugin registry generated: ${relative(REPO_ROOT, GENERATED_REGISTRY_PATH)}`,
  );

  console.log(`🎉 Published ${plugins.length} player plugin(s).\n`);
}

buildAllPlugins();
