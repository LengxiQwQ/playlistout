# --- QQ音乐歌单导出工具 ---
# -*- coding: utf-8 -*-

"""
依赖（自行安装）：
    pip install requests
    pip install openpyxl
"""

__author__ = "lengxiQwQ, Dragon水魅"

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
import platform
import subprocess
import requests
import socket
import argparse
from datetime import datetime

# 针对 Windows 控制台尽量启用 UTF-8 编码避免特殊字符乱码
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 强制优先使用 IPv4 避免国内部分运营商 IPv6 握手超时 (如 c6.y.qq.com AAAA 解析挂起)
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
    print("  核心特性: 本地运行 · 本地导出 · 不上传 Playlist Out 服务器 · 全格式歌单备份导出")
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
    print("\n感谢使用 Playlist Out，程序已安全退出！\n")

# --- 辅助函数 ---

# 去掉可能的 JSONP 包装，返回 JSON 字符串
def strip_jsonp(text):
    m = re.search(r'^[^\(]*\((\{.*\})\)\s*;?\s*$', text, flags=re.S)
    if m:
        return m.group(1)
    return text

# 将文件名中 Windows 不允许的字符替换为空格：< > : " / \ | ? * 以及控制字符（0-31），去掉首尾空白
def sanitize_filename(name):
    if not name:
        return ""
    name = re.sub(r'[\x00-\x1f]', ' ', name)
    name = re.sub(r'[<>:"/\\|?*]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or "playlist"

# 解析 QQ音乐短链接
def resolve_shortlink(text):
    if not text:
        return text
    # Support http://, https://, or bare domain like c6.y.qq.com/base/fcgi-bin/u?__=...
    m = re.search(r'https?://[a-zA-Z0-9-]+\.y\.qq\.com/base/fcgi-bin/u\S*', text)
    if not m:
        m2 = re.search(r'(?:^|[^\w.-])([a-zA-Z0-9-]+\.y\.qq\.com/base/fcgi-bin/u\S*)', text)
        if m2:
            url = f"https://{m2.group(1)}"
        else:
            url = None
    else:
        url = m.group(0)

    if url:
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
                ),
            }
            resp = requests.get(url, headers=headers, allow_redirects=False, timeout=8)
            if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                return resp.headers["Location"]
            elif resp.status_code == 200:
                return resp.url
        except Exception:
            pass
    return text

# 从用户输入中提取歌单ID
def extract_playlist_id(text):
    if not text:
        return None
    from cli.core.detector import extract_clean_url_or_input
    cleaned = extract_clean_url_or_input(text)
    if re.fullmatch(r'\d{5,18}', cleaned.strip()):
        return cleaned.strip()

    resolved = resolve_shortlink(cleaned)

    # 严格排除用户主页特征，避免将用户 UIN 误识别为歌单 ID
    is_playlist_path = any(p in resolved for p in ('/playlist', '/taoge', '/playsquare'))
    is_playlist_query = any(k in resolved for k in ('disstid', 'dissid', 'tid', 'playlist_id', 'diss_id', 'playlistid'))
    if ('/profile' in resolved or 'hostuin=' in resolved or 'uin=' in resolved) and not (is_playlist_path or is_playlist_query):
        return None

    # 1. 优先从 URL 路径匹配: /playlist/<id>, /taoge/<id>, /playsquare/<id>
    m = re.search(r'/(?:playlist|taoge|playsquare)(?:_v\d+)?/(\d{5,18})', resolved)
    if m:
        return m.group(1)
    # 2. 匹配 Query 参数: id=..., disstid=..., dissid=..., tid=..., playlist_id=...
    m = re.search(r'[?&#](?:id|disstid|dissid|tid|playlist_id|diss_id|playlistid)=(\d{5,18})', resolved)
    if m:
        return m.group(1)
    # 3. 针对明确的 QQ 音乐歌单页面兜底匹配数字
    if 'y.qq.com' in resolved and any(k in resolved for k in ('detail', 'taoge', 'playlist', 'playsquare')):
        m = re.search(r'(\d{5,18})', resolved)
        if m:
            return m.group(1)
    return None

