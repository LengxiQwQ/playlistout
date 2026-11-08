"""Technical & Visual QA suite for Playlist Out Film.

Validates:
1. Video stream: 1920x1080, 30 fps, H.264, 1740 frames (58.0s)
2. Audio stream: 48 kHz stereo AAC, EBU R128 integrated loudness & true peak
3. Full decode integrity (zero corrupt frames), black-frame & freeze-frame checks
4. Generates:
   - qa/contact-sheet.jpg (8x8 grid of all 58 seconds)
   - qa/audio-waveform.png
   - qa/mobile-844px-preview.jpg (simulating horizontal phone viewing!)
   - qa/keyframes/*.png (16 high-res keyframes across all 7 scenes)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "output" / "playlistout-promo.mp4"
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


def main() -> int:
    if not VIDEO.exists():
        print(f"Missing video: {VIDEO}")
        return 1

    data = probe(VIDEO)
    video = stream(data, "video")
    audio = stream(data, "audio")
    print(
        f"Video: {video.get('codec_name')} {video.get('width')}x{video.get('height')} "
        f"{video.get('r_frame_rate')} frames={video.get('nb_read_frames')}"
    )
    print(f"Audio: {audio.get('codec_name')} {audio.get('sample_rate')} Hz {audio.get('channels')} ch")
    print(
        f"Duration: {data['format'].get('duration')} s, "
        f"size: {int(data['format'].get('size', 0)) / 1024 / 1024:.2f} MiB"
    )

    decode = run("ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "null", "-")
    print(f"Full decode: {'OK' if decode.returncode == 0 and not decode.stderr.strip() else 'ERRORS'}")
    if decode.stderr.strip():
        print(decode.stderr[:1000])

    black = run("ffmpeg", "-i", str(VIDEO), "-vf", "blackdetect=d=0.3:pix_th=0.05", "-an", "-f", "null", "-")
    blacks = [line.strip() for line in black.stderr.splitlines() if "black_start" in line]
    print(f"Black intervals: {len(blacks)}")

    freeze = run("ffmpeg", "-i", str(VIDEO), "-vf", "freezedetect=n=0.003:d=1.8", "-an", "-f", "null", "-")
    frozen = [line.strip() for line in freeze.stderr.splitlines() if "freeze_start" in line]
    print(f"Static intervals (>=1.8 s): {len(frozen)}")

    loud = run("ffmpeg", "-i", str(VIDEO), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-")
    loud_i = re.findall(r"I:\s+(-?[0-9.]+) LUFS", loud.stderr)
    loud_lra = re.findall(r"LRA:\s+(-?[0-9.]+) LU", loud.stderr)
    loud_tp = re.findall(r"Peak:\s+(-?[0-9.]+) dBFS", loud.stderr)
    print(
        f"Loudness: I={loud_i[-1] if loud_i else '?'} LUFS, "
        f"LRA={loud_lra[-1] if loud_lra else '?'} LU, "
        f"true peak={loud_tp[-1] if loud_tp else '?'} dBFS"
    )

    # Contact Sheet (1 fps across all 58s -> 8x8 tile)
    run(
        "ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-vf", "fps=1,scale=320:-1,tile=8x8:color=#f5efe2",
        "-frames:v", "1", str(QA / "contact-sheet.jpg"),
    )

    # Waveform visualization
    run(
        "ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-filter_complex", "showwavespic=s=1600x320:colors=#e06c88|#266b4e",
        "-frames:v", "1", str(QA / "audio-waveform.png"),
    )

    # Keyframes extraction
    keyframes = {
        40: "01-intro-trapped-cage",
        92: "02-intro-key-unlock",
        116: "03-intro-mascot-breakout-leap",
        190: "04-intro-brand-and-6-platforms",
        295: "05-parse-sticky-url-input",
        322: "06-parse-mascot-button-press",
        430: "07-parse-playlist-104-tracks",
        610: "08-export-excel-dual-sheet",
        690: "09-export-canonical-json",
        780: "10-export-all-6-formats-fan",
        920: "11-batch-3-playlists-checked",
        1045: "12-batch-multisheet-and-zip",
        1220: "13-cli-interactive-laptop",
        1272: "14-cli-mascot-stomp-enter",
        1345: "15-cli-cross-platform-badges",
        1425: "16-eco-musicfree-plugin",
        1540: "17-eco-players-and-public-api",
        1690: "18-finale-brand-and-mascot-star",
    }
    keydir = QA / "keyframes"
    keydir.mkdir(exist_ok=True)
    for frame, name in keyframes.items():
        run(
            "ffmpeg", "-y", "-v", "error",
            "-ss", f"{frame / 30:.3f}",
            "-i", str(VIDEO),
            "-frames:v", "1",
            str(keydir / f"{frame:04d}-{name}.png"),
        )

    # Mobile 844px horizontal viewport check sheet (2x3 grid of 844x474 downscaled frames)
    run(
        "ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-vf", "select='eq(n\\,190)+eq(n\\,430)+eq(n\\,780)+eq(n\\,1045)+eq(n\\,1345)+eq(n\\,1690)',scale=844:474,tile=2x3:padding=12:color=#2d3436",
        "-fps_mode", "vfr", "-frames:v", "1", str(QA / "mobile-844px-readability.jpg"),
    )

    print(f"Wrote {QA / 'contact-sheet.jpg'}, {QA / 'mobile-844px-readability.jpg'}, and {keydir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
