# Quality report — Playlist Out · Paper Trail

**Status: delivered.** Final render and technical acceptance completed on
2026-11-07.

- Deliverable: `out/playlistout-paper-trail.mp4`
- Source: `videos/playlistout-paper-trail/`
- Contact sheets: `qa/contact-sheet.jpg`, `qa/transition-sheet.jpg`
- Key stills: `qa/stills/`
- Soundtrack: `out/playlistout-paper-trail-soundtrack.mp3`

## 1. Technical acceptance

| Check | Result |
|---|---|
| Container / video | MP4 / H.264 |
| Resolution | **1920 × 1080** |
| Frame rate | **30/1 fps** |
| Duration | **56.000 s** |
| Frame count (decoded) | **1,680 / 1,680** |
| Audio | AAC, **48 kHz, 2 channels**, 327 kb/s |
| File size | 36,017,299 bytes (34.3 MiB) |
| Video bitrate | 4.81 Mb/s |
| Integrated loudness | **−14.0 LUFS** |
| Loudness range | 7.3 LU |
| True peak | **−2.2 dBTP** |
| Fast start | Remuxed with `+faststart` |
| Full-file decode | 1,680 frames decoded without reported errors |

Commands used:

```bash
python qa/probe.py
python qa/static_scan.py
ffmpeg -v error -i out/playlistout-paper-trail.mp4 -f null -
ffmpeg -hide_banner -nostats -i out/playlistout-paper-trail.mp4 -vf "freezedetect=n=0.003:d=1.0" -an -f null -
```

The full video was also opened in a media player (`ffplay -autoexit -nodisp`) as
a technical end-to-end playback check. A human perceptual screening on a
calibrated display was **not** possible in this environment; the visual review
below is frame-based.

## 2. Visual inspection

- 53 overview frames across the film (about 1 s spacing) and 31 transition frames around hand-offs — 84 extracted stills in total.
- 11 full-resolution key stills (`qa/stills/01`–`11`).
- Additional full-res checks at 0.3, 5.16, 17.2, 25.3, 35.5, 46.6 and 51.55 s.

The following were explicitly checked:

- No text overlaps in the new intro title swap; the mascot was moved below the
  title after a first-pass overlap was found.
- The playlist card and CTA remain inside the 1920 × 1080 frame.
- The browser UI has correct chrome, URL bar, platform chips, result summary,
  table columns and export panel.
- The XLSX grid uses the correct title/artist/album/duration/status/vip/type
  columns; the JSON card shows a valid-looking Canonical JSON shape.
- The batch page displays 12 checked playlists, 12/12 selected, the
  multi-sheet format, progress and the workbook/ZIP outputs.
- The CLI uses the real PowerShell banner, six-platform menu, QQ URL, details,
  1–5 format list, multi-select `1, 2`, Excel/JSON output and output folder.
- The final cover shows the logo, wordmark, Chinese tagline, URL, GitHub and MIT.
- No black or near-white full frames (min mean luminance 61.1, max 239.2).
- `freezedetect` reports low-motion holds in the browser reading beat (6.7–7.9 s),
  the batch page read beat (25.9–28.0 s), two CLI reading beats (42.6–43.8 s and
  44.3–45.3 s) and the end card (52.2–55.8 s). These are intentional reading /
  ending holds; the rest of the film keeps camera, note, cursor or paper motion.
  There are no accidental full-frame blank or frozen screens.
- No logo 404s, no missing glyph boxes, no `\\` path escape in the terminal.

### Issues found during production and fixed

1. Fonts were originally root-URL referenced and failed the Remotion bundle.
   Fixed with `FontFace` + `staticFile`.
2. Brand logos used root URLs and 404'd in captures. Fixed with `staticFile`.
3. Platform ticket text wrapped inside the 205 px tag. Widened and tightened.
4. Intro playlist card fell below the 1080 frame. Moved up 52 px.
5. Intro “ready to go” sticker covered the card title. Removed.
6. Old/new intro titles cross-faded on top of each other. Reconciled into a
   clean fade-gap.
