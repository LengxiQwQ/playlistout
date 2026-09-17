<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="PlaylistOut" />

# Playlist Out

*Your playlists shouldn't be trapped inside one music platform.*

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)

**🌐 [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)**

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
- **Zero-Friction & Secure Authorization**: Public playlists from QQ Music and NetEase Cloud Music are 100% zero-login with full tracklist export. KuGou Music supports instant guest previews with optional mobile QR code authorization to unlock complete playlists (tokens stored strictly within the user's browser, zero server storage).
- **Pure and Focused**: It is not a music player, does not download audio files, and avoids intrusive cloud sync. It focuses purely, reliably, and completely on one job: exporting and migrating playlist data.

---

## 🚀 Use It Online

No installation required. Simply visit **[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)** to get started:

1. **Paste a Playlist** — Supports links from QQ Music, NetEase Cloud Music, KuGou Music, and Soda Music (desktop URLs, mobile short links, raw IDs, or copied mobile share text). You can also paste user homepage links or user IDs to directly load all publicly created playlists.
2. **Instant Parsing** — Edge workers parse playlist metadata, song titles, artists, albums, covers, and track availability/VIP statuses.
3. **Full Preview** — Review the complete tracklist, total track count, and track availability directly in your browser before exporting.
4. **Export or Copy** — Save locally as TXT / CSV / Excel (.xlsx) / JSON, or copy to clipboard with a single click; batch-package multiple playlists into multi-sheet Excel workbooks or ZIP archives.

---

## ✨ Key Features

### 🔗 Fast Cross-Platform Playlist Parsing & Export
Native support for public playlists from **QQ Music**, **NetEase Cloud Music**, **KuGou Music**, and **Soda Music (汽水音乐)**:
- **QQ Music / NetEase Cloud Music**: Fully web-based and 100% zero-login. Parse and export complete playlists without accounts, cookies, tokens, or software installation.
- **Soda Music (汽水音乐)**: Zero-login direct resolution for share shortlinks and playlists, extracting synced Douyin favorites and soundtrack tracks.
- **KuGou Music**: Due to upstream H5 anti-scraping and app-funneling restrictions, guest unauthenticated requests receive a **10-track public preview**; full 100% tracklists can be unlocked seamlessly via one-click mobile QR code authorization in the web app or by passing token credentials in API request headers.

#### 📊 Platform Capabilities & Upstream Limitations Matrix

| Platform | Code | Single Playlist | User Playlists | Upstream Mechanism & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **QQ Music** | `qqmusic` | 🟢 **100% Zero-Login Full Export** (No track count cap) | 🟢 **Zero-Login Full Export** (QQ number or profile URL) | No tokens or cookies needed; uses open public web protocol. |
| **NetEase Cloud Music** | `netease` | 🟢 **100% Zero-Login Full Export** (Deep pagination 1000+ tracks) | 🟢 **Zero-Login Full Export** (UID or profile URL) | Solves common 10-track unauthenticated limits in other tools. |
| **Soda Music** | `qishui` | 🟢 **100% Zero-Login Full Export** (Supports synced Douyin tracks) | ⚪ *No public user profiles on platform* | No tokens needed; extracts complete tracks from shortlinks. |
| **KuGou Music** | `kugou` | 🟡 **Zero-Login: 10-track preview only**<br/>🟢 **With Token: 100% Full Export** | 🟡 **Requires Token & Userid** | **Upstream Restriction**: KuGou mobile share pages embed only the first 10 tracks into SSR HTML, redirecting further viewing to their App. To unlock playlists beyond 10 tracks or export user profile collections, provide creator session credentials:<br/>• **Web UI**: Click "Connect KuGou Account" for one-click QR scan;<br/>• **API**: Pass `Authorization` and `X-Kugou-Userid` headers. |


### 📚 User Playlist Collections & Batch Packaging
Paste a user's QQ number, NetEase UID, or profile link to load their entire collection of publicly created playlists in one click. Select all or any subset of playlists, and batch-export them into a **Multi-Sheet Excel Workbook** (one sheet per playlist) or a **ZIP Archive** containing individual Excel / CSV / TXT / JSON files.

### 🐕 KuGou Mobile QR Safe Unlock
KuGou only provides guest previews for unauthenticated requests. PlaylistOut provides **KuGou mobile App QR authorization** to unlock complete playlists without track limits. Session tokens are stored strictly within the user's local browser storage and never sent to or retained in any server database.

### 🏷️ Song VIP & Availability Status Detection
Automatically detects and marks track playable statuses: **Playable**, **Unavailable / Uncopyrighted**, **VIP Only**, **Paid Album**, etc. Displayed prominently in both the web table and exported CSV / Excel / TXT / JSON files to prevent unexpected missing tracks during cross-platform migration.

### 🔍 Cross-Platform Numeric ID Disambiguation
When entering a raw numeric ID, the system concurrently probes single-playlist and user-profile targets across platforms, presenting an interactive journal dialog to let you choose your intended destination.

### 🎵 Deep Pagination for Large Playlists
Breaks free from common 100-track truncation or unauthenticated 10-track limits. PlaylistOut features an automated pagination and batch-hydration engine with seamless support for **1,000+ track** playlists, preserving the original track order and legitimate duplicate tracks without silent dropping.

### 📦 4 File Formats Generated Locally
Export parsed playlists into multiple widely-used formats tailored for different use cases:
- **TXT** — Clean plain text list with stationery card styling and status tags, ideal for inspection, notepad backups, or niche music players.
- **CSV** — Standard comma-separated values (with UTF-8 BOM, including VIP and Status columns, preventing garbled text in Excel on Windows).
- **Excel (.xlsx)** — Native formatted spreadsheet with metadata cards, custom column widths, VIP, and availability tags.
- **JSON** — Complete structured data containing track IDs, artists, albums, VIP flags, availability statuses, and metadata for developers.

> All files are assembled and downloaded directly within browser memory. Data never passes through intermediary third-party servers.

### 📋 3 Quick Clipboard Formats
When you just need text without downloading a file, copy tracklists directly in several handy formats:
- **Title Only**: One track title per line.
- **Title - Artist**: Universal text format, ready to paste into search bars or import dialogs of other music apps.
- **Title - Artist - Album**: Full tab-separated (TSV) format, ready to paste directly into any spreadsheet via Ctrl+V.

### 🛡️ Robust Security & Formula Injection Defense
During CSV and Excel exports, cells starting with special trigger characters (`=`, `+`, `-`, `@`) are automatically escaped with leading single quotes. This prevents malicious spreadsheet formula execution (CSV Injection / DDE) when opening exported files. The entire API is protected by rate limiting and OWASP security headers.

---

## 🌐 Public API v1

PlaylistOut officially provides a unified cross-platform public API for third-party developers, automation pipelines, and custom clients.

- **Production Base URL**: `https://playlistout-api.lengxiqwq.com`
- **Universal Resolver**: `GET /api/v1/resolve?q=<input>`
  - Replicates the server-side logic of the main search box (supports QQ Music, NetEase Cloud Music, KuGou Music, and Soda Music playlist links, profile URLs, shortlinks, and share text).
  - Supports explicit disambiguation parameters: `&type=auto|playlist|user` and `&platform=auto|qqmusic|netease|kugou|qishui`.
  - Public GET endpoints feature open CORS (`Access-Control-Allow-Origin: *`), enabling direct `fetch` calls from browser web apps.
- **Single Playlist Endpoint**: `GET /api/v1/playlist?url=<url_or_id>`
- **User Playlists Endpoint**: `GET /api/v1/user/playlists?uid=<uid_or_uin>`
- **KuGou Token Acquisition & Authentication**:
  - **How to obtain**: In the "连接酷狗账号" modal, both desktop **QR code scanning** and mobile **one-click KuGou App jump** are supported. Once connected, developers can one-click copy ready-to-run **cURL commands**, raw **Token**, and **UserID** from the Developer API Credentials card.
  - **Security Standard**: Strictly adhering to OWASP security practices, credential parameters in URLs (e.g. `?token=...`) are **forbidden and rejected with 400 Bad Request**. Provide credentials via standard HTTP headers:
  ```bash
  # Fetch complete 400+ track KuGou playlist with Token & Userid headers
  curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://m.kugou.com/songlist/gcid_xxx/" \
    -H "Authorization: Bearer <kugou_token>" \
    -H "X-Kugou-Userid: <kugou_userid>"
  ```
- **Full API Documentation & Code Samples (cURL / JavaScript / Python)**: See [`docs/API.md`](docs/API.md).

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

| Field | Type | Required | Description & Format |
|---|---|---|---|
| `createTime` | `string \| null` | Optional | **Playlist creation time** (1st position). Formatted as `YYYY-MM-DD HH:mm:ss`, or `null` if unavailable upstream. |
| `exportedAt` | `string` | Optional | **Data export time**. Local generation timestamp `YYYY-MM-DD HH:mm:ss`. |
| `generator` | `string` | Optional | **Generator platform identifier**. Fixed to `"PlaylistOut"`. |
| `generatorUrl` | `string` | Optional | **Official website URL**. Fixed to `"https://playlistout.lengxiqwq.com"`. |
| `name` | `string` | **Required** | Full title of the playlist. |
| `creator` | `string` | Optional | Nickname of the playlist creator / curator. |
| `updateTime` | `string \| null` | Optional | Last modified / updated timestamp in `YYYY-MM-DD HH:mm:ss` format. `null` if unavailable. |
| `platform` | `string` | **Required** | Source music platform identifier (e.g., `"qqmusic"`, `"netease"`, `"kugou"`, `"qishui"`). |
| `id` | `string` | **Required** | Native unique playlist identifier from the source platform (e.g., `"773829104"`). |
| `sourceUrl` | `string` | **Required** | Direct canonical web URL of the playlist on the source platform. |
| `trackCount` | `number` | **Required** | Total number of tracks contained in the playlist (integer). |
| `loadedTrackCount` | `number` | Optional | Number of actually loaded tracks. Represents loaded subset count in guest previews. |
| `isPartial` | `boolean` | Optional | Whether this export is a partial guest preview (e.g. `true` for unauthenticated KuGou preview). |
| `totalDuration` | `string \| null` | Optional | Formatted total playlist duration (e.g., `"3 小时 45 分钟"`), `null` during partial preview. |
| `loadedDuration` | `string \| null` | Optional | Formatted duration of actually loaded tracks. |
| `playCount` | `number \| null` | Optional | Cumulative listen / play count as an integer. |
| `tags` | `string[]` | Optional | Array of genre and category tags (e.g., `["Pop", "Acoustic"]`). |
| `description` | `string` | Optional | Playlist introduction / background description. |
| `tracks` | `Track[]` | **Required** | Array of track items, preserving the original curator order. |

#### Track Item Schema

| Field | Type | Required | Description & Format |
|---|---|---|---|
| `index` | `number` | Optional | 1-based sequential display index in the playlist. |
| `id` | `string` | Optional | Unique track identifier / MID from the source platform (e.g., `"0039MnYb0qxYAc"`). |
| `title` | `string` | **Required** | Song title (preserving version notes and subtitles). |
| `artists` | `string[]` | **Required** | Array of participating artist names (e.g., `["Jay Chou", "Ashin"]`). |
| `album` | `string` | **Required** | Album name. |
| `durationMs` | `number` | Optional | Total audio duration in milliseconds (e.g., `269000` = 4m 29s). |
| `isVip` | `boolean` | Optional | Whether this track is VIP exclusive. |
| `isAvailable` | `boolean` | Optional | Whether track is playable on source platform (`false` when unavailable / uncopyrighted). |
| `status` | `string` | Optional | Status enum: `"playable"`, `"unplayable"`, `"vip"`, `"paid"`, `"geo_blocked"`. |
| `statusText` | `string` | Optional | Localized friendly status text (e.g., `"正常"`, `"下架/无版权"`, `"VIP专享"`). |
| `sourceUrl` | `string` | Optional | Direct canonical web URL of the track detail page. |

#### Standard JSON Example

```json
{
  "createTime": "2021-06-18 14:30:00",
  "exportedAt": "2026-09-14 23:30:00",
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "name": "Chinese Classic Pop Hits",
  "creator": "Music Cafe",
  "updateTime": "2024-03-01 09:15:20",
  "platform": "qqmusic",
  "id": "773829104",
  "sourceUrl": "https://y.qq.com/n/ryqq/playlist/773829104",
  "trackCount": 2,
  "loadedTrackCount": 2,
  "isPartial": false,
  "totalDuration": "8 分钟",
  "loadedDuration": "8 分钟",
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
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc"
    },
    {
      "index": 2,
      "id": "0027fM2M3wD4gS",
      "title": "Won't Cry",
      "artists": ["Jay Chou", "Ashin"],
      "album": "Won't Cry",
      "durationMs": 222000,
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS"
    }
  ]
}
```

---

### 2. CSV Format (`.csv`)

- **Encoding**: `UTF-8 with BOM` (starts with `\uFEFF` byte order mark to avoid mojibake in Microsoft Excel on Windows).
- **Line Ending**: `\r\n` (CRLF).
- **Pure Table Output**: By default, generates standard RFC 4180 pure tabular data (7 columns) without comment lines for maximum compatibility with spreadsheet software and music migration pipelines.
- **Metadata Extension Mode**: When metadata inclusion is enabled in advanced settings, prefaced by `# ` comment lines containing playlist metadata.
- **Formula Injection Defense**: Cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are safely prepended with a single quote `'` to prevent DDE/macro code execution in spreadsheet applications.
- **RFC 4180 Escaping**: Fields containing commas or quotes are wrapped in double quotes, with internal quotes escaped as `""`.

#### CSV File Example

```csv
序号,歌曲标题,歌手,专辑,时长,VIP,歌曲状态
1,Sunny Day,Jay Chou,Yeh Hui-Mei,04:29,—,正常
2,Won't Cry,"Jay Chou, Ashin",Won't Cry,03:42,—,正常
```

---

### 3. Excel Format (`.xlsx`)

- **File Specification**: Native Microsoft Excel OpenXML Workbook (`.xlsx`).
- **Worksheet Name**: `歌单歌曲`.
- **Layout Architecture**:
  1. **Metadata Header Block (Rows 1–6/7, two-column key-value layout)**:
     - Row 1: `['歌单名称', playlist.name, '', '']`
     - Row 2: `['创建时间', createTime, '导出时间', exportedAt]` (*Creation time 1st, Export time 2nd, placed side-by-side*)
     - Row 3: `['导出工具', 'PlaylistOut', '平台网址', 'https://playlistout.lengxiqwq.com']`
     - Row 4: `['歌单作者', creator, '歌曲总数', trackCountStr]`
     - Row 5: `['最后更新', updateTime, '总播放量', playCountStr]`
     - Row 6: `['风格标签', tagsStr, '歌单链接', sourceUrl]`
     - Row 7 (optional): `['歌单简介', description, '', '']` (present when description exists)
  2. **Blank Separator Row (Row 8)**: Natural separation between metadata and the song table.
  3. **Table Column Headers (Row 9)**: `序号`, `歌曲标题`, `歌手`, `专辑`, `时长`, `VIP`, `歌曲状态` (7 columns).
  4. **Track Data Rows (Row 10+)**: Sequential track list with formula injection defense and responsive column widths (10 / 32 / 22 / 25 / 10 / 8 / 14).

---

### 4. Plain Text Format (`.txt`)

- **Encoding**: `UTF-8`.
- **Format Style**: Stationery book layout, balancing clean human readability and line-by-line script ingestion.
- **Structure**:
  - Top stationery header bounded by `==================================================`;
  - First metadata line is `创建时间:`, followed immediately by `导出时间:`, and third line is `导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)`;
  - Displays playlist title, curator, last updated date, track count with duration, tags, play count, link, and description (clearly notes loaded track count and duration during partial previews);
  - Plain track entries below the divider: `${title} - ${artists} - ${album}` (or `${title} - ${artists}` if no album);
  - Automatically appends status tags for unplayable/VIP tracks (e.g. `[下架/无版权]`, `[VIP专享]`);
  - Preserves raw text without spreadsheet formula escape prefixes.

#### TXT File Example

```text
==================================================
  创建时间: 2021-06-18 14:30:00
  导出时间: 2026-09-14 23:30:00
  导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)
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
| **QQ Music** | ✅ Supported | Playlist share URLs / IDs / App share text / QQ number batch export (No login) |
| **NetEase Cloud Music** | ✅ Supported | Playlist URLs / short links / IDs / UID batch export / VIP & copyright status (No login) |
| **KuGou Music** | ✅ Supported | Web & App share URLs / IDs (guest preview without login; mobile QR authorization for full export) |
| Kuwo Music | Planned | On the roadmap |
| Migu Music | Planned | On the roadmap |
| Qishui Music | Planned | On the roadmap |

Each streaming platform connects through an independent Provider module, while the frontend maintains a unified data model and export experience.

---

## 🔒 Privacy & Data

PlaylistOut operates with a transparent, privacy-first commitment:

- **No Service Accounts**: PlaylistOut itself has no account registration, user logins, or profiling system. QQ Music and NetEase Cloud Music require zero credentials. When using mobile QR code authorization to unlock KuGou Music, the temporary token is stored solely within your local browser LocalStorage and never sent to or retained in any server database.
- **Stateless Edge Proxy**: Tracklists are fetched on demand via Cloudflare Workers and returned immediately to the frontend. No playlist database exists, and no songs are retained on the server.
- **100% Local Export**: TXT, CSV, XLSX, and JSON files are generated entirely within the client's browser. File contents are never transmitted to any server.
- **Anonymous Aggregated Metrics**: Cloudflare D1 stores only anonymous aggregate counters (e.g., success/failure counts, export format distributions) for service health monitoring and capacity planning. No IP addresses, URLs, or track names are stored.
- **Fail-Closed Principle**: If upstream data is truncated, incomplete, or fails validation, PlaylistOut explicitly reports an error rather than silently returning an incomplete tracklist.

---

## ⌨️ Command-Line Tools (CLI)

In addition to the web app, standalone Python CLI scripts are provided under `cli/` for automation, cron backup jobs, and developer workflows:
- **Supported Platforms**: **QQ Music** (`cli/qqmusic/`) and **NetEase Cloud Music** (`cli/netease/`).
- **Key Capabilities**: Supports single playlist export by URL or ID, and batch discovery and export of all publicly created playlists by QQ number or NetEase UID. The NetEase CLI uniquely detects track availability and VIP status.

Navigate to the respective directory, install requirements, and run the script (each directory includes a detailed `README.md`):

```bash
# QQ Music CLI
cd cli/qqmusic && pip install -r requirements.txt && python qq_music_playlist_export.py

# NetEase Cloud Music CLI
cd cli/netease && pip install -r requirements.txt && python netease_playlist_export.py
```

---

## 💻 Development

PlaylistOut is organized as a lightweight Monorepo:

| Directory | Description |
|---|---|
| `web/` | Web application built with React 18 + TypeScript + Vite |
| `worker/` | Edge API service built with Cloudflare Workers + TypeScript + D1 |
| `cli/qqmusic/` | Original Python QQ Music CLI tool |
| `cli/netease/` | Standalone Python NetEase Cloud Music CLI tool |
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

# Unit and component tests (Web & Worker)
npm run test

# Validate against real public playlists (QQ Music / NetEase / KuGou)
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

PlaylistOut is open-source software licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

<!-- WEBSITE_STATS:START -->
### 🌐 Live Website Statistics & Insights

> 📊 Data aggregated in real-time via [Cloudflare D1 Edge Node](https://playlistout-api.lengxiqwq.com/api/stats) and synced daily.

#### 📌 Core Metrics & Usage Volume

| 👥 Unique Visitors (UV) | 📄 Page Views (PV) | 🎵 Playlists Parsed | 💿 Tracks Processed | 📦 Exports | ⏱️ Uptime |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **307**<br><sub>Today +101</sub> | **2,271**<br><sub>Today +885</sub> | **183**<br><sub>Today +40</sub> | **62,668**<br><sub>Today +19,759</sub> | **551**<br><sub>Today +188</sub> | **6 Days**<br><sub>Since 2026-09-12</sub> |

#### 🗺️ Geographic & Client Distribution
- **🌍 Top Visitor Regions:** 🇲🇾 Malaysia **65%** ｜ 🇺🇸 United States **31%** ｜ 🇨🇳 Mainland China **2%** ｜ 🇭🇰 Hong Kong **1%** ｜ 🇯🇵 Japan **0%** ｜ 🇨🇳 Taiwan **0%** ｜ 🌐 CD **0%** ｜ 🇩🇪 Germany **0%** ｜ 🌐 BE **0%** ｜ 🇨🇦 Canada **0%**
- **💻 Client Devices:** Desktop **97%** ｜ Mobile **3%**
- **🌐 Browsers:** Other **83%** ｜ Chrome **14%** ｜ Edge **2%** ｜ Safari **1%**

#### 🇨🇳 Mainland China Visitor Province Distribution

| Province / Municipality | Share | Province / Municipality | Share |
| :---: | :---: | :---: | :---: |
| Guangdong | **38%** | Shanghai | **27%** |
| Shaanxi | **15%** | Henan | **8%** |
| Guangxi | **4%** | Hubei | **4%** |
| Liaoning | **4%** | — | — |

#### 📊 Feature Usage & Platform Breakdown
- **🎵 Platform Shares:** QQ Music **89%** (134 parses) ｜ NetEase Cloud Music **11%** (17 parses)
- **📦 Export Format Distribution:** Excel (.xlsx) **64%** ｜ TXT **32%** ｜ CSV **2%** ｜ JSON **1%**

> 🛡️ **Privacy Guarantee**: All metrics are stored as discrete, coarse-grained anonymous aggregate counters in accordance with Project Constitution. **No raw IP addresses, private playlist contents, or personal credentials are ever stored.**
<!-- WEBSITE_STATS:END -->

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

Views: **504** ｜ Uniques: **113** (14-day) ｜ Clones: **1,128** ｜ Cloners: **236** (14-day)

**Top referrers (14-day):** github.com · Google · Bing · Baidu · chatgpt.com · Yahoo  
**Top content (14-day):** LengxiQwQ/qqmusic-playlist-exporter · lengxiQwQ/qqmusic-playlist-exporter · releases · LengxiQwQ/music-playlist-exporter

> Data since 2026-08-31 · Last updated: 2026-09-17
<!-- INSIGHTS:END -->

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a></sub>
</p>