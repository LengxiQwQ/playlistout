# Playlist Out — Paper Trail

A 56-second, 1920 × 1080 / 30 fps music-journal motion film for
**Playlist Out · 把你的歌单带走**. A short 0.7-second letterpress chapter card
(“批量手账”) turns the page between the single-playlist story and the batch
section, then the film continues without a full-screen reset.

> 这不是 PPT，也不是软件录屏。它是一本会动的音乐手账：一张歌单从六个平台的
> 约束里逃出来，被粘贴进 Playlist Out，变成表格、JSON 与更多格式，随后走进
> 批量导出、桌面 CLI 和开源播放器。结尾，它回到一本安静的手账封面。

| | |
|---|---|
| Composition | `PlaylistOutPaperTrail` |
| Runtime | **56.000 s** · 1,680 frames |
| Delivery | H.264 MP4 / AAC, 1920×1080, 30 fps, yuv420p |
| Music | Original 120 BPM score + synthesized sound design (56 s) |
| Language | Chinese (on-screen copy), Latin hand-lettering accents |
| Primary reference | The real Playlist Out web UI, `cli/README.md`, and the user-supplied screenshots |

**Final deliverables**

- `out/playlistout-paper-trail.mp4` — the film
- `out/playlistout-paper-trail-soundtrack.mp3` — the original score, 320 kb/s
- `out/playlistout-paper-trail-contact-sheet.jpg` — 53-frame overview sheet
- `out/playlistout-paper-trail-transition-sheet.jpg` — 31-frame hand-off sheet
- `out/poster.jpg` — end-card poster
- `out/SHA256SUMS.txt` — delivery checksums
- `qa/QUALITY_REPORT.md` — inspection notes and remaining limits
- `qa/stills/` — 11 full-resolution key stills
- `README.md` + `docs/` — build, asset, music and status documentation

---

## 1. Build & render

### Requirements

- Node.js 22+ (tested with Node 24.20.0), npm 11+
- Python 3.14 (for the audio generator; `numpy`, `scipy`)
- FFmpeg 9+ on `PATH` (loudness master + QA probes)
- Remotion's Chrome Headless Shell (`npx remotion browser ensure`)

### Install

```bash
cd videos/playlistout-paper-trail
npm install
npx remotion browser ensure
```

### Regenerate the score (already included in `public/audio/film-mix.wav`)

```bash
python tools/make_soundtrack.py
# the script writes raw stems to qa/audio/ and qa/audio/score-raw.wav
# then run the measured loudness pass (see docs/AUDIO.md for the exact command)
```

The committed `public/audio/film-mix.wav` is the loudness-mastered 48 kHz stereo
mix. Re-running audio generation is only needed if you edit the arrangement.

### Preview / QA render

```bash
npm run render:preview
# 960 × 540, CRF 24, with audio — fast way to check timing and transitions
```

### Final render

```bash
npm run render
# 1920 × 1080, H.264 CRF 17, yuv420p, 30 fps, 3 concurrency
```

Output: `out/playlistout-paper-trail.mp4`.

### Individual stills

```bash
npx remotion still src/index.tsx PlaylistOutPaperTrail out/still.png --frame=840
```

### Studio

```bash
npm run studio
```

The Studio loads local fonts through `FontGate` and the audio from
`public/audio/film-mix.wav`. The composition is 1,680 frames long.

---

## 2. Project structure

```text
playlistout-paper-trail/
├─ src/
│  ├─ Film.tsx                 # master timeline, persistent note, audio
│  ├─ Root.tsx                 # Remotion composition
│  ├─ theme.ts                 # palette, font stacks, platform colours
│  ├─ timeline.ts              # 30 fps cue map / 120 BPM bar positions
│  ├─ data.ts                  # verified export formats, sample playlist data,
│  │                           #   batch collection and player/ecosystem copy
│  ├─ notePath.ts              # one continuous performer path for the note
│  ├─ assets.ts                # staticFile() handles
│  ├─ scenes/
│  │  ├─ IntroScene.tsx        # trapped playlist, six platforms, escape
│  │  ├─ FileExportScene.tsx   # rows → Excel / JSON / six formats
│  │  ├─ BatchOutputScene.tsx  # 12 playlists → workbook / ZIP / envelope
│  │  ├─ TerminalScene.tsx     # real CLI flow, cross-platform close
│  │  ├─ EcosystemScene.tsx    # MusicFree / 洛雪 / Listen 1 / BBPlayer / API
│  │  └─ FinaleScene.tsx       # notebook-cover close
│  ├─ components/
│  │  ├─ browser/              # faithful web UI, batch page, cursor, bits
│  │  ├─ NotebookBackdrop.tsx
│  │  ├─ NoteMascot.tsx
│  │  ├─ Stationery.tsx         # paper, tape, stickers, cover art
│  │  ├─ Doodles.tsx
│  │  └─ FontGate.tsx
│  └─ lib/anim.ts
├─ public/
│  ├─ audio/film-mix.wav       # mastered 56 s stereo mix
│  ├─ brand/logo-*.png         # from the Playlist Out repo (MIT)
│  ├─ fonts/                   # OFL fonts + licenses
│  └─ textures/                # public site paper texture files
├─ tools/make_soundtrack.py    # original score + SFX generator
├─ qa/                         # frames, contact sheets, probe results, report
└─ docs/
   ├─ STORYBOARD.md
   ├─ AUDIO.md
   ├─ ASSET-MANIFEST.md
   └─ FEATURE-TRUTH.md
```

