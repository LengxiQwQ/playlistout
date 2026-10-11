# --- 汽水音乐歌单导出工具 ---
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
import argparse
import requests
import socket
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
WEB_URL = "https://playlistout.lengxiqwq.com"
AUTHOR_NAME = "LengxiQwQ"


def terminal_link(url, text=None):
    """生成终端可点击超链接 (支持 OSC 8 协议)"""
    label = text if text else url
    return f"\033]8;;{url}\033\\{label}\033]8;;\033\\"


def print_banner(platform_name):
    """统一线框引导 UI - 头部 Banner"""
    author_link = terminal_link(AUTHOR_URL, f"作者: {AUTHOR_NAME}")
    repo_link = terminal_link(REPO_URL, "GitHub 开源仓库")
    web_link = terminal_link(WEB_URL, "在线网页版")
    title = f"Playlist Out - {platform_name} 歌单导出工具"
    print("=" * 64)
    print(f"           {title}")
    print("")
    print(f"  {author_link} · {repo_link} · {web_link}")
    print("")
    print("  核心特性: 100% 本地隐私安全 · 全格式歌单备份导出")
    print("=" * 64)


def print_format_menu():
    """统一线框引导 UI - 导出格式选择菜单"""
    print("\n请选择导出文件格式：")
    print("  [1] .xlsx  - Excel 表格文件")
    print("  [2] .csv   - 标准 CSV 表格")
    print("  [3] .json  - Canonical JSON 标准格式")
    print("  [4] .txt   - 纯文本歌单清单")
    print("  [5] .m3u8  - 通用播放列表 (M3U8)")
    print("  [0] 全部导出 (默认，直接回车即可)\n")


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
    print("\n感谢使用 Playlist Out，程序已安全退出！\n")


LUNA_USER_AGENT = 'Luna/19.1.0 Android'
AWEME_USER_AGENT = 'com.ss.android.ugc.aweme/280001 (Linux; U; Android 13; zh_CN;)'
SHORTLINK_USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)

FETCH_TIMEOUT = 15
PAGE_COUNT = 200
MAX_PAGES = 50
AWEME_PAGE_COUNT = 30
MAX_AWEME_PAGES = 45


