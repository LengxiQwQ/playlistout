<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="PlaylistOut" />

# Playlist Out

*Your playlists shouldn't be trapped inside one music platform.*

[![Website](https://img.shields.io/badge/Website-playlistout.com-EAA008?style=flat-square)](https://playlistout.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)

**[🌐 playlistout.com](https://playlistout.com)**

</div>

<p align="center">
  📖 README Language: <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

---

## 💡 Why PlaylistOut?

We spend countless hours curating music playlists across streaming platforms, only to run into familiar frustrations:
When switching platforms, there is no easy way to migrate your library; when wanting to back up your collection, no service lets you export a clean, structured tracklist; or when organizing songs into spreadsheets for analysis or printing, you are left copying and pasting one by one.

Walled gardens keep your playlists locked inside proprietary apps.

**PlaylistOut does one simple thing: turn public playlists into structured, portable data that truly belongs to you.**

- **Client-Side Export**: All exported files are generated 100% locally in your browser's memory and downloaded directly, never uploaded back to the server.
- **No Sign-In Required**: No QQ Music account needed, no cookies required, and zero browser extensions or desktop apps to install.
- **Pure and Focused**: It is not a music player, does not download audio files, and avoids intrusive cloud sync. It focuses purely, reliably, and completely on one job: exporting and migrating playlist data.

---

## 🚀 Use It Online

No installation required. Simply visit **[playlistout.com](https://playlistout.com)** to get started:

1. **Paste a Playlist** — Supports desktop web URLs (`y.qq.com`), mobile share links (`c6.y.qq.com`), raw playlist IDs, or copied mobile share text (automatically extracts valid URLs).
2. **Instant Parsing** — Edge workers parse playlist metadata, song titles, artists, albums, and cover art.
3. **Full Preview** — Review the complete tracklist and total track count directly in your browser before exporting.
4. **Export or Copy** — Save locally as TXT / CSV / Excel (.xlsx) / JSON, or copy to clipboard with a single click.

---

## ✨ Key Features

### 🔗 Web-Based, No Login Needed
Parse playlists directly without logging into any streaming service, without providing cookies or tokens, and without installing browser extensions. A single public link is all it takes.

### 🎵 Deep Pagination for Large Playlists
Breaks free from the common 100-track truncation limitation found in many tools. PlaylistOut features an automated pagination engine with seamless support for **1,000+ track** playlists, preserving the original track order and legitimate duplicate tracks without silent dropping.

### 📦 4 File Formats Generated Locally
Export parsed playlists into multiple widely-used formats tailored for different use cases:
- **TXT** — Clean and simple plain text list, ideal for quick inspection, notepad backups, or importing into niche music players.
- **CSV** — Standard comma-separated values (with UTF-8 BOM by default to prevent garbled text in Excel on Windows).
- **Excel (.xlsx)** — Native formatted spreadsheet, ready for sorting, archiving, and editing in Microsoft Excel, WPS, or LibreOffice.
- **JSON** — Complete structured data containing track IDs, artists, albums, and metadata, built for developers and automated workflows.

> All files are assembled and downloaded directly within browser memory. Data never passes through intermediary third-party servers.

### 📋 3 Quick Clipboard Formats
When you just need text without downloading a file, copy tracklists directly in several handy formats:
- **Title Only**: One track title per line.
- **Title - Artist**: Universal text format, ready to paste into search bars or import dialogs of other music apps.
- **Title - Artist - Album**: Full tab-separated (TSV) format, ready to paste directly into any spreadsheet via Ctrl+V.

### 🛡️ Robust Security & Formula Injection Defense
During CSV and Excel exports, cells starting with special trigger characters (`=`, `+`, `-`, `@`) are automatically escaped with leading single quotes. This prevents malicious spreadsheet formula execution (CSV Injection / DDE) when opening exported files. The entire API is protected by rate limiting and OWASP security headers.

---

## 🎧 Supported Platforms

| Platform | Web Support | Notes |
|---|---|---|
| **QQ Music** | ✅ Supported | Playlist share URLs / IDs / App share text parsing and export |
| NetEase Cloud Music | Planned | On the roadmap |
| Kugou Music | Planned | On the roadmap |
| Kuwo Music | Planned | On the roadmap |
| Migu Music | Planned | On the roadmap |
| Qishui Music | Planned | On the roadmap |

Each streaming platform connects through an independent Provider module, while the frontend maintains a unified data model and export experience.

---

## 🔒 Privacy & Data

PlaylistOut operates with a transparent, privacy-first commitment:

- **No User Accounts**: No registration, login, or identity tracking. No personal information is ever collected.
- **Stateless Edge Proxy**: Tracklists are fetched on demand via Cloudflare Workers and returned immediately to the frontend. No playlist database exists, and no songs are retained on the server.
- **100% Local Export**: TXT, CSV, XLSX, and JSON files are generated entirely within the client's browser. File contents are never transmitted to any server.
- **Anonymous Aggregated Metrics**: Cloudflare D1 stores only anonymous aggregate counters (e.g., success/failure counts, export format distributions) for service health monitoring and capacity planning. No IP addresses, URLs, or track names are stored.
- **Fail-Closed Principle**: If upstream data is truncated, incomplete, or fails validation, PlaylistOut explicitly reports an error rather than silently returning an incomplete tracklist.

---

## ⌨️ QQ Music CLI

The repository maintains the original Python command-line utility for scripting, batch jobs, and technical reference:
- Supports single playlist export
- Supports batch export of all public playlists by QQ number

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

For advanced arguments and configuration, see [`cli/qqmusic/README.md`](./cli/qqmusic/README.md).

---

## 💻 Development

PlaylistOut is organized as a lightweight Monorepo:

| Directory | Description |
|---|---|
| `web/` | Web application built with React 18 + TypeScript + Vite |
| `worker/` | Edge API service built with Cloudflare Workers + TypeScript + D1 |
| `cli/qqmusic/` | Original Python QQ Music CLI tool |
| `docs/` | Roadmap, architectural constitution, API specifications, and setup manuals |

### Run Locally

```bash
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout
npm install
npm run dev
```

### Verification & Testing

```bash
# TypeScript type checking
npm run typecheck

# Unit and component tests
npm run test

# Validate against real QQ Music playlists (including 1,000+ track pagination)
npm --prefix worker run test:live

# Full production build
npm run build
```

---

## 📚 Documentation

- [`ROADMAP.md`](./docs/ROADMAP.md) — Maintenance roadmap and provider expansion plans
- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md) — Product boundaries, architecture rules, and security guidelines
- [`API.md`](./docs/API.md) — Edge API specification and error contracts
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md) — Production setup and operational guide
- [`CHANGELOG.md`](./CHANGELOG.md) — Version release history

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

When adding a new music platform Provider, keep platform-specific logic inside the Provider module and conform to PlaylistOut's normalized playlist data model to ensure consistent exports across all platforms.

---

## 📄 License

PlaylistOut is open-source software licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a>
</p>
