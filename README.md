<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/favicon.svg" width="76" alt="PlaylistOut" />

# PlaylistOut

*Your playlists shouldn't be trapped inside one music platform.*

[![Website](https://img.shields.io/badge/Website-playlistout.com-2563eb?style=flat-square)](https://playlistout.com)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![CI](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml)

**[🌐 playlistout.com](https://playlistout.com)**

</div>

<p align="center">
  📖 README Language: <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

---

## 💡 Why PlaylistOut?

Music platforms make it easy to build playlists, but when you want to back them up, organize them, process the data, or migrate somewhere else later, getting a clean copy of the track list is often much harder than it should be.

**PlaylistOut does one simple thing:** it turns public playlists into structured data that you can actually keep.

Paste a supported playlist link and PlaylistOut will read the playlist title, tracks, artists, albums and other available information, normalize the result, and let you export it as TXT, CSV, Excel or JSON.

It does not play music, download songs, or ask you to sign in. It focuses on one job: exporting playlist data clearly and reliably.

---

## 🚀 Use It Online

No installation is required. Open **[playlistout.com](https://playlistout.com)** and paste a public playlist link.

1. **Paste a playlist** — public playlist URLs, mobile share links and playlist IDs are supported.
2. **Parse automatically** — PlaylistOut reads playlist metadata, tracks, artists, albums and other available fields.
3. **Preview the result** — check the complete track list before exporting.
4. **Export or copy** — save as TXT / CSV / Excel / JSON, or copy the track list directly.

---

## ✨ Main Features

### 🔗 Paste a Link and Parse

QQ Music public playlists are currently supported. PlaylistOut accepts desktop web links, mobile share links, numeric playlist IDs, and can extract a supported playlist from copied share text.

### 🎵 Large Playlist Support

Pagination is handled automatically, including playlists with **1000+ tracks**. PlaylistOut preserves source order and legitimate duplicate entries instead of silently dropping tracks during pagination or deduplication.

### 📦 Export Data You Can Actually Use

After parsing, the playlist can be exported directly as:

- **TXT** — a simple plain-text track list
- **CSV** — convenient for spreadsheets and other tools
- **Excel (.xlsx)** — ready to open in Excel, WPS and compatible software
- **JSON** — useful for scripts, programs and further processing

All export files are generated locally in your browser. They do not need to be uploaded to the server.

### 📋 Quick Copy

If you do not need a file, you can copy the track list directly in several common formats, including:

- Track title only
- Track title - artist
- Track title - artist - album

### 🛡️ Safer Spreadsheet Exports

CSV and Excel exports escape content that could otherwise be interpreted as formulas by spreadsheet software, preventing ordinary track data from being executed as spreadsheet formulas.

---

## 🎧 Supported Platforms

| Platform | Status |
|---|---|
| **QQ Music** | ✅ Supported |
| NetEase Cloud Music | Planned |
| Kugou Music | Planned |
| Kuwo Music | Planned |
| Migu Music | Planned |
| Qishui Music | Planned |

Each music platform is added through an independent Provider, while the frontend continues to use the same normalized data model and export workflow.

---

## 🔒 Privacy & Data

PlaylistOut has no user account system and does not turn your playlists into its own cloud library.

- Parsed track lists are not stored
- Submitted playlist history is not stored
- Exported TXT / CSV / XLSX / JSON files are not stored
- Export files are generated locally in the browser
- The server keeps only anonymous aggregate statistics such as parse success / failure counts

If upstream data is clearly incomplete or cannot be trusted, PlaylistOut prefers to report an error instead of generating an export that looks valid but is missing tracks.

---

## ⌨️ QQ Music CLI

The repository still includes the original Python QQ Music command-line version for scripting, batch workflows and technical reference. It supports single-playlist export as well as QQ account batch export.

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

See [`cli/qqmusic/README.md`](./cli/qqmusic/README.md) for detailed usage.

---

## 💻 For Developers

PlaylistOut is a lightweight monorepo:

| Part | Purpose |
|---|---|
| `web/` | React + TypeScript + Vite frontend |
| `worker/` | Cloudflare Worker API and Providers |
| `cli/qqmusic/` | Original Python QQ Music CLI |
| `docs/` | Roadmap, API, project rules and deployment documentation |

### Run Locally

```bash
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout
npm install
npm run dev
```

### Verification

```bash
npm run typecheck
npm run test
npm --prefix worker run test:live
npm run build
```

---

## 📚 Documentation

- [`ROADMAP.md`](./docs/ROADMAP.md) — current maintenance and provider expansion plans
- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md) — product, architecture, privacy and implementation boundaries
- [`API.md`](./docs/API.md) — PlaylistOut API contract
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md) — deployment, recovery and operations
- [`CHANGELOG.md`](./CHANGELOG.md) — release history

---

## 🤝 Contributing

Issues and Pull Requests are welcome.

When adding a new music-platform Provider, keep platform-specific logic inside the Provider and continue using PlaylistOut's shared normalized playlist data model.

---

## 📄 License

PlaylistOut is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a>
</p>
