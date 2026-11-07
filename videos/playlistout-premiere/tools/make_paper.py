"""Generate a tactile paper surface and a repeating paper-fibre tile.

No third-party imagery; the fibres, pulp mottling and flecks are drawn from
seeded random numbers so the result stays reproducible.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "textures"
OUT.mkdir(parents=True, exist_ok=True)


def fractal_field(w: int, h: int, rng: np.random.Generator) -> np.ndarray:
    field = np.zeros((h, w), dtype=np.float32)
    for scale, amp in [(4, 0.55), (12, 0.34), (36, 0.22), (96, 0.13)]:
        small = rng.normal(0, 1, (max(2, h // scale), max(2, w // scale))).astype(np.float32)
        layer = np.array(Image.fromarray(small).resize((w, h), Image.Resampling.BICUBIC))
        field += layer * amp
    field -= field.min()
    field /= max(1e-6, field.max())
    return field


def make_surface(w: int, h: int, seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    field = fractal_field(w, h, rng)

    base = np.zeros((h, w, 3), dtype=np.float32)
    # cream paper, with local absorbency variation
    base[..., 0] = 244 + (field - 0.5) * 10
    base[..., 1] = 238 + (field - 0.5) * 10
    base[..., 2] = 225 + (field - 0.5) * 9

    full = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    draw = ImageDraw.Draw(full, "RGBA")

    # long, mostly horizontal paper fibres
    for _ in range(int(w * h * 0.0018)):
        x = rng.uniform(-20, w + 20)
        y = rng.uniform(-20, h + 20)
        length = rng.uniform(3, 28)
        angle = rng.uniform(0, np.pi) if rng.random() < 0.58 else rng.normal(0.12, 0.22)
        x2 = x + np.cos(angle) * length
        y2 = y + np.sin(angle) * length
        if rng.random() < 0.22:
            color = (120, 102, 76, rng.integers(20, 52))
        elif rng.random() < 0.22:
            color = (255, 251, 237, rng.integers(35, 85))
        else:
            color = (196, 177, 145, rng.integers(14, 36))
        draw.line((x, y, x2, y2), fill=color, width=1 if rng.random() > 0.12 else 2)

    # a few longer, softly curved fibres
    for _ in range(24):
        x = rng.uniform(0, w)
        y = rng.uniform(0, h)
        pts = [(x, y)]
        for k in range(4):
            x += rng.uniform(-6, 6)
            y += rng.uniform(-2, 2)
            pts.append((x, y))
        draw.line(pts, fill=(125, 106, 78, rng.integers(30, 62)), width=1)

    # pulp specks
    for _ in range(int(w * h * 0.0011)):
        x = rng.uniform(0, w)
        y = rng.uniform(0, h)
        r = rng.uniform(0.35, 1.8)
        color = (120, 101, 72, rng.integers(20, 60)) if rng.random() < 0.7 else (255, 251, 237, rng.integers(30, 90))
        draw.ellipse((x, y, x + r, y + r), fill=color)

    # very subtle broad scuffs / sizing marks
    overlay = Image.new("L", (w, h), 0)
    od = ImageDraw.Draw(overlay)
    for _ in range(9):
        x1 = rng.uniform(0, w)
        y1 = rng.uniform(0, h)
        length = rng.uniform(120, 500)
        angle = rng.uniform(-0.25, 0.25)
        x2 = x1 + np.cos(angle) * length
        y2 = y1 + np.sin(angle) * length
        od.line((x1, y1, x2, y2), fill=int(rng.uniform(6, 16)), width=int(rng.uniform(3, 12)))
    overlay = overlay.filter(ImageFilter.GaussianBlur(9))
    full = Image.composite(Image.new("RGB", (w, h), (124, 105, 78)), full, overlay.point(lambda v: int(v * 0.7)))
    return full


def save_tile() -> None:
    tile = make_surface(1024, 1024, 20261108)
    # turn the tile edges into a soft wrap by mirroring the border strips
    a = np.asarray(tile).astype(np.float32)
    strip = 28
    a[:, :strip] = (a[:, :strip] + a[:, -strip:][:, ::-1]) / 2
    a[:, -strip:] = a[:, :strip][:, ::-1]
    a[:strip, :] = (a[:strip, :] + a[-strip:, :][::-1, :]) / 2
    a[-strip:, :] = a[:strip, :][::-1, :]
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(OUT / "paper-fibre-tile.png", optimize=True)


def main() -> None:
    save_tile()
    page = make_surface(1920, 1080, 20261107)
    page.save(OUT / "paper-fibre-page.png", optimize=True)
    print("wrote paper-fibre-tile.png and paper-fibre-page.png")


if __name__ == "__main__":
    main()
