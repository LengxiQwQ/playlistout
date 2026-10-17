# --- 酷狗音乐歌单导出工具 ---
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

import html
import json
import csv
import time
import base64
import zlib
import struct
import tempfile
import hashlib
import platform
import subprocess
import argparse
import requests
import socket
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

# 强制优先使用 IPv4 避免国内部分运营商 IPv6 握手超时
try:
    import urllib3.util.connection as urllib3_cn
    urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass

# ----------------- 统一品牌与终端交互组件 -----------------
from cli.core.ui import print_divider, print_title, prompt_input
from cli.core.naming import build_export_base_name, ensure_unique_base_name

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


def print_exit_banner():
    print("\n感谢使用 Playlist Out，程序已安全退出！\n")


# ----------------- 常量与签名密钥 -----------------
KUGOU_SONGINFO_KEY = "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt"
KUGOU_LITE_SALT = "LnT6xpN3khm36zse0QzvmgTZ3waWdRSA"
KUGOU_LITE_APPID = "3116"
KUGOU_LITE_CLIENTVER = "11440"

MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
)

AUTH_HEADERS = {
    "User-Agent": "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi",
    "kg-rc": "1",
    "kg-thash": "5d816a0",
    "kg-rec": "1",
    "kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F",
    "Accept": "application/json",
}

DEFAULT_AUTH_DIR = os.path.expanduser("~/.playlistout")
DEFAULT_AUTH_FILE = os.path.join(DEFAULT_AUTH_DIR, "kugou_auth.json")
LOCAL_AUTH_FILE = os.path.abspath(".kugou_auth.json")


def sign_kugou_login(params):
    """酷狗登录/公开集合类接口签名算法"""
    pairs = "".join(f"{k}={params[k]}" for k in sorted(params.keys()))
    return hashlib.md5((KUGOU_SONGINFO_KEY + pairs + KUGOU_SONGINFO_KEY).encode("utf-8")).hexdigest()


def sign_kugou_gateway(params, data_str="", salt=KUGOU_LITE_SALT):
    """酷狗网关（Cloudlist等）接口签名算法"""
    pairs = "".join(f"{k}={params[k]}" for k in sorted(params.keys()))
    return hashlib.md5((salt + pairs + data_str + salt).encode("utf-8")).hexdigest()


# ----------------- 凭证存储与管理 -----------------

def get_auth_file_path():
    """获取凭证存储路径，优先本地，否则用户主目录"""
    if os.path.exists(LOCAL_AUTH_FILE):
        return LOCAL_AUTH_FILE
    return DEFAULT_AUTH_FILE


def load_auth_credentials():
    """读取本地永久保存的酷狗登录凭证"""
    paths = [LOCAL_AUTH_FILE, DEFAULT_AUTH_FILE]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    token = (data.get("token") or "").strip()
                    userid = str(data.get("userid") or "").strip()
                    if token and userid:
                        return token, userid, data
            except Exception:
                pass
    return None, None, {}


def save_auth_credentials(token, userid, source="manual"):
    """永久保存酷狗登录凭证到本地"""
    target_path = DEFAULT_AUTH_FILE
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    payload = {
        "token": str(token).strip(),
        "userid": str(userid).strip(),
        "source": source,
        "updated_at": int(time.time()),
    }
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"→ 登录凭证已永久保存至: {target_path}")
        return True
    except Exception as e:
        print(f"! 保存凭证失败: {e}")
        return False


def clear_auth_credentials():
    """清除本地存储的酷狗登录凭证"""
    removed = False
    for p in [LOCAL_AUTH_FILE, DEFAULT_AUTH_FILE]:
        if os.path.exists(p):
            try:
                os.remove(p)
                removed = True
                print(f"→ 已清除凭证文件: {p}")
            except Exception as e:
                print(f"! 清除凭证文件失败 {p}: {e}")
    if not removed:
        print("→ 本地未找到已保存的凭证。")


# ----------------- 酷狗扫码与手动登录流 -----------------

def request_kugou_qr():
    """向酷狗官方接口申请登录二维码"""
    clienttime = str(int(time.time()))
    mid = hashlib.md5(f"playlistout_{clienttime}_{time.time()}".encode("utf-8")).hexdigest()

    params = {
        "appid": KUGOU_LITE_APPID,
        "clientver": KUGOU_LITE_CLIENTVER,
        "clienttime": clienttime,
        "dfid": "-",
        "mid": mid,
        "uuid": "-",
        "type": "1",
        "plat": "4",
        "qrcode_txt": f"https://h5.kugou.com/apps/loginQRCode/html/index.html?appid={KUGOU_LITE_APPID}&",
        "srcappid": "2919",
    }
    params["signature"] = sign_kugou_login(params)

    headers = {
        **AUTH_HEADERS,
        "dfid": "-",
        "clienttime": clienttime,
        "mid": mid,
    }

    resp = requests.get("https://login-user.kugou.com/v2/qrcode", params=params, headers=headers, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"请求酷狗二维码失败 (HTTP {resp.status_code})")

    data = resp.json()
    if data.get("status") != 1 or not data.get("data", {}).get("qrcode"):
        raise RuntimeError(f"酷狗二维码接口返回异常: {data}")

    qrcode = data["data"]["qrcode"]
    qrcode_img = data["data"].get("qrcode_img", "")
    login_url = f"https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode={qrcode}&appid={KUGOU_LITE_APPID}"

    return qrcode, qrcode_img, login_url


def poll_kugou_qr_status(qrcode_key):
    """轮询酷狗二维码扫描状态"""
    clienttime = str(int(time.time()))
    mid = hashlib.md5(f"playlistout_check_{clienttime}_{qrcode_key}".encode("utf-8")).hexdigest()

    params = {
        "appid": KUGOU_LITE_APPID,
        "clientver": KUGOU_LITE_CLIENTVER,
        "clienttime": clienttime,
        "dfid": "-",
        "mid": mid,
        "uuid": "-",
        "plat": "4",
        "srcappid": "2919",
        "qrcode": qrcode_key,
    }
    params["signature"] = sign_kugou_login(params)

    headers = {
        **AUTH_HEADERS,
        "dfid": "-",
        "clienttime": clienttime,
        "mid": mid,
    }

    resp = requests.get("https://login-user.kugou.com/v2/get_userinfo_qrcode", params=params, headers=headers, timeout=10)
    if resp.status_code != 200:
        return "failed", None, None, f"HTTP {resp.status_code}"

    json_data = resp.json()
    data = json_data.get("data") or {}
    raw_status = data.get("status")

    # 1: 待扫码, 2: 已扫描待确认, 4: 登录成功, 3: 过期
    if raw_status == 4 and data.get("token") and data.get("userid"):
        return "success", str(data["token"]), str(data["userid"]), "登录成功"
    elif raw_status == 2:
        return "scanned", None, None, "已扫描二维码，请在手机酷狗上点击确认登录..."
    elif raw_status == 1:
        return "waiting", None, None, "等待手机酷狗扫码..."
    elif raw_status == 3:
        return "expired", None, None, "二维码已过期"
    else:
        return "failed", None, None, json_data.get("error") or "检查登录异常"



