# --- 酷我音乐歌单导出工具 ---
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
import html
import json
import csv
import math
import platform
import subprocess
import argparse
import requests
import socket
from concurrent.futures import ThreadPoolExecutor

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


def print_exit_banner():
    print("\n" + "=" * 64)
    print("感谢使用 PlaylistOut，程序已安全退出！")
    print("=" * 64)


HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) '
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    ),
    'Accept': 'application/json, text/plain, */*',
}

PAGE_SIZE = 100
MAX_PAGES = 50
CONCURRENT_BATCH_SIZE = 5


def sanitize_filename(name):
    if not name:
        return ""
    name = re.sub(r'[\x00-\x1f]', ' ', name)
    name = re.sub(r'[<>:"/\\|?*]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or "playlist"


def unescape_html(text):
    if not text:
        return ""
    return html.unescape(str(text)).strip()


def resolve_shortlink(text):
    if not text:
        return text
    # 仅针对短链域名（如 t.kuwo.cn 或带 /s/ 短链）发起重定向解析
    m = re.search(r'https?://(?:t\.kuwo\.cn|[a-zA-Z0-9.-]*kuwo\.cn/s/)\S+', text)
    if not m:
        m2 = re.search(r'(?:^|[^\w.-])(t\.kuwo\.cn/\S+)', text)
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
    text = text.strip()
    if re.fullmatch(r'\d{4,18}', text):
        return text

    # 1. 优先直接匹配常见 URL 路径: /playlist_detail/<id> 或 /playlist/<id>
    m = re.search(r'/(?:playlist_detail|playlist)/(\d{4,18})', text)
    if m:
        return m.group(1)

    # 2. 匹配常见 Query 参数: pid=..., id=..., playlistId=...
    m = re.search(r'[?&](?:pid|id|playlistId)=(\d{4,18})', text)
    if m:
        return m.group(1)

    # 3. 若未命中且疑似短链，尝试解析短链重定向
    resolved = resolve_shortlink(text)
    m = re.search(r'/(?:playlist_detail|playlist)/(\d{4,18})', resolved)
    if m:
        return m.group(1)
    m = re.search(r'[?&](?:pid|id|playlistId)=(\d{4,18})', resolved)
    if m:
        return m.group(1)

    # 4. 兜底匹配包含 kuwo 的字符串中的任意 4-18 位连续数字
    if 'kuwo' in resolved.lower():
        m = re.search(r'(\d{4,18})', resolved)
        if m:
            return m.group(1)
    return None


def determine_track_status(song):
    online = song.get('online')
    is_listen_fee = bool(song.get('isListenFee'))
    pay_info = song.get('payInfo') or {}
    fee_type = pay_info.get('feeType') or {}
    is_vip_fee = (fee_type.get('vip') == '1' or fee_type.get('song') == '1')

    if online == 0:
        return '下架/无版权'
    if is_listen_fee or is_vip_fee:
        return 'VIP专享'
    return '正常'


def fetch_kuwo_page(playlist_id, page=1, page_size=PAGE_SIZE):
    url = f"https://m.kuwo.cn/newh5app/wapi/api/www/playlist/playListInfo?pid={playlist_id}&pn={page}&rn={page_size}"
    headers = {
        **HEADERS,
        'Referer': f"https://m.kuwo.cn/newh5app/playlist_detail/{playlist_id}",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"请求酷我第 {page} 页失败: {e}", file=sys.stderr)
    return None


def get_playlist_info(playlist_id):
    """
    获取酷我歌单元数据与完整歌曲列表（自动多页拉取拼接）。
    返回: (playlist_title, tracks, author, cover_url, playlist_id)
    """
    res1 = fetch_kuwo_page(playlist_id, page=1, page_size=PAGE_SIZE)
    if not res1 or res1.get('code') != 200 or not res1.get('data'):
        msg = res1.get('msg', '未知错误') if res1 else '网络超时或接口异常'
        print(f"获取歌单信息失败: {msg}", file=sys.stderr)
        return None

    data = res1['data']
    playlist_title = unescape_html(data.get('name') or "酷我音乐歌单")
    author = unescape_html(data.get('uname') or "酷我用户")
    cover_url = str(data.get('img700') or data.get('img') or data.get('img300') or data.get('uPic') or "").strip()
    raw_total = int(data.get('total') or len(data.get('musicList') or []))

    all_raw_songs = list(data.get('musicList') or [])
    total_pages = math.ceil(raw_total / PAGE_SIZE) if raw_total > 0 else 1

    if total_pages > 1:
        target_pages = min(total_pages, MAX_PAGES)
        remaining_pages = list(range(2, target_pages + 1))
        print(f"歌单共 {raw_total} 首歌曲，需获取 {target_pages} 页数据，正在分批抓取中...")

        # 分批并发请求，保持顺序
        with ThreadPoolExecutor(max_workers=CONCURRENT_BATCH_SIZE) as executor:
            page_results = list(executor.map(lambda p: fetch_kuwo_page(playlist_id, p, PAGE_SIZE), remaining_pages))

        for p_res in page_results:
            if p_res and p_res.get('code') == 200 and p_res.get('data'):
                sub_list = p_res['data'].get('musicList') or []
                all_raw_songs.extend(sub_list)

    tracks = []
    for s in all_raw_songs:
        name = unescape_html(s.get('name') or "未知歌曲")
        artist = unescape_html(s.get('artist') or "未知歌手")
        album = unescape_html(s.get('album') or "")
        dur_sec = int(s.get('duration') or 0)
        dur_str = f"{dur_sec // 60:02d}:{dur_sec % 60:02d}" if dur_sec > 0 else ""
        dur_ms = dur_sec * 1000 if dur_sec > 0 else None
        status = determine_track_status(s)
        song_cover = str(s.get('pic') or s.get('albumpic') or s.get('pic120') or "").strip()
        rid = str(s.get('rid') or s.get('id') or "").strip()
        release_date = str(s.get('releaseDate') or "").strip() or None

        tracks.append((
            name,
            artist,
            album,
            dur_str,
            status,
            song_cover,
            rid,
            dur_ms,
            release_date,
        ))

    return (playlist_title, tracks, author, cover_url, playlist_id)


def export_xlsx(filename, tracks):
    try:
        from openpyxl import Workbook
    except ImportError:
        print("未检测到 openpyxl 库，跳过 xlsx 导出。请执行 pip install openpyxl 安装。")
        return

    wb = Workbook()
    ws = wb.active
    ws.title = "酷我音乐歌单"

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
            artist = t.get("artist") or ""
            album = t.get("album") or ""
            duration_str = t.get("duration") or ""
            status_text = t.get("statusText") or t.get("status") or ""
            cover_url = t.get("coverUrl") or t.get("cover") or ""
            rid = t.get("id") or ""
            dt_ms = t.get("durationMs")
            release_date = t.get("releaseDate")
        else:
            name = t[0] if len(t) > 0 else ""
            artist = t[1] if len(t) > 1 else ""
            album = t[2] if len(t) > 2 else ""
            duration_str = t[3] if len(t) > 3 else ""
            status_text = t[4] if len(t) > 4 else ""
            cover_url = t[5] if len(t) > 5 and t[5] else ""
            rid = t[6] if len(t) > 6 and t[6] else ""
            dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
            release_date = t[8] if len(t) > 8 and t[8] else None

        if dt_ms is None and duration_str and ":" in str(duration_str):
            parts = str(duration_str).split(":")
            try:
                if len(parts) == 2:
                    dt_ms = (int(parts[0]) * 60 + int(parts[1])) * 1000
                elif len(parts) == 3:
                    dt_ms = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])) * 1000
            except ValueError:
                pass

        artist_str = str(artist).strip() if artist else "未知歌手"
        album_str = str(album).strip() if album else ""

        is_vip = (status_text == "VIP专享")
        is_available = (status_text != "下架/无版权")
        if status_text == "下架/无版权":
            machine_status = "unplayable"
        elif status_text == "VIP专享":
            machine_status = "vip"
        else:
            machine_status = "playable"

        track_entry = {
            "index": i,
            "title": str(name).strip() if name else "未知歌曲",
            "artist": artist_str,
        }
        if album_str and album_str != "未知专辑":
            track_entry["album"] = album_str
        if rid:
            track_entry["id"] = str(rid).strip()
            track_entry["sourceUrl"] = f"https://www.kuwo.cn/play_detail/{rid}"
        if dt_ms is not None and dt_ms > 0:
            track_entry["durationMs"] = int(dt_ms)
        if release_date:
            track_entry["releaseDate"] = str(release_date).strip()
        if cover_url and str(cover_url).strip():
            track_entry["coverUrl"] = str(cover_url).strip()
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text or "正常"

        tracks_out.append(track_entry)

    payload = {
        "name": playlist_title or "酷我音乐歌单",
    }
    if author and str(author).strip():
        payload["creator"] = str(author).strip()
    if playlist_cover and str(playlist_cover).strip():
        payload["coverUrl"] = str(playlist_cover).strip()
    payload["platform"] = "kuwo"
    if playlist_id and str(playlist_id).strip():
        payload["id"] = str(playlist_id).strip()
        payload["sourceUrl"] = f"https://www.kuwo.cn/playlist_detail/{playlist_id}"
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
            name, artist, album, dur, status = t[:5]
            tag = f" [{status}]" if status != '正常' else ""
            f.write(f"{name} - {artist} - {album}{tag}\n")