# 从用户输入中提取用户 QQ号 (uin)
def extract_user_uin(text):
    if not text:
        return None
    from cli.core.detector import extract_clean_url_or_input
    cleaned = extract_clean_url_or_input(text)
    if re.fullmatch(r'\d{5,12}', cleaned.strip()):
        return cleaned.strip()
    resolved = resolve_shortlink(cleaned)
    if '/playlist' in resolved or '/taoge' in resolved or '/playsquare' in resolved:
        return None
    m = re.search(r'[?&#](?:uin|hostuin)=(\d{5,12})', resolved)
    if m:
        return m.group(1)
    m_path = re.search(r'/profile/(\d{5,12})', resolved)
    if m_path:
        return m_path.group(1)
    return None


def normalize_qq_release_date(value):
    raw = str(value or "").strip()
    if re.fullmatch(r"\d{8}", raw) and raw != "00000000":
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw) and raw != "0000-00-00":
        return raw
    return None


def extract_qq_song_metadata(song):
    album_obj = song.get("album") if isinstance(song.get("album"), dict) else {}
    release_date = normalize_qq_release_date(song.get("time_public") or album_obj.get("time_public"))

    track_number = song.get("index_album")
    try:
        track_number = int(track_number)
        if track_number <= 0:
            track_number = None
    except (TypeError, ValueError):
        track_number = None

    disc_number = None
    index_cd = song.get("index_cd")
    try:
        if index_cd is not None:
            parsed_index_cd = int(index_cd)
            if parsed_index_cd >= 0:
                disc_number = parsed_index_cd + 1
    except (TypeError, ValueError):
        pass

    if disc_number is None:
        legacy_cd = song.get("cdIdx")
        try:
            legacy_cd = int(legacy_cd)
            if legacy_cd > 0:
                disc_number = legacy_cd
        except (TypeError, ValueError):
            pass

    mv_obj = song.get("mv") if isinstance(song.get("mv"), dict) else {}
    mv_id = str(song.get("vid") or mv_obj.get("vid") or "").strip() or None

    return release_date, track_number, disc_number, mv_id


def extract_qq_song_status_and_quality(song):
    file_obj = song.get("file") if isinstance(song.get("file"), dict) else {}
    pay_obj = song.get("pay") if isinstance(song.get("pay"), dict) else {}
    action_obj = song.get("action") if isinstance(song.get("action"), dict) else {}

    size128 = song.get("size128") if song.get("size128") is not None else (file_obj.get("size_128mp3") if file_obj.get("size_128mp3") is not None else file_obj.get("size_128"))
    size320 = song.get("size320") if song.get("size320") is not None else (file_obj.get("size_320mp3") if file_obj.get("size_320mp3") is not None else file_obj.get("size_320"))
    sizeflac = song.get("sizeflac") if song.get("sizeflac") is not None else file_obj.get("size_flac")

    payplay = pay_obj.get("payplay") if pay_obj.get("payplay") is not None else pay_obj.get("pay_play")
    payalbum = pay_obj.get("payalbum") if pay_obj.get("payalbum") is not None else (1 if (pay_obj.get("price_album") or 0) > 0 else 0)
    alertid = song.get("alertid") if song.get("alertid") is not None else action_obj.get("alert")
    msgid = song.get("msgid") if song.get("msgid") is not None else action_obj.get("msgid")
    icons = action_obj.get("icons") or 0
    is_vip_icon = bool(isinstance(icons, int) and (((icons >> 1) & 1) == 1 or ((icons >> 18) & 1) == 1))

    is_paid_album = (payalbum == 1)
    is_vip_stream = (payplay == 1 or msgid == 13 or alertid == 41 or is_vip_icon)
    is_geo_blocked_only = (alertid in (2, 21) or msgid == 14)

    has_explicit_zero_audio = (size128 == 0 and size320 == 0 and (sizeflac is None or sizeflac == 0))
    is_takedown_alert = (
        alertid == 11 or
        (alertid is not None and alertid != 0 and not is_geo_blocked_only and alertid != 41 and not is_vip_stream and not is_paid_album)
    )
    is_takedown_msg = (msgid == 0 and not is_vip_stream and not is_paid_album)
    is_truly_unplayable = (is_takedown_alert or is_takedown_msg or has_explicit_zero_audio)

    if is_paid_album:
        status_text = "付费专辑"
    elif is_truly_unplayable:
        status_text = "下架/无版权"
    elif is_vip_stream:
        status_text = "VIP专享"
    else:
        status_text = "正常"

    max_quality = None
    if isinstance(sizeflac, (int, float)) and sizeflac > 0:
        max_quality = "FLAC"
    elif isinstance(size320, (int, float)) and size320 > 0:
        max_quality = "320kbps"
    elif isinstance(size128, (int, float)) and size128 > 0:
        max_quality = "128kbps"

    return status_text, max_quality


