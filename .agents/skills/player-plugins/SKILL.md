---
name: player-plugins
description: SOP for developing, building, testing, and submitting player plugins (MusicFree, LX Music, etc.).
---

# Music Player Plugins SOP

## 1. Architecture & Invariants
- **Directory**: `plugins/<player-id>/` (isolated, containing `package.json`, `src/index.js`, `plugins.json`, `scripts/build.js`, `test/test-runner.js`).
- **File Naming**: `把你的歌单带走-PlaylistOut.js` (hyphens only; **never** use parentheses in filenames or URLs).
- **Platform Name**: `platform: "把你的歌单带走 (PlaylistOut)"` in runtime metadata (`isSelfPlatform()` accepts both legacy and bilingual names).
- **URLs**:
  - Plugin file: `https://playlistout.lengxiqwq.com/plugins/<player-id>/把你的歌单带走-PlaylistOut.js`
  - Subscription: `https://playlistout.lengxiqwq.com/plugins/<player-id>/plugins.json`
  - Catalog: `https://playlistout.lengxiqwq.com/plugins/index.json`
- **Frontend**: Update `web/src/components/ecosystem/PluginEcosystem.tsx` dynamically via `INTEGRATIONS`; never hardcode URLs.

## 2. Commands & Workflow
```bash
npm run build:plugins   # Discovers and builds all plugins to web/public/plugins/<player-id>/ and generates index.json
npm run test:plugins    # Runs test suites for all plugins under plugins/*/test/test-runner.js
npm run gate            # Local 7-check CI gate (mandatory 100% green before any git push)
```

## 3. Copywriting & PR Rules
- **No "Zero Copyright Risk" Fluff**: Focus objectively on playlist parsing; never lecture developers or claim zero risk.
- **Genuine Strengths**: Highlight Kugou login-free sheet parsing, NetEase 1000+ track paging, QQ/Qishui redirect washing, and dual online/offline modes.
- **Mobile Clipboard Limitation**: Mobile React Native clipboards truncate at ~2000 characters. **Never** advise pasting raw JSON on mobile; recommend URLs/subscriptions on mobile, and JSON pasting on desktop.
- **PR Template**: See [community-pr-guide.md](./references/community-pr-guide.md).
