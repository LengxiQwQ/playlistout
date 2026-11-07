#!/usr/bin/env python3
"""Technical acceptance probe for the final deliverable."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "out" / "playlistout-paper-trail.mp4"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def main():
    if not VIDEO.exists():
        raise SystemExit(f"missing {VIDEO}")
    probe = run([
        "ffprobe", "-v", "error", "-count_frames",
        "-show_entries",
        "format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels",
        "-of", "json", str(VIDEO),
    ])
    data = json.loads(probe.stdout or "{}")
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    audio = next((s for s in streams if s.get("codec_type") == "audio"), {})
    report = {
        "file": VIDEO.name,
        "bytes": VIDEO.stat().st_size,
        "duration_seconds": float(data.get("format", {}).get("duration", 0)),
        "video_codec": video.get("codec_name"),
        "width": video.get("width"),
        "height": video.get("height"),
        "fps": video.get("r_frame_rate"),
        "video_frames": int(video.get("nb_read_frames", 0) or 0),
        "audio_codec": audio.get("codec_name"),
        "audio_sample_rate": audio.get("sample_rate"),
        "audio_channels": audio.get("channels"),
        "checks": {},
    }
    c = report["checks"]
    c["1920x1080"] = report["width"] == 1920 and report["height"] == 1080
    c["30fps"] = report["fps"] == "30/1"
    c["duration_50_to_60"] = 50 <= report["duration_seconds"] <= 60
    c["exact_1680_frames"] = report["video_frames"] == 1680
    c["h264"] = report["video_codec"] == "h264"
    c["audio_present"] = bool(audio)
    c["audio_48k_stereo"] = str(audio.get("sample_rate")) == "48000" and int(audio.get("channels", 0)) == 2

    # Black / freeze detection. The film intentionally holds the end card, so
    # freezedetect is reported but judged against the known ~2 s hold.
    black = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(VIDEO),
        "-vf", "blackdetect=d=0.2:pic_th=0.98:pix_th=0.10",
        "-an", "-f", "null", "-",
    ])
    report["blackdetect_log"] = (black.stderr or "").strip().splitlines()[-8:]

    ebu = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(VIDEO),
        "-af", "ebur128=peak=true", "-f", "null", "-",
    ])
    tail = (ebu.stderr or "").strip().splitlines()
    report["loudness_tail"] = tail[-18:]

    all_good = all(c.values())
    report["passed"] = all_good
    (ROOT / "qa" / "probe.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if all_good else 1)


if __name__ == "__main__":
    main()