No existing Playlist Out application source is modified by this project.

---

## 3. Visual direction

The language is deliberately the site's own: cream paper, ruled lines, a red
margin, binder holes, hard offset shadows, washi tape, colored platform
stickers, Space Mono metadata, Caveat handwriting, and Ma Shan Zheng for
Chinese journal titles.

The film adds a single continuous character — a small ink eighth-note with a
face — and a red thread that connects playlists, files and players. The note
carries the “take it with you” idea through every scene; the thread is the
visual promise that the data stays connected.

- Everything is drawn in 2D with paper layers and a fixed 16:9 stage.
- The browser window is a stable object; the site scrolls and changes inside it.
- File cards are born from actual track rows; the workbook is born from the 12
  selected playlists. Those morphs are the transitions, not fades.
- The terminal is a dark sheet of paper pinned onto the same desk, not a cut to
  a different world.
- At the end, a cover sheet wipes up over the collage and becomes the film's
  final page.

See `docs/STORYBOARD.md` for the shot-by-shot map.

---

## 4. Functional truth

The film is an art-directed reconstruction of real Playlist Out surfaces, not a
screen recording.

Verified against the repo:

- Six platforms: QQ 音乐, 网易云音乐, 酷狗音乐, 酷我音乐, 汽水音乐, 咪咕音乐.
  The Cool Dog chip is shown as **未登录**, matching its login-free preview limit.
- Single playlist flow: paste link → parse → summary + track table with
  VIP / 下架 status → multi-select formats → export toast.
- Formats shown in the web toolbar: **Excel / JSON / TXT / CSV / M3U8**.
  Markdown is shown as an additional browser-local data format; it lives in the
  export registry and is documented in `docs/EXPORT-FORMATS.md`.
- Batch example uses a QQ Music user collection (the only batch-ready source
  shown here), 12 playlists. Export choices shown: multi-sheet Excel workbook
  and ZIP packaging. Both are real web features; ZIP is shown as the
  alternative, not a simultaneous second download.
- CLI flow matches `cli/README.md` and the interactive screenshot: six platforms,
  the `playlistout` command, QQ recognition, playlist details, 1–5 format list,
  multi-select `1, 2`, Excel + JSON output, `output/` directory, Windows /
  macOS / Linux packaging.
- Player ecosystem: MusicFree is an available plugin; 洛雪音乐 and Listen 1 use
  exported JSON import flows; **BBPlayer is marked 即将上线**, not available;
  Soundiiz is labelled a third-party migration service; Public API and Canonical
  JSON are shown as real integration surfaces.
- No audio downloading, no lyrics scraping, no server-side playlist storage is
  implied. All export copy says the file bytes are produced locally.

Sample playlist/track metadata is illustrative. It uses real-looking artist and
track information consistent with the supplied screenshot, but it is not live
data from a current API response.

---

## 5. Music

The 56-second score is written at 120 BPM (28 bars), in F major / D minor, and
synthesized entirely with numpy/scipy primitives: no samples, no third-party
recordings. It follows the edit:

- intimate intro (Rhodes, pad, vinyl)
- full playful groove for web parse
- a quiet paper-file interlude
- a funkier batch section
- a minimal 16th-note CLI section
- a wide reprise for the ecosystem
- a deliberate final cadence on Fmaj9 at 54 s, with a 2 s tail

The exact cue map, instruments, loudness targets and authorization notes are in
`docs/AUDIO.md`.

Master: **−14.0 LUFS integrated, −2.2 dBTP after AAC**, 48 kHz stereo.

---

## 6. QA workflow

```bash
# 1. render the film
npm run render
# 2. probe codec, size, fps, frame count, loudness
python qa/probe.py
# 3. extract overview + hand-off stills
python qa/extract_frames.py
# 4. build contact sheets
python qa/contact_sheet.py
# 5. scan for accidental static/black stretches
python qa/static_scan.py
# 6. inspect every frame in the contact sheets; also watch the MP4 end to end
```

The acceptance report is `qa/QUALITY_REPORT.md`.

Known limits are stated honestly: programmatic checks cannot replace human
viewing; the film is a hand-recreated interface rather than a live screen
recording; the score is original synthesis, so its timbre is "synth-pop
stationery" rather than recorded live instruments.

---

## 7. License

- Film source: MIT (see `LICENSE`).
- Original score & sound design: CC BY 4.0, attribution
  “Playlist Out — Paper Trail, original score” (see `docs/AUDIO.md`).
- Fonts: SIL Open Font License 1.1 (license files in
  `public/fonts/licenses/`).
- Playlist Out logo: from the Playlist Out repository, MIT.
- Website paper textures: from the Playlist Out repository, MIT.
- All code-generated imagery is original to this project.
