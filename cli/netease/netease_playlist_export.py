# --- 网易云音乐歌单导出工具 ---
# -*- coding: utf-8 -*-

"""
依赖（自行安装）：
    pip install requests
    pip install openpyxl
"""

__author__ = "lengxiQwQ"

import os
import re
import sys
import json
import csv
import platform
import subprocess
import requests
import socket
import argparse
from datetime import datetime, timezone

# 针对 Windows 控制台尽量启用 UTF-8 编码避免特殊字符乱码
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 强制优先使用 IPv4 避免国内部分运营商 IPv6 握手超时
try:
    import urllib3.util.connection as urllib3_cn
    urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass

# ----------------- 统一品牌与终端交互组件 -----------------
REPO_URL = "https://github.com/LengxiQwQ/playlistout"
AUTHOR_URL = "https://github.com/LengxiQwQ"
AUTHOR_NAME = "lengxiQwQ"


def terminal_link(url, text=None):
    """生成终端可点击超链接 (支持 OSC 8 协议)"""
    label = text if text else url
    return f"\033]8;;{url}\033\\{label}\033]8;;\033\\"


def print_banner(platform_name):
    """统一线框引导 UI - 头部 Banner"""
    repo_hyperlink = terminal_link(REPO_URL, REPO_URL)
    author_hyperlink = terminal_link(AUTHOR_URL, AUTHOR_NAME)
    title = f"PlaylistOut - {platform_name} 歌单导出工具"
    print("=" * 64)
    print(f"        {title}")
    print(f"  开源仓库: {repo_hyperlink}")
    print(f"  开发作者: {author_hyperlink} ({AUTHOR_URL})")
    print("  核心特性: 100% 本地隐私安全 · 零商业化 · 全格式歌单备份导出")
    print("=" * 64)


def print_format_menu():
    """统一线框引导 UI - 导出格式选择菜单"""
    print("-" * 64)
    print("请选择导出文件格式：")
    print("  [1] .xlsx  - Excel 表格文件 (首个 Sheet 纯净一歌一行)")
    print("  [2] .csv   - 标准 CSV 格式 (utf-8-sig 编码，双击无乱码)")
    print("  [3] .json  - Canonical JSON 标准格式 (供开发者/播放器接入)")
    print("  [4] .txt   - 纯文本歌单清单 (人类可读文本)")
    print("  [5] .m3u8  - 通用播放列表 (Extended M3U，支持本地播放器)")
    print("  [0] 全部导出 (默认 / 推荐，输入 0 或直接回车/其他键导出全部格式)")
    print("-" * 64)


def resolve_export_formats(choice):
    """
    根据用户输入解析导出格式：
    1~5 对应单格式；0 或其他任意输入代表全部导出。
    """
    choice = str(choice or "").strip().lower()
    mapping = {
        "1": ["xlsx"],
        "xlsx": ["xlsx"],
        "2": ["csv"],
        "csv": ["csv"],
        "3": ["json"],
        "json": ["json"],
        "4": ["txt"],
        "txt": ["txt"],
        "5": ["m3u8"],
        "m3u8": ["m3u8"],
    }
    if choice in mapping:
        return mapping[choice]
    return ["xlsx", "csv", "json", "txt", "m3u8"]


def reveal_folder(target_path):
    """非阻塞打开输出文件夹或在资源管理器中定位文件"""
    try:
        abs_path = os.path.abspath(target_path)
        folder = abs_path if os.path.isdir(abs_path) else os.path.dirname(abs_path)
        if platform.system() == "Windows":
            if os.path.isfile(abs_path):
                subprocess.Popen(['explorer', f'/select,{abs_path}'], shell=False)
            else:
                os.startfile(folder)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", folder])
        else:
            subprocess.Popen(["xdg-open", folder])
    except Exception:
        pass


def print_exit_banner():
    """统一退出提示"""
    print("\n" + "=" * 64)
    print("感谢使用 PlaylistOut，程序已安全退出！")
    print("=" * 64)

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    'Referer': 'https://music.163.com/',
    'Origin': 'https://music.163.com',
    'Cookie': 'os=pc; appver=2.9.7',
}

