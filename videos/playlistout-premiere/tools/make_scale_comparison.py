from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root = Path(r"D:\Projects\playlistout\videos\playlistout-premiere")
demo = root / "demo"
font_path = root / "public" / "fonts" / "NotoSansSC-VF.ttf"
font_big = ImageFont.truetype(str(font_path), 30)
font_mid = ImageFont.truetype(str(font_path), 21)
font_small = ImageFont.truetype(str(font_path), 16)
W, H = 844, 475
pad, top, gap = 24, 70, 40
canvas = Image.new("RGB", (W * 2 + pad * 3, 2 * H + top + gap + pad), "#f2ecdf")
d = ImageDraw.Draw(canvas)
def center(text, x, y, font, fill="#2d3436"):
    box = d.textbbox((0, 0), text, font=font)
    d.text((x - (box[2]-box[0])/2, y), text, font=font, fill=fill)
center("CURRENT v3 · 844 px wide", pad + W/2, 20, font_big, "#8d6a5b")
center("SCALE DEMO 1.75x · 844 px wide", pad*2 + W + W/2, 20, font_big, "#3e6f5a")
for row, (label, old, new) in enumerate([
    ("PARSE INPUT", "current-input-1920-844.jpg", "scale-lab-input-844.jpg"),
    ("PARSE RESULT", "current-result-1920-844.jpg", "scale-lab-result-844.jpg"),
]):
    y = top + row * (H + gap)
    d.text((pad, y - 27), label, font=font_mid, fill="#5f615b")
    d.text((pad*2 + W, y - 27), label, font=font_mid, fill="#5f615b")
    canvas.paste(Image.open(demo / old).convert("RGB"), (pad, y))
    canvas.paste(Image.open(demo / new).convert("RGB"), (pad*2 + W, y))
    d.rectangle([pad, y, pad + W, y + H], outline="#b9ad9a", width=1)
    d.rectangle([pad*2 + W, y, pad*2 + W + W, y + H], outline="#b9ad9a", width=1)
d.text((pad, canvas.height - 28), "Left: v3 at phone width. Right: re-laid-out UI at 1.75x. Main title unchanged.", font=font_small, fill="#7f7b70")
canvas.save(demo / "scale-comparison-844.jpg", quality=92)
print("wrote", demo / "scale-comparison-844.jpg", canvas.size)
