<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="Playlist Out" />

# Playlist Out

**Your playlists should not be trapped inside a single music platform.**

Parse, export, and carry your playlists into supported open-source players.

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/LengxiQwQ/playlistout/ci.yml?style=flat-square&label=CI)](https://github.com/LengxiQwQ/playlistout/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

🌐 Online: [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/)

[简体中文](README.md) · English

</div>

---

## What is Playlist Out?

**Playlist Out** is an open-source tool for playlist backup, export, and migration. It turns public playlists from supported platforms into a normalized data structure: regular users can inspect, organize, and export playlists as `Excel`, `JSON`, `TXT`, `CSV`, or `M3U8`, then continue using them in supported open-source players; developers can integrate the same parsing capabilities through the Public API or the standard JSON data contract.

Playlist Out is **not a music player** and does not provide, store, or proxy audio files. It only handles playlist and track metadata, with the goal of making playlists easier to back up, migrate, and reuse.

---

## Quick Start

No desktop client is required. Open [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/) and get started:

1. **Parse** — paste a playlist link, share text, or supported ID and let Playlist Out resolve it.
2. **Review & export** — confirm the track list, then choose Excel, JSON, TXT, CSV, or M3U8.
3. **Keep moving** — if you use a supported open-source player, import the parsed playlist through the available plugin or adapter.

---

## Key Features

| Capability | Description | Capability | Description |
|---|---|---|---|
| **Cross-platform parsing** | Normalize public playlists from multiple major music services | **Multiple export formats** | Excel / JSON / TXT / CSV / M3U8 |
| **Flexible input** | Web links, short links, share text, and selected numeric IDs | **Structured metadata** | Tracks, artists, albums, artwork, source, and availability state |
| **Public user playlists** | Supported on selected platforms | **Player ecosystem** | Plugins, JSON compatibility, and lightweight upstream adapters |
| **Python CLI** | Ready-to-run command-line exporters for QQ Music and NetEase Cloud Music | **Local export** | Files are generated in the browser without being uploaded to the server |
| **Public API** | Unified parsing for third-party apps, scripts, and migration tools | **Open integration** | Web, CLI, plugins, and third-party apps can use the same normalized playlist data |

---

## Supported Music Platforms

| Platform | Public Playlists | Public User Playlists | Notes |
|---|:---:|:---:|---|
| **QQ Music** | ✅ | ✅ | No login required |
| **NetEase Cloud Music** | ✅ | ✅ | No login required |
| **Soda Music** | ✅ | — | Public shared playlists |
| **KuGou Music** | ✅ | ✅ | Public content can be previewed without login; full playlists or user collections may require QR authorization |

> Capabilities depend on upstream public pages and APIs and may change when upstream behavior changes.

---

## Python CLI

Playlist Out also keeps standalone Python command-line tools for users who prefer local terminal workflows, batch exports, or a non-Web interface.

The repository currently includes two independent CLIs:

| Platform | Script | Supports |
|---|---|---|
| **QQ Music** | [`cli/qqmusic/qq_music_playlist_export.py`](cli/qqmusic/qq_music_playlist_export.py) | Playlist URL / ID, QQ user playlists, batch export |
| **NetEase Cloud Music** | [`cli/netease/netease_playlist_export.py`](cli/netease/netease_playlist_export.py) | Playlist URL / short link / ID, public user playlists |

Both CLIs support **Excel → JSON → TXT → CSV → M3U8** exports.

### QQ Music CLI

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

👉 [QQ Music CLI documentation](cli/qqmusic/README.md)

### NetEase Cloud Music CLI

```bash
cd cli/netease
pip install -r requirements.txt
python netease_playlist_export.py
```

👉 [NetEase CLI documentation](cli/netease/README.md)

> The standalone Python CLIs currently cover QQ Music and NetEase Cloud Music. KuGou Music and Soda Music are currently available through the Web app / Public API.

---

## Bring Playlists Further

**Playlist Out does more than export playlists — it can also bring them into supported open-source players.**

### Supported

| App | Status | Integration |
|---|---|---|
| **MusicFree** | ✅ Available | Playlist Out plugin |

### MusicFree

Playlist Out provides a MusicFree import plugin for bringing external playlists directly into MusicFree.

**Plugin URL**

```text
https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js
```

- [MusicFree Website](https://musicfree.catcat.work/) — download and learn about MusicFree
- [MusicFree GitHub](https://github.com/maotoumao/MusicFree) — view the player source code
- [Playlist Out · MusicFree Plugin Docs](plugins/musicfree/README.md) — installation, usage, configuration, and plugin development

### In Progress

| App | Status | Progress |
|---|---|---|
| **LX Music** | 💬 Proposed upstream | [Issue #3001](https://github.com/lyswhut/lx-music-desktop/issues/3001) |
| **BBPlayer** | 💬 Proposed upstream | [Issue #340](https://github.com/bbplayer-app/BBPlayer/issues/340) |
| **Listen 1** | 💬 Proposed upstream | [Issue #1413](https://github.com/listen1/listen1_desktop/issues/1413) |
| **Moosync** | 🗓️ Planned | Extension integration |

Different players expose different extension and import capabilities, so Playlist Out uses plugins, generic JSON import, or lightweight upstream PRs depending on the target application.

> See the [Open-Source Player Ecosystem Integration Plan](docs/ECOSYSTEM-INTEGRATION.md) for research, field mappings, and integration status.

---

## Export Formats

| Format | Best For |
|---|---|
| **Excel (.xlsx)** | Organization, archiving, and manual analysis |
| **JSON** | Developers, scripts, third-party apps, and player integrations (Canonical schema: single flat `artist`, zero nulls/padding) |
| **TXT** | Reading, simple backup, and text processing |
| **CSV** | Spreadsheet and generic data workflows |
| **M3U8** | Local players and media libraries |

Export files are generated locally in the browser and do not need to be uploaded to the server.

For programmatic use, prefer **JSON** and follow the [JSON Data Format Specification](docs/JSON-SCHEMA.md).

---

## Privacy and Project Boundaries

Playlist Out aims to stay simple and transparent:

- no Playlist Out account system;
- no server-side user playlist database;
- export files are generated locally in the browser;
- exported track lists and files are not stored by Playlist Out;
- KuGou authorization data stays in the user's local browser;
- the server keeps only anonymous aggregate statistics without specific playlist contents;
- Playlist Out does not provide, store, or proxy audio streams.

The website's Privacy Policy contains the complete data handling explanation.

---

## Developer Integration

Playlist Out exposes both a **Public API** and a stable **JSON data contract** for open-source players, migration tools, automation scripts, and third-party clients.

### Public API

Production API:

```text
https://playlistout-api.lengxiqwq.com
```

The simplest unified resolver endpoint:

```http
GET /api/v1/resolve?q=<playlist-link-or-share-text>
```

The API documentation covers:

- endpoints and request parameters;
- CORS and authentication rules;
- KuGou authorization headers;
- rate limits;
- response envelopes and error codes;
- JavaScript / Python / cURL examples.

👉 [Read the full Public API documentation](docs/API.md)

### Data Contract / JSON Schema

Applications that do not want to depend on the online API can read Playlist Out JSON exports directly.

The JSON Schema defines the normalized playlist contract, including playlist metadata, track fields, platform source, artwork, duration, and availability state. This is the primary reference for local import compatibility in third-party players.

👉 [Read the JSON Data Format Specification](docs/JSON-SCHEMA.md)

### Player and Plugin Integration

If you maintain an open-source music player and want to integrate Playlist Out:

- players with extension systems can ship a dedicated plugin / extension;
- players with local file import can support Playlist Out JSON;
- applications can also call the Public API for normalized playlist data.

👉 [Read the Open-Source Player Ecosystem Integration Plan](docs/ECOSYSTEM-INTEGRATION.md)

---

## Local Development

Playlist Out uses a monorepo for the web app, Worker API, and plugins.

```text
playlistout/
├── web/                  # React / Vite frontend
├── worker/               # Cloudflare Worker API
├── cli/                  # Python command-line exporters
│   ├── qqmusic/
│   └── netease/
├── plugins/
│   └── musicfree/        # MusicFree plugin
├── docs/                 # API, data contract, and project docs
└── scripts/              # development and maintenance scripts
```

Install dependencies:

```bash
npm install
```

Start the local development environment:

```bash
npm run dev
```

Run the full project checks:

```bash
npm run check
```

Build:

```bash
npm run build
```

---

## Documentation Guide

The main README intentionally stays focused. Detailed protocols, APIs, and architecture live in dedicated documents.

| Document | Audience | What It Covers |
|---|---|---|
| [Public API](docs/API.md) | Third-party developers | Endpoints, parameters, authentication, CORS, rate limits, response contracts, and errors |
| [JSON Schema](docs/JSON-SCHEMA.md) | Player / tool developers | Playlist Out normalized JSON data contract and field definitions |
| [Web Export Formats](docs/EXPORT-FORMATS.md) | Users / migration-tool developers | Current CSV, XLSX, JSON, M3U8, and TXT structures and compatibility rules |
| [QQ Music CLI](cli/qqmusic/README.md) | Command-line users | QQ Music playlist / user-playlist export, setup, and usage |
| [NetEase CLI](cli/netease/README.md) | Command-line users | NetEase playlist / user-playlist export, setup, and usage |
| [MusicFree Plugin](plugins/musicfree/README.md) | MusicFree users and plugin developers | Installation, usage, configuration, build, and tests |
| [Ecosystem Integration](docs/ECOSYSTEM-INTEGRATION.md) | Open-source player maintainers | Player research, field mappings, Issue / PR integration plans |
| [Project Constitution](docs/PROJECT-CONSTITUTION.md) | Contributors / maintainers | Architecture, security, privacy, product boundaries, and long-term principles |
| [Roadmap](docs/ROADMAP.md) | Users and contributors | Current progress and future direction |

---

## Contributing

Issues, feature proposals, and Pull Requests are welcome.

If you develop or maintain an open-source music player and want to support Playlist Out, open an Issue to discuss the most suitable integration path:

👉 [Open an Issue](https://github.com/LengxiQwQ/playlistout/issues)

---

## License

Playlist Out is open-source under the [MIT License](LICENSE).

The MIT License allows use, copying, modification, and redistribution — including commercial use — as long as the original copyright and license notice are preserved. See [`LICENSE`](LICENSE) for the exact terms.

---

<div align="center">

### Playlist Out · Take Your Playlists With You

The idea behind Playlist Out has always been simple: **your playlists should belong to you, not be trapped inside one platform.**

I hope it helps you take the playlists you carefully built out of one service and continue using them wherever you actually want to listen.

**Made with ❤️ by [LengxiQwQ](https://github.com/LengxiQwQ)**

[Website](https://playlistout.lengxiqwq.com) · [GitHub](https://github.com/LengxiQwQ/playlistout) · [Issues](https://github.com/LengxiQwQ/playlistout/issues)

</div>