def _render_qr_ansi_legacy(b64_png):
    try:
        clean_b64 = b64_png.split(",")[-1]
        raw = base64.b64decode(clean_b64)
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            return None
        pos = 8
        idat_chunks = []
        w, h = 0, 0
        while pos < len(raw):
            length, chunk_type = struct.unpack(">I4s", raw[pos:pos+8])
            pos += 8
            data = raw[pos:pos+length]
            pos += length + 4
            if chunk_type == b"IHDR":
                w, h = struct.unpack(">II", data[:8])
            elif chunk_type == b"IDAT":
                idat_chunks.append(data)
        if not idat_chunks or w == 0 or h == 0:
            return None
        decompressed = zlib.decompress(b"".join(idat_chunks))
        stride = 1 + (w + 7) // 8
        grid = []
        for y in range(h):
            line = decompressed[y * stride : (y + 1) * stride]
            bits = []
            for b in line[1:]:
                for bit_idx in range(7, -1, -1):
                    bits.append((b >> bit_idx) & 1)
            grid.append(bits[:w])
        start_row = 0
        while start_row < h and all(grid[start_row][x] == 1 for x in range(w)):
            start_row += 1
        if start_row >= h:
            return None
        black_len = 0
        for val in grid[start_row]:
            if val == 0:
                black_len += 1
            elif black_len > 0:
                break
        module_size = max(1, black_len // 7)
        num_modules = w // module_size
        quiet = 2
        total_w = num_modules + quiet * 2
        matrix = []
        for _ in range(quiet):
            matrix.append([1] * total_w)
        for r in range(num_modules):
            y = int((r + 0.5) * module_size)
            row = [1] * quiet
            for c in range(num_modules):
                x = int((c + 0.5) * module_size)
                row.append(grid[y][x])
            row.extend([1] * quiet)
            matrix.append(row)
        for _ in range(quiet):
            matrix.append([1] * total_w)
        total_rows = len(matrix)
        lines = []
        for r in range(0, total_rows, 2):
            row_top = matrix[r]
            row_bot = matrix[r + 1] if r + 1 < total_rows else [1] * total_w
            line_parts = ["  "]
            for top, bot in zip(row_top, row_bot):
                fg = "30" if top == 0 else "37"
                bg = "40" if bot == 0 else "47"
                line_parts.append(f"\033[{fg};{bg}m\u2580\033[0m")
            lines.append("".join(line_parts))
        return "\n".join(lines)
    except Exception:
        return None


def run_qr_login_flow(no_open=False):
    """执行二维码扫码登录流程（纯终端色块，无外部弹窗）"""
    print_title("酷狗 APP 扫码登录", emoji="📱")
    print("🚀 正在申请官方登录二维码，请稍候...\n")
    qrcode, qrcode_img_b64, login_url = request_kugou_qr()

    rendered = _render_qr_ansi_legacy(qrcode_img_b64)
    if rendered:
        print(rendered)
        print("")

    qr_btn = terminal_link(login_url, "移动端点击在酷狗音乐中打开")
    print("📱 手机端操作指南：")
    print("  1. 打开手机【酷狗音乐】APP ➜ 点击右上角「扫一扫」➜ 扫描终端上方二维码")
    print(f"  2. 移动端专属：若在手机端运行脚本无法扫码，请在浏览器中打开：{qr_btn}（将自动跳转至手机酷狗音乐 APP 登录；电脑端运行无需点击，直接扫码即可）\n")

    last_msg = ""
    start_time = time.time()
    max_wait = 300  # 5分钟超时

    while time.time() - start_time < max_wait:
        status, token, userid, msg = poll_kugou_qr_status(qrcode)
        if msg != last_msg:
            print(f"🚀 {msg}")
            last_msg = msg

        if status == "success":
            print(f"\n✅ 酷狗账号登录成功！UserID: {userid}")
            save_auth_credentials(token, userid, source="qr")
            print_divider()
            return token, userid
        elif status == "expired":
            print("⚠️ 二维码已超时过期，请重新登录。")
            print_divider()
            return None, None
        elif status == "failed":
            print(f"❌ 登录异常: {msg}")
            print_divider()
            return None, None

        time.sleep(1.5)
    print("⚠️ 扫码超时，请重试。")
    print_divider()
    return None, None


def run_manual_login_flow():
    """手动输入从官网获取的 ID 和 Token"""
    web_link = terminal_link(WEB_URL, "在线网页版")
    print_title("手动输入凭证", f"您可以访问 Playlist Out {web_link} 登录酷狗后粘贴 UserID 与 Token：", emoji="🔑")
    print("")

    try:
        userid_input = prompt_input("请输入酷狗 UserID (如: 12345678)")
        if not userid_input:
            print("⚠️ UserID 不能为空！")
            print("")
            return None, None

        token_input = prompt_input("请输入酷狗 Token (32位十六进制字符串)")
        if not token_input:
            print("⚠️ Token 不能为空！")
            print("")
            return None, None

        auth_path = save_auth_credentials(token_input, userid_input, source="manual")
        if auth_path:
            print(f"📁 登录凭证已永久保存至: {auth_path}")
        print(f"✅ 凭证配置成功！UserID: {userid_input}")
        print("")
        return token_input, userid_input
    except (KeyboardInterrupt, EOFError):
        print("\n🚀 已取消输入。")
        print("")
        return None, None


def interactive_login_menu():
    """交互式登录菜单，提供扫码与手动凭证两种方式"""
    print_title("酷狗音乐登录", "普通公开歌单无需登录，只有个人歌单和「我喜欢」需要登录。", emoji="🔐")
    print("")
    print("  1  扫码登录")
    print("  2  手动输入 UserID 和 Token")
    print("  0  返回")
    print("")

    while True:
        try:
            choice = prompt_input("选择登录方式")
            if choice == "1":
                return run_qr_login_flow()
            elif choice == "2":
                return run_manual_login_flow()
            elif choice in ("0", "q", "exit"):
                return None, None
            else:
                print("⚠️ 请输入 1、2 或 0。")
                print("")
        except (KeyboardInterrupt, EOFError):
            print("\n已取消登录。")
            return None, None


# ----------------- URL 解析与链接处理 -----------------

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
    """解析酷狗短链接 (如 t1.kugou.com/...)"""
    if not text:
        return text
    m = re.search(r'https?://t\d?\.kugou\.com/[a-zA-Z0-9_]+', text)
    if not m:
        m2 = re.search(r'(?:^|[^\w.-])(t\d?\.kugou\.com/[a-zA-Z0-9_]+)', text)
        if m2:
            url = f"https://{m2.group(1)}"
        else:
            url = None
    else:
        url = m.group(0)

    if url:
        current_url = url
        for _ in range(3):
            try:
                resp = requests.get(
                    current_url,
                    headers={"User-Agent": MOBILE_UA},
                    allow_redirects=False,
                    timeout=8,
                )
                if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                    next_url = resp.headers["Location"]
                    if not next_url.startswith("http"):
                        from urllib.parse import urljoin
                        next_url = urljoin(current_url, next_url)
                    current_url = next_url
                else:
                    break
            except Exception:
                break
        return current_url
    return text


def extract_kugou_target(input_text):
    """
    识别酷狗输入类型并提取 ID：
    - special: 官方精选/专题歌单 (special/single/546903)
    - collection: 酷狗概念版 / 新版集合歌单 (collection_3_1504683618_2_0)
    - songlist: H5 分享页歌单 (gcid_3zr52qfrzaz06a / src_cid=...)
    - cloudlist: 个人云端歌单 / 我喜欢的歌 (listid=4 / kugou_cloudlist_4 / 纯数字 4)
    """
    if not input_text:
        return None
    from cli.core.detector import extract_clean_url_or_input
    cleaned = extract_clean_url_or_input(input_text)
    text = resolve_shortlink(cleaned.strip())

    # 1. 官方精选/专题歌单 (如 https://www.kugou.com/yy/special/single/546903.html)
    special_match = re.search(r'special/single/(\d+)', text, re.IGNORECASE)
    if special_match:
        return {
            "type": "special",
            "id": special_match.group(1),
            "original_url": text,
        }

    # 2. 酷狗概念版 / 新版集合歌单 (global_specialid=collection_3_1504683618_2_0)
    col_match = re.search(r'(?:[?&]global_specialid=|\b)(collection_\d+_\d+_\d+_\d+)\b', text, re.IGNORECASE)
    if col_match:
        sp_match = re.search(r'[?&]specialid=(-?\d+)', text, re.IGNORECASE)
        return {
            "type": "collection",
            "id": col_match.group(1),
            "specialid": int(sp_match.group(1)) if sp_match else 0,
            "original_url": text,
        }

    # 3. H5 移动端分享页歌单 (gcid_... 或 src_cid=...)
    gcid_match = re.search(r'(?:songlist/|src_cid=|gid=)?(gcid_[a-zA-Z0-9]+)', text, re.IGNORECASE)
    if gcid_match:
        return {
            "type": "songlist",
            "id": gcid_match.group(1),
            "original_url": text,
        }

    # 4. 未加 gcid_ 前缀的 10-20 位 src_cid 或 raw 14位字符 CID
    raw_cid_match = re.search(r'src_cid=([a-zA-Z0-9]{10,20})', text, re.IGNORECASE)
    if raw_cid_match:
        cid = raw_cid_match.group(1)
        return {
            "type": "songlist",
            "id": cid if cid.startswith("gcid_") else f"gcid_{cid}",
            "original_url": text,
        }
    if re.fullmatch(r'[a-zA-Z0-9]{14}', text):
        return {
            "type": "songlist",
            "id": f"gcid_{text}",
            "original_url": text,
        }

    # 5. 云端歌单 listid 形式 (如 listid=4 或 kugou_cloudlist_4 或 songlist/4/)
    cloud_match = (
        re.search(r'[?&]listid=(\d+)', text, re.IGNORECASE)
        or re.search(r'kugou_cloudlist_(\d+)', text, re.IGNORECASE)
        or re.search(r'songlist/(\d+)/?(?:[?#]|$)', text, re.IGNORECASE)
    )
    if cloud_match:
        return {
            "type": "cloudlist",
            "id": cloud_match.group(1),
            "original_url": text,
        }

    # 6. 纯数字 ID: 1-12 位，默认为个人云端歌单 ID (如 4, 10, 1425711902)
    if re.fullmatch(r'\d{1,12}', text):
        return {
            "type": "cloudlist",
            "id": text,
            "original_url": f"https://m.kugou.com/songlist/?listid={text}",
        }

    return None



# ----------------- 数据标准化 -----------------

def clean_audio_extension(s):
    if not s:
        return ""
    return re.sub(r'\.(mp3|flac|wav|m4a|aac|ogg|ape)$', '', str(s), flags=re.IGNORECASE).strip()


def extract_title_and_artists(raw_song):
    """从原始歌曲数据中提取标准化的歌名与歌手"""
    raw_name = clean_audio_extension(raw_song.get("name") or raw_song.get("songname") or raw_song.get("filename") or "")

    # 1. 尝试显式 singerinfo 数组
    singerinfo = raw_song.get("singerinfo")
    if isinstance(singerinfo, list) and singerinfo:
        artists = [s.get("name", "").strip() for s in singerinfo if s.get("name", "").strip()]
        if artists:
            title = raw_name
            if " - " in raw_name:
                title = raw_name.split(" - ", 1)[1].strip()
            return title or raw_name or "未知歌曲", ", ".join(artists)

    # 2. 尝试显式 singername
    singername = (raw_song.get("singername") or "").strip()
    if singername:
        title = raw_name
        if " - " in raw_name:
            title = raw_name.split(" - ", 1)[1].strip()
        return title or raw_name or "未知歌曲", singername

    # 3. 兜底切分 "歌手 - 歌名"
    if " - " in raw_name:
        parts = raw_name.split(" - ", 1)
        artist = parts[0].strip() or "未知歌手"
        title = parts[1].strip() or raw_name
        return title, artist

    return raw_name or "未知歌曲", "未知歌手"


def normalize_cover_url(url):
    if not url:
        return ""
    clean = url.replace("{size}", "400").replace(r"\/", "/").strip()
    if clean.startswith("http://"):
        clean = "https://" + clean[7:]
    elif clean.startswith("//"):
        clean = "https:" + clean
    return clean


def normalize_kugou_track(raw_song, index):
    """将酷狗单曲统一转换为 PlaylistOut Track 格式"""
    title, artist = extract_title_and_artists(raw_song)
    h = raw_song.get("hash") or raw_song.get("FileHash") or ""

    album_obj = raw_song.get("albuminfo") or {}
    album = (
        album_obj.get("name")
        or raw_song.get("album_name")
        or raw_song.get("AlbumName")
        or ""
    ).strip()

    # 时长处理 (timelen 为毫秒, duration 为秒或毫秒)
    timelen = raw_song.get("timelen")
    duration = raw_song.get("duration")
    duration_ms = 0
    if timelen and timelen > 0:
        duration_ms = int(timelen)
    elif duration and duration > 0:
        duration_ms = int(duration) if duration > 1000 else int(duration * 1000)

    # VIP 与状态
    privilege = raw_song.get("privilege", raw_song.get("Privilege", 0))
    is_vip = privilege == 10
    status_text = "VIP专享" if is_vip else "正常"

    # 音质
    has_lossless = bool((raw_song.get("sqhash") or "").strip()) or bool(raw_song.get("sqfilesize", 0) > 0)
    has_320 = bool((raw_song.get("320hash") or "").strip()) or bool(raw_song.get("320filesize", 0) > 0)
    max_quality = "FLAC" if has_lossless else ("320kbps" if has_320 else "128kbps")

    cover = normalize_cover_url(
        raw_song.get("cover")
        or (raw_song.get("trans_param") or {}).get("union_cover")
        or raw_song.get("pic")
    )

    source_url = f"https://www.kugou.com/song/#hash={h}" if h else ""

    mins = duration_ms // 60000
    secs = (duration_ms % 60000) // 1000
    duration_str = f"{mins:02d}:{secs:02d}" if duration_ms > 0 else "--:--"

    pub_date = str(
        raw_song.get("publish_date")
        or (raw_song.get("trans_param") or {}).get("publish_date")
        or ""
    ).strip()
    release_date = pub_date if re.match(r"^\d{4}-\d{2}-\d{2}$", pub_date) and pub_date != "0000-00-00" else None

    raw_mv = str(raw_song.get("mvhash") or raw_song.get("MvHash") or "").strip()
    mv_id = raw_mv if raw_mv and not re.fullmatch(r"0+", raw_mv) else None

    track_obj = {
        "index": index,
        "title": title,
        "artist": artist,
        "album": album,
        "id": h,
        "duration_ms": duration_ms,
        "duration_str": duration_str,
        "is_available": True,
        "is_vip": is_vip,
        "status": "vip" if is_vip else "playable",
        "status_text": status_text,
        "max_quality": max_quality,
        "cover_url": cover,
        "source_url": source_url,
    }
    if release_date:
        track_obj["release_date"] = release_date
    if mv_id:
        track_obj["mv_id"] = mv_id
    return track_obj


# ----------------- 数据抓取器 -----------------

def fetch_special_playlist(special_id, original_url=None):
    """
    抓取酷狗官方精选/专题歌单 (specialid)
    完全无需登录，公开调用 mobilecdn.kugou.com
    """
    print(f"→ 正在获取官方专题歌单元数据 (specialid: {special_id})...")
    info_url = f"http://mobilecdn.kugou.com/api/v3/special/info?specialid={special_id}"
    list_info = {}
    try:
        r = requests.get(info_url, headers={"User-Agent": MOBILE_UA}, timeout=10)
        if r.status_code == 200:
            list_info = r.json().get("data") or {}
    except Exception as e:
        print(f"! 获取歌单元数据轻微失败，继续获取歌曲: {e}")

    playlist_name = (list_info.get("specialname") or "酷狗专题歌单").strip()
    creator = (list_info.get("nickname") or list_info.get("username") or "酷狗音乐").strip()
    cover_url = normalize_cover_url(list_info.get("pic") or list_info.get("imgurl"))
    description = (list_info.get("intro") or "").strip()
    expected_total = int(list_info.get("songcount") or list_info.get("count") or 0)

    print(f"→ 歌单名称: {playlist_name}")
    print(f"→ 预计歌曲数: {expected_total or '未知'}")

    page_size = 300
    page = 1
    max_pages = 50
    raw_songs = []
    seen_fingerprints = set()

    while page <= max_pages:
        song_url = (
            f"http://mobilecdn.kugou.com/api/v3/special/song?"
            f"specialid={special_id}&page={page}&pagesize={page_size}&version=9108&area_code=1"
        )
        r = requests.get(song_url, headers={"User-Agent": MOBILE_UA}, timeout=15)
        if r.status_code != 200:
            if raw_songs:
                break
            raise RuntimeError(f"请求专题歌曲列表失败 (HTTP {r.status_code})")

        data = r.json().get("data") or {}
        batch = data.get("info")
        if not isinstance(batch, list) or not batch:
            break

        fingerprint = ";".join(f"{s.get('hash', '')}:{s.get('filename', '')}" for s in batch)
        if fingerprint in seen_fingerprints:
            print("! 检测到重复页面，分页结束。")
            break
        seen_fingerprints.add(fingerprint)

        if expected_total <= 0 and data.get("total"):
            expected_total = int(data["total"])

        raw_songs.extend(batch)
        print(f"→ 已抓取第 {page} 页，当前累计 {len(raw_songs)} 首...")

        if expected_total > 0 and len(raw_songs) >= expected_total:
            break
        if len(batch) < page_size:
            break
        page += 1

    tracks = [normalize_kugou_track(s, i + 1) for i, s in enumerate(raw_songs)]
    return {
        "id": str(special_id),
        "name": playlist_name,
        "creator": creator,
        "cover_url": cover_url,
        "description": description,
        "track_count": len(tracks),
        "play_count": int(list_info.get("playcount") or 0),
        "source_url": original_url or f"https://www.kugou.com/yy/special/single/{special_id}.html",
        "tracks": tracks,
    }


def fetch_collection_playlist(collection_id, specialid=0, original_url=None):
    """
    抓取酷狗概念版 / 新版集合歌单 (collection_...)
    完全无需登录，通过 pubsongscdn.kugou.com 批量分页获取
    """
    print(f"→ 正在获取概念版集合歌单 (ID: {collection_id})...")

    # 1. 尝试获取元数据
    list_name = None
    creator = None
    cover_url = None
    description = ""
    try:
        now_ms = str(int(time.time() * 1000))
        params = {
            "srcappid": "2919",
            "clientver": "20000",
            "clienttime": now_ms,
            "mid": now_ms,
            "uuid": now_ms,
            "dfid": "-",
            "specialid": str(specialid),
            "global_specialid": collection_id,
            "sign": "h5",
        }
        params["signature"] = sign_kugou_login(params)
        info_resp = requests.get(
            "https://mobiles.kugou.com/v5/special/info_v2",
            params=params,
            headers={"User-Agent": MOBILE_UA, "Referer": "https://activity.kugou.com/"},
            timeout=8,
        )
        if info_resp.status_code == 200:
            d = (info_resp.json().get("data") or {})
            if d.get("specialname"):
                list_name = d["specialname"].strip()
            if d.get("nickname"):
                creator = d["nickname"].strip()
            if d.get("user_avatar") or d.get("imgurl"):
                cover_url = normalize_cover_url(d.get("user_avatar") or d.get("imgurl"))
            if d.get("intro"):
                description = d["intro"].strip()
    except Exception:
        pass

    if not list_name:
        parts = collection_id.split("_")
        list_name = f"酷狗歌单_{parts[3] if len(parts) > 3 else collection_id}"
    if not creator:
        parts = collection_id.split("_")
        creator = f"酷狗用户_{parts[2]}" if len(parts) > 2 else "酷狗用户"

    print(f"→ 歌单名称: {list_name}")

    # 2. 批量分页抓取歌曲列表
    page = 1
    page_size = 100
    all_songs = []
    total_count = float("inf")
    max_pages = 50

    while len(all_songs) < total_count and page <= max_pages:
        now_ms = str(int(time.time() * 1000))
        params = {
            "srcappid": "2919",
            "clientver": "20000",
            "clienttime": now_ms,
            "mid": now_ms,
            "uuid": now_ms,
            "dfid": "-",
            "uid": "0",
            "appid": "1058",
            "token": "",
            "type": "0",
            "module": "playlist",
            "page": str(page),
            "pagesize": str(page_size),
            "global_collection_id": collection_id,
        }
        params["signature"] = sign_kugou_login(params)
        res = requests.get(
            "https://pubsongscdn.kugou.com/v2/get_other_list_file",
            params=params,
            headers={"User-Agent": MOBILE_UA, "Referer": "https://activity.kugou.com/"},
            timeout=15,
        )
        if res.status_code != 200:
            if all_songs:
                break
            raise RuntimeError(f"获取概念版歌曲失败 (HTTP {res.status_code})")

        json_data = res.json()
        if json_data.get("status") != 1 or not json_data.get("data", {}).get("info"):
            if all_songs:
                break
            raise RuntimeError(f"集合歌单解析失败或暂无歌曲: {json_data.get('errmsg', '')}")

        total_count = int(json_data["data"].get("count") or 0)
        batch = json_data["data"]["info"]
        if not batch:
            break

        if not cover_url and batch[0]:
            cover_url = normalize_cover_url(batch[0].get("cover") or (batch[0].get("trans_param") or {}).get("union_cover"))

        all_songs.extend(batch)
        print(f"→ 已抓取第 {page} 页，当前累计 {len(all_songs)}/{total_count} 首...")

        if len(all_songs) >= total_count or len(batch) < page_size:
            break
        page += 1

    tracks = [normalize_kugou_track(s, i + 1) for i, s in enumerate(all_songs)]
    return {
        "id": collection_id,
        "name": list_name,
        "creator": creator,
        "cover_url": cover_url,
        "description": description,
        "track_count": len(tracks),
        "play_count": 0,
        "source_url": original_url or f"https://m.kugou.com/songlist/?global_specialid={collection_id}",
        "tracks": tracks,
    }


def fetch_songlist_h5(gcid, original_url=None):
    """
    抓取移动端 H5 分享页歌单 (gcid_...)
    无需登录，解析 SSR HTML 中注入的 window.$output 数据
    """
    print(f"→ 正在抓取酷狗移动端分享页 (GCID: {gcid})...")
    url = f"https://m.kugou.com/songlist/{gcid}/"
    resp = requests.get(
        url,
        headers={
            "User-Agent": MOBILE_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout=15,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"访问分享页失败 (HTTP {resp.status_code})")

    html_text = resp.text
    m = re.search(r'window\.\$output\s*=\s*(\{.+?\});', html_text, re.DOTALL)
    if not m:
        raise RuntimeError("无法在酷狗分享页中提取到 window.$output 歌单数据。")

    try:
        output_data = json.loads(m.group(1))
    except Exception as e:
        raise RuntimeError(f"反序列化分享页歌单 JSON 失败: {e}")

    info = output_data.get("info") or {}
    list_info = info.get("listinfo") or {}
    songs = info.get("songs") or []

    # 如果有集合ID且提供了更多歌曲，可以尝试调用 collection 接口获取完整曲目
    encode_gic = output_data.get("encode_gic")
    if encode_gic and encode_gic.startswith("collection_") and len(songs) < int(list_info.get("count") or 0):
        print(f"→ 发现集合标识 {encode_gic}，尝试获取完整曲目...")
        try:
            return fetch_collection_playlist(encode_gic, original_url=original_url)
        except Exception as e:
            print(f"! 尝试完整抓取略过: {e}")

    playlist_name = (list_info.get("name") or "酷狗歌单").strip()
    creator = (list_info.get("nickname") or list_info.get("list_create_username") or "酷狗用户").strip()
    cover_url = normalize_cover_url(list_info.get("pic"))
    description = (list_info.get("intro") or "").strip()

    print(f"→ 歌单名称: {playlist_name} (共 {len(songs)} 首歌曲)")
    tracks = [normalize_kugou_track(s, i + 1) for i, s in enumerate(songs)]

    return {
        "id": gcid,
        "name": playlist_name,
        "creator": creator,
        "cover_url": cover_url,
        "description": description,
        "track_count": len(tracks),
        "play_count": int(list_info.get("play_count") or list_info.get("playcount") or 0),
        "source_url": original_url or url,
        "tracks": tracks,
    }


def fetch_cloudlist_playlist(listid, token, userid, original_url=None):
    """
    抓取个人自建歌单 / 云端歌单 (需登录凭证 token 和 userid)
    调用 gateway.kugou.com/v4/get_list_all_file 接口
    """
    print(f"→ 正在抓取个人云端歌单 (listid: {listid}, userid: {userid})...")
    page_size = 300
    page = 1
    max_pages = 50
    all_songs = []
    seen_fingerprints = set()
    expected_total = -1

    while page <= max_pages:
        clienttime = str(int(time.time()))
        mid = hashlib.md5(f"cloudlist_{clienttime}_{userid}_{page}".encode("utf-8")).hexdigest()

        post_data = {
            "listid": str(listid),
            "userid": str(userid),
            "area_code": 1,
            "show_relate_goods": 1,
            "pagesize": page_size,
            "allplatform": 1,
            "show_cover": 1,
            "type": 0,
            "token": token,
            "page": page,
        }
        data_str = json.dumps(post_data, separators=(",", ":"))

        query_params = {
            "dfid": "-",
            "mid": mid,
            "uuid": "-",
            "appid": KUGOU_LITE_APPID,
            "clientver": KUGOU_LITE_CLIENTVER,
            "clienttime": clienttime,
            "token": token,
            "userid": str(userid),
        }
        query_params["signature"] = sign_kugou_gateway(query_params, data_str)

        headers = {
            "User-Agent": "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi",
            "Content-Type": "application/json",
            "x-router": "cloudlist.service.kugou.com",
            "dfid": "-",
            "clienttime": clienttime,
            "mid": mid,
            "kg-rc": "1",
            "kg-thash": "5d816a0",
            "kg-rec": "1",
            "kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F",
        }

        resp = requests.post(
            "https://gateway.kugou.com/v4/get_list_all_file",
            params=query_params,
            headers=headers,
            data=data_str,
            timeout=15,
        )

        if resp.status_code != 200:
            if page == 1:
                raise RuntimeError(f"酷狗网关异常 (HTTP {resp.status_code})")
            break

        json_data = resp.json()
        if json_data.get("status") != 1:
            err_code = json_data.get("error_code", -1)
            msg = json_data.get("error") or json_data.get("msg") or "未知原因"
            if err_code in (0, 100, 200, 401, 403, 1000, 1001, 1002, 2000, 2001, 2002, 2003, 2005, 10001, 10002):
                raise PermissionError(f"酷狗登录凭证已过期或无效 (错误码: {err_code}, 信息: {msg})")
            if page == 1:
                raise RuntimeError(f"获取歌单失败: {msg} (错误码: {err_code})")
            break

        data = json_data.get("data") or {}
        batch = data.get("info")
        if not isinstance(batch, list) or not batch:
            break

        if expected_total <= 0 and data.get("count"):
            expected_total = int(data["count"])

        fingerprint = ";".join(f"{s.get('hash', '')}:{s.get('name', '')}" for s in batch)
        if fingerprint in seen_fingerprints:
            print("! 检测到重复页面，分页结束。")
            break
        seen_fingerprints.add(fingerprint)

        all_songs.extend(batch)
        print(f"→ 已抓取第 {page} 页，当前累计 {len(all_songs)} 首...")

        if expected_total > 0 and len(all_songs) >= expected_total:
            break
        if len(batch) < page_size:
            break
        page += 1

    # 按照客户端定义的 sort 字段排序，保证与手机端显示一致
    def sort_key(s):
        sort_val = s.get("sort")
        if sort_val is None:
            sort_val = s.get("fsort")
        return int(sort_val) if sort_val is not None else 999999

    all_songs.sort(key=sort_key)

    playlist_name = f"酷狗歌单_{listid}"
    if str(listid) == "4":
        playlist_name = "我喜欢"

    tracks = [normalize_kugou_track(s, i + 1) for i, s in enumerate(all_songs)]
    return {
        "id": str(listid),
        "name": playlist_name,
        "creator": f"用户_{userid}",
        "cover_url": tracks[0]["cover_url"] if tracks else "",
        "description": "酷狗个人自建歌单",
        "track_count": len(tracks),
        "play_count": 0,
        "source_url": original_url or f"https://m.kugou.com/songlist/?listid={listid}",
        "tracks": tracks,
    }


# ----------------- 文件导出模块 -----------------

def export_xlsx(playlist, output_path):
    """导出格式清晰美观的 Excel 电子表格"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "歌单歌曲列表"

    headers = ["序号", "歌曲名称", "歌手", "专辑", "时长", "状态", "最高音质", "酷狗链接"]
    ws.append(headers)

    header_font = Font(name="微软雅黑", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1677FF", end_color="1677FF", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="E0E0E0"),
        right=Side(style="thin", color="E0E0E0"),
        top=Side(style="thin", color="E0E0E0"),
        bottom=Side(style="thin", color="E0E0E0"),
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border
    ws.row_dimensions[1].height = 26

    data_font = Font(name="微软雅黑", size=10)
    for row_idx, track in enumerate(playlist["tracks"], start=2):
        ws.append([
            track["index"],
            track["title"],
            track["artist"],
            track["album"],
            track["duration_str"],
            track["status_text"],
            track["max_quality"],
            track["source_url"],
        ])
        ws.row_dimensions[row_idx].height = 20
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = center_align if col_idx in (1, 5, 6, 7) else left_align

    # 自动调整列宽
    col_widths = [8, 30, 24, 24, 10, 12, 12, 38]
    for col_idx, width in enumerate(col_widths, start=1):
        col_letter = chr(64 + col_idx)
        ws.column_dimensions[col_letter].width = width

    wb.save(output_path)


def export_csv(playlist, output_path):
    """导出 UTF-8 带 BOM 的 CSV，兼容 Excel 双击无乱码"""
    headers = ["序号", "歌曲名称", "歌手", "专辑", "时长", "状态", "最高音质", "酷狗链接"]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for t in playlist["tracks"]:
            writer.writerow([
                t["index"],
                t["title"],
                t["artist"],
                t["album"],
                t["duration_str"],
                t["status_text"],
                t["max_quality"],
                t["source_url"],
            ])


def format_total_duration(total_ms):
    if not total_ms or total_ms <= 0:
        return ""
    total_minutes = int(total_ms // 60000)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    if hours > 0:
        return f"{hours} 小时 {minutes} 分钟"
    return f"{minutes} 分钟"


def export_json(playlist, output_path):
    """导出 PlaylistOut Canonical 标准规范 JSON 格式"""
    tracks_out = []
    for i, t in enumerate(playlist.get("tracks") or [], 1):
        idx = int(t.get("index") or i)
        title = str(t.get("title") or "未知歌曲").strip() or "未知歌曲"
        artist = str(t.get("artist") or "未知歌手").strip() or "未知歌手"
        album = str(t.get("album") or "").strip()
        tid = str(t.get("id") or "").strip()
        isrc = str(t.get("isrc") or "").strip().upper()
        dur_ms = t.get("durationMs") if t.get("durationMs") is not None else t.get("duration_ms")
        release_date = str(t.get("releaseDate") or t.get("release_date") or "").strip()
        track_num = t.get("trackNumber") or t.get("track_number")
        disc_num = t.get("discNumber") or t.get("disc_number")
        source_url = str(t.get("sourceUrl") or t.get("source_url") or "").strip()
        if not source_url and tid:
            source_url = f"https://www.kugou.com/song/#hash={tid}"
        cover_url = str(t.get("coverUrl") or t.get("cover_url") or "").strip()
        is_vip = bool(t.get("isVip") if "isVip" in t else t.get("is_vip", False))
        is_available = bool(t.get("isAvailable") if "isAvailable" in t else t.get("is_available", True))
        status_text = str(t.get("statusText") or t.get("status_text") or "").strip()
        if not status_text:
            status_text = "下架/无版权" if not is_available else ("VIP专享" if is_vip else "正常")
        machine_status = str(t.get("status") or "").strip()
        if not machine_status:
            if not is_available or status_text == "下架/无版权":
                machine_status = "unplayable"
            elif is_vip or status_text == "VIP专享":
                machine_status = "vip"
            elif status_text == "付费专辑":
                machine_status = "paid"
            else:
                machine_status = "playable"
        max_quality = str(t.get("maxQuality") or t.get("max_quality") or "").strip()
        mv_id = str(t.get("mvId") or t.get("mv_id") or "").strip()
        mv_url = str(t.get("mvUrl") or t.get("mv_url") or "").strip()
        if mv_id and not mv_url:
            mv_url = f"https://www.kugou.com/mvweb/html/mv_{mv_id}.html"

        track_entry = {
            "index": idx,
            "title": title,
            "artist": artist,
        }
        if album and album != "未知专辑":
            track_entry["album"] = album
        if tid:
            track_entry["id"] = tid
        if isrc:
            track_entry["isrc"] = isrc
        if isinstance(dur_ms, (int, float)) and dur_ms > 0:
            track_entry["durationMs"] = int(dur_ms)
        if release_date:
            track_entry["releaseDate"] = release_date
        if isinstance(track_num, int) and track_num > 0:
            track_entry["trackNumber"] = int(track_num)
        if isinstance(disc_num, int) and disc_num > 0:
            track_entry["discNumber"] = int(disc_num)
        if source_url:
            track_entry["sourceUrl"] = source_url
        if cover_url:
            track_entry["coverUrl"] = cover_url
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text
        if max_quality:
            track_entry["maxQuality"] = max_quality
        if mv_id:
            track_entry["mvId"] = mv_id
            track_entry["mvUrl"] = mv_url

        tracks_out.append(track_entry)

    loaded_duration_ms = sum(t.get("durationMs", 0) for t in tracks_out)
    duration_str = format_total_duration(loaded_duration_ms)
    track_count = int(playlist.get("trackCount") or playlist.get("track_count") or len(tracks_out))
    is_partial = bool(playlist.get("isPartial", len(tracks_out) < track_count))

    payload = {
        "generator": "PlaylistOut",
        "generatorUrl": WEB_URL,
        "exportedFrom": "PlaylistOutCLI",
        "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "name": str(playlist.get("name") or "酷狗音乐歌单").strip() or "酷狗音乐歌单",
    }
    creator = str(playlist.get("creator") or "").strip()
    if creator:
        payload["creator"] = creator
    cover_url = str(playlist.get("coverUrl") or playlist.get("cover_url") or "").strip()
    if cover_url:
        payload["coverUrl"] = cover_url
    payload["platform"] = "kugou"
    pid = str(playlist.get("id") or "").strip()
    if pid:
        payload["id"] = pid
    source_url = str(playlist.get("sourceUrl") or playlist.get("source_url") or "").strip()
    if not source_url and pid:
        source_url = f"https://www.kugou.com/yy/special/single/{pid}.html"
    if source_url:
        payload["sourceUrl"] = source_url
    payload["trackCount"] = track_count
    payload["loadedTrackCount"] = len(tracks_out)
    payload["isPartial"] = is_partial
    if loaded_duration_ms > 0:
        if not is_partial:
            if duration_str:
                payload["totalDuration"] = duration_str
            payload["totalDurationMs"] = loaded_duration_ms
        if duration_str:
            payload["loadedDuration"] = duration_str
        payload["loadedDurationMs"] = loaded_duration_ms
    play_count = int(playlist.get("playCount") or playlist.get("play_count") or 0)
    if play_count > 0:
        payload["playCount"] = play_count
    tags = playlist.get("tags")
    if isinstance(tags, list) and len(tags) > 0:
        payload["tags"] = tags
    description = str(playlist.get("description") or "").strip()
    if description:
        payload["description"] = description
    payload["tracks"] = tracks_out

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def export_txt(playlist, output_path):
    """导出极简文本曲目清单"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"歌单名称: {playlist['name']}\n")
        f.write(f"创建者: {playlist['creator']}\n")
        f.write(f"歌曲总数: {playlist['track_count']}\n")
        f.write("-" * 50 + "\n")
        for t in playlist["tracks"]:
            f.write(f"{t['index']}. {t['title']} - {t['artist']}\n")


def export_m3u8(playlist, output_path):
    """导出 UTF-8 M3U8 播放列表"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("#EXTM3U\n")
        f.write(f"#PLAYLIST:{playlist['name']}\n\n")
        for t in playlist["tracks"]:
            secs = t["duration_ms"] // 1000 if t.get("duration_ms") else -1
            f.write(f"#EXTINF:{secs},{t['artist']} - {t['title']}\n")
            f.write(f"{t['source_url']}\n")


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


def perform_export(playlist, output_dir="output", formats=None, reveal_folder_flag=True):
    """统一导出执行函数"""
    if not playlist or not playlist.get("tracks"):
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

    os.makedirs(output_dir, exist_ok=True)
    # 统一命名：【平台】歌单名 - 作者；重名自动追加 (2)、(3)……
    base_filename = ensure_unique_base_name(
        build_export_base_name(playlist.get("name"), playlist.get("creator"), "kugou"),
        output_dir,
        resolved_formats,
    )

    exported_files = []

    print(f"\n→ 开始导出歌单《{playlist['name']}》 (共 {len(playlist['tracks'])} 首歌曲)...\n")

    for fmt in resolved_formats:
        out_file = os.path.join(output_dir, f"{base_filename}.{fmt}")
        try:
            if fmt == "xlsx":
                export_xlsx(playlist, out_file)
            elif fmt == "csv":
                export_csv(playlist, out_file)
            elif fmt == "json":
                export_json(playlist, out_file)
            elif fmt == "txt":
                export_txt(playlist, out_file)
            elif fmt == "m3u8":
                export_m3u8(playlist, out_file)
            exported_files.append(out_file)
            print(f"  ✓ {fmt.upper():<5} -> {os.path.abspath(out_file)}")
        except Exception as e:
            print(f"  × {fmt.upper():<5} 失败: {e}")

    print(f"\n[🎉] 导出完成！共 {len(playlist['tracks'])} 首歌曲，已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder_flag:
        reveal_folder(exported_files[0])
    return exported_files


def _fetch_kugou_playlist_by_target(target, cli_token=None, cli_userid=None, allow_interactive=False):
    target_type = target["type"]
    target_id = target["id"]
    print(f"→ 成功识别目标类型: {target_type.upper()}, ID: {target_id}")

    playlist = None

    # 1. 官方精选歌单
    if target_type == "special":
        playlist = fetch_special_playlist(target_id, target["original_url"])

    # 2. 概念版集合歌单
    elif target_type == "collection":
        playlist = fetch_collection_playlist(target_id, target.get("specialid", 0), target["original_url"])

    # 3. H5 分享页歌单
    elif target_type == "songlist":
        playlist = fetch_songlist_h5(target_id, target["original_url"])

    # 4. 个人云端歌单 (Cloudlist)
    elif target_type == "cloudlist":
        token = cli_token
        userid = cli_userid

        if not token or not userid:
            saved_token, saved_userid, _ = load_auth_credentials()
            token = token or saved_token
            userid = userid or saved_userid

        if not token or not userid:
            if allow_interactive:
                print("\n! 提示：您正在导出个人自建歌单 (Cloudlist)，该歌单需要酷狗登录凭证。")
                token, userid = interactive_login_menu()
                if not token or not userid:
                    print("! 未获取到有效凭证，无法导出个人自建歌单。")
                    return None
            else:
                print("× 导出酷狗个人自建歌单 (Cloudlist) 需要登录凭证。请先运行 `PlaylistOut -p kugou --login` 或通过 `--token` 与 `--userid` 传入凭证。", file=sys.stderr)
                return None

        try:
            playlist = fetch_cloudlist_playlist(target_id, token, userid, target["original_url"])
        except PermissionError as pe:
            print(f"\n! 凭证认证失败: {pe}", file=sys.stderr)
            if allow_interactive:
                print("→ 正在引导重新登录...")
                token, userid = interactive_login_menu()
                if token and userid:
                    playlist = fetch_cloudlist_playlist(target_id, token, userid, target["original_url"])
                else:
                    return None
            else:
                return None

    return playlist


# ----------------- 主程序执行 -----------------

def main():
    parser = argparse.ArgumentParser(
        description="酷狗音乐歌单导出工具 (PlaylistOut Kugou Exporter)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
支持链接类型：
  1. 酷狗官方精选/专题歌单: https://www.kugou.com/yy/special/single/546903.html (免登录限前10首，必须登录完整导出)
  2. 移动端分享页短链: https://t1.kugou.com/xxx (普通版免登限前10首，概念版免登全量)
  3. 移动端分享页 H5: https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/ (免登限前10首)
  4. 个人自建歌单 (Cloudlist/我喜欢): listid=4 或 纯数字歌单ID (需要登录凭证)
  5. 酷狗概念版集合歌单: global_specialid=collection_3_1504683618_2_0 (100%免登录全量抓取)

登录认证方式（支持永久本地保存）：
  方式一：终端扫码登录 (运行 --login 选择 [1]，生成二维码图片扫码即可)
  方式二：官网/抓包凭证 (运行 --login 选择 [2]，或通过 --token/--userid 传入)
        """
    )

    parser.add_argument("input", nargs="?", help="歌单链接、短链或歌单ID")
    parser.add_argument("-i", "--id", dest="opt_id", help="歌单链接或歌单ID")
    parser.add_argument("-o", "--output-dir", default="output", help="导出目录 (默认: output)")
    parser.add_argument(
        "-f", "--format",
        default="all",
        help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (逗号分隔，默认: all)",
    )
    parser.add_argument("--login", action="store_true", help="调出交互式登录菜单，配置并永久保存凭证")
    parser.add_argument("--logout", action="store_true", help="清除本地永久保存的酷狗登录凭证")
    parser.add_argument("--token", help="临时或手动指定酷狗 Token")
    parser.add_argument("--userid", help="临时或手动指定酷狗 UserID")
    parser.add_argument("--save-auth", action="store_true", help="将本次传入的 --token 和 --userid 永久保存到本地")
    parser.add_argument("--no-open", action="store_true", help="不自动打开导出文件夹或二维码图片")

    args = parser.parse_args()

    # 处理凭证清除
    if args.logout:
        clear_auth_credentials()
        return

    # 处理手动保存凭证
    if args.save_auth and args.token and args.userid:
        save_auth_credentials(args.token, args.userid, source="manual")
        print("✓ 凭证已保存。")
        if not args.input and not args.opt_id:
            return

    # 处理显式 --login 流程
    if args.login:
        interactive_login_menu()
        if not args.input and not args.opt_id:
            return

    raw_input = args.opt_id or args.input
    output_dir = args.output_dir if args.output_dir else "output"

    if raw_input:
        target = extract_kugou_target(raw_input)
        if not target:
            print("错误: 无法识别输入的酷狗链接或歌单 ID，请检查输入格式。", file=sys.stderr)
            sys.exit(1)

        playlist = _fetch_kugou_playlist_by_target(target, cli_token=args.token, cli_userid=args.userid, allow_interactive=False)
        if not playlist or not playlist.get("tracks"):
            print("错误: 未能获取到任何有效歌曲数据。", file=sys.stderr)
            sys.exit(1)

        formats = [x.strip() for x in args.format.split(",")]
        perform_export(playlist, output_dir=output_dir, formats=formats, reveal_folder_flag=not args.no_open)
        return

    # 交互模式
    print_banner("酷狗音乐")
    print("\n支持：官方精选歌单 / 个人自建歌单 / H5分享短链 / 概念版集合歌单")
    token, userid, _ = load_auth_credentials()
    if token and userid:
        print(f"→ 检测到已保存的酷狗登录凭证 (UserID: {userid})")
    else:
        print("→ 当前未保存登录凭证 (普通歌单免登限前10首预览，完整导出需输入 login 登录；概念版免登全量)")

    try:
        while True:
            user_input = input("\n请输入链接或 ID（输入 login 配置登录，输入 0 退出）：").strip()
            print("=" * 64)
            if not user_input or user_input in ("0", "q", "quit", "exit"):
                print_exit_banner()
                break

            if user_input.lower() == "login":
                interactive_login_menu()
                continue

            target = extract_kugou_target(user_input)
            if not target:
                print("× 无法识别输入的酷狗链接或歌单 ID，请检查输入格式！")
                print("=" * 64)
                continue

            playlist = _fetch_kugou_playlist_by_target(target, cli_token=args.token, cli_userid=args.userid, allow_interactive=True)
            if not playlist or not playlist.get("tracks"):
                print("× 未能获取到任何有效歌曲数据，请检查歌单是否有效或重试。")
                print("=" * 64)
                continue

            tracks = playlist.get("tracks", [])
            unavail = sum(1 for t in tracks if t.get("status_text") == "下架/无版权")
            vip_cnt = sum(1 for t in tracks if t.get("status_text") == "VIP专享")
            print(f"\n歌单：{playlist['name']}（作者：{playlist.get('creator', '酷狗用户')}，共 {len(tracks)} 首）")
            print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

            print_format_menu()
            fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
            print("=" * 64)
            sel_formats = resolve_export_formats(fmt_input)

            perform_export(playlist, output_dir=output_dir, formats=sel_formats, reveal_folder_flag=not args.no_open)
    except (KeyboardInterrupt, EOFError):
        print_exit_banner()


if __name__ == "__main__":
    main()

