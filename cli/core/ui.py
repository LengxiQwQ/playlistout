# -*- coding: utf-8 -*-
"""
PlaylistOut UI & Terminal Components
====================================
Branding, ANSI banners, OSC-8 terminal hyperlinks, format menus, and cross-platform folder opener.
"""

import os
import re
import sys
import platform
import subprocess
from typing import List

REPO_URL = "https://github.com/LengxiQwQ/playlistout"
AUTHOR_URL = "https://github.com/LengxiQwQ"
WEB_URL = "https://playlistout.lengxiqwq.com"
AUTHOR_NAME = "LengxiQwQ"


def terminal_link(url: str, text: str = None) -> str:
    """生成终端可点击超链接 (支持 OSC 8 协议)"""
    label = text if text else url
    return f"\033]8;;{url}\033\\{label}\033]8;;\033\\"


def sanitize_filename(name: str) -> str:
    """过滤文件名中的非法字符"""
    if not name:
        return "playlist"
    cleaned = re.sub(r'[\\/:*?"<>|]', '_', str(name))
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned or "playlist"


def _terminal_display_width(text: str) -> int:
    """计算终端显示宽度，保证中英文混排的平台名称视觉对齐。"""
    import unicodedata
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in str(text))


def _pad_terminal_text(text: str, width: int) -> str:
    """按终端显示宽度补空格。"""
    text = str(text)
    return text + " " * max(0, width - _terminal_display_width(text))


def print_divider(width: int = 64):
    """打印横线分隔符 (默认 64 字符宽度，上下各留空一行)。"""
    print()
    print("─" * width)
    print()


def print_banner(platform_name: str = None):
    """统一 CLI 品牌头部。"""
    author_link = terminal_link(AUTHOR_URL, f"作者：{AUTHOR_NAME}")
    repo_link = terminal_link(REPO_URL, "GitHub 开源仓库")
    web_link = terminal_link(WEB_URL, "在线网页版")

    if platform_name:
        title = f"Playlist Out CLI - {platform_name} 歌单导出工具"
    else:
        title = "Playlist Out CLI · 把你的歌单带走"

    print(title)
    print("")
    print("你的歌单，不应该只困在一个音乐平台里。")
    print("解析、导出，并把歌单继续带进支持的开源播放器。")
    print("")
    print(f"{author_link} · {repo_link} · {web_link}")
    print_divider()


def print_main_menu(platforms: list):
    """主菜单界面：平台入口 + 最简使用提示。"""
    for idx, p in enumerate(platforms, 1):
        name = _pad_terminal_text(p["name"], 12)
        print(f"  {idx}  {name}{p['desc']}")
    print("")
    print("直接粘贴链接或分享文案即可自动识别平台。")
    print("只有歌单 ID？先输入平台编号。")
    print("")


def print_format_menu():
    """统一导出格式菜单：描述用途，不暴露实现细节"""
    print("\n导出格式")
    print("  1  Excel (.xlsx)  适合查看、整理和备份")
    print("  2  JSON  (.json)  适合第三方工具和程序导入")
    print("  3  CSV   (.csv)   适合表格软件和迁移工具")
    print("  4  TXT   (.txt)   简单的歌曲清单")
    print("  5  M3U8  (.m3u8)  通用播放列表")
    print("\n  Enter  全部导出")
    print("  0      返回\n")


def resolve_export_formats(choice: str) -> List[str]:
    """解析导出格式；空输入/all 代表全部，0 代表返回。兼容 (1, 2) 等带括号输入。"""
    choice = str(choice or "").strip().lower()
    # 兼容用户输入的各种括号 (中英文小括号、方括号等)
    choice = re.sub(r'[()（）\[\]]', '', choice).strip()
    all_formats = ["xlsx", "json", "csv", "txt", "m3u8"]
    if not choice or choice == "all":
        return all_formats
    if choice == "0":
        return []

    mapping = {
        "1": "xlsx", "xlsx": "xlsx", "excel": "xlsx",
        "2": "json", "json": "json",
        "3": "csv", "csv": "csv",
        "4": "txt", "txt": "txt",
        "5": "m3u8", "m3u8": "m3u8",
    }
    items = [x.strip() for x in choice.replace("，", ",").replace(" ", ",").split(",") if x.strip()]
    res = []
    for item in items:
        if item == "all":
            return all_formats
        if item == "0":
            return []
        if item in mapping and mapping[item] not in res:
            res.append(mapping[item])
    return res if res else all_formats


def reveal_folder(target_path: str):
    """跨平台非阻塞打开输出文件夹或在资源管理器中定位文件"""
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
    """退出提示"""
    github_link = terminal_link(REPO_URL, "GitHub")
    print_divider()
    print(f"感谢使用！欢迎在 {github_link} 给个 Star ⭐️")
    print("Playlist Out - Paste. Parse. Export.")
    print()
