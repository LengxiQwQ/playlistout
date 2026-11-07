# Audio — original score & sound design

## Summary

- **Duration**: 56.000 s
- **Tempo / meter**: 120 BPM, 4/4, 28 bars
- **Key**: F major / D minor, with modal colour (Fmaj9, Dm9, Bbmaj9, C7sus)
- **Format**: 48 kHz / 2 ch / PCM 16-bit WAV for Remotion; AAC in the final MP4
- **Master**: −14.0 LUFS integrated, −2.2 dBTP after AAC, LRA 7.3 LU
- **Sources**: 100% synthesized with numpy/scipy; no samples, no library music,
  no recordings, no third-party tracks
- **License**: CC BY 4.0. Attribution: “Playlist Out — Paper Trail, original score”
- **Cue lock**: 30 fps picture; every hit is derived from the same cue list as
  `src/timeline.ts`.

## Arrangement map

| Bars | Seconds | Section | Arrangement |
|---|---|---|---|
| 1–2 | 0–4 | Intro | Fmaj9 / Dm9 pads, Rhodes, vinyl crackle, toy-piano motif, no backbeat |
| 3 | 4–6 | Escape | Kick + rim + shaker, Bb pad, snap, riser into browser |
| 4–8 | 6–16 | Web parse | Full funky groove, syncopated bass, warm lead motif, bell answers |
| 9–10 | 16–20 | File magic | Drums thin out at 16.25, sparse bass, glassy bell arpeggio, paper SFX |
| 11–13 | 20–26 | Formats / batch door | Groove returns, higher toy plucks, fill into the page turn |
| 14–17 | 26–36 | Batch | Strongest groove, claps, 8-bit answers, bell hook, workbook/zip |
| 18–22 | 36–46 | CLI | 16th-note tech bass, rim clicks, filtered pad, chip/bell conversation |
| 23–26 | 46–52 | Ecosystem | Full warm reprise, lead + bell doubling, check stamps |
| 27 | 52–54 | Pre-cadence | Drums stop; Bb–C suspension; cover wipe |
| 28 | 54–56 | Finale | Fmaj9, low F, final bell, 2 s natural tail |

### Motif

The recurring four-bar hook (in F major pentatonic) is:

```
A4  C5  F5  E5  D5  C5  A4  G4
F4  A4  C5  D5  C5  A4  G4
A4  C5  F5  G5  A5  G5  F5  C5
D5  E5  G5  F5  D5  C5  A4
```

It is voiced by a warm additive lead in the main sections, toy piano in the
intro/file scene, and bells in the batch/ecosystem sections. No existing melody
was referenced or reproduced.

## Sound design

| Cue (s) | Event |
|---|---|
| 3.56 | tape peel / thread snap |
| 4.95 | browser sheet whoosh |
| 5.42 | brand stamp |
| 7.30–8.22 | link typewriter ticks |
| 8.50 | parse click |
| 9.02 | result paper unroll |
| 14.90 / 15.90 | format select / export clicks |
| 16.06 | export success chime |
| 16.30 | row-to-file burst |
| 17.35 / 18.40 | Excel / JSON births |
| 19.30 | four format cards flop |
| 24.30 / 25.30 | folder open / page turn |
| 28.08 | batch export click |
| 28.55–29.95 | progress ticks |
| 30.0 / 31.42 / 33.12 | workbook, zip, envelope |
| 35.5–37.5 | terminal slide and command typing |
| 39.0–39.5 | CLI URL typing |
| 43.04 / 43.9 | export + success |
| 45.5 / 46.2 | terminal-to-ecosystem whoosh, player card pops |
| 48.08–48.42 | three verification stamps |
| 51.35 / 52.02 / 53.98 | cover wipe, final stamp, closing chime |

All SFX are short synthesized noise/pitch envelopes. No downloaded sound packs.

## Generation

```bash
python tools/make_soundtrack.py
```

Writes:

- `qa/audio/score-raw.wav` (unmastered mix)
- `qa/audio/music-only-raw.wav`
- `qa/audio/sfx-only-raw.wav`

Measured loudness of the current raw mix:

```
input_i = -16.93 LUFS
input_tp = -2.86 dBTP
input_lra = 7.30 LU
```

Mastering command (two-pass, linear):

```bash
ffmpeg -y -i qa/audio/score-raw.wav \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=-16.93:measured_TP=-2.86:measured_LRA=7.30:measured_thresh=-27.08:offset=0.0:linear=true,volume=-1.1dB,aresample=48000" \
  -ar 48000 -ac 2 -c:a pcm_s16le public/audio/film-mix.wav
```

The music-only and SFX-only QA stems are normalized separately for audition:

```bash
ffmpeg -y -i qa/audio/music-only-raw.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" \
  -ar 48000 -ac 2 -c:a pcm_s16le qa/audio/music-only.wav
ffmpeg -y -i qa/audio/sfx-only-raw.wav -af "loudnorm=I=-20:TP=-2:LRA=11,aresample=48000" \
  -ar 48000 -ac 2 -c:a pcm_s16le qa/audio/sfx-only.wav
```

Visual references: `qa/audio/waveform.png` and `qa/audio/spectrogram.png`.
The final QC pass re-checks the loudness of `out/playlistout-paper-trail.mp4`
after AAC encoding.

## Licensing & publication

- The final MP4 measures -14.0 LUFS integrated and -2.2 dBTP after AAC muxing.
The score and all SFX were written and synthesized for this project.
- They are released under **Creative Commons Attribution 4.0 International
  (CC BY 4.0)**: <https://creativecommons.org/licenses/by/4.0/>.
- Attribution to include in a Bilibili / YouTube description:
  `Music & sound design: Playlist Out — Paper Trail (original score, CC BY 4.0)`.
- No content-ID-risky recordings are used. If a platform's automated system
  still flags the file, the full generation script and stems are included so the
  claim can be disputed or the mix regenerated.
- Font licenses: see `public/fonts/licenses/` (OFL; Permanent Marker license).
- The Playlist Out logo is from the MIT-licensed Playlist Out repository.

### AI involvement

The score was composed and generated programmatically for this production. It
is intended as an original, freely licensable soundtrack, not a recreation of a
commercial song. The arrangement, synthesis code and stems are available in
this project.