def format_total_duration(total_ms):
    if not total_ms or total_ms <= 0:
        return None
    total_minutes = int(total_ms // 60000)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    if hours > 0:
        return f"{hours} 小时 {minutes} 分钟"
    return f"{minutes} 分钟"


# --- 与 QQ音乐接口交互（返回 (playlist_title, [(name,singers,album), ...], author) 或 None） ---

# 获取指定 QQ号 的所有歌单列表，返回 (nickname, [{"id":..., "name":...}, ...]) 或 None
def get_user_playlists(uin):
    """
    调用 QQ音乐接口获取指定用户（QQ号）的所有歌单。
    返回 (nickname字符串, [{"id":歌单ID, "name":歌单名称}, ...]) 或 None（失败时）。
    """
    # 修复 QQ音乐 API 返回的双重编码字符串（UTF-8 → Latin-1 解码的乱码）
    def fix_encoding(s):
        if not isinstance(s, str):
            return str(s or "")
        try:
            # 尝试用 latin-1 编码回字节，再以 utf-8 解码修复乱码
            fixed = s.encode('latin-1').decode('utf-8')
            # 如果修复后有无效字符，回退原字符串
            return fixed
        except (UnicodeEncodeError, UnicodeDecodeError, LookupError):
            return s

    url = "https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss"
    params = {
        "hostUin": 0,
        "hostuin": str(uin),
        "sin": 0,
        "size": 200,
        "g_tk": 5381,
        "loginUin": 0,
        "format": "json",
        "inCharset": "utf8",
        "outCharset": "utf-8",
        "notice": 0,
        "platform": "yqq.json",
        "needNewCode": 0,
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://y.qq.com/portal/profile.html",
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        j = resp.json()
        if isinstance(j, dict) and j.get("code") == 0:
            data = j.get("data") or {}
            # 提取昵称（hostname），修复编码
            nickname_raw = data.get("hostname") or ""
            nickname = fix_encoding(nickname_raw).strip() or str(uin)
            # 提取歌单列表（tid 是歌单ID，diss_name 是歌单名称）
            items = data.get("disslist") or []
            playlists = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                pid = str(item.get("tid") or "")
                pname = fix_encoding(item.get("diss_name") or "")
                # 过滤掉 dir_show=0 的（如 QZone背景音乐）和 tid=0 的
                if pid and pid != "0" and item.get("dir_show", 1) != 0:
                    playlists.append({"id": pid, "name": pname})
            if playlists:
                return (nickname, playlists)
    except Exception:
        pass
    
    return None

# 老接口: c.y.qq.com 获取歌单信息 返回 (title, song_list, author) 或 None
def try_c_y_qq(disstid):
    url = "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg"
    params = {
        "disstid": str(disstid),
        "type": "1",
        "json": "1",
        "utf8": "1",
        "onlysong": "0",
        "format": "json"
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": f"https://y.qq.com/n/ryqq/playlist/{disstid}"
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
    except Exception:
        return None

    text = strip_jsonp(resp.text.strip())
    try:
        j = json.loads(text)
    except Exception:
        return None

    title = None
    author = ""
    if isinstance(j, dict):
        if "cdlist" in j and isinstance(j["cdlist"], list) and j["cdlist"]:
            cd = j["cdlist"][0]
            title = cd.get("dissname") or cd.get("diss_name") or cd.get("title") or cd.get("cdtitle") or cd.get("name")
            author = cd.get("data_signer") or cd.get("nickname") or cd.get("nick") or cd.get("username") or cd.get("uname") or ""
            songlist = cd.get("songlist") or cd.get("list") or []
        else:
            title = j.get("dissname") or j.get("title") or j.get("name")
            author = j.get("data_signer") or j.get("nickname") or j.get("nick") or ""
            songlist = j.get("songlist") or []
    else:
        return None

    results = []
    for s in songlist:
        name = s.get("songname") or s.get("name") or s.get("title") or ""
        if "singer" in s and isinstance(s["singer"], list):
            singers = ", ".join([a.get("name") or a.get("singer_name") or a.get("nickname","") for a in s["singer"]])
        else:
            singers = s.get("singername") or s.get("singer_name") or s.get("lan") or s.get("singer") or ""
        album = s.get("albumname") or (s.get("album") or {}).get("name") or s.get("albumname_utf8") or ""
        album_mid = s.get("albummid") or (s.get("album") or {}).get("mid") or ""
        cover_url = f"https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg" if album_mid else ""
        mid = (s.get("songmid") or s.get("mid") or "").strip()
        interval = s.get("interval")
        duration_ms = interval * 1000 if isinstance(interval, (int, float)) and interval > 0 else None
        release_date, track_number, disc_number, mv_id = extract_qq_song_metadata(s)
        status_text, max_quality = extract_qq_song_status_and_quality(s)
        results.append((name, singers, album, cover_url, mid, duration_ms, release_date, track_number, disc_number, mv_id, status_text, max_quality))

    return (title or "", results, author)

# 新接口: u.y.qq.com 的 GetPlaylistDetail 返回 (title, song_list, author) 或 None
def try_u_y_qq_playlist_detail(playlist_id):
    url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
    payload = {
        "comm": {
            "cv": 4747474,
            "ct": 24,
            "format": "json",
            "inCharset": "utf-8",
            "outCharset": "utf-8",
            "notice": 0,
            "platform": "yqq.json",
            "needNewCode": 1,
            "uin": "0"
        },
        "playlist": {
            "method": "GetPlaylistDetail",
            "module": "music.playlist.PlaylistDetailServer",
            "param": {
                "id": int(playlist_id),
                "n": 1000,
                "order": 5
            }
        }
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": f"https://y.qq.com/n/ryqq/playlist/{playlist_id}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
    except Exception:
        return None

    try:
        j = resp.json()
    except Exception:
        return None

    pl = j.get("playlist")
    if not pl:
        return None

    title = ""
    author = ""
    if isinstance(pl, dict):
        title = pl.get("title") or pl.get("dissname") or (pl.get("data") or {}).get("title") or (pl.get("data") or {}).get("name") or pl.get("name") or ""
        creator = pl.get("creator") or (pl.get("data") or {}).get("creator") or {}
        if isinstance(creator, dict):

            # 兼容各种字段名
            author = creator.get("nickname") or creator.get("nickName") or creator.get("nick") or creator.get("name") or creator.get("data_signer") or ""
        if not author:
            author = pl.get("data_signer") or pl.get("nickname") or pl.get("nick") or ""

    if pl.get("code") is not None and pl.get("code") != 0:
        return None

    songlist = (pl.get("data") or {}).get("songlist") or (pl.get("data") or {}).get("songs") or pl.get("songlist") or []
    results = []
    for s in songlist:
        name = s.get("name") or s.get("songname") or ""
        if isinstance(s.get("singer"), list):
            singers = ", ".join([a.get("name","") for a in s["singer"]])
        else:
            singers = s.get("singername") or s.get("singer") or ""
        album = (s.get("album") or {}).get("name") or s.get("albumname") or ""
        album_mid = (s.get("album") or {}).get("mid") or s.get("albummid") or ""
        cover_url = f"https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg" if album_mid else ""
        mid = (s.get("mid") or s.get("songmid") or "").strip()
        interval = s.get("interval")
        duration_ms = interval * 1000 if isinstance(interval, (int, float)) and interval > 0 else None
        release_date, track_number, disc_number, mv_id = extract_qq_song_metadata(s)
        status_text, max_quality = extract_qq_song_status_and_quality(s)
        results.append((name, singers, album, cover_url, mid, duration_ms, release_date, track_number, disc_number, mv_id, status_text, max_quality))
    return (title or "", results, author)

def get_playlist_songs(playlist_id):

    # 依次尝试不同接口，返回 (title, songs, author) 或 None
    res = try_c_y_qq(playlist_id)
    if res:
        return res

    res = try_u_y_qq_playlist_detail(playlist_id)
    if res:
        return res

    # 备用 payload（playlist_songlist），尝试从 data 中提取 author
    url = "https://u.y.qq.com/cgi-bin/musicu.fcg"
    payload_alt = {
        "comm": {"cv": 4747474, "ct": 24, "format": "json", "uin": "0", "platform": "yqq.json"},
        "playlist_songlist": {
            "method": "GetPlaylistSongs",
            "module": "playlist.PlaylistSongListSrv",
            "param": {"id": int(playlist_id), "start": 0, "count": 1000}
        }
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": f"https://y.qq.com/n/ryqq/playlist/{playlist_id}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, data=json.dumps(payload_alt), headers=headers, timeout=10)
        j = resp.json()
        p = j.get("playlist_songlist", {})
        if p.get("code") == 0:
            data = p.get("data", {})
            songlist = data.get("songlist", []) or []
            title = data.get("title") or data.get("dissname") or data.get("name") or ""
            results = []
            for s in songlist:
                name = s.get("name","")
                singers = ", ".join([a.get("name","") for a in s.get("singer", [])]) if isinstance(s.get("singer"), list) else s.get("singer","")
                album = (s.get("album") or {}).get("name","")
                album_mid = (s.get("album") or {}).get("mid") or s.get("albummid") or ""
                cover_url = f"https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg" if album_mid else ""
                mid = (s.get("mid") or s.get("songmid") or "").strip()
                interval = s.get("interval")
                duration_ms = interval * 1000 if isinstance(interval, (int, float)) and interval > 0 else None
                release_date, track_number, disc_number, mv_id = extract_qq_song_metadata(s)
                status_text, max_quality = extract_qq_song_status_and_quality(s)
                results.append((name, singers, album, cover_url, mid, duration_ms, release_date, track_number, disc_number, mv_id, status_text, max_quality))
            author = data.get("data_signer") or data.get("nickname") or data.get("nick") or data.get("username") or ""
            return (title or "", results, author)
    except Exception:
        pass

    return None

# --- 导出函数（txt/csv/xlsx/json/m3u8） ---

# 保存为 txt（每行 "Title - Artist - Album"）
def export_to_txt(rows, output_path):
    header = ""
    try:
        with open(output_path, "w", encoding="utf-8-sig", newline="\n") as f:
            f.write(header)
            for item in rows:
                name = item[0] if len(item) > 0 else ""
                singers = item[1] if len(item) > 1 else ""
                album = item[2] if len(item) > 2 else ""
                safe_name = (name or "").replace("\r"," ").replace("\n"," ")
                safe_singers = (singers or "").replace("\r"," ").replace("\n"," ")
                safe_album = (album or "").replace("\r"," ").replace("\n"," ")
                f.write(f"{safe_name} - {safe_singers} - {safe_album}\n")
    except Exception:
        raise

# 保存为 csv（utf-8-sig，第一行为表头）
def export_to_csv(rows, output_path):
    try:
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Title", "Artist", "Album"])
            for item in rows:
                name = item[0] if len(item) > 0 else ""
                singers = item[1] if len(item) > 1 else ""
                album = item[2] if len(item) > 2 else ""
                safe_name = (name or "").replace("\r"," ").replace("\n"," ")
                safe_singers = (singers or "").replace("\r"," ").replace("\n"," ")
                safe_album = (album or "").replace("\r"," ").replace("\n"," ")
                writer.writerow([safe_name, safe_singers, safe_album])
    except Exception:
        raise

# 保存为 xlsx（openpyxl），第一行为表头
def export_to_xlsx(rows, output_path):
    try:
        from openpyxl import Workbook
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise

    wb = Workbook()
    ws = wb.active
    ws.title = "QQ音乐歌单"
    ws.append(["Title", "Artist", "Album"])
    for item in rows:
        name = item[0] if len(item) > 0 else ""
        singers = item[1] if len(item) > 1 else ""
        album = item[2] if len(item) > 2 else ""
        ws.append([name or "", singers or "", album or ""])
    for col_idx in range(1, 4):
        col = get_column_letter(col_idx)
        max_len = 0
        for cell in ws[col]:
            try:
                l = len(str(cell.value))
            except:
                l = 0
            if l > max_len:
                max_len = l
        ws.column_dimensions[col].width = min(max(10, int(max_len * 1.1) + 2), 60)
    wb.save(output_path)

# 保存为 json（Canonical Playlist/Track 规范），使用 utf-8 编码
def export_to_json(rows, output_path, playlist_title="", author="", playlist_id="", playlist_cover=""):
    tracks = []
    for i, item in enumerate(rows, 1):
        if isinstance(item, dict):
            name = item.get("title") or item.get("name") or item.get("Title") or ""
            singers = item.get("artist") or item.get("singers") or item.get("Artist") or ""
            album = item.get("album") or item.get("Album") or ""
            cover_url = item.get("coverUrl") or item.get("cover") or ""
            track_id = item.get("id") or ""
            isrc = item.get("isrc") or ""
            duration_ms = item.get("durationMs")
            release_date = item.get("releaseDate")
            track_number = item.get("trackNumber")
            disc_number = item.get("discNumber")
            mv_id = item.get("mvId")
            status_text = item.get("statusText") or "正常"
            max_quality = item.get("maxQuality")
        else:
            name = item[0] if len(item) > 0 else ""
            singers = item[1] if len(item) > 1 else ""
            album = item[2] if len(item) > 2 else ""
            cover_url = item[3] if len(item) > 3 and item[3] else ""
            track_id = item[4] if len(item) > 4 and item[4] else ""
            isrc = ""
            duration_ms = item[5] if len(item) > 5 and isinstance(item[5], (int, float)) and item[5] > 0 else None
            release_date = item[6] if len(item) > 6 and item[6] else None
            track_number = item[7] if len(item) > 7 and isinstance(item[7], int) and item[7] > 0 else None
            disc_number = item[8] if len(item) > 8 and isinstance(item[8], int) and item[8] > 0 else None
            mv_id = item[9] if len(item) > 9 and item[9] else None
            status_text = item[10] if len(item) > 10 and item[10] else "正常"
            max_quality = item[11] if len(item) > 11 and item[11] else None

        source_url = f"https://y.qq.com/n/ryqq/songDetail/{track_id}" if track_id else None

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
            "artist": str(singers).strip() if singers else "未知歌手",
        }
        if album and str(album).strip() and str(album).strip() != "未知专辑":
            track_entry["album"] = str(album).strip()
        if track_id and str(track_id).strip():
            track_entry["id"] = str(track_id).strip()
        if isrc and str(isrc).strip():
            track_entry["isrc"] = str(isrc).strip().upper()
        if duration_ms is not None and duration_ms > 0:
            track_entry["durationMs"] = int(duration_ms)
        if release_date:
            track_entry["releaseDate"] = str(release_date).strip()
        if track_number:
            track_entry["trackNumber"] = int(track_number)
        if disc_number:
            track_entry["discNumber"] = int(disc_number)
        if source_url:
            track_entry["sourceUrl"] = source_url
        if cover_url and str(cover_url).strip():
            track_entry["coverUrl"] = str(cover_url).strip()
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text or "正常"
        if max_quality and str(max_quality).strip():
            track_entry["maxQuality"] = str(max_quality).strip()
        if mv_id:
            track_entry["mvId"] = str(mv_id).strip()
            track_entry["mvUrl"] = f"https://y.qq.com/n/ryqq/mv/{mv_id}"
        tracks.append(track_entry)

    loaded_duration_ms = sum(t.get("durationMs", 0) for t in tracks)
    duration_str = format_total_duration(loaded_duration_ms)

    payload = {
        "generator": "PlaylistOut",
        "generatorUrl": WEB_URL,
        "exportedFrom": "PlaylistOutCLI",
        "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "name": playlist_title or "QQ音乐歌单",
    }
    if author and str(author).strip():
        payload["creator"] = str(author).strip()
    if playlist_cover and str(playlist_cover).strip():
        payload["coverUrl"] = str(playlist_cover).strip()
    payload["platform"] = "qqmusic"
    if playlist_id and str(playlist_id).strip():
        payload["id"] = str(playlist_id).strip()
        payload["sourceUrl"] = f"https://y.qq.com/n/ryqq/playlist/{playlist_id}"
    payload["trackCount"] = len(tracks)
    payload["loadedTrackCount"] = len(tracks)
    payload["isPartial"] = False
    if loaded_duration_ms > 0:
        if duration_str:
            payload["totalDuration"] = duration_str
        payload["totalDurationMs"] = loaded_duration_ms
        if duration_str:
            payload["loadedDuration"] = duration_str
        payload["loadedDurationMs"] = loaded_duration_ms
    payload["tracks"] = tracks

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception:
        raise

# 保存为 m3u8（通用歌单），使用 utf-8 编码
def export_to_m3u8(rows, output_path, playlist_title=""):
    try:
        with open(output_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("#EXTM3U\n")
            if playlist_title:
                clean_title = (playlist_title or "").replace("\r", " ").replace("\n", " ").strip()
                f.write(f"#PLAYLIST:{clean_title}\n")
            for item in rows:
                name = item[0] if len(item) > 0 else ""
                singers = item[1] if len(item) > 1 else ""
                safe_name = (name or "").replace("\r", " ").replace("\n", " ").strip()
                safe_singers = (singers or "").replace("\r", " ").replace("\n", " ").strip()
                disp = f"{safe_singers} - {safe_name}" if safe_singers else safe_name
                fn = sanitize_filename(disp)
                f.write(f"#EXTINF:-1,{disp}\n")
                f.write(f"{fn}.mp3\n")
    except Exception:
        raise

# 打开并选中文件（Windows），或在其他平台打开文件所在目录
def open_file_location(path):
    try:
        abs_path = os.path.abspath(path)
        dirpath = os.path.dirname(abs_path)
        system = platform.system()
        if system == "Windows":

            # explorer /select, 可以高亮选中文件
            try:
                subprocess.run(["explorer", "/select,", abs_path])
                return
            except Exception:

                # 退回到打开目录
                try:
                    os.startfile(dirpath)
                    return
                except Exception:
                    pass
        elif system == "Darwin":

            # macOS
            try:
                subprocess.run(["open", dirpath])
                return
            except Exception:
                pass
        else:

            # Linux / 其他，尝试 xdg-open
            try:
                subprocess.run(["xdg-open", dirpath])
                return
            except Exception:
                pass
    except Exception:
        pass

# --- 统一导出执行函数 ---
def perform_export(songs, playlist_title, author, pid, output_dir="output", formats=None, reveal_folder_flag=True):
    if not songs:
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

    safe_title = sanitize_filename(playlist_title or f"playlist_{pid}")
    safe_author = sanitize_filename(author or "未知作者")
    base_name = f"{safe_title} - {safe_author}"

    os.makedirs(output_dir, exist_ok=True)
    exported_files = []

    print(f"\n[*] 开始导出歌单《{playlist_title}》 (共 {len(songs)} 首歌曲)...\n")

    for fmt in resolved_formats:
        out_path = os.path.join(output_dir, f"{base_name}.{fmt}")
        try:
            if fmt == "xlsx":
                export_to_xlsx(songs, out_path)
            elif fmt == "csv":
                export_to_csv(songs, out_path)
            elif fmt == "json":
                export_to_json(songs, out_path, playlist_title=playlist_title, author=author, playlist_id=str(pid) if pid else "")
            elif fmt == "txt":
                export_to_txt(songs, out_path)
            elif fmt == "m3u8":
                export_to_m3u8(songs, out_path, playlist_title)
            exported_files.append(out_path)
            print(f"  [✓] {fmt.upper():<5} -> {os.path.abspath(out_path)}")
        except Exception as e:
            print(f"  [✗] {fmt.upper():<5} 导出失败: {e}")

    print(f"\n[🎉] 导出完成！共 {len(songs)} 首歌曲，已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder_flag:
        reveal_folder(exported_files[0])
    return exported_files


# --- 批量导出共享函数 ---
def batch_export_songs(playlists, folder_name, nickname="", output_dir="output", formats=None, reveal_folder_flag=True):
    """批量导出歌单列表"""
    if formats is None:
        print_format_menu()
        fmt_choice = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
        print("=" * 64)
        formats = resolve_export_formats(fmt_choice)

    target_dir = os.path.join(output_dir, folder_name)
    os.makedirs(target_dir, exist_ok=True)
    print(f"\n开始批量导出，保存到文件夹：{os.path.abspath(target_dir)}")
    exported = 0
    failed = 0
    all_exported_files = []

    for idx, pl in enumerate(playlists):
        pid = pl["id"]
        pname = pl["name"]
        print(f"\n  [{idx+1}/{len(playlists)}] 正在获取歌单 [{pid}] {pname}...")
        res = get_playlist_songs(pid)
        if not res or not res[1]:
            print("    ✗ 跳过（无法读取或歌单为空）")
            failed += 1
            continue
        title, songs, author = res
        files = perform_export(
            songs,
            title or pname,
            author or nickname,
            pid,
            output_dir=target_dir,
            formats=formats,
            reveal_folder_flag=False,
        )
        if files:
            exported += 1
            all_exported_files.extend(files)
        else:
            failed += 1

    print(f"\n批量导出完成！成功：{exported} 个歌单，失败：{failed} 个歌单")
    print(f"文件保存在：{os.path.abspath(target_dir)}")
    print("=" * 64)
    if all_exported_files and reveal_folder_flag:
        reveal_folder(target_dir)
    return (exported, failed)

# --- 主程序入口 ---
def main():
    parser = argparse.ArgumentParser(
        description="QQ音乐歌单导出工具 (PlaylistOut QQ Music Exporter)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", nargs="?", help="歌单链接、歌单ID 或 QQ号")
    parser.add_argument("-i", "--id", dest="opt_id", help="歌单链接、歌单ID 或 QQ号")
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
        is_just_digits = user_input.isdigit() and len(user_input) >= 4
        pid = extract_playlist_id(user_input)
        uin = extract_user_uin(user_input)
        playlist_info = None
        qq_info = None
        if pid:
            playlist_info = get_playlist_songs(pid)
        if is_just_digits:
            qq_info = get_user_playlists(user_input)
        elif uin and not playlist_info:
            qq_info = get_user_playlists(uin)

        if playlist_info and playlist_info[1]:
            title, songs, author = playlist_info
            perform_export(songs, title, author, pid, output_dir=output_dir, formats=formats, reveal_folder_flag=not args.no_open)
            return
        elif qq_info:
            qq_nickname, qq_playlists = qq_info
            safe_nick = sanitize_filename(qq_nickname) or "user"
            batch_export_songs(qq_playlists, f"{safe_nick}的歌单_{user_input}", qq_nickname, output_dir=output_dir, formats=formats, reveal_folder_flag=not args.no_open)
            return
        else:
            print("错误: 无法解析输入的 QQ 音乐链接、歌单 ID 或 QQ 号", file=sys.stderr)
            sys.exit(1)

    # 交互模式
    print_banner("QQ 音乐")
    try:
        while True:
            user_input = input("\n请输入歌单链接 或 歌单ID 或 QQ号（输入 0 退出）：").strip()
            print("=" * 64)
            if not user_input or user_input in ("0", "q", "quit", "exit"):
                print_exit_banner()
                break

            is_just_digits = user_input.isdigit() and len(user_input) >= 4
            pid = extract_playlist_id(user_input)
            uin = extract_user_uin(user_input)

            playlist_info = None
            qq_info = None

            if pid:
                playlist_info = get_playlist_songs(pid)
            
            if is_just_digits:
                qq_info = get_user_playlists(user_input)
            elif uin and not playlist_info:
                qq_info = get_user_playlists(uin)

            # 既是歌单又是QQ号
            if playlist_info and playlist_info[1] and qq_info:
                title, songs, author = playlist_info
                qq_nickname, qq_playlists = qq_info
                print(f"\n'{user_input}' 既是歌单ID也是QQ号，请选择：")
                print(f"  [1] 导出该歌单 — [{pid}] {title}（{len(songs)} 首）")
                print(f"  [2] 导出该QQ号所有歌单 — {qq_nickname} 共 {len(qq_playlists)} 个歌单\n")
                c = input("请选择 (1/2，默认1)：").strip()
                print("=" * 64)
                if c == "2":
                    print(f"\n用户：{qq_nickname}，共 {len(qq_playlists)} 个歌单：")
                    for i, pl in enumerate(qq_playlists):
                        print(f"  {i+1:3d}. [{pl['id']}] {pl['name']}")
                    batch_export_songs(qq_playlists, user_input, qq_nickname, output_dir=output_dir, reveal_folder_flag=not args.no_open)
                    continue

            elif qq_info:
                qq_nickname, qq_playlists = qq_info
                print(f"\n检测到QQ号，用户：{qq_nickname}，共 {len(qq_playlists)} 个歌单：")
                for i, pl in enumerate(qq_playlists):
                    print(f"  {i+1:3d}. [{pl['id']}] {pl['name']}")
                batch_export_songs(qq_playlists, user_input, qq_nickname, output_dir=output_dir, reveal_folder_flag=not args.no_open)
                continue

            elif not playlist_info and not qq_info:
                print("\n无法识别输入，请确认歌单链接/ID 或 QQ号是否正确")
                print("=" * 64)
                continue

            title, songs, author = playlist_info
            pid = pid or extract_playlist_id(user_input)
            playlist_title = title.strip() if title else f"playlist_{pid}"
            display_author = author or "未知"

            print(f"\n已获取到 {display_author} 的歌单：\n名称：{playlist_title}，共 {len(songs)} 首歌曲")
            print_format_menu()
            fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
            print("=" * 64)
            sel_formats = resolve_export_formats(fmt_input)
            perform_export(songs, playlist_title, display_author, pid, output_dir=output_dir, formats=sel_formats, reveal_folder_flag=not args.no_open)

    except KeyboardInterrupt:
        print_exit_banner()


if __name__ == "__main__":
    main()
