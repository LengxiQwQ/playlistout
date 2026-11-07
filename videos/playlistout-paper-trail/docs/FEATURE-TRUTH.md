# Feature truth audit for the film

This film is an art-directed reconstruction, not a screen recording. The
following table records what each on-screen claim is based on in the current
repository. Paths are repository-relative.

| Film moment | What is shown | Evidence / constraint |
|---|---|---|
| Intro platform ring | QQ 音乐, 网易云音乐, 酷狗音乐, 酷我音乐, 汽水音乐, 咪咕音乐 | `worker/src/providers/platforms.ts`; `cli/README.md` platform matrix |
| Search search note | “跨平台公开歌单解析”, paste link/QQ/homepage into the public web app | `web/src/components/playlist/SearchNote.tsx`; `web/src/i18n/zh-CN.ts` |
| QQ result | 104-track public playlist, status tags, metadata | Illustrative sample data in `src/data.ts`; field layout reconstructed from `TrackTable.tsx` / `PlaylistSummary.tsx` |
| Web formats | Excel, JSON, TXT, CSV, M3U8 in the toolbar | `web/src/components/ExportToolbar.tsx`; `docs/EXPORT-FORMATS.md` |
| Markdown card | Markdown as an additional browser-local data format | `web/src/utils/export/plugins/markdown.ts`; `docs/EXPORT-FORMATS.md` (not exposed as a toolbar sticker in the current UI; it is shown as a file capability) |
| Export copy | files are generated locally and not uploaded | Browser-local exporter architecture; `docs/EXPORT-FORMATS.md` and privacy copy |
| Batch page | QQ Music public collection, 12 playlists, 12/12 selected, max 50 | `web/src/components/playlist/UserPlaylistsPaper.tsx`; `web/src/utils/batchExport.ts` |
| Batch formats | multi-sheet workbook; ZIP alternatives | `batchExport.ts` (`multi_sheet_xlsx` and ZIP path) and UI format labels |
| Workbook | index + one sheet per playlist | `exportToMultiSheetExcel()` in `batchExport.ts` |
| ZIP | one file per playlist inside a ZIP | `exportToZip()` in `batchExport.ts` |
| CLI | `playlistout`, six-platform menu, QQ URL, summary, formats 1–5, `1, 2`, Excel + JSON, `output/` | `cli/README.md`; `cli/main.py`; `cli/core/ui.py`; `cli/core/exporter.py` |
| CLI cross-platform | Windows, macOS, Linux packages | `cli/README.md` download/install table |
| MusicFree | available plugin, paste link or local JSON | `web/public/plugins/index.json`; `plugins/musicfree/README.md` |
| 洛雪音乐 | available via JSON import | `web/src/data/integrations.ts` (`FEATURED_UPCOMING_INTEGRATIONS`, status `available`, kind `import`) |
| Listen 1 | available via JSON restore | same; documented JSON restore path |
| BBPlayer | upcoming, native built-in | `web/src/data/integrations.ts` (`status: 'upcoming'`); `README.md` |
| Soundiiz | third-party migration service | `web/src/components/migration/MigrationPanel.tsx`; labelled as third party and not claimed as an in-house migration |
| Public API / Canonical JSON | open endpoint and unified JSON | `docs/API.md`; `docs/JSON-SCHEMA.md` |
| Caveat: Cool Dog | “酷狗音乐（未登录）” in the platform row; login hint in CLI line | `README.md`: login-free preview is limited to the first 10 tracks; CLI line mentions normal vs concept edition |
| Caveat: batch scope | batch page is QQ Music only | `UserPlaylistsPaper.tsx` supports user-data batches; QQ/NetEase/Kugou are the batch-capable sources. The film deliberately uses QQ. |
| Caveat: no audio download | never shown or claimed | Constitutional boundary: Playlist Out exports playlist data only |

## Data that is illustrative

The playlist title (`花谱、鎖那、鹿乃`), creator, 104 tracks, the 12 playlist
names and their counts are sample data designed to make the UI legible and
warm. They are consistent with the screenshots supplied for the commission and
with the site's real layout, but they are not a live API response at render
time.

## UI reconstruction note

Layouts, labels, colours and typography were rebuilt from the live web app and
the source components. The browser window, paper scroll, table and terminal are
React/CSS, not screenshots. This keeps the UI crisp at 1080p and lets the data
morph into physical files.

## Known departures from exact UI

- The result table is truncated to six visible rows with a small explanatory
  caption so the export panel can be shown in the same shot; the real UI
  scrolls the full 104 rows.
- The 12-playlist batch is an illustrative subset of an account; the UI can
  select up to 50 per batch.
- The CLI window is a designed dark surface with PowerShell chrome; content is
  taken from the real CLI output, with the playlist title cleaned of the HTML
  entity corruption visible in the supplied screenshot.
- A Markdown file card is shown as a capability, while the current web toolbar
  offers the five main download formats.
