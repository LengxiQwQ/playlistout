# QA workspace

Everything here is generated from the final deliverable, except the two JSON
files written by the probes.

## Run after a render

```bash
# Technical stream / duration / frame count / loudness
python qa/probe.py

# Overview stills + hand-off stills
python qa/extract_frames.py

# Labelled contact sheets (requires Pillow)
python qa/contact_sheet.py
```

## Outputs

- `probe.json` — codec / resolution / fps / frame count / loudness / blackdetect
- `frames/` — decoded inspection stills
- `contact-sheet.jpg` — 52 overview frames
- `transition-sheet.jpg` — 31 hand-off / transition frames
- `audio/music-only.wav`, `audio/sfx-only.wav` — audition stems
- `audio/waveform.png`, `audio/spectrogram.png` — visual audio checks
- `QUALITY_REPORT.md` — observed result, fixes and remaining limitations

## Scope & honesty

The environment can decode and inspect every frame programmatically, and did so.
It cannot provide a human perceptual screening. The final report distinguishes:

1. what was inspected by extracting and reviewing frames/contact sheets,
2. what was checked from stream metadata, loudness and decode logs,
3. what would still require a human on a calibrated display and a good pair of
   headphones before publishing.

No check is marked “passed” merely because a command exited 0.
