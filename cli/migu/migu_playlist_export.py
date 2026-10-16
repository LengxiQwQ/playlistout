# --- 咪咕音乐歌单导出工具 ---
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

# 自适应路径注入，支持无论从何处运行均可正确加载共享模块
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_CLI_DIR = os.path.dirname(_CURRENT_DIR)
_REPO_ROOT = os.path.dirname(_CLI_DIR)
for _p in (_REPO_ROOT, _CLI_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import json
import csv
import math
import platform
import subprocess
import argparse
import requests
import socket
from datetime import datetime
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

from cli.core.naming import build_export_base_name, ensure_unique_base_name
from cli.core.http import resolve_shortlink

REPO_URL = "https://github.com/LengxiQwQ/playlistout"
AUTHOR_URL = "https://github.com/LengxiQwQ"
WEB_URL = "https://playlistout.lengxiqwq.com"
AUTHOR_NAME = "LengxiQwQ"

PAGE_SIZE = 50
MAX_PAGES = 50

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://h5.nf.migu.cn/',
}


def terminal_link(url, text=None):
    """生成终端可点击超链接 (支持 OSC 8 协议)"""
    label = text if text else url
    return f"\033]8;;{url}\033\\{label}\033]8;;\033\\"


def print_banner(platform_name="咪咕音乐"):
    """统一线框引导 UI - 头部 Banner"""
    author_link = terminal_link(AUTHOR_URL, f"作者: {AUTHOR_NAME}")
    repo_link = terminal_link(REPO_URL, "开源仓库")
    web_link = terminal_link(WEB_URL, "在线版")

    title = f"Playlist Out CLI - {platform_name} 歌单导出工具"
    print("\033[1;35m" + title + "\033[0m")
    print("")
    print("你的歌单，不应该只困在一个音乐平台里。")
    print("解析、导出，并把歌单继续带进支持的开源播放器。")
    print("")
    print(f"{author_link} · {repo_link} · {web_link}")
    print_divider()


def print_divider(width=64):
    print()
    print("─" * width)
    print()


def extract_playlist_id(text):
    """
    从输入文本、短链或 URL 中提取咪咕歌单 ID。
    支持：
    - c.migu.cn 短链 (自动跟随 302 重定向)
    - h5.nf.migu.cn 分享链接 (?id=...)
    - music.migu.cn 网页链接 (/playlist/... 或 ?id=...)
    - 纯数字 ID
    """
    if not text:
        return None
    raw = text.strip()

    # 1. 如果是纯数字 ID (4-20 位)
    if re.fullmatch(r'\d{4,20}', raw):
        return raw

    # 2. 如果包含短链 c.migu.cn，优先提取短链并跟随重定向
    short_match = re.search(r'https?://c\.migu\.cn/[a-zA-Z0-9]+(?:\?[^\s()（）]+)?', raw)
    if short_match:
        resolved = resolve_shortlink(short_match.group(0))
        if resolved:
            raw = resolved

    # 3. 从 URL query 中匹配 id、playlistId 或 musicListId
    m = re.search(r'[?&](?:id|playlistId|playlist_id|musicListId)=(\d{4,20})', raw, re.I)
    if m:
        return m.group(1)

    # 4. 从路径中匹配 playlist/12345
    m = re.search(r'/playlist/(\d{4,20})', raw, re.I)
    if m:
        return m.group(1)

    # 5. 兜底匹配包含 migu 的字符串中的任意 5-18 位连续数字
    if 'migu' in raw.lower():
        m = re.search(r'\b(\d{5,18})\b', raw)
        if m:
            return m.group(1)

    return None


def determine_track_status(song):
    """
    判定歌曲版权状态：
    - 下架/无版权: restrictType == -1 或 copyrightType == 0
    - VIP专享: restrictType == 1 或 showTags 包含 'vip' 或所有音频格式都是 vip
    - 正常: 免费可播
    """
    restrict = song.get('restrictType')
    copyright_type = song.get('copyrightType')
    if restrict == -1 or copyright_type == 0:
        return '下架/无版权'

    show_tags = [str(t).lower() for t in song.get('showTags') or []]
    formats = song.get('audioFormats') or []
    all_vip = bool(formats) and all(
        any('vip' in str(t).lower() for t in f.get('showTagsNew') or [])
        for f in formats
    )

    if restrict == 1 or 'vip' in show_tags or all_vip:
        return 'VIP专享'

    return '正常'


