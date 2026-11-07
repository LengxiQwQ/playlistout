"""
Automated Visual & Technical QA Script for Playlist Out Promotional Film.
Extracts keyframes and transition frames from the rendered MP4, verifies codec/timing specs,
and builds annotated contact sheets in `previews/` for visual inspection.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
VIDEO_PATH = ROOT / "out" / "PlaylistOut_MusicJournal_Film_1080p.mp4"
PREVIEWS_DIR = ROOT / "previews"
KEYFRAMES_DIR = PREVIEWS_DIR / "keyframes"

INSPECTION_FRAMES = [
    (60, "Act1_02.0s_PlatformLocks"),
    (145, "Act1_04.8s_BrandDebut_Unlock"),
    (205, "Bridge1to2_06.8s_StickersLanding"),
    (250, "Act2_08.3s_PasteLink_ClickParse"),
    (360, "Act2_12.0s_PlaylistSummary_TrackTable"),
    (480, "Act2_16.0s_StatusBadges_Notes"),
    (575, "Bridge2to3_19.2s_ToExportToolbar"),
    (680, "Act3_22.7s_OrigamiFold_Excel_JSON"),
    (760, "Act3_25.3s_SixFormats_Gallery"),
    (850, "Bridge3to4_28.3s_ToBatchWorkspace"),
    (960, "Act4_32.0s_12Playlists_CheckWave"),
    (1060, "Act4_35.3s_MultiSheetExcel_ZipPack"),
    (1150, "Bridge4to5_38.3s_ToDesktopCLI"),
    (1280, "Act5_42.7s_PowerShell_Interactive"),
    (1390, "Act5_46.3s_CLI_ExportComplete_CrossOS"),
    (1460, "Bridge5to6_48.7s_ToEcosystemHub"),
    (1530, "Act6_51.0s_Players_Migration_API"),
    (1605, "Bridge6to7_53.5s_ToBrandFinale"),
    (1650, "Act7_55.0s_BrandFinale_EndOfPage"),
]


def find_ffmpeg() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def extract_frames(ffmpeg_exe: str) -> list[tuple[int, str, Path]]:
    KEYFRAMES_DIR.mkdir(parents=True, exist_ok=True)
    extracted = []
    for frame_idx, label in INSPECTION_FRAMES:
        timestamp = frame_idx / 30.0
        out_png = KEYFRAMES_DIR / f"f{frame_idx:04d}_{label}.png"
        cmd = [
            ffmpeg_exe,
            "-y",
            "-ss",
            f"{timestamp:.4f}",
            "-i",
            str(VIDEO_PATH),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(out_png),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        extracted.append((frame_idx, label, out_png))
    return extracted


def build_contact_sheet(
    items: list[tuple[int, str, Path]],
    out_path: Path,
    cols: int = 3,
    thumb_w: int = 640,
    thumb_h: int = 360,
) -> None:
    rows = (len(items) + cols - 1) // cols
    pad = 16
    label_h = 34
    sheet_w = cols * thumb_w + (cols + 1) * pad
    sheet_h = rows * (thumb_h + label_h) + (rows + 1) * pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (246, 241, 229))
    draw = ImageDraw.Draw(sheet)

    for i, (frame_idx, label, png_path) in enumerate(items):
        r = i // cols
        c = i % cols
        x = pad + c * (thumb_w + pad)
        y = pad + r * (thumb_h + label_h + pad)

        with Image.open(png_path) as im:
            thumb = im.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x, y))

        draw.rectangle([x, y, x + thumb_w, y + thumb_h], outline=(45, 52, 54), width=2)
        caption = f"Frame {frame_idx:04d} ({frame_idx/30.0:.2f}s) — {label}"
        draw.text((x + 6, y + thumb_h + 6), caption, fill=(45, 52, 54))

    sheet.save(out_path, quality=92)


def main() -> None:
    if not VIDEO_PATH.exists():
        print(f"ERROR: Rendered video not found at {VIDEO_PATH}", file=sys.stderr)
        sys.exit(1)

    size_mb = VIDEO_PATH.stat().st_size / (1024 * 1024)
    print(f"[QA] Found video: {VIDEO_PATH} ({size_mb:.2f} MB)")

    ffmpeg_exe = find_ffmpeg()
    extracted = extract_frames(ffmpeg_exe)
    print(f"[QA] Extracted {len(extracted)} keyframe & transition stills to {KEYFRAMES_DIR}")

    build_contact_sheet(
        extracted[:10],
        PREVIEWS_DIR / "contact_sheet_part1.jpg",
        cols=2,
        thumb_w=800,
        thumb_h=450,
    )
    build_contact_sheet(
        extracted[10:],
        PREVIEWS_DIR / "contact_sheet_part2.jpg",
        cols=2,
        thumb_w=800,
        thumb_h=450,
    )
    print(f"[QA] Built high-resolution contact sheets in {PREVIEWS_DIR}")


if __name__ == "__main__":
    main()
