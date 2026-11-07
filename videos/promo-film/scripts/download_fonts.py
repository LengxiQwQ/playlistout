import re
import urllib.request
from pathlib import Path

FONTS_DIR = Path(__file__).resolve().parent.parent / "public" / "fonts"
FONTS_DIR.mkdir(parents=True, exist_ok=True)

# Clean old files
for old in FONTS_DIR.glob("*.ttf"):
    old.unlink()

FONT_SPECS = [
    ("MaShanZheng-Regular.woff", "https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap"),
    ("ZCOOLKuaiLe-Regular.woff", "https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap"),
    ("Caveat-Bold.woff", "https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap"),
    ("PermanentMarker-Regular.woff", "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap"),
    ("SpaceMono-Regular.woff", "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400&display=swap"),
    ("SpaceMono-Bold.woff", "https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&display=swap"),
]

# Using Firefox 10 User-Agent makes Google Fonts return a single complete WOFF1 file containing all glyphs
UA_WOFF = "Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0"

for filename, css_url in FONT_SPECS:
    req = urllib.request.Request(css_url, headers={"User-Agent": UA_WOFF})
    with urllib.request.urlopen(req, timeout=20) as resp:
        css = resp.read().decode("utf-8")
    urls = re.findall(r"url\((https://[^)]+\.(?:ttf|woff2?))\)", css)
    if not urls:
        raise RuntimeError(f"Could not find font URL in CSS for {filename}:\n{css}")
    font_url = urls[0]
    out_path = FONTS_DIR / filename
    print(f"Downloading {filename} from {font_url} ...")
    urllib.request.urlretrieve(font_url, out_path)
    print(f"  -> Saved {out_path.name} ({out_path.stat().st_size:,} bytes)")