def resolve_max_quality(song):
    """提取最高音质描述"""
    formats = song.get('audioFormats') or []
    types = [str(f.get('formatType') or '').upper() for f in formats]
    if any('ZQ24' in t or '24BIT' in t or 'HI-RES' in t for t in types):
        return 'Hi-Res'
    if any(t == 'SQ' or 'FLAC' in t for t in types):
        return 'FLAC'
    if any(t == 'HQ' or '320' in t for t in types):
        return '320kbps'
    if any(t == 'PQ' or '128' in t for t in types):
        return '128kbps'
    return None


def fetch_migu_meta(playlist_id):
    """获取咪咕歌单基本元数据"""
    url = f"https://c.musicapp.migu.cn/MIGUM3.0/resource/playlist/v2.0?playlistId={playlist_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('code') == '000000' and data.get('data'):
                return data['data']
    except Exception as e:
        print(f"请求咪咕歌单元数据失败: {e}", file=sys.stderr)
    return None


def fetch_migu_page(playlist_id, page=1, page_size=PAGE_SIZE):
    """获取咪咕歌单单页歌曲列表"""
    url = f"https://c.musicapp.migu.cn/MIGUM3.0/resource/playlist/song/v2.0?playlistId={playlist_id}&pageNo={page}&pageSize={page_size}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('code') == '000000' and data.get('data'):
                return data['data']
    except Exception as e:
        print(f"请求咪咕第 {page} 页失败: {e}", file=sys.stderr)
    return None


class MiguPlaylistResult(tuple):
    """Backwards-compatible 5-tuple (playlist_title, tracks, author, cover_url, playlist_id) with rich extra_meta."""
    def __new__(cls, playlist_title, tracks, author, cover_url, playlist_id, extra_meta=None):
        return super().__new__(cls, (playlist_title, tracks, author, cover_url, playlist_id))

    def __init__(self, playlist_title, tracks, author, cover_url, playlist_id, extra_meta=None):
        self.extra_meta = extra_meta or {}


def get_playlist_info(playlist_id):
    """
    获取咪咕歌单元数据与完整歌曲列表（自动多页拉取拼接）。
    返回: (playlist_title, tracks, author, cover_url, playlist_id)
    """
    meta = fetch_migu_meta(playlist_id)
    first_page = fetch_migu_page(playlist_id, page=1, page_size=PAGE_SIZE)

    if not first_page and not meta:
        print("获取咪咕歌单失败: 网络超时或歌单不存在", file=sys.stderr)
        return None

    playlist_title = (meta.get('title') if meta else None) or f"咪咕歌单_{playlist_id}"
    author = (meta.get('ownerName') if meta else None) or "咪咕音乐用户"
    cover_url = ""
    if meta:
        cover_url = meta.get('originalImgUrl') or (meta.get('imgItem') or {}).get('img') or ""

    all_raw_songs = []
    if first_page and first_page.get('songList'):
        all_raw_songs.extend(first_page['songList'])

    total_count = first_page.get('totalCount') if first_page else (meta.get('musicNum') if meta else len(all_raw_songs))
    total_count = total_count or len(all_raw_songs)

    # 分页拉取后续页面
    if total_count > PAGE_SIZE and len(all_raw_songs) >= PAGE_SIZE:
        total_pages = min(MAX_PAGES, math.ceil(total_count / PAGE_SIZE))
        remaining_pages = list(range(2, total_pages + 1))

        def _fetch_sub(page):
            return fetch_migu_page(playlist_id, page=page, page_size=PAGE_SIZE)

        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(_fetch_sub, remaining_pages))
            for p_res in results:
                if p_res and p_res.get('songList'):
                    all_raw_songs.extend(p_res['songList'])

    tracks = []
    for s in all_raw_songs:
        name = str(s.get('songName') or "未知歌曲").strip()
        singers = " / ".join(str(singer.get('name') or "").strip() for singer in s.get('singerList') or [] if singer.get('name')) or "未知歌手"
        album = str(s.get('album') or "").strip()
        dur_sec = int(s.get('duration') or 0)
        dur_str = f"{dur_sec // 60:02d}:{dur_sec % 60:02d}" if dur_sec > 0 else ""
        dur_ms = dur_sec * 1000 if dur_sec > 0 else None
        status = determine_track_status(s)
        
        # 封面图相对路径补齐
        raw_pic = s.get('img1') or s.get('img2') or s.get('img3') or ""
        song_cover = ""
        if raw_pic:
            song_cover = raw_pic if raw_pic.startswith("http") else f"https://d.musicapp.migu.cn{raw_pic if raw_pic.startswith('/') else '/' + raw_pic}"

        tid = str(s.get('songId') or s.get('contentId') or "").strip()
        release_date = str(s.get('publishTime') or "").strip() or None
        max_quality = resolve_max_quality(s)

        tracks.append((
            name,
            singers,
            album,
            dur_str,
            status,
            song_cover,
            tid,
            dur_ms,
            release_date,
            max_quality,
        ))

    play_count = None
    if meta and meta.get('opNumItem'):
        try:
            play_count = int(meta['opNumItem'].get('playNum'))
        except (ValueError, TypeError):
            pass

    extra_meta = {
        "track_count": total_count,
        "play_count": play_count,
        "tags": [],
        "description": meta.get('intro') or meta.get('summary') or "" if meta else "",
    }

    return MiguPlaylistResult(playlist_title, tracks, author, cover_url, playlist_id, extra_meta)