def export_m3u8(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        f.write(f"#PLAYLIST:{playlist_title}\n")
        for i, t in enumerate(tracks, 1):
            name, artist, album, dur, status = t[:5]
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
            disp = f"{artist} - {name}" if artist else name
            fn = sanitize_filename(disp)
            f.write(f"#EXTINF:{sec},{disp}\n")
            f.write(f"{fn}.mp3\n")


def open_folder(filepath):
    try:
        abs_path = os.path.abspath(filepath)
        folder = abs_path if os.path.isdir(abs_path) else os.path.dirname(abs_path)
        if platform.system() == 'Windows':
            if os.path.isfile(abs_path):
                subprocess.Popen(['explorer', f'/select,{abs_path}'], shell=False)
            else:
                os.startfile(folder)
        elif platform.system() == 'Darwin':
            subprocess.Popen(['open', folder])
        else:
            subprocess.Popen(['xdg-open', folder])
    except Exception:
        pass


def perform_export(info, output_dir="output", formats=None, reveal_folder=True):
    if not info:
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

    playlist_title, tracks, author, cover_url, playlist_id = info
    safe_title = sanitize_filename(playlist_title) or "kuwo_playlist"
    os.makedirs(output_dir, exist_ok=True)

    exported_files = []

    print("\n" + "-" * 64)
    print(f"[*] 开始导出歌单《{playlist_title}》 (共 {len(tracks)} 首歌曲)...")

    for fmt in resolved_formats:
        fn = os.path.join(output_dir, f"{safe_title}.{fmt}")
        try:
            if fmt == 'xlsx':
                export_xlsx(fn, tracks)
            elif fmt == 'csv':
                export_csv(fn, tracks)
            elif fmt == 'json':
                export_json(fn, playlist_title, tracks, author, cover_url, playlist_id)
            elif fmt == 'txt':
                export_txt(fn, playlist_title, tracks, author)
            elif fmt == 'm3u8':
                export_m3u8(fn, playlist_title, tracks, author)
            exported_files.append(fn)
            print(f"[✓] 成功生成 {fmt.upper():<5} 文件: {os.path.abspath(fn)}")
        except Exception as e:
            print(f"[✗] 导出 {fmt.upper()} 失败: {e}")

    print("-" * 64)
    print(f"[🎉] 导出任务全部完成！共导出 {len(tracks)} 首歌曲。")
    print(f"[*] 文件已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder:
        open_folder(exported_files[0])
    return exported_files


def main():
    parser = argparse.ArgumentParser(description="酷我音乐歌单导出工具 (PlaylistOut Kuwo Exporter)")
    parser.add_argument("input", nargs="?", help="酷我歌单 ID、链接或短链")
    parser.add_argument("--id", "-i", dest="opt_id", help="酷我歌单 ID、链接或短链")
    parser.add_argument("--output-dir", "-o", default="output", help="导出目录 (默认: output)")
    parser.add_argument(
        "--format", "-f",
        default="all",
        help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (逗号分隔，默认: all)"
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="导出完成后不自动打开文件夹"
    )
    args = parser.parse_args()

    raw_input = args.opt_id or args.input
    output_dir = args.output_dir if args.output_dir else "output"

    if raw_input:
        pid = extract_playlist_id(raw_input)
        if not pid:
            print("错误: 无法解析酷我歌单 ID", file=sys.stderr)
            sys.exit(1)
        formats = [x.strip() for x in args.format.split(",")]
        info = get_playlist_info(pid)
        if not info:
            sys.exit(1)
        perform_export(info, output_dir, formats, reveal_folder=not args.no_open)
        return

    print_banner("酷我音乐")
    print("支持：歌单链接 / 歌单ID / 移动端短链")
    try:
        while True:
            user_input = input("\n请输入链接或 ID（输入 0 退出）：").strip()
            if not user_input or user_input in ('0', 'q', 'quit', 'exit'):
                print_exit_banner()
                break

            playlist_id = extract_playlist_id(user_input)
            if not playlist_id:
                print("❌ 未能识别到有效的酷我歌单 ID，请检查输入！")
                continue

            print(f"正在获取歌单 (ID: {playlist_id}) 信息...")
            info = get_playlist_info(playlist_id)
            if not info:
                print("❌ 获取歌单信息失败，请重试。")
                continue

            playlist_title, tracks, author, _, _ = info
            unavail = sum(1 for t in tracks if t[4] == '下架/无版权')
            vip_cnt = sum(1 for t in tracks if t[4] == 'VIP专享')
            print(f"\n歌单：{playlist_title}（作者：{author}，共 {len(tracks)} 首）")
            print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

            print_format_menu()
            fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
            sel_formats = resolve_export_formats(fmt_input)

            perform_export(info, output_dir, sel_formats, reveal_folder=not args.no_open)
    except (KeyboardInterrupt, EOFError):
        print_exit_banner()


if __name__ == '__main__':
    main()

