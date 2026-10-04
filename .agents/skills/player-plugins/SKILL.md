---
name: player-plugins
description: >-
  Standard operating procedure and architectural guide for developing, testing,
  building, and submitting music player plugins (e.g., MusicFree, LX Music) for PlaylistOut.
  Use when creating a new player plugin, updating existing plugins, verifying plugin tests,
  or preparing community PRs to external plugin aggregators.
---

# PlaylistOut Music Player Plugins Workflow & Standards

This skill guides agents through the lifecycle of third-party music player plugins for PlaylistOut.

## 1. Architectural Principles

PlaylistOut supports an extensible, decoupled multi-player plugin architecture. All plugins reside under `plugins/<player-id>/` and are automatically discovered by global build and test runners.

### Core Invariants:
1. **Namespace Isolation**:
   - Each player integration MUST have its own isolated directory: `plugins/<player-id>/` (e.g., `plugins/musicfree/`).
   - Root configuration files or scripts MUST NOT hardcode any single player's artifacts.
2. **File Naming & Link Safety**:
   - Plugin filename format: `把你的歌单带走-PlaylistOut.js`.
   - **CRITICAL**: Use a hyphen (`-`), NEVER parentheses in file names or URLs (e.g., avoid `(PlaylistOut).js`). Parentheses break Markdown link formatting `[text](url)` and cause encoding issues on mobile clipboards.
3. **Platform Display Name**:
   - Inside the plugin runtime metadata: `platform: "把你的歌单带走 (PlaylistOut)"`.
   - Parentheses are safe for the internal metadata string, but NOT in URLs/filenames.
   - For backward compatibility, `isSelfPlatform(name)` must accept both the legacy `"PlaylistOut"` and the standardized `"把你的歌单带走 (PlaylistOut)"`.
4. **Hosting & Subscription URLs**:
   - Direct plugin artifact: `https://playlistout.lengxiqwq.com/plugins/<player-id>/把你的歌单带走-PlaylistOut.js`
   - Dedicated subscription source: `https://playlistout.lengxiqwq.com/plugins/<player-id>/plugins.json`
   - Global ecosystem manifest: `https://playlistout.lengxiqwq.com/plugins/index.json` (auto-generated)

---

## 2. Directory Layout for a Player Plugin

When creating a new plugin (e.g., `plugins/<player-id>/`), implement the following structure:

```text
plugins/<player-id>/
├── package.json          # Manifest with name, version, build and test scripts
├── src/
│   └── index.js          # Plugin source code adhering to the player's runtime API
├── dist/                 # Local build artifact output
├── plugins.json          # Player-specific subscription/import manifest
├── scripts/
│   └── build.js          # Build script copying artifact to dist/ and web/public/plugins/<player-id>/
├── test/
│   └── test-runner.js    # Node.js automated test suite for the plugin
└── README.md             # Player-specific installation and user guidance
```

---

## 3. Build & Test Procedures

### Building Plugins:
Run the universal plugin builder:
```bash
npm run build:plugins
```
- Discovers all subdirectories under `plugins/*/scripts/build.js`.
- Executes each player's build script.
- Populates `web/public/plugins/<player-id>/`.
- Aggregates metadata into `web/public/plugins/index.json`.

### Testing Plugins:
Run the universal test runner:
```bash
npm run test:plugins
```
- Discovers all `plugins/*/test/test-runner.js` files and executes them.
- This runner is automatically integrated into Step 5 of the local CI gate:
```bash
npm run gate
```

---

## 4. Frontend Integration

When adding or updating a player plugin in the Web UI:
- Open `web/src/components/ecosystem/PluginEcosystem.tsx`.
- Add or update the player entry in `INTEGRATIONS`:
  - `id`: `<player-id>`
  - `pluginUrl`: `"https://playlistout.lengxiqwq.com/plugins/<player-id>/把你的歌单带走-PlaylistOut.js"`
  - `docsUrl`: `"https://playlistout.lengxiqwq.com/plugins/<player-id>/"` or link to player documentation.
- The UI dynamically handles URL copying and status badges; NEVER introduce player-specific hardcoded button handlers.

---

## 5. Community Submission & PR Guidelines

When preparing PRs or issues for external plugin aggregator repositories (such as `qwerwhr/musicfree-plugins`, `meerl/MusicFreePlugins`, `Huibq/keep-alive`):

### Mandatory Copywriting Rules:
1. **No "Zero Copyright Risk" Fluff**:
   - Open source developers know how playlist scrapers work. Claiming "zero risk" sounds unprofessional and condescending. State the functionality objectively.
2. **Technical Honesty & Strengths**:
   - Emphasize real technical breakthroughs:
     - **酷狗音乐 (Kugou)**: 免登录解析公开歌单与全量歌曲（解决业内通常必须登录才能抓取的问题）。
     - **网易云音乐 (NetEase)**: 免登录完整分页获取超千首大歌单。
     - **QQ音乐 / 汽水音乐**: 完整多格式与短链自动重定向解析。
     - **双模支持**: 在线 URL 解析 + 离线 JSON 导入。
3. **Mobile Clipboard Limitation Invariant**:
   - **CRITICAL**: Mobile React Native / Webview clipboards truncate pasted text at around 2000 characters.
   - **NEVER** advertise or suggest that mobile users copy-paste long JSON text into the player!
   - Clearly state: Mobile users should use the playlist URL or subscribe via `plugins.json`; raw JSON string pasting is only suitable for desktop environments.
4. **Tone**:
   - Modest, factual, and respectful. Avoid excessive marketing emojis (🔥, 🚀), buzzwords ("完美告别"), or over-promising.
