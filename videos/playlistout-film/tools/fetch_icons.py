import urllib.request
import urllib.parse
import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

apps = {
    'netease': '网易云音乐',
    'qq': 'QQ音乐',
    'kugou': '酷狗音乐',
    'kuwo': '酷我音乐',
    'qishui': '汽水音乐',
    'migu': '咪咕音乐'
}

out_dir = r'd:\Projects\playlistout\videos\playlistout-film\public\images\platforms'
os.makedirs(out_dir, exist_ok=True)

for key, name in apps.items():
    query_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(name)}&country=cn&entity=software&limit=1"
    req = urllib.request.Request(query_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data['resultCount'] > 0:
                item = data['results'][0]
                icon_url = item.get('artworkUrl512') or item.get('artworkUrl100')
                track_name = item.get('trackName')
                print(f"[{key}] {track_name}: {icon_url}")
                img_req = urllib.request.Request(icon_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(img_req, timeout=10) as img_resp:
                    img_bytes = img_resp.read()
                    file_path = os.path.join(out_dir, f"{key}.jpg")
                    with open(file_path, 'wb') as f:
                        f.write(img_bytes)
                    print(f" -> Saved {file_path} ({len(img_bytes)} bytes)")
    except Exception as e:
        print(f"Error fetching {key}: {e}")
