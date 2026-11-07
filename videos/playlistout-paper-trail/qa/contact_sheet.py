#!/usr/bin/env python3
"""Build labelled contact sheets from qa/frames."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "qa" / "frames"
OUT = ROOT / "qa"

COLS = 5
THUMB_W = 384
THUMB_H = 216
PAD = 12
LABEL_H = 26

font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 15)
small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 12)


def make_sheet(prefix: str, output: str):
    files = sorted(FRAMES.glob(f"{prefix}-*.jpg"))
    if not files:
        print(f"no frames for {prefix}")
        return
    rows = (len(files) + COLS - 1) // COLS
    width = COLS * THUMB_W + (COLS + 1) * PAD
    height = rows * (THUMB_H + LABEL_H) + (rows + 1) * PAD
    sheet = Image.new("RGB", (width, height), "#efe7d7")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(files):
        col = i % COLS
        row = i // COLS
        x = PAD + col * (THUMB_W + PAD)
        y = PAD + row * (THUMB_H + LABEL_H + PAD)
        img = Image.open(path).convert("RGB")
        img = img.resize((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
        sheet.paste(img, (x, y))
        draw.rectangle([x, y, x + THUMB_W - 1, y + THUMB_H - 1], outline="#2d3436", width=2)
        draw.text((x + 4, y + THUMB_H + 4), path.stem, fill="#2d3436", font=font)
    dest = OUT / output
    sheet.save(dest, quality=92)
    print(f"wrote {dest} ({sheet.width}x{sheet.height})")


make_sheet("overview", "contact-sheet.jpg")
make_sheet("transition", "transition-sheet.jpg")
