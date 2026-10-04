---
description: Architectural standards and invariants for player plugins
trigger: always_on
---
# Player Plugin Architecture Rules

When developing, refactoring, building, or publishing player integrations, follow these invariants.

## Mandatory invariants

1. **Self-contained namespace**
   - Each integration lives in `plugins/<player-id>/`.
   - `<player-id>` is lowercase kebab-case and equals `plugin.config.json#id`.
   - Each plugin provides `plugin.config.json` and `package.json` with `build` and `test` scripts.

2. **Do not standardize player-specific artifact formats**
   - Different players may require different filenames, extensions, manifests, SDKs, or test layouts.
   - Never require another player to use MusicFree's filename, CommonJS format, or `plugins.json`.
   - Public artifacts are declared explicitly in that plugin's `plugin.config.json`.

3. **Strict build ownership**
   - Plugin build scripts produce only plugin-local output, normally `plugins/<player-id>/dist/`.
   - Plugin build scripts MUST NOT write to `web/public/plugins`.
   - `scripts/build-plugins.js` is the only publisher allowed to populate `web/public/plugins`.

4. **Namespaced publication**
   - Every declared artifact is published beneath `/plugins/<player-id>/`.
   - `/plugins/index.json` is the generated global ecosystem manifest.
   - `web/public/plugins` is generated output: never hand-edit it and never depend on committed generated files.

5. **Universal discovery, dependencies, and testing**
   - `npm run build:plugins` discovers and builds every plugin directory.
   - `npm run test:plugins` discovers and runs every plugin's own test script.
   - `npm run validate:plugins` builds first, then tests.
   - Plugins with npm dependencies must carry a plugin-local lockfile; the root runner installs them with `npm ci` on clean machines.
   - Missing configs, scripts, declared artifacts, or namespace violations are hard failures.

6. **Frontend decoupling**
   - Available plugin cards, versions, URLs, summaries, and supported count come from `/plugins/index.json`.
   - `PluginEcosystem.tsx` MUST NOT branch on a concrete player ID.
   - Static frontend data is reserved for proposed/planned integrations that do not yet have a published plugin.