def sanitize_filename(name):
    if not name:
        return ""
    name = re.sub(r'[\x00-\x1f]', ' ', name)
    name = re.sub(r'[<>:"/\\|?*]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or "playlist"


def build_qishui_image_url(cover, spec="crop-center:720:720.jpg"):
    """
    将汽水音乐 url_cover 结构解析为可直接访问的 ImageX CDN 图片 URL。
    """
    if not cover:
        return None
    if isinstance(cover, str):
        return cover.strip() or None
    if isinstance(cover, dict):
        if cover.get('url') and isinstance(cover['url'], str):
            return cover['url'].strip() or None

        urls = cover.get('urls') or []
        prefix = urls[0] if (isinstance(urls, list) and len(urls) > 0) else ""
        uri = cover.get('uri') or ""
        if not prefix and not uri:
            return None

        base = f"{prefix}{uri}"
        if not base:
            return None

        if cover.get('template_prefix'):
            return f"{base}~{cover['template_prefix']}-{spec}"
        return base
    return None


def extract_url_from_text(text):
    """
    从带有额外文字、前后缀的分享内容中提取出有效 URL。
    例如: "「冷汐OωO在抖音收藏的音乐」https://qishui.douyin.com/s/iXHhmCAW/ 复制链接，打开【汽水音乐】直接收听！"
    """
    if not text:
        return ""
    match = re.search(r'https?://[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"\'<>`()\[\]{}]+', text, flags=re.I)
    if match:
        return re.sub(r'[.,;:!?，。！？@]+$', '', match.group(0))
    return text.strip()


def resolve_shortlink(url_or_text):
    """
    解析汽水音乐短链接（如 https://qishui.douyin.com/s/xxxx/ 或 https://qishui.com/s/xxxx），返回重定向后的目标 URL。
    """
    candidate = extract_url_from_text(url_or_text)
    if not candidate:
        return candidate

    # 仅针对短链域名与 /s/ 路径发起 HTTP 重定向检测
    if not re.search(r'(?:qishui\.douyin\.com|music\.douyin\.com|qishui\.com)/s/', candidate, flags=re.I):
        return candidate

    target = candidate if re.match(r'^https?://', candidate, flags=re.I) else f"https://{candidate}"
    current_url = target
    for _ in range(3):
        try:
            resp = requests.get(
                current_url,
                headers={'User-Agent': SHORTLINK_USER_AGENT},
                allow_redirects=False,
                timeout=8,
            )
            if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                loc = resp.headers["Location"]
                if not re.match(r'^https?://', loc, flags=re.I):
                    from urllib.parse import urljoin
                    loc = urljoin(current_url, loc)
                current_url = loc
                if 'playlist_id' in loc or 'playlistId' in loc:
                    return current_url
            else:
                break
        except Exception:
            break
    return current_url


def extract_playlist_id(text):
    """
    从输入文本中提取汽水音乐歌单 ID（通常为 19 位连续数字）。
    支持纯数字、完整 URL、微信长分享链接、带参链接或移动端分享文案。
    """
    if not text:
        return None
    trimmed = text.strip()

    # 1. 直接输入纯数字 ID (通常 16~20 位)
    if re.fullmatch(r'\d{4,20}', trimmed):
        return trimmed

    # 2. 从已有 URL Query 参数或路径中快速提取无需走网络
    m = re.search(r'(?:[?&](?:playlist_id|playlistId|id)=|\/(?:share\/)?playlist\/)(\d{4,20})', trimmed, flags=re.I)
    if m:
        return m.group(1)

    # 3. 若为短链文案，解析短链重定向
    resolved = resolve_shortlink(trimmed)
    m = re.search(r'(?:[?&](?:playlist_id|playlistId|id)=|\/(?:share\/)?playlist\/)(\d{4,20})', resolved, flags=re.I)
    if m:
        return m.group(1)

    # 4. 兜底匹配任意 16-20 位连续数字
    m = re.search(r'\b(\d{16,20})\b', resolved)
    if m:
        return m.group(1)

    return None


def determine_track_status(track_data):
    """
    根据 label_info 判定歌曲可用性与 VIP 状态。
    """
    label_info = track_data.get('label_info') or {}

    if label_info.get('only_vip_playable'):
        return {
            'isAvailable': True,
            'isVip': True,
            'status': 'vip',
            'statusText': 'VIP专享',
        }

    q_map = label_info.get('quality_map') or {}
    med_detail = (q_map.get('medium') or {}).get('play_detail') or {}
    if med_detail.get('need_purchase'):
        return {
            'isAvailable': True,
            'isVip': False,
            'status': 'paid',
            'statusText': '付费专辑',
        }

    lossless_vips = label_info.get('quality_only_vip_can_play') or []
    if 'lossless' in lossless_vips and not label_info.get('only_vip_playable'):
        return {
            'isAvailable': True,
            'isVip': False,
            'status': 'playable',
            'statusText': '正常',
        }

    has_audio = (
        (isinstance(track_data.get('bit_rates'), list) and len(track_data['bit_rates']) > 0) or
        bool(track_data.get('vid')) or
        (isinstance(track_data.get('duration'), (int, float)) and track_data['duration'] > 0)
    )

    if not has_audio and not track_data.get('name'):
        return {
            'isAvailable': False,
            'isVip': False,
            'status': 'unplayable',
            'statusText': '下架/无版权',
        }

    return {
        'isAvailable': True,
        'isVip': False,
        'status': 'playable',
        'statusText': '正常',
    }


def normalize_media_resource(m, index):
    """
    将汽水音乐单一 media_resource 节点规整为标准化 Track 数据元组。
    返回: (name, artist, album, duration_str, status_text, cover_url, track_id, duration_ms, release_date)
    """
    entity = m.get('entity') or {}
    track_wrapper = entity.get('track_wrapper') or {}
    raw_track = track_wrapper.get('track') or entity.get('track') or m.get('track')

    if raw_track:
        tid = str(raw_track.get('id') or "").strip()
        name = str(raw_track.get('name') or raw_track.get('title') or "未知歌曲").strip()

        # Artists
        artists = []
        for a in raw_track.get('artists') or []:
            aname = str(
                a.get('name') or
                a.get('artist_name') or
                a.get('simple_display_name') or
                (a.get('user') or {}).get('nickname') or
                ""
            ).strip()
            if aname:
                artists.append(aname)
        artist = ", ".join(artists) if artists else "未知艺人"

        # Album & Release Date
        album_obj = raw_track.get('album') or {}
        album = str(album_obj.get('name') or "").strip()

        release_date = None
        rd = album_obj.get('release_date')
        if isinstance(rd, (int, float)) and rd > 0:
            ms = rd if rd > 1e11 else rd * 1000
            try:
                dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
                release_date = dt.strftime('%Y-%m-%d')
            except Exception:
                pass
        elif isinstance(rd, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', rd.strip()):
            release_date = rd.strip()

        # Duration
        dur = raw_track.get('duration') or raw_track.get('duration_ms') or 0
        dur_ms = int(dur) if isinstance(dur, (int, float)) and dur > 0 else None
        dur_sec = dur_ms // 1000 if dur_ms else 0
        dur_str = f"{dur_sec // 60:02d}:{dur_sec % 60:02d}" if dur_sec > 0 else ""

        # Cover
        cover_url = (
            build_qishui_image_url(album_obj.get('url_cover')) or
            build_qishui_image_url(raw_track.get('url_cover')) or
            ""
        )

        st_info = determine_track_status(raw_track)

        return (
            name,
            artist,
            album,
            dur_str,
            st_info['statusText'],
            cover_url,
            tid,
            dur_ms,
            release_date,
        )

    # 视频/UGC 原声节点
    video_wrapper = entity.get('video_wrapper') or {}
    raw_video = video_wrapper.get('video') or entity.get('video') or m.get('video')
    if raw_video:
        vid = str(raw_video.get('video_id') or raw_video.get('id') or raw_video.get('vid') or m.get('id') or "").strip()
        raw_title = str(raw_video.get('title') or raw_video.get('name') or raw_video.get('description') or "").strip()
        cleaned_title = re.sub(r'(?:\s*#[^\s#]+)+$', '', raw_title).strip()
        name = cleaned_title or raw_title or "视频片段"

        artists = []
        for a in raw_video.get('artists') or []:
            aname = str(
                a.get('name') or
                a.get('artist_name') or
                a.get('simple_display_name') or
                (a.get('user_info') or {}).get('nickname') or
                (a.get('user') or {}).get('nickname') or
                ""
            ).strip()
            if aname:
                artists.append(aname)
        artist = ", ".join(artists) if artists else "未知艺人"

        dur = raw_video.get('duration') or 0
        dur_ms = None
        if isinstance(dur, (int, float)) and dur > 0:
            dur_ms = int(dur if dur > 10000 else dur * 1000)
        dur_sec = dur_ms // 1000 if dur_ms else 0
        dur_str = f"{dur_sec // 60:02d}:{dur_sec % 60:02d}" if dur_sec > 0 else ""

        cover_url = (
            build_qishui_image_url(raw_video.get('cover_url')) or
            build_qishui_image_url(raw_video.get('share_cover_url')) or
            build_qishui_image_url(raw_video.get('image_url')) or
            ""
        )

        label_info = raw_video.get('label_info') or {}
        is_vip = bool(label_info.get('only_vip_playable'))
        status_text = "VIP专享" if is_vip else "视频"

        return (
            name,
            artist,
            "",
            dur_str,
            status_text,
            cover_url,
            vid,
            dur_ms,
            None,
        )

    # 兜底未知节点
    fallback_id = str(m.get('id') or "").strip()
    return (
        "未知或已下架音频",
        "未知艺人",
        "",
        "",
        "下架/无版权",
        "",
        fallback_id,
        None,
        None,
    )


def fetch_aweme_music_collection(owner_id):
    """
    通过抖音 Aweme 用户收藏接口获取完整的收藏音乐列表（含 UGC 原声）。
    """
    all_tracks = []
    cursor = '0'
    page = 0

    while page < MAX_AWEME_PAGES:
        page += 1
        url = (
            f"https://aweme.snssdk.com/aweme/v1/user/music/collect/"
            f"?user_id={owner_id}&cursor={cursor}&count={AWEME_PAGE_COUNT}"
        )
        try:
            resp = requests.get(url, headers={'User-Agent': AWEME_USER_AGENT}, timeout=FETCH_TIMEOUT)
            if resp.status_code != 200:
                break
            data = resp.json()
        except Exception as e:
            print(f"请求抖音收藏接口失败: {e}", file=sys.stderr)
            break

        items = data.get('mc_list') or []
        for raw in items:
            tid = str(raw.get('id_str') or raw.get('mid') or raw.get('id') or "").strip()
            # 优先从 unified_music_group 或 song 中提取真实正版歌名，避免粗糙原声名
            umg = raw.get('unified_music_group') or {}
            song = raw.get('song') or {}
            title = str(umg.get('title') or song.get('title') or raw.get('title') or "").strip()
            if not title or re.match(r'^@?.*创作的原声$', title):
                if umg.get('title'):
                    title = str(umg['title']).strip()
                elif song.get('title'):
                    title = str(song['title']).strip()
            title = title or str(raw.get('title') or "未知歌曲").strip()

            author = str(umg.get('author') or raw.get('author') or "未知艺人").strip()
            album = str(raw.get('album') or "").strip()

            dur = raw.get('duration') or 0
            dur_ms = int(dur * 1000) if isinstance(dur, (int, float)) and dur > 0 else None
            dur_sec = dur_ms // 1000 if dur_ms else 0
            dur_str = f"{dur_sec // 60:02d}:{dur_sec % 60:02d}" if dur_sec > 0 else ""

            # Cover
            cover_url = ""
            for cov_key in ('cover_large', 'cover_hd', 'cover_medium', 'cover_thumb'):
                c_obj = raw.get(cov_key) or {}
                urls = c_obj.get('url_list') or []
                if urls:
                    cover_url = urls[0]
                    break

            is_available = raw.get('status') == 1 or raw.get('status') is None
            is_orig = bool(raw.get('is_original_sound'))
            status_text = "下架/无版权" if not is_available else ("原声" if is_orig else "正常")

            all_tracks.append((
                title,
                author,
                album,
                dur_str,
                status_text,
                cover_url,
                tid,
                dur_ms,
                None,
            ))

        has_more = bool(data.get('has_more'))
        next_cursor = str(data.get('cursor', ''))
        if not has_more or not next_cursor or next_cursor == cursor or len(items) == 0:
            break
        cursor = next_cursor

    return all_tracks


def get_playlist_info(playlist_id, channel="qishui"):
    """
    通过官方 Luna 接口分页拉取歌单元数据与全量音乐资源列表。
    支持 options: channel='qishui' (官方清洁正版通道) 或 'douyin' (全量收藏通道)。
    返回: (playlist_title, tracks, author, cover_url, playlist_id)
    """
    cursor = '0'
    page = 0
    all_media_resources = []
    playlist_meta = None

    # 1. 抓取第一页获取歌单元数据与通道判定
    first_payload = {
        'playlist_id': playlist_id,
        'cursor': cursor,
        'count': PAGE_COUNT,
    }

    try:
        resp = requests.post(
            'https://beta-luna.douyin.com/luna/playlist/detail',
            headers={
                'User-Agent': LUNA_USER_AGENT,
                'Content-Type': 'application/json; charset=utf-8',
            },
            json=first_payload,
            timeout=FETCH_TIMEOUT,
        )
        if resp.status_code == 404:
            print("错误: 汽水音乐歌单未找到或已设为私密", file=sys.stderr)
            return None
        if resp.status_code != 200:
            print(f"错误: 汽水音乐接口返回状态码 {resp.status_code}", file=sys.stderr)
            return None
        data = resp.json()
    except Exception as e:
        print(f"请求汽水音乐接口失败: {e}", file=sys.stderr)
        return None

    playlist_meta = data.get('playlist')
    if not playlist_meta:
        print("错误: 未能获取到有效的汽水歌单信息", file=sys.stderr)
        return None

    playlist_title = str(playlist_meta.get('title') or playlist_meta.get('name') or "汽水音乐歌单").strip()
    author = str((playlist_meta.get('owner') or {}).get('nickname') or "汽水用户").strip()
    cover_url = build_qishui_image_url(playlist_meta.get('url_cover')) or ""
    declared_total = int(playlist_meta.get('count_tracks') or 0)
    is_douyin_sync = bool(playlist_meta.get('type') == 4 and (playlist_meta.get('owner') or {}).get('id'))

    # 2. 如果指定了 douyin 通道且是抖音同步歌单
    if channel.lower() == 'douyin' and is_douyin_sync:
        owner_id = str(playlist_meta['owner']['id']).strip()
        print(f"检测到抖音同步歌单，正在通过抖音全量收藏通道拉取 (用户 UID: {owner_id})...")
        tracks = fetch_aweme_music_collection(owner_id)
        return (playlist_title, tracks, author, cover_url, playlist_id)

    # 3. 官方 Luna 通道 (正版清洁音频流)
    first_medias = data.get('media_resources') or []
    all_media_resources.extend(first_medias)

    has_more = bool(data.get('has_more'))
    next_cursor = str(data.get('next_cursor') or '')

    if has_more and next_cursor:
        print(f"歌单共约 {declared_total or '多'} 首歌曲，正在自动分页抓取中...")

    while has_more and next_cursor and next_cursor != cursor and page < MAX_PAGES:
        cursor = next_cursor
        page += 1
        payload = {
            'playlist_id': playlist_id,
            'cursor': cursor,
            'count': PAGE_COUNT,
        }
        try:
            r = requests.post(
                'https://beta-luna.douyin.com/luna/playlist/detail',
                headers={
                    'User-Agent': LUNA_USER_AGENT,
                    'Content-Type': 'application/json; charset=utf-8',
                },
                json=payload,
                timeout=FETCH_TIMEOUT,
            )
            if r.status_code != 200:
                break
            page_data = r.json()
        except Exception as e:
            print(f"抓取第 {page + 1} 页异常: {e}", file=sys.stderr)
            break

        medias = page_data.get('media_resources') or []
        all_media_resources.extend(medias)

        has_more = bool(page_data.get('has_more'))
        next_cursor = str(page_data.get('next_cursor') or '')

    tracks = [normalize_media_resource(m, idx + 1) for idx, m in enumerate(all_media_resources)]
    return (playlist_title, tracks, author, cover_url, playlist_id)


def export_xlsx(filename, tracks):
    try:
        from openpyxl import Workbook
    except ImportError:
        print("未检测到 openpyxl 库，跳过 xlsx 导出。请执行 pip install openpyxl 安装。")
        return

    wb = Workbook()
    ws = wb.active
    ws.title = "汽水音乐歌单"

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


def format_total_duration(total_ms):
    if not total_ms or total_ms <= 0:
        return ""
    total_minutes = int(total_ms // 60000)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    if hours > 0:
        return f"{hours} 小时 {minutes} 分钟"
    return f"{minutes} 分钟"


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
            tid = t.get("id") or ""
            isrc = t.get("isrc") or ""
            dt_ms = t.get("durationMs")
            release_date = t.get("releaseDate")
            track_num = t.get("trackNumber")
            disc_num = t.get("discNumber")
            is_orig = t.get("isOriginalSound")
            max_quality = t.get("maxQuality")
            mv_id = t.get("mvId")
        else:
            name = t[0] if len(t) > 0 else ""
            artist = t[1] if len(t) > 1 else ""
            album = t[2] if len(t) > 2 else ""
            duration_str = t[3] if len(t) > 3 else ""
            status_text = t[4] if len(t) > 4 else ""
            cover_url = t[5] if len(t) > 5 and t[5] else ""
            tid = t[6] if len(t) > 6 and t[6] else ""
            isrc = ""
            dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
            release_date = t[8] if len(t) > 8 and t[8] else None
            track_num = None
            disc_num = None
            is_orig = True if status_text == "原声" else None
            max_quality = t[9] if len(t) > 9 and t[9] else None
            mv_id = None

        if dt_ms is None and duration_str and ":" in str(duration_str):
            parts = str(duration_str).split(":")
            try:
                if len(parts) == 2:
                    dt_ms = (int(parts[0]) * 60 + int(parts[1])) * 1000
                elif len(parts) == 3:
                    dt_ms = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])) * 1000
            except ValueError:
                pass

        artist_str = str(artist).strip() if artist else "未知艺人"
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
        if tid:
            track_entry["id"] = str(tid).strip()
        if isrc and str(isrc).strip():
            track_entry["isrc"] = str(isrc).strip().upper()
        if dt_ms is not None and dt_ms > 0:
            track_entry["durationMs"] = int(dt_ms)
        if release_date:
            track_entry["releaseDate"] = str(release_date).strip()
        if track_num:
            track_entry["trackNumber"] = int(track_num)
        if disc_num:
            track_entry["discNumber"] = int(disc_num)
        if tid:
            track_entry["sourceUrl"] = f"https://music.douyin.com/qishui/share/track?track_id={tid}"
        if cover_url and str(cover_url).strip():
            track_entry["coverUrl"] = str(cover_url).strip()
        if is_orig is not None:
            track_entry["isOriginalSound"] = bool(is_orig)
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text or "正常"
        if max_quality and str(max_quality).strip():
            track_entry["maxQuality"] = str(max_quality).strip()
        if mv_id and str(mv_id).strip():
            track_entry["mvId"] = str(mv_id).strip()

        tracks_out.append(track_entry)

    loaded_duration_ms = sum(t.get("durationMs", 0) for t in tracks_out)
    duration_str = format_total_duration(loaded_duration_ms)

    payload = {
        "generator": "PlaylistOut",
        "generatorUrl": WEB_URL,
        "exportedFrom": "PlaylistOutCLI",
        "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "name": playlist_title or "汽水音乐歌单",
    }
    if author and str(author).strip():
        payload["creator"] = str(author).strip()
    if playlist_cover and str(playlist_cover).strip():
        payload["coverUrl"] = str(playlist_cover).strip()
    payload["platform"] = "qishui"
    if playlist_id and str(playlist_id).strip():
        payload["id"] = str(playlist_id).strip()
        payload["sourceUrl"] = f"https://music.douyin.com/qishui/share/playlist?playlist_id={playlist_id}"
    payload["trackCount"] = len(tracks_out)
    payload["loadedTrackCount"] = len(tracks_out)
    payload["isPartial"] = False
    if loaded_duration_ms > 0:
        if duration_str:
            payload["totalDuration"] = duration_str
        payload["totalDurationMs"] = loaded_duration_ms
        if duration_str:
            payload["loadedDuration"] = duration_str
        payload["loadedDurationMs"] = loaded_duration_ms
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
    safe_title = sanitize_filename(playlist_title) or "qishui_playlist"
    os.makedirs(output_dir, exist_ok=True)

    exported_files = []

    print(f"\n[*] 开始导出歌单《{playlist_title}》 (共 {len(tracks)} 首歌曲)...\n")

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
            print(f"  [✓] {fmt.upper():<5} -> {os.path.abspath(fn)}")
        except Exception as e:
            print(f"  [✗] {fmt.upper():<5} 导出失败: {e}")

    print(f"\n[🎉] 导出完成！共 {len(tracks)} 首歌曲，已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder:
        open_folder(exported_files[0])
    return exported_files


def main():
    parser = argparse.ArgumentParser(description="汽水音乐歌单导出工具 (PlaylistOut Qishui Exporter)")
    parser.add_argument("input", nargs="?", help="汽水音乐歌单 ID、链接或分享文本")
    parser.add_argument("--id", "-i", dest="opt_id", help="汽水音乐歌单 ID、链接或分享文本")
    parser.add_argument("--output-dir", "-o", default="output", help="导出目录 (默认: output)")
    parser.add_argument(
        "--format", "-f",
        default="all",
        help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (逗号分隔，默认: all)"
    )
    parser.add_argument(
        "--channel", "-c",
        default="qishui",
        choices=["qishui", "douyin"],
        help="解析通道: qishui (官方清洁正版通道, 默认) 或 douyin (全量收藏通道，含 UGC 视频原声)"
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
            print("错误: 无法解析汽水音乐歌单 ID", file=sys.stderr)
            sys.exit(1)
        formats = [x.strip() for x in args.format.split(",")]
        info = get_playlist_info(pid, channel=args.channel)
        if not info:
            sys.exit(1)
        perform_export(info, output_dir, formats, reveal_folder=not args.no_open)
        return

    print_banner("汽水音乐")
    try:
        while True:
            user_input = input("\n请输入歌单链接 或 歌单ID（输入 0 退出）：").strip()
            print("=" * 64)
            if not user_input or user_input in ('0', 'q', 'quit', 'exit'):
                print_exit_banner()
                break

            playlist_id = extract_playlist_id(user_input)
            if not playlist_id:
                print("❌ 未能识别到有效的汽水音乐歌单 ID，请检查输入！")
                print("=" * 64)
                continue

            print(f"正在获取歌单 (ID: {playlist_id}) 信息...")
            info = get_playlist_info(playlist_id, channel=args.channel)
            if not info:
                print("❌ 获取歌单信息失败，请重试。")
                print("=" * 64)
                continue

            playlist_title, tracks, author, _, _ = info
            unavail = sum(1 for t in tracks if t[4] == '下架/无版权')
            vip_cnt = sum(1 for t in tracks if t[4] == 'VIP专享')
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

