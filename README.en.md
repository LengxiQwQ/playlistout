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

## 📋 Data Export Format Specifications & Open Integration

To facilitate seamless integration, ingestion, and automated parsing by third-party music platforms, developer tools, and data migration utilities, we formally define and standardize our 4 exported file formats.

> 💡 **Third-Party Platform Recommendation**: We strongly recommend reading and parsing the **JSON format**. It contains the most comprehensive metadata schema, strict type definitions, and raw unescaped track details.

---

### 1. JSON Format (`.json`) —— Recommended for Integration

- **Encoding**: `UTF-8` (without BOM)
- **MIME Type**: `application/json`
- **Use Case**: Cross-platform migration, third-party music player imports, automated data pipelines.

#### Root Object Schema

| Field | Type | Nullable | Description & Format |
|---|---|---|---|
| `createTime` | `string \| null` | Yes | **Playlist creation time** (1st position). Formatted as `YYYY-MM-DD HH:mm:ss` (e.g. `"2021-06-18 14:30:00"`), or `null` if unavailable upstream. |
| `exportedAt` | `string` | No | **Data export time** (2nd position, immediately adjacent to creation time). Local generation timestamp `YYYY-MM-DD HH:mm:ss`. |
| `generator` | `string` | No | **Generator platform identifier**. Fixed to `"PlaylistOut"` for easy identification and ingestion by third parties. |
| `generatorUrl` | `string` | No | **Official website URL**. Fixed to `"https://playlistout.com"`. |
| `name` | `string` | No | Full title of the playlist. |
| `creator` | `string` | No (may be empty) | Nickname of the playlist creator / curator. |
| `updateTime` | `string \| null` | Yes | Last modified / updated timestamp in `YYYY-MM-DD HH:mm:ss` format. |
| `platform` | `string` | No | Source music platform identifier (e.g., `"qqmusic"`). |
| `id` | `string` | No | Native unique playlist identifier from the source platform (e.g., `"773829104"`). |
| `sourceUrl` | `string` | No | Direct canonical web URL of the playlist on the source platform. |
| `trackCount` | `number` | No | Total number of tracks contained in the playlist (integer). |
| `totalDuration` | `string \| null` | Yes | Formatted total playlist duration string (e.g., `"3 小时 45 分钟"` or `"48 分钟"`). |
| `playCount` | `number \| null` | Yes | Cumulative listen / play count as an integer. |
| `tags` | `string[]` | No | Array of genre and category tags (e.g., `["Pop", "Acoustic"]`). |
| `description` | `string` | No (may be empty) | Playlist introduction / background description. |
| `tracks` | `Track[]` | No | Array of track items, preserving the original curator order. |

#### Track Item Schema

| Field | Type | Nullable | Description & Format |
|---|---|---|---|
| `index` | `number` | No | 1-based sequential display index in the playlist. |
| `id` | `string` | No | Unique track identifier / MID from the source platform (e.g., `"0039MnYb0qxYAc"`). |
| `title` | `string` | No | Song title (preserving version notes and subtitles). |
| `artists` | `string[]` | No | Array of participating artist names (e.g., `["Jay Chou", "Ashin"]`). |
| `album` | `string` | No (may be empty) | Album name. |
| `durationMs` | `number` | No | Total audio duration in milliseconds (e.g., `269000` = 4m 29s). |
| `sourceUrl` | `string` | No | Direct canonical web URL of the track detail page. |

#### Standard JSON Example

```json
{
  "createTime": "2021-06-18 14:30:00",
  "exportedAt": "2026-09-14 23:30:00",
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.com",
  "name": "Chinese Classic Pop Hits",
  "creator": "Music Cafe",
  "updateTime": "2024-03-01 09:15:20",
  "platform": "qqmusic",
  "id": "773829104",
  "sourceUrl": "https://y.qq.com/n/ryqq/playlist/773829104",
  "trackCount": 2,
  "totalDuration": "8 分钟",
  "playCount": 128500,
  "tags": ["Pop", "Classic", "Mandopop"],
  "description": "Timeless melodies that touch your soul.",
  "tracks": [
    {
      "index": 1,
      "id": "0039MnYb0qxYAc",
      "title": "Sunny Day",
      "artists": ["Jay Chou"],
      "album": "Yeh Hui-Mei",
      "durationMs": 269000,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc"
    },
    {
      "index": 2,
      "id": "0027fM2M3wD4gS",
      "title": "Won't Cry",
      "artists": ["Jay Chou", "Ashin"],
      "album": "Won't Cry",
      "durationMs": 222000,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS"
    }
  ]
}
```

---

### 2. CSV Format (`.csv`)