def sanitize_filename(name):
    if not name:
        return ""
    name = re.sub(r'[\x00-\x1f]', ' ', name)
    name = re.sub(r'[<>:"/\\|?*]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or "playlist"

def resolve_shortlink(text):
    if not text:
        return text
    m = re.search(r'https?://163cn\.tv/[a-zA-Z0-9]+', text)
    if not m:
        m2 = re.search(r'(?:^|[^\w.-])(163cn\.tv/[a-zA-Z0-9]+)', text)
        if m2:
            url = f"https://{m2.group(1)}"
        else:
            url = None
    else:
        url = m.group(0)

    if url:
        try:
            resp = requests.get(url, headers=HEADERS, allow_redirects=False, timeout=8)
            if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                return resp.headers["Location"]
            elif resp.status_code == 200:
                return resp.url
        except Exception:
            pass
    return text

def extract_playlist_id(text):
    if not text:
        return None
    resolved = resolve_shortlink(text.strip())
    # Try query param id=...
    m = re.search(r'(?:[?&]id=|\/playlist\/)(\d{4,18})', resolved)
    if m:
        return m.group(1)
    if re.fullmatch(r'\d{4,18}', text.strip()):
        return text.strip()
    return None

def extract_user_id(text):
    if not text:
        return None
    resolved = resolve_shortlink(text.strip())
    if '/playlist' in resolved:
        return None
    if '/user' in resolved or 'user/home' in resolved or 'user?id=' in resolved:
        m = re.search(r'(?:[?&]id=|\/user\/)(\d{4,18})', resolved)
        if m:
            return m.group(1)
    if re.fullmatch(r'\d{4,18}', text.strip()):
        return text.strip()
    return None

def determine_track_status(song, priv):
    st = priv.get('st') if priv else None
    pl = priv.get('pl') if priv else None
    fee = song.get('fee', priv.get('fee', 0) if priv else 0)

    rcmd = song.get('noCopyrightRcmd') or {}
    is_geo = st == -200 or rcmd.get('type') == 1 or '地区' in str(rcmd.get('typeDesc', '')) or '国家' in str(rcmd.get('typeDesc', ''))
    if is_geo:
        return '仅海外受限'
    if st is not None and st < 0:
        return '下架/无版权'
    if song.get('noCopyrightRcmd'):
        return '下架/无版权'
    if pl == 0 and fee not in (1, 4):
        return '下架/无版权'
    if fee == 1:
        return 'VIP专享'
    if fee == 4:
        return '付费专辑'
    return '正常'

def fetch_song_details(track_ids):
    if not track_ids:
        return [], []
    all_songs = []
    all_privileges = []
    batch_size = 500
    chunks = [track_ids[i:i + batch_size] for i in range(0, len(track_ids), batch_size)]

    def fetch_batch(chunk):
        c_param = json.dumps([{"id": int(cid)} for cid in chunk])
        url = 'https://music.163.com/api/v3/song/detail'
        try:
            resp = requests.post(
                url,
                headers={**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'},
                data={'c': c_param},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get('songs', []), data.get('privileges', [])
        except Exception as e:
            print(f"获取歌曲详情批次失败: {e}")
        return [], []

    from concurrent.futures import ThreadPoolExecutor
    workers = min(5, max(1, len(chunks)))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(fetch_batch, chunks))

    for songs, privs in results:
        all_songs.extend(songs)
        all_privileges.extend(privs)

    return all_songs, all_privileges

def get_playlist_data(playlist_id):
    post_headers = {**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'}
    post_data = {'id': str(playlist_id), 'n': '100000', 's': '8'}
    pl = None

    # 1. Try v6 POST (avoids datacenter GET anti-bot and fetches full trackIds)
    try:
        resp = requests.post('https://music.163.com/api/v6/playlist/detail', headers=post_headers, data=post_data, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('code') == 200 and data.get('playlist'):
                pl = data['playlist']
    except Exception:
        pass

    # 2. Try v3 POST fallback
    if not pl:
        try:
            resp = requests.post('https://music.163.com/api/v3/playlist/detail', headers=post_headers, data=post_data, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('code') == 200 and data.get('playlist'):
                    pl = data['playlist']
        except Exception:
            pass

    # 3. Try legacy / v6 GET fallback
    if not pl:
        url = f"https://music.163.com/api/v6/playlist/detail?id={playlist_id}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('code') == 200 and data.get('playlist'):
                    pl = data['playlist']
        except Exception as e:
            print(f"抓取歌单异常: {e}")
            return None

    if not pl:
        return None

    try:
        title = pl.get('name', '未命名歌单')
        author = pl.get('creator', {}).get('nickname', '未知作者')

        track_ids = [t['id'] for t in pl.get('trackIds', [])]
        if not track_ids and pl.get('tracks'):
            track_ids = [t['id'] for t in pl['tracks']]

        songs, privs = fetch_song_details(track_ids)
        song_map = {str(s['id']): s for s in songs}
        priv_map = {str(p['id']): p for p in privs}

        tracks = []
        for tid in track_ids:
            tid_str = str(tid)
            song = song_map.get(tid_str, {'name': f'歌曲 #{tid_str}'})
            priv = priv_map.get(tid_str, {})
            name = song.get('name', '未知歌曲')
            singers = " / ".join(a.get('name', '') for a in song.get('ar', [])) or "未知歌手"
            album = song.get('al', {}).get('name', '') or "未知专辑"
            duration_s = song.get('dt', 0) // 1000
            duration_str = f"{duration_s // 60:02d}:{duration_s % 60:02d}"
            status_text = determine_track_status(song, priv)
            cover_url = (song.get('al') or {}).get('picUrl') or (song.get('album') or {}).get('picUrl') or ''
            if cover_url and cover_url.startswith('http://'):
                cover_url = 'https://' + cover_url[7:]

            dt_raw = song.get('dt')
            dt_ms = int(dt_raw) if isinstance(dt_raw, (int, float)) and dt_raw > 0 else None
            pub_time = song.get('publishTime')
            release_date = None
            if pub_time and isinstance(pub_time, (int, float)) and pub_time > 0:
                try:
                    pub_seconds = pub_time / 1000 if pub_time > 1e11 else pub_time
                    release_date = datetime.fromtimestamp(pub_seconds, tz=timezone.utc).strftime('%Y-%m-%d')
                except Exception:
                    pass
            track_num = song.get('no')
            disc_num = song.get('cd')
            mv_id = song.get('mv')
            tracks.append((
                name,
                singers,
                album,
                duration_str,
                status_text,
                cover_url,
                tid_str,
                dt_ms,
                release_date,
                track_num if isinstance(track_num, int) and track_num > 0 else None,
                int(disc_num) if isinstance(disc_num, (int, str)) and str(disc_num).isdigit() and int(disc_num) > 0 else None,
                str(mv_id) if mv_id and str(mv_id) != "0" else None,
            ))

        playlist_cover = pl.get('coverImgUrl') or ''
        if playlist_cover and playlist_cover.startswith('http://'):
            playlist_cover = 'https://' + playlist_cover[7:]

        return title, tracks, author, playlist_cover
    except Exception as e:
        print(f"解析歌单异常: {e}")
        return None

def get_user_playlists(uid):
    url = f"https://music.163.com/api/user/playlist/?uid={uid}&limit=100&offset=0"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get('code') != 200 or 'playlist' not in data:
            return None
        playlists = data['playlist']
        nickname = f"用户_{uid}"
        for p in playlists:
            if str(p.get('userId')) == str(uid) and p.get('creator', {}).get('nickname'):
                nickname = p['creator']['nickname']
                break

        res = []
        for p in playlists:
            res.append({
                "id": str(p.get('id')),
                "name": p.get('name', '未命名歌单'),
                "track_count": p.get('trackCount', 0),
                "is_created": str(p.get('userId')) == str(uid),
            })
        return nickname, res
    except Exception as e:
        print(f"获取用户歌单异常: {e}")
        return None

def export_xlsx(filename, playlist_title, tracks, author):
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "歌单歌曲"

    ws.append(["歌单名称", playlist_title])
    ws.append(["歌单作者", author])
    ws.append(["歌曲总数", f"{len(tracks)} 首"])
    ws.append([])

    headers = ["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"]
    ws.append(headers)

    for i, t in enumerate(tracks, 1):
        ws.append([i, t[0], t[1], t[2], t[3], t[4]])

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 30
    ws.column_dimensions['C'].width = 25
    ws.column_dimensions['D'].width = 25
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 16

    wb.save(filename)

def export_csv(filename, tracks):
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"])
        for i, t in enumerate(tracks, 1):
            writer.writerow([i, t[0], t[1], t[2], t[3], t[4]])

def export_json(filename, playlist_title, tracks, author, playlist_cover="", playlist_id=""):
    tracks_out = []
    for i, t in enumerate(tracks, 1):
        if isinstance(t, dict):
            name = t.get("title") or t.get("name") or ""
            singers = t.get("artist") or t.get("artists") or ""
            album = t.get("album") or ""
            duration_str = t.get("duration") or ""
            status_text = t.get("statusText") or t.get("status") or ""
            cover_url = t.get("coverUrl") or t.get("cover") or ""
            tid_str = t.get("id") or ""
            dt_ms = t.get("durationMs")
            release_date = t.get("releaseDate")
            track_num = t.get("trackNumber")
            disc_num = t.get("discNumber")
            mv_id = t.get("mvId")
        else:
            name = t[0] if len(t) > 0 else ""
            singers = t[1] if len(t) > 1 else ""
            album = t[2] if len(t) > 2 else ""
            duration_str = t[3] if len(t) > 3 else ""
            status_text = t[4] if len(t) > 4 else ""
            cover_url = t[5] if len(t) > 5 and t[5] else ""
            tid_str = t[6] if len(t) > 6 and t[6] else ""
            dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
            release_date = t[8] if len(t) > 8 and t[8] else None
            track_num = t[9] if len(t) > 9 and isinstance(t[9], int) and t[9] > 0 else None
            disc_num = t[10] if len(t) > 10 and isinstance(t[10], int) and t[10] > 0 else None
            mv_id = t[11] if len(t) > 11 and t[11] else None

        # Parse duration_str if dt_ms is missing
        if dt_ms is None and duration_str and ":" in str(duration_str):
            parts = str(duration_str).split(":")
            try:
                if len(parts) == 2:
                    dt_ms = (int(parts[0]) * 60 + int(parts[1])) * 1000
                elif len(parts) == 3:
                    dt_ms = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])) * 1000
            except ValueError:
                pass

        artist_str = str(singers).replace(" / ", ", ").strip() if singers else "未知歌手"
        album_str = str(album).strip() if album else ""

        is_vip = (status_text == "VIP专享")
        is_available = (status_text != "下架/无版权")
        if status_text == "下架/无版权":
            machine_status = "unplayable"
        elif status_text == "VIP专享":
            machine_status = "vip"
        elif status_text == "付费专辑":
            machine_status = "paid"
        else:
            machine_status = "playable"

        track_entry = {
            "index": i,
            "title": str(name).strip() if name else "未知歌曲",
            "artist": artist_str,
        }
        if album_str and album_str != "未知专辑":
            track_entry["album"] = album_str
        if tid_str:
            track_entry["id"] = str(tid_str).strip()
        if dt_ms is not None and dt_ms > 0:
            track_entry["durationMs"] = int(dt_ms)
        if release_date:
            track_entry["releaseDate"] = str(release_date).strip()
        if track_num:
            track_entry["trackNumber"] = int(track_num)
        if disc_num:
            track_entry["discNumber"] = int(disc_num)
        if tid_str:
            track_entry["sourceUrl"] = f"https://music.163.com/#/song?id={tid_str}"
        if cover_url and str(cover_url).strip():
            track_entry["coverUrl"] = str(cover_url).strip()
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text or "正常"
        if mv_id:
            track_entry["mvId"] = str(mv_id).strip()
            track_entry["mvUrl"] = f"https://music.163.com/#/mv?id={mv_id}"

        tracks_out.append(track_entry)

    payload = {
        "name": playlist_title or "网易云音乐歌单",
    }
    if author and str(author).strip():
        payload["creator"] = str(author).strip()
    if playlist_cover and str(playlist_cover).strip():
        payload["coverUrl"] = str(playlist_cover).strip()
    payload["platform"] = "netease"
    if playlist_id and str(playlist_id).strip():
        payload["id"] = str(playlist_id).strip()
        payload["sourceUrl"] = f"https://music.163.com/#/playlist?id={playlist_id}"
    payload["trackCount"] = len(tracks_out)
    payload["tracks"] = tracks_out

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def export_txt(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("==================================================\n")
        f.write(f"  歌单名称: {playlist_title}\n")
        f.write(f"  歌单作者: {author}\n")
        f.write(f"  歌曲总数: {len(tracks)} 首\n")
        f.write("==================================================\n\n")
        for i, t in enumerate(tracks, 1):
            name, singers, album, dur, status = t[:5]
            tag = f" [{status}]" if status != '正常' else ""
            f.write(f"{name} - {singers} - {album}{tag}\n")

def export_m3u8(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        f.write(f"#PLAYLIST:{playlist_title}\n")
        for i, t in enumerate(tracks, 1):
            name, singers, album, dur, status = t[:5]
            sec = -1
            if dur and ":" in str(dur):
                parts = str(dur).split(":")
                try:
                    if len(parts) == 2:
                        sec = int(parts[0]) * 60 + int(parts[1])
                    elif len(parts) == 3:
                        sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                except ValueError:
                    sec = -1
            disp = f"{singers} - {name}" if singers else name
            fn = sanitize_filename(disp)
            f.write(f"#EXTINF:{sec},{disp}\n")
            f.write(f"{fn}.mp3\n")

# --- 统一导出执行函数 ---
def perform_export(title, tracks, author, playlist_cover="", playlist_id="", output_dir="output", formats=None, reveal_folder_flag=True):
    if not tracks:
        return []
    if formats is None:
        resolved_formats = ["xlsx", "csv", "json", "txt", "m3u8"]
    elif isinstance(formats, str):
        resolved_formats = resolve_export_formats(formats)
    else:
        fmt_list = [str(f).strip().lower() for f in formats if str(f).strip()]
        if not fmt_list or "all" in fmt_list or "0" in fmt_list:
            resolved_formats = ["xlsx", "csv", "json", "txt", "m3u8"]
        elif len(fmt_list) == 1:
            resolved_formats = resolve_export_formats(fmt_list[0])
        else:
            resolved_formats = []
            for item in fmt_list:
                for r in resolve_export_formats(item):
                    if r not in resolved_formats:
                        resolved_formats.append(r)

    safe_title = sanitize_filename(title or f"playlist_{playlist_id}")
    safe_author = sanitize_filename(author or "未知作者")
    base_name = f"{safe_title} - {safe_author}"

    os.makedirs(output_dir, exist_ok=True)
    exported_files = []

    print("\n" + "-" * 64)
    print(f"[*] 开始导出歌单《{title}》 (共 {len(tracks)} 首歌曲)...")

    for fmt in resolved_formats:
        out_path = os.path.join(output_dir, f"{base_name}.{fmt}")
        try:
            if fmt == "xlsx":
                export_xlsx(out_path, title, tracks, author)
            elif fmt == "csv":
                export_csv(out_path, tracks)
            elif fmt == "json":
                export_json(out_path, title, tracks, author, playlist_cover, playlist_id=str(playlist_id))
            elif fmt == "txt":
                export_txt(out_path, title, tracks, author)
            elif fmt == "m3u8":
                export_m3u8(out_path, title, tracks, author)
            exported_files.append(out_path)
            print(f"[✓] 成功生成 {fmt.upper():<5} 文件: {os.path.abspath(out_path)}")
        except Exception as e:
            print(f"[✗] 导出 {fmt.upper()} 失败: {e}")

    print("-" * 64)
    print(f"[🎉] 导出任务全部完成！共导出 {len(tracks)} 首歌曲。")
    print(f"[*] 文件已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder_flag:
        reveal_folder(exported_files[0])
    return exported_files


def main():
    parser = argparse.ArgumentParser(
        description="网易云音乐歌单导出工具 (PlaylistOut NetEase Exporter)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", nargs="?", help="网易云歌单链接、短链、歌单ID 或 用户主页")
    parser.add_argument("-i", "--id", dest="opt_id", help="网易云歌单链接、短链、歌单ID 或 用户主页")
    parser.add_argument("-o", "--output-dir", default="output", help="导出目录 (默认: output)")
    parser.add_argument(
        "-f", "--format",
        default="all",
        help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (默认: all)",
    )
    parser.add_argument("--no-open", action="store_true", help="导出完成后不自动打开文件夹")
    args = parser.parse_args()

    raw_input = args.opt_id or args.input
    output_dir = args.output_dir if args.output_dir else "output"
    formats = resolve_export_formats(args.format)

    if raw_input:
        user_input = raw_input.strip()
        user_id = extract_user_id(user_input)
        playlist_id = extract_playlist_id(user_input)

        if user_id and ('user' in user_input or '163cn.tv' in user_input) and not playlist_id:
            user_data = get_user_playlists(user_id)
            if user_data:
                nickname, pls = user_data
                created_pls = [p for p in pls if p['is_created']]
                target_pls = created_pls or pls
                for pl in target_pls:
                    data = get_playlist_data(pl['id'])
                    if data:
                        t, trks, a = data[:3]
                        cov = data[3] if len(data) > 3 else ''
                        perform_export(t, trks, a, cov, pl['id'], output_dir=output_dir, formats=formats, reveal_folder_flag=False)
                if not args.no_open:
                    reveal_folder(output_dir)
                return
            else:
                print("错误: 无法获取该用户的歌单列表", file=sys.stderr)
                sys.exit(1)

        if playlist_id:
            data = get_playlist_data(playlist_id)
            if not data:
                print("错误: 获取歌单失败，请检查是否公开或 ID 是否正确", file=sys.stderr)
                sys.exit(1)
            title, tracks, author = data[:3]
            playlist_cover = data[3] if len(data) > 3 else ''
            perform_export(title, tracks, author, playlist_cover, playlist_id, output_dir=output_dir, formats=formats, reveal_folder_flag=not args.no_open)
            return
        else:
            print("错误: 无法解析输入的网易云链接或歌单 ID", file=sys.stderr)
            sys.exit(1)

    # 交互模式
    print_banner("网易云音乐")
    try:
        while True:
            user_input = input("\n请输入链接或 ID（输入 0 退出）：").strip()
            if not user_input or user_input in ('0', 'q', 'quit', 'exit'):
                print_exit_banner()
                break

            user_id = extract_user_id(user_input)
            playlist_id = extract_playlist_id(user_input)

            if user_id and ('user' in user_input or '163cn.tv' in user_input) and not playlist_id:
                user_data = get_user_playlists(user_id)
                if user_data:
                    nickname, pls = user_data
                    print(f"\n用户【{nickname}】共发现 {len(pls)} 个歌单：")
                    created_pls = [p for p in pls if p['is_created']]
                    sub_pls = [p for p in pls if not p['is_created']]
                    print(f"  创建的歌单 ({len(created_pls)} 个):")
                    for idx, p in enumerate(created_pls, 1):
                        print(f"    {idx}. {p['name']} ({p['track_count']}首) [ID: {p['id']}]")
                    if sub_pls:
                        print(f"  收藏的歌单 ({len(sub_pls)} 个):")
                        for idx, p in enumerate(sub_pls, len(created_pls) + 1):
                            print(f"    {idx}. {p['name']} ({p['track_count']}首) [ID: {p['id']}]")

                    sel = input("\n请选择要导出的歌单序号（或输入 all 导出所有，0 返回）：").strip()
                    if sel == '0':
                        continue
                    to_export = []
                    if sel.lower() == 'all':
                        to_export = created_pls
                    elif sel.isdigit() and 1 <= int(sel) <= len(pls):
                        to_export = [pls[int(sel) - 1]]

                    print_format_menu()
                    fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
                    sel_formats = resolve_export_formats(fmt_input)

                    for pl in to_export:
                        data = get_playlist_data(pl['id'])
                        if data:
                            t, trks, a = data[:3]
                            cov = data[3] if len(data) > 3 else ''
                            perform_export(t, trks, a, cov, pl['id'], output_dir=output_dir, formats=sel_formats, reveal_folder_flag=False)
                    if to_export and not args.no_open:
                        reveal_folder(output_dir)
                    continue

            if playlist_id:
                print(f"正在抓取歌单 ID: {playlist_id} ...")
                data = get_playlist_data(playlist_id)
                if not data:
                    print("❌ 获取歌单失败，请检查是否公开或 ID 是否正确。")
                    continue
                title, tracks, author = data[:3]
                playlist_cover = data[3] if len(data) > 3 else ''
                unavail = sum(1 for t in tracks if t[4] == '下架/无版权')
                vip_cnt = sum(1 for t in tracks if t[4] == 'VIP专享')
                print(f"\n歌单：{title}（作者：{author}，共 {len(tracks)} 首）")
                print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

                print_format_menu()
                fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
                sel_formats = resolve_export_formats(fmt_input)
                perform_export(title, tracks, author, playlist_cover, playlist_id, output_dir=output_dir, formats=sel_formats, reveal_folder_flag=not args.no_open)
            else:
                print("❌ 无法识别的输入，请输入网易云歌单链接、短链或 ID。")
    except KeyboardInterrupt:
        print_exit_banner()


if __name__ == '__main__':
    main()
