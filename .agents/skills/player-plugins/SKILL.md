---
name: player-plugins
description: SOP for developing, building, testing, publishing, and submitting player integrations.
---

# Player Plugins SOP

## 1. Add a player integration

Create one isolated directory:

```text
plugins/<player-id>/
├── plugin.config.json
├── package.json
├── src/...
├── test/...
├── scripts/...
└── dist/            # generated; ignored by Git
```

Requirements:

- `<player-id>` is lowercase kebab-case.
- `plugin.config.json#id` matches the directory exactly.
- `package.json` exposes `build` and `test` scripts.
- The plugin's build writes only plugin-local output under `dist/`.
- `plugin.config.json` declares every public artifact with:
  - `role`: `entrypoint`, optional `subscription`, or `asset`;
  - `source`: a path under `dist/`;
  - `publicPath`: the path inside `/plugins/<player-id>/`.
- Exactly one artifact is the `entrypoint`.
- Do not copy MusicFree-specific filenames or subscription formats unless the target player actually requires them.

If the plugin needs npm packages, keep a plugin-local lockfile. The root runner installs those dependencies with `npm ci` on clean machines.

## 2. Web metadata

Put available-plugin presentation data in `plugin.config.json#web`:

- localized `summary`;
- homepage;
- repository;
- guide;
- logo.

Do **not** edit `PluginEcosystem.tsx` for each new available player. The root build generates `/plugins/index.json`, and the web UI discovers published plugins from that manifest automatically.

Only integrations that are still proposed/planned belong in the static roadmap list in `web/src/data/integrations.ts`.

## 3. Analytics attribution

Every plugin identifies itself on PlaylistOut API requests. Registration is
automatic: the publisher generates `worker/src/analytics/generated/registered-plugins.ts`
from discovered plugin manifests, so do not hand-edit Worker plugin constants.

Send on each PlaylistOut API request, injected at one centralized HTTP helper:

```
X-PlaylistOut-Client-Type: plugin
X-PlaylistOut-Client-Id: <player-id>            # equals plugin.config.json#id
X-PlaylistOut-Client-Version: <plugin version>
X-PlaylistOut-Host: android|ios|windows|macos|linux|unknown
User-Agent: PlaylistOut-<PlayerId>/<plugin version>
```

Identity is analytics-only: it never changes rate limits, and URL parameters are
not used. Commit the regenerated registry after `npm run build:plugins`; the gate
fails if it is stale.

## 4. Commands

```bash
npm run build:plugins
npm run test:plugins
npm run validate:plugins
npm run gate
```

`validate:plugins` is the normal pre-release plugin command because it builds first and then tests the current outputs.

Never hand-edit or commit `web/public/plugins/`.

## 5. External communication

When preparing an upstream Issue/PR, read the current target plugin's config and actual generated manifest before quoting install URLs or supported install methods. Never assume every player has a subscription file.

See `references/community-pr-guide.md`.