7. Intro note covered the new title. Moved it below the title.
8. Result note covered the summary action stickers. Moved to the page margin.
9. Cursor coordinates were content-relative while rendered at stage scale.
   Moved the cursor out of the browser content transform.
10. A 3D browser page rotation stretched live text and exposed blank triangles.
    Replaced with a physical chapter-card paper wipe.
11. File cards bled above the page wipe during the hand-off. Early fade added.
12. Excel grid had shifted/clipped columns. Rebuilt with verified headers.
13. CLI note sat on menu/details text and became black-on-black during terminal
    entry. Hidden during entry and kept on the paper margin.
14. Terminal entry and browser entry were translucent, causing double-exposure.
    Made opaque at the first 2–4 frames of entry.
15. Batch progress/checks and OS badges needed retiming for readability.
16. Finale at 52 s was blank while the cover arrived. Content now reveals with
    the cover and holds on a complete end card.
17. Prompt string had a doubled backslash. Fixed.
18. Audio was first at −12.9 LUFS; trimmed 1.1 dB to the delivered −14.0 LUFS.

## 3. Audio review

- Original score at 120 BPM / 28 bars, synthesized from numpy/scipy primitives.
- No samples, recordings, library cues or downloaded SFX.
- Music-only and SFX-only stems are included in `qa/audio/`.
- Waveform and spectrogram are included.
- Cues: paper/tape/string snaps, typing, parse, format flips, folder, zip,
  terminal typing, checks, page wipe and final bell.
- No clipped samples in the rendered AAC; true peak −2.2 dBTP.
- The score has deliberate drops at the file interlude, terminal entry and
  ending; the fade is a real composed tail, not a truncated loop.

Limitation: the score is procedural synth music. It has the requested playful
electronic / cozy character, but it is not a recorded ensemble and should be
listened to on headphones for a final subjective judgment.

## 4. Functional truth

The film's claims were audited against the current repository. The full mapping
is in `docs/FEATURE-TRUTH.md`. Key statuses:

- MusicFree — supported plugin.
- 洛雪音乐 / Listen 1 — supported JSON import paths.
- BBPlayer — upcoming, shown dashed.
- Soundiiz — third-party migration service, not an in-house automatic migration.
- Public API / Canonical JSON — available integration surfaces.
- Markdown — supported browser-local exporter, shown as a file capability but
  not as one of the five toolbar stickers.
- 酷狗音乐 — shown as “未登录”; the CLI line mentions the normal/concept edition
  difference.

## 5. Remaining limitations

1. **No human perceptual screening.** The environment can decode, extract and
   measure every frame, but cannot make a subjective “does this feel good?”
   judgment. The MP4 was played through with `ffplay` and inspected via frames.
2. **UI reconstruction.** The browser and terminal are React reconstructions of
   the real product, not a live screen recording. Sample playlist data is
   illustrative.
3. **Markdown UI nuance.** Markdown exists in the exporter registry and docs,
   but the current web toolbar exposes five main formats; the film presents
   Markdown as a data-file capability.
4. **Music timbre.** The score is intentionally synthesized rather than played
   on acoustic instruments.
5. **Small decorative type.** Some annotations are 9–12 px at 1080p; they are
   deliberately secondary. A 1080p-or-better screen is recommended.
6. **No 9:16 deliverable.** The film is 16:9 only; publishing suggestions for a
   later short cut are in `docs/PUBLISH.md`.
7. **Low-motion holds.** The end card, chapter card and reading beats intentionally
   use very little motion. `freezedetect` reports ~1–2 s near-static spans at the
   browser reading beat (6.7–7.9 s), the batch read (25.9–28.0 s), the CLI reading
   beats (42.6–43.8 s / 44.3–45.3 s) and the end card (52.2–55.8 s). These are
   deliberate pacing beats; the rest of the film carries continuous note, camera,
   cursor or paper motion. No accidental full-frame blank/black screens exist.
