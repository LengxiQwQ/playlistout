"""Run repeatable technical QA on the rendered film and produce contact sheets.

Usage:
    python tools/qa.py
    python tools/qa.py output/playlistout-premiere.mp4
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "output" / "playlistout-premiere.mp4"
QA = ROOT / "qa"
QA.mkdir(parents=True, exist_ok=True)


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe(path: Path) -> dict:
    p = run(
        "ffprobe", "-v", "error", "-count_frames",
        "-show_entries", "format=duration,size,bit_rate",
        "-show_entries", "stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,nb_read_frames",
        "-of", "json", str(path),
    )
    if p.returncode != 0:
        raise RuntimeError(p.stderr)
    return json.loads(p.stdout)


def stream(data: dict, kind: str) -> dict:
    for s in data.get("streams", []):
        if s.get("codec_type") == kind:
            return s
    return {}


def matches(stderr: str, key: str) -> list[str]:
    return [line.strip() for line in stderr.splitlines() if key in line]


def main() -> int:
    if not VIDEO.exists():
        print(f"Missing video: {VIDEO}")
        return 1
    data = probe(VIDEO)
    video = stream(data, "video")
    audio = stream(data, "audio")
    print(f"Video: {video.get('codec_name')} {video.get('width')}x{video.get('height')} "
          f"{video.get('r_frame_rate')} frames={video.get('nb_read_frames')}")
    print(f"Audio: {audio.get('codec_name')} {audio.get('sample_rate')} Hz {audio.get('channels')} ch")
    print(f"Duration: {data['format'].get('duration')} s, size: {int(data['format'].get('size', 0)) / 1024 / 1024:.1f} MiB")

    decode = run("ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "null", "-")
    print(f"Full decode: {'OK' if decode.returncode == 0 and not decode.stderr.strip() else 'ERRORS'}")
    if decode.stderr.strip():
        print(decode.stderr[:1000])

    black = run("ffmpeg", "-i", str(VIDEO), "-vf", "blackdetect=d=0.3:pix_th=0.05", "-an", "-f", "null", "-")
    blacks = matches(black.stderr, "black_start")
    print(f"Black intervals: {len(blacks)}")

    freeze = run("ffmpeg", "-i", str(VIDEO), "-vf", "freezedetect=n=0.003:d=1.5", "-an", "-f", "null", "-")
    frozen = matches(freeze.stderr, "freeze_start")
    print(f"Static intervals (>=1.5 s): {len(frozen)}")

    loud = run("ffmpeg", "-i", str(VIDEO), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-")
    loud_i = re.findall(r"I:\s+(-?[0-9.]+) LUFS", loud.stderr)
    loud_lra = re.findall(r"LRA:\s+(-?[0-9.]+) LU", loud.stderr)
    loud_tp = re.findall(r"Peak:\s+(-?[0-9.]+) dBFS", loud.stderr)
    print(f"Loudness: I={loud_i[-1] if loud_i else '?'} LUFS, LRA={loud_lra[-1] if loud_lra else '?'} LU, "
          f"true peak={loud_tp[-1] if loud_tp else '?'} dBFS")

    run("ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-vf", "fps=1,scale=320:-1,tile=8x7", "-frames:v", "1", str(QA / "contact-sheet.jpg"))
    run("ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-filter_complex", "showwavespic=s=1600x320:colors=#4f7d69", "-frames:v", "1",
        str(QA / "audio-waveform.png"))
    keyframes = {
        45: "intro-title", 155: "intro-handed-off", 300: "parse-result", 390: "parse-complete",
        480: "export-toolbar", 560: "export-files", 640: "excel-json", 800: "batch-entry",
        900: "batch-selected", 970: "batch-pack", 1020: "cli-boot", 1240: "cli-complete",
        1320: "cli-os", 1450: "eco", 1500: "eco-api", 1560: "finale-entry", 1620: "finale",
        1670: "end",
    }
    keydir = QA / "keyframes"
    keydir.mkdir(exist_ok=True)
    for frame, name in keyframes.items():
        run("ffmpeg", "-y", "-v", "error", "-ss", f"{frame / 30:.3f}", "-i", str(VIDEO),
            "-frames:v", "1", str(keydir / f"{frame:04d}-{name}.png"))
    print(f"Wrote {QA / 'contact-sheet.jpg'} and {keydir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
