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


def print_banner(platform_name: str = None):
    """统一线框引导 UI - 头部 Banner"""
    author_link = terminal_link(AUTHOR_URL, f"作者: {AUTHOR_NAME}")
    repo_link = terminal_link(REPO_URL, "GitHub 开源仓库")
    web_link = terminal_link(WEB_URL, "在线网页版")
    
    if platform_name:
        title = f"Playlist Out - {platform_name} 歌单导出工具"
    else:
        title = "Playlist Out - 全平台音乐歌单导出工具"

    print("=" * 64)
    print(f"           {title}")
    print("")
    print(f"  {author_link} · {repo_link} · {web_link}")
    print("")
    print("  核心特性: 100% 本地隐私安全 · 全平台智能识别 · 全格式备份导出")
    print("=" * 64)


def print_main_menu(platforms: list):
    """主菜单界面，列出支持平台并展示双轨使用提示"""
    print("\n当前已接入平台与特性：")
    for idx, p in enumerate(platforms, 1):
        print(f"  [{idx}] {p['name']:<10} - {p['desc']}")
    print("\n💡 使用提示：")
    print("  • 直接粘贴【任何平台的歌单链接、短链或分享文案】，系统将自动识别并解析！")
    print("  • 也可以直接输入平台序号 [1-5] 锁定平台，再粘贴链接或纯数字歌单 ID。")
    print("  • 输入 0 或 q 退出程序。\n")


def print_format_menu():
    """统一线框引导 UI - 导出格式选择菜单"""
    print("\n请选择导出文件格式：")
    print("  [1] .xlsx  - Excel 表格文件 (排版美化)")
    print("  [2] .csv   - 标准 CSV 表格 (带 UTF-8 BOM)")
    print("  [3] .json  - Canonical JSON 标准格式")
    print("  [4] .txt   - 纯文本歌单清单")
    print("  [5] .m3u8  - 通用播放列表 (M3U8)")
    print("  [0] 全部导出 (默认，直接回车即可)\n")


def resolve_export_formats(choice: str) -> List[str]:
    """
    根据用户输入解析导出格式：
    支持单个 (1~5 / xlsx), 逗号分隔 (1,2 / xlsx,csv), 0 或空代表全部导出。
    """
    choice = str(choice or "").strip().lower()
    if not choice or choice in ("0", "all"):
        return ["xlsx", "csv", "json", "txt", "m3u8"]

    mapping = {
        "1": "xlsx",
        "xlsx": "xlsx",
        "excel": "xlsx",
        "2": "csv",
        "csv": "csv",
        "3": "json",
        "json": "json",
        "4": "txt",
        "txt": "txt",
        "5": "m3u8",
        "m3u8": "m3u8",
    }

    items = [x.strip() for x in choice.replace("，", ",").replace(" ", ",").split(",") if x.strip()]
    res = []
    for item in items:
        if item in ("0", "all"):
            return ["xlsx", "csv", "json", "txt", "m3u8"]
        if item in mapping and mapping[item] not in res:
            res.append(mapping[item])

    return res if res else ["xlsx", "csv", "json", "txt", "m3u8"]


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
    print("\n" + "=" * 64)
    print("  感谢使用 Playlist Out，保护你的数字音乐资产！再见。")
    print("=" * 64)
