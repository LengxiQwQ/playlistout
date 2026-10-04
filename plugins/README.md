# PlaylistOut Player Plugin Contract

Each published player integration lives in its own namespace:

```text
plugins/<player-id>/
├── plugin.config.json
├── package.json
├── src/                 # layout is plugin-specific
├── test/                # layout is plugin-specific
├── scripts/             # layout is plugin-specific
└── dist/                # generated locally; never committed
```

## Required contract

- `<player-id>` uses lowercase kebab-case and must equal `plugin.config.json#id`.
- `package.json` must expose `build` and `test` scripts.
- A plugin build may only create its own local output (normally under `dist/`).
- A plugin build must **never** write to `web/public/plugins`.
- `plugin.config.json` declares which files from `dist/` are public artifacts.
- Exactly one declared artifact has role `entrypoint`; `subscription` is optional.
- Artifact names and formats are player-specific. There is no repository-wide requirement that every player use the MusicFree filename or `plugins.json`.
- If a plugin has npm dependencies, keep them plugin-local and commit a plugin-local lockfile. The root runner automatically installs them with `npm ci` on a clean machine.

## Publishing

```bash
npm run build:plugins
npm run test:plugins
# or both, in the correct order:
npm run validate:plugins
```

The root publisher:

1. discovers every directory under `plugins/*`;
2. validates its self-description;
3. runs the plugin's own build;
4. rejects plugin builds that write into another namespace;
5. copies only declared artifacts to `web/public/plugins/<player-id>/`;
6. generates `web/public/plugins/index.json`.

`web/public/plugins/` is generated output and is intentionally ignored by Git.
The web UI reads `/plugins/index.json` at runtime, so a newly published plugin
appears automatically without adding a player-specific frontend branch.