def perform_export(info, output_dir="output", formats=None, reveal_folder=True):
    from cli.platforms.migu import normalize_migu_info
    from cli.core.exporter import perform_export as core_perform_export
    from cli.core.ui import resolve_export_formats

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

    playlist = normalize_migu_info(info)
    return core_perform_export(
        playlist,
        output_dir=output_dir,
        formats=resolved_formats,
        reveal_folder_flag=reveal_folder,
    )


def main():
    from cli.core.ui import print_format_menu, print_exit_banner, resolve_export_formats

    parser = argparse.ArgumentParser(description="咪咕音乐歌单导出工具 (PlaylistOut Migu Exporter)")
    parser.add_argument("input", nargs="?", help="歌单链接、短链或歌单 ID")
    parser.add_argument("--id", "-i", dest="opt_id", help="歌单链接、短链或歌单 ID")
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
            print("错误: 无法解析咪咕歌单 ID", file=sys.stderr)
            sys.exit(1)
        formats = [x.strip() for x in args.format.split(",")]
        info = get_playlist_info(pid)
        if not info:
            sys.exit(1)
        perform_export(info, output_dir, formats, reveal_folder=not args.no_open)
        return

    print_banner("咪咕音乐")
    try:
        while True:
            user_input = input("\n请输入歌单链接 或 歌单ID（输入 0 退出）：").strip()
            print("=" * 64)
            if not user_input or user_input in ('0', 'q', 'quit', 'exit'):
                print_exit_banner()
                break

            playlist_id = extract_playlist_id(user_input)
            if not playlist_id:
                print("× 未能识别到有效的咪咕歌单 ID，请检查输入！")
                print("=" * 64)
                continue

            print(f"正在获取歌单 (ID: {playlist_id}) 信息...")
            info = get_playlist_info(playlist_id)
            if not info:
                print("× 获取歌单信息失败，请重试。")
                print("=" * 64)
                continue

            playlist_title, tracks, author, _, _ = info
            unavail = sum(1 for t in tracks if len(t) > 4 and t[4] == '下架/无版权')
            vip_cnt = sum(1 for t in tracks if len(t) > 4 and t[4] == 'VIP专享')
            print(f"\n歌单：{playlist_title}（作者：{author}，共 {len(tracks)} 首）")
            print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

            print_format_menu()
            fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
            print("=" * 64)
            sel_formats = resolve_export_formats(fmt_input)

            perform_export(info, output_dir, sel_formats, reveal_folder=not args.no_open)
    except (KeyboardInterrupt, EOFError):
        print_exit_banner()


if __name__ == '__main__':
    main()

