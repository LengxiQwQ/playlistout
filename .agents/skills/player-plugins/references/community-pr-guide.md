# Community Integration / PR Guide

Use the target player's actual implementation and PlaylistOut plugin metadata as the source of truth. Do not copy a MusicFree-specific install recipe into another player's repository.

## Before writing

1. Read `plugins/<player-id>/plugin.config.json`.
2. Confirm the plugin's current package version and build/test results.
3. Read the generated `/plugins/index.json` (or derive the namespaced URL from the declared public artifact) before quoting an install URL.
4. Mention a subscription/import feed only if that plugin declares one.
5. Match the upstream project's terminology and installation model.

## Suggested PR body structure

```markdown
### Integration
<player display name> × PlaylistOut

### What it adds
- <verified user-facing capability>
- <verified supported input/import path>
- <verified mapping or interoperability behavior>

### Distribution
- Entrypoint: <actual generated entrypoint URL>
- Optional player-specific feed/import descriptor: <only if declared>
- Source: https://github.com/LengxiQwQ/playlistout/tree/main/plugins/<player-id>

### Verification
- `npm run validate:plugins`
- <target-player-specific checks>
```

Keep the wording factual and modest. Do not claim unsupported capabilities, universal compatibility, or a player-specific file format that the target integration does not use.
