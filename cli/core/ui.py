# -*- coding: utf-8 -*-
"""
Playlist Out CLI UI & Terminal Components
=========================================
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


WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}


def sanitize_filename(name: str, max_length: int = 150) -> str:
    """
    过滤文件名中的非法字符，并遵守 Windows 文件名规范：
    1. 过滤保留字符: \\ / : * ? " < > |
    2. 过滤 ASCII 控制字符 (0x00-0x1F, 0x7F)
    3. 剥离尾部空格与句点 (. )
    4. 截断超长文件名至 max_length (默认 150 字符)
    5. Windows 保留设备名称避让 (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    6. 空标题安全兜底为 'playlist'
    """
    if not name:
        return "playlist"

    # 1. 过滤控制字符与非法字符
    cleaned = re.sub(r'[\x00-\x1f\x7f]', '', str(name))
    cleaned = re.sub(r'[\\/:*?"<>|]', '_', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # 2. 剥离尾部点与空格 (Windows 不支持尾部点或空格)
    cleaned = cleaned.rstrip('. ')

    # 3. 限制文件名长度
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip('. ')

    # 4. 空名兜底
    if not cleaned:
        return "playlist"

    # 5. Windows 保留名称避让 (如 CON -> _CON)
    base_stem = cleaned.split('.')[0].strip().upper()
    if base_stem in WINDOWS_RESERVED_NAMES or cleaned.upper() in WINDOWS_RESERVED_NAMES:
        cleaned = f"_{cleaned}"

    return cleaned


_COLOR_ENABLED_OVERRIDE = None


def set_color_enabled(enabled):
    """
    显式设置或重置终端颜色启用状态。
    当处于命令行参数脚本运行模式时，设置为 False，彻底杜绝任何 ANSI 颜色码输出。
    """
    global _COLOR_ENABLED_OVERRIDE
    _COLOR_ENABLED_OVERRIDE = enabled


def is_color_enabled() -> bool:
    """获取当前是否启用彩色输出。"""
    return supports_color()


def supports_color() -> bool:
    """检测当前输出环境是否支持/启用 ANSI 彩色转义码。"""
    if os.environ.get("NO_COLOR") or os.environ.get("PLAYLISTOUT_NO_COLOR"):
        return False
    if os.environ.get("FORCE_COLOR") or os.environ.get("PLAYLISTOUT_FORCE_COLOR"):
        return True
    if _COLOR_ENABLED_OVERRIDE is False:
        return False
    if _COLOR_ENABLED_OVERRIDE is True:
        return True
    return bool(sys.stdout and hasattr(sys.stdout, "isatty") and sys.stdout.isatty())


def color_cyan(text: str) -> str:
    """青色加粗文本，用于各级标题、识别成功的平台与操作提示"""
    if supports_color():
        return f"\033[1;36m{text}\033[0m"
    return text


def color_amber(text: str) -> str:
    """暖橙黄色加粗文本，用于品牌软件名称"""
    if supports_color():
        return f"\033[1;33m{text}\033[0m"
    return text


def color_green(text: str) -> str:
    """绿色加粗文本，用于成功、完成、正常状态"""
    if supports_color():
        return f"\033[1;32m{text}\033[0m"
    return text


def color_yellow(text: str) -> str:
    """黄色加粗文本，用于 VIP 提示、警示、部分加载"""
    if supports_color():
        return f"\033[1;33m{text}\033[0m"
    return text


def color_red(text: str) -> str:
    """红色加粗文本，用于无版权/下架、失败、错误"""
    if supports_color():
        return f"\033[1;31m{text}\033[0m"
    return text


def color_bold(text: str) -> str:
    """加粗亮白文本，用于菜单选项序号"""
    if supports_color():
        return f"\033[1m{text}\033[0m"
    return text


def color_blue(text: str) -> str:
    """蓝色加粗文本，用于酷狗音乐品牌色"""
    if supports_color():
        return f"\033[1;34m{text}\033[0m"
    return text


def color_magenta(text: str) -> str:
    """洋红/桃粉加粗文本，用于咪咕音乐品牌色"""
    if supports_color():
        return f"\033[1;35m{text}\033[0m"
    return text


def get_platform_brand_color(platform_id: str = None, text: str = "") -> str:
    """
    根据平台 ID 或别名返回带品牌专属主题色的文本 (无色彩环境原样返回)。
    - 网易云音乐 (netease / 163 / wyy): 红色 (Bold Red)
    - QQ 音乐 (qqmusic / qq): 绿色 (Bold Green)
    - 酷狗音乐 (kugou / kg): 蓝色 (Bold Blue)
    - 酷我音乐 (kuwo / kw): 黄色 (Bold Yellow)
    - 汽水音乐 (qishui / qs / douyin): 青色 (Bold Cyan)
    - 咪咕音乐 (migu / mg): 品红/桃粉 (Bold Magenta)
    """
    if not supports_color() or not platform_id or not text:
        return text

    pid = str(platform_id).strip().lower()
    if pid in ("netease", "163", "wyy"):
        return color_red(text)
    elif pid in ("qqmusic", "qq"):
        return color_green(text)
    elif pid in ("kugou", "kg"):
        return color_blue(text)
    elif pid in ("kuwo", "kw"):
        return color_yellow(text)
    elif pid in ("qishui", "qs", "douyin"):
        return color_cyan(text)
    elif pid in ("migu", "mg"):
        return color_magenta(text)
    return text


def format_title(title: str, emoji: str = "📌") -> str:
    """统一格式化区块标题 (支持情境 Emoji 与青色高亮)"""
    raw_title = f"{emoji} {title}" if emoji else title
    return color_cyan(raw_title)


def print_title(title: str, subtitle: str = None, emoji: str = "📌"):
    """
    统一打印区块标题组件。
    前导零多余空行 (由上层分隔符或输入回车提供)，后随可选副标题。
    """
    print(format_title(title, emoji=emoji))
    if subtitle:
        print(f"  {subtitle}")


def prompt_input(prompt_text: str = "", divider_after: bool = True, divider_on_empty: bool = False) -> str:
    """
    统一交互式输入：
    1. 提示语文本独占一行；
    2. 用户在下一行 '> ' 处输入内容；
    3. 用户按回车后，自动打印严格规范的分隔符 (上下各空一行)；
    4. 默认若输入为空不打印分隔符；若 divider_on_empty=True (例如回车选用默认选项) 则回车依然触发标准分隔符。
    """
    if prompt_text:
        clean_prompt = prompt_text.strip()
        if not clean_prompt.endswith("：") and not clean_prompt.endswith(":"):
            clean_prompt = f"{clean_prompt}："
        elif clean_prompt.endswith(":"):
            clean_prompt = clean_prompt[:-1] + "："
        print(clean_prompt)

    prompt_symbol = color_cyan("> ") if supports_color() else "> "
    val = input(prompt_symbol).strip()
    if divider_after and (val or divider_on_empty):
        print_divider()
    return val



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

    # 使用暖橙色加粗渲染软件名称 (非交互模式无色彩)
    print(color_amber(title))
    print("")
    print("你的歌单，不应该只困在一个音乐平台里。")
    print("解析、导出，并把歌单继续带进支持的开源播放器。")
    print("")
    print(f"{author_link} · {repo_link} · {web_link}")
    print_divider()


def print_main_menu(platforms: list):
    """主菜单界面：平台入口 + 最简使用提示。"""
    for idx, p in enumerate(platforms, 1):
        num_str = color_bold(str(idx)) if supports_color() else str(idx)
        raw_name = p.get("name", "")
        pad_spaces = " " * max(0, 12 - _terminal_display_width(raw_name))
        colored_name = get_platform_brand_color(p.get("id"), raw_name)
        print(f"  {num_str}  {colored_name}{pad_spaces}{p.get('desc', '')}")
    print("")
    print("💡 直接粘贴链接或分享文案即可自动识别平台。")
    print("💡 只有歌单 ID？先输入平台编号。")
    print("")


def print_format_menu():
    """统一导出格式菜单：描述用途，不暴露实现细节"""
    print_title("导出格式", emoji="📦")
    k1 = color_bold("1") if supports_color() else "1"
    k2 = color_bold("2") if supports_color() else "2"
    k3 = color_bold("3") if supports_color() else "3"
    k4 = color_bold("4") if supports_color() else "4"
    k5 = color_bold("5") if supports_color() else "5"
    k_enter = color_bold("Enter") if supports_color() else "Enter"
    k0 = color_bold("0") if supports_color() else "0"

    print(f"  {k1}  Excel (.xlsx)  适合查看、整理和备份")
    print(f"  {k2}  JSON  (.json)  适合第三方工具和程序导入")
    print(f"  {k3}  CSV   (.csv)   适合表格软件和迁移工具")
    print(f"  {k4}  TXT   (.txt)   简单的歌曲清单")
    print(f"  {k5}  M3U8  (.m3u8)  通用播放列表")
    print("")
    print(f"  {k_enter}  全部导出")
    print(f"  {k0}      返回")
    print("")


def resolve_export_formats(choice: str, strict: bool = False) -> List[str]:
    """
    解析导出格式。空输入/all 代表全部，0 代表返回/取消。兼容 (1, 2) 等带括号输入。
    strict=True 时遇到未知格式或无效输入抛出 ValueError。
    """
    choice = str(choice or "").strip().lower()
    # 兼容用户输入的各种括号 (中英文小括号、方括号等)
    choice = re.sub(r'[()（）\[\]]', '', choice).strip()
    all_formats = ["xlsx", "json", "csv", "txt", "m3u8"]
    if not choice or choice in ("all", "全部"):
        return all_formats
    if choice == "0":
        if strict:
            raise ValueError("导出格式 '0' 仅用于交互菜单返回，命令行模式请指定具体格式或留空 (默认全部)")
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
        if item in ("all", "全部"):
            return all_formats
        if item == "0":
            if strict:
                raise ValueError("导出格式 '0' 仅用于交互菜单返回，命令行模式请指定具体格式或留空 (默认全部)")
            return []
        if item in mapping:
            fmt = mapping[item]
            if fmt not in res:
                res.append(fmt)
        else:
            if strict:
                raise ValueError(f"不支持的导出格式 '{item}'。有效格式: 1~5 或 xlsx, json, csv, txt, m3u8, all")
            return []
    return res if res else ([] if strict else all_formats)


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


_EXIT_BANNER_PRINTED = False


def reset_exit_banner_state():
    """重置退出横幅打印标记 (测试专用)"""
    global _EXIT_BANNER_PRINTED
    _EXIT_BANNER_PRINTED = False


def print_exit_banner(include_divider: bool = True, force: bool = False):
    """退出提示 (幂等保障，单次进程运行中严格只输出一次)"""
    global _EXIT_BANNER_PRINTED
    if _EXIT_BANNER_PRINTED and not force:
        return
    _EXIT_BANNER_PRINTED = True

    github_link = terminal_link(REPO_URL, "GitHub")
    if include_divider:
        print_divider()
    print(f"感谢使用！欢迎在 {github_link} 点个 Star ⭐️")
    print("Playlist Out - Paste. Parse. Export.")
    print()