- **Encoding**: `UTF-8 with BOM` (starts with `\uFEFF` byte order mark to avoid mojibake in Microsoft Excel on Windows).
- **Line Ending**: `\r\n` (CRLF).
- **Metadata Comment Block**: Prefaced by `# ` comment lines containing metadata and generator branding. Standard tabular parsers can simply skip lines starting with `#` to extract song rows.
- **Formula Injection Defense**: Cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are safely prepended with a single quote `'` to prevent DDE/macro code execution in spreadsheet applications.
- **RFC 4180 Escaping**: Fields containing commas or quotes are wrapped in double quotes, with internal quotes escaped as `""`.

#### CSV File Example

```csv
# 创建时间: 2021-06-18 14:30:00
# 导出时间: 2026-09-14 23:30:00
# 导出工具: PlaylistOut (https://playlistout.com)
# 歌单名称: Chinese Classic Pop Hits
# 歌单作者: Music Cafe
# 歌曲总数: 2 首 (8 分钟)
# 风格标签: Pop, Classic, Mandopop
# 总播放量: 128,500 次
# 歌单链接: https://y.qq.com/n/ryqq/playlist/773829104
序号,歌曲标题,歌手,专辑,时长
1,Sunny Day,Jay Chou,Yeh Hui-Mei,04:29
2,Won't Cry,"Jay Chou, Ashin",Won't Cry,03:42
```

---

### 3. Excel Format (`.xlsx`)

- **File Specification**: Native Microsoft Excel OpenXML Workbook (`.xlsx`).
- **Worksheet Name**: `歌单歌曲`.
- **Layout Architecture**:
  1. **Metadata Header Block (Rows 1–6/7, two-column key-value layout)**:
     - Row 1: `['歌单名称', playlist.name, '', '']`
     - Row 2: `['创建时间', createTime, '导出时间', exportedAt]` (*Creation time 1st, Export time 2nd, placed side-by-side*)
     - Row 3: `['导出工具', 'PlaylistOut', '平台网址', 'https://playlistout.com']`
     - Row 4: `['歌单作者', creator, '歌曲总数', trackCountStr]`
     - Row 5: `['最后更新', updateTime, '总播放量', playCountStr]`
     - Row 6: `['风格标签', tagsStr, '歌单链接', sourceUrl]`
     - Row 7 (optional): `['歌单简介', description, '', '']` (present when description exists)
  2. **Blank Separator Row (Row 8)**: Natural separation between metadata and the song table.
  3. **Table Column Headers (Row 9)**: `序号`, `歌曲标题`, `歌手`, `专辑`, `时长`.
  4. **Track Data Rows (Row 10+)**: Sequential track list with formula injection defense and responsive column widths (10 / 32 / 22 / 25 / 10).

---

### 4. Plain Text Format (`.txt`)

- **Encoding**: `UTF-8`.
- **Format Style**: Stationery book layout, balancing clean human readability and line-by-line script ingestion.
- **Structure**:
  - Top stationery header bounded by `==================================================`;
  - First metadata line is `创建时间:`, followed immediately by `导出时间:`, and third line is `导出工具: PlaylistOut (https://playlistout.com)`;
  - Displays playlist title, curator, last updated date, track count with duration, tags, play count, link, and description;
  - Plain track entries below the divider: `${title} - ${artists} - ${album}` (or `${title} - ${artists}` if no album);
  - Preserves raw text without spreadsheet formula escape prefixes.

#### TXT File Example

```text
==================================================
  创建时间: 2021-06-18 14:30:00
  导出时间: 2026-09-14 23:30:00
  导出工具: PlaylistOut (https://playlistout.com)
  歌单名称: Chinese Classic Pop Hits
  歌单作者: Music Cafe
  最后更新: 2024-03-01 09:15:20
  歌曲总数: 2 首 (总时长 8 分钟)
  风格标签: Pop · Classic · Mandopop
  总播放量: 128,500 次
  歌单链接: https://y.qq.com/n/ryqq/playlist/773829104
--------------------------------------------------
  歌单简介:
  Timeless melodies that touch your soul.
==================================================

Sunny Day - Jay Chou - Yeh Hui-Mei
Won't Cry - Jay Chou, Ashin - Won't Cry
```

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

## ⭐ Star History

<a href="https://www.star-history.com/?repos=LengxiQwQ%2Fplaylistout&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&theme=dark&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
 </picture>
</a>

<!-- INSIGHTS:START -->
**📊 Repository Traffic**

Views: **402** ｜ Uniques: **111** (14-day) ｜ Clones: **763** ｜ Cloners: **178** (14-day)

**Top referrers (14-day):** github.com · Google · Bing · Baidu · chatgpt.com · doubao.com  
**Top content (14-day):** LengxiQwQ/qqmusic-playlist-exporter · lengxiQwQ/qqmusic-playlist-exporter · releases · LengxiQwQ/music-playlist-exporter

> Data since 2026-08-31 · Last updated: 2026-09-15
<!-- INSIGHTS:END -->

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a></sub>
</p>