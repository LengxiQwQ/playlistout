#!/usr/bin/env python3
"""
Decode the whole film to tiny grayscale frames and flag suspicious static runs
or all-black / all-white frames. This is a detection aid, not a substitute for
watching the film.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "out" / "playlistout-paper-trail.mp4"
W, H = 160, 90
FPS = 30

cmd = [
    "ffmpeg", "-v", "error", "-i", str(VIDEO),
    "-vf", f"scale={W}:{H}:flags=area,format=gray",
    "-f", "rawvideo", "-",
]
proc = subprocess.run(cmd, capture_output=True, check=True)
raw = np.frombuffer(proc.stdout, dtype=np.uint8)
frames = raw.reshape(-1, H, W).astype(np.float32)
count = len(frames)
mean_lum = frames.mean(axis=(1, 2))
diff = np.zeros(count, dtype=np.float32)
diff[1:] = np.abs(frames[1:] - frames[:-1]).mean(axis=(1, 2))

# Find low-difference runs, ignoring 1-frame compression noise.
threshold = 0.32
low = diff < threshold
runs = []
start = None
for i, v in enumerate(low):
    if v and start is None:
        start = i
    if not v and start is not None:
        if i - start >= 15:
            runs.append({"start_s": round(start / FPS, 2), "end_s": round(i / FPS, 2), "frames": i - start})
        start = None
if start is not None and count - start >= 15:
    runs.append({"start_s": round(start / FPS, 2), "end_s": round(count / FPS, 2), "frames": count - start})

report = {
    "video": VIDEO.name,
    "decoded_frames": count,
    "resolution_for_scan": f"{W}x{H}",
    "mean_luminance": {"min": float(mean_lum.min()), "max": float(mean_lum.max()), "avg": float(mean_lum.mean())},
    "near_black_frames": int((mean_lum < 8).sum()),
    "near_white_frames": int((mean_lum > 247).sum()),
    "static_runs_ge_0_5s": runs,
    "mean_interframe_difference": float(diff[1:].mean()) if count > 1 else 0.0,
    "notes": [
        "The 54-56 s end-card hold is intentional.",
        "The chapter card around 25.5 s intentionally holds for a few frames.",
    ],
}
(ROOT / "qa" / "static_scan.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
