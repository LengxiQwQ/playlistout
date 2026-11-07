#!/usr/bin/env python3
"""Extract QA frames from the final film. Run from the project root."""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "out" / "playlistout-paper-trail.mp4"
OUT = ROOT / "qa" / "frames"
OUT.mkdir(parents=True, exist_ok=True)

# overview every ~1.1 s plus all the awkward hand-offs
TIMES = [
    0.3, 1.4, 2.6, 3.4, 4.2, 5.1, 5.9, 6.7, 7.7, 8.5, 9.2, 10.2,
    11.4, 12.6, 13.8, 14.8, 15.8, 16.4, 17.2, 18.5, 19.6, 20.8,
    22.2, 23.4, 24.5, 25.3, 25.7, 26.4, 27.6, 28.3, 29.4, 30.4,
    31.7, 33.1, 34.4, 35.4, 36.2, 37.3, 38.6, 40.2, 41.8, 43.2,
    44.4, 45.5, 46.6, 47.8, 49.1, 50.3, 51.4, 52.1, 53.2, 54.3, 55.5,
]

TRANSITIONS = [
    3.58, 3.92, 4.98, 5.16, 6.0, 9.02, 9.24, 16.22, 16.42,
    16.9, 17.35, 18.42, 25.28, 25.48, 25.62, 25.78, 26.0,
    28.08, 30.02, 31.4, 33.08, 35.5, 35.7, 43.0, 45.5, 48.08,
    51.35, 51.55, 51.8, 52.05, 54.0,
]


def grab(t: float, name: str):
    dest = OUT / name
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", f"{t:.3f}", "-i", str(VIDEO), "-frames:v", "1",
            "-q:v", "2", str(dest),
        ],
        check=True,
    )


def main():
    if not VIDEO.exists():
        raise SystemExit(f"missing video: {VIDEO}")
    for t in TIMES:
        grab(t, f"overview-{t:05.2f}.jpg")
    for t in TRANSITIONS:
        grab(t, f"transition-{t:05.2f}.jpg")
    print(f"extracted {len(TIMES) + len(TRANSITIONS)} frames into {OUT}")


if __name__ == "__main__":
    main()
