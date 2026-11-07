# -*- coding: utf-8 -*-
"""
Download authentic open-source OFL Google Fonts used by Playlist Out's Music Journal design system
into public/fonts/ so Remotion renders deterministically with zero network dependency or KaiTi fallback.
"""
import os
import re
import urllib.request

FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "fonts")
os.makedirs(FONTS_DIR, exist_ok=True)

# Direct raw GitHub google/fonts URLs + Google Fonts CSS fallback
FONT_SOURCES = {
    "MaShanZheng-Regular.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf",
    ],
    "ZCOOLKuaiLe-Regular.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf",
    ],
    "PermanentMarker-Regular.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf",
        "https://github.com/google/fonts/raw/main/apache/permanentmarker/PermanentMarker-Regular.ttf",
    ],
    "Caveat-Bold.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf",
        "https://github.com/google/fonts/raw/main/ofl/caveat/Caveat%5Bwght%5D.ttf",
    ],
    "SpaceMono-Regular.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/spacemono/SpaceMono-Regular.ttf",
    ],
    "SpaceMono-Bold.ttf": [
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Bold.ttf",
        "https://github.com/google/fonts/raw/main/ofl/spacemono/SpaceMono-Bold.ttf",
    ],
}

GOOGLE_CSS_FAMILIES = {
    "MaShanZheng-Regular.ttf": "Ma+Shan+Zheng",
    "ZCOOLKuaiLe-Regular.ttf": "ZCOOL+KuaiLe",
    "PermanentMarker-Regular.ttf": "Permanent+Marker",
    "Caveat-Bold.ttf": "Caveat:wght@700",
    "SpaceMono-Regular.ttf": "Space+Mono:wght@400",
    "SpaceMono-Bold.ttf": "Space+Mono:wght@700",
}


def download_via_google_css(filename: str, family_query: str, dest: str) -> bool:
    for host in ("https://fonts.googleapis.com", "https://fonts.font.im"):
        try:
            css_url = f"{host}/css2?family={family_query}&display=swap"
            req = urllib.request.Request(
                css_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                css_text = resp.read().decode("utf-8", errors="ignore")
            urls = re.findall(r"url\((https://[^)]+)\)", css_text)
            if urls:
                font_url = urls[-1].strip("'\"")
                f_req = urllib.request.Request(
                    font_url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                )
                with urllib.request.urlopen(f_req, timeout=20) as f_resp:
                    data = f_resp.read()
                if len(data) > 5000:
                    with open(dest, "wb") as f:
                        f.write(data)
                    print(f"[OK via CSS] {filename} ({len(data)} bytes)")
                    return True
        except Exception as e:
            print(f"[WARN CSS {host}] {filename}: {e}")
    return False


def main():
    for filename, urls in FONT_SOURCES.items():
        dest = os.path.join(FONTS_DIR, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 10000:
            print(f"[SKIP] {filename} already exists ({os.path.getsize(dest)} bytes)")
            continue

        success = False
        for url in urls:
            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                )
                with urllib.request.urlopen(req, timeout=25) as resp:
                    data = resp.read()
                if len(data) > 10000:
                    with open(dest, "wb") as f:
                        f.write(data)
                    print(f"[OK] {filename} ({len(data)} bytes)")
                    success = True
                    break
            except Exception as e:
                print(f"[WARN] {filename} from {url}: {e}")

        if not success and filename in GOOGLE_CSS_FAMILIES:
            download_via_google_css(filename, GOOGLE_CSS_FAMILIES[filename], dest)


if __name__ == "__main__":
    main()
