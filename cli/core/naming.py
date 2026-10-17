# -*- coding: utf-8 -*-
"""
Playlist Out CLI Unified Export Naming
======================================
Single source of truth for exported file names across the unified CLI and the
legacy per-vendor scripts:

    单歌单：  【平台】歌单名 - 作者.ext
    重名时：  【平台】歌单名 - 作者 (2).ext、（3）……

The platform display names must stay in sync with each adapter's ``display_name``
(``cli/platforms/<id>.py``); ``cli/tests/test_export_naming.py`` enforces this.
"""

import os
import re
from typing import Iterable, List, Optional, Set

from .ui import sanitize_filename

# 与 cli/platforms/<id>.py 的 adapter.display_name 保持一致（测试会校验）
PLATFORM_DISPLAY_NAMES = {
    "qqmusic": "QQ 音乐",
    "netease": "网易云音乐",
    "kugou": "酷狗音乐",
    "kuwo": "酷我音乐",
    "qishui": "汽水音乐",
    "migu": "咪咕音乐",
}

DEFAULT_PLATFORM_NAME = "音乐平台"
DEFAULT_FORMATS = ["xlsx", "json", "csv", "txt", "m3u8"]

# Windows MAX_PATH（260）的安全预算：为冲突后缀 (2)、(3)… 与系统保留留出余量
MAX_TOTAL_PATH_LENGTH = 240


def get_platform_display_name(platform: Optional[str]) -> str:
    """返回平台的用户可见名称，未知平台回退为通用名称。"""
    return PLATFORM_DISPLAY_NAMES.get((platform or "").strip().lower(), DEFAULT_PLATFORM_NAME)


def fit_base_name_to_path_budget(
    base_name: str,
    output_dir: str,
    formats: Optional[List[str]] = None,
    max_path_length: int = MAX_TOTAL_PATH_LENGTH,
) -> str:
    """
    MAX_PATH 总路径预算守卫：确保「输出目录绝对路径 + 文件名 + 最长扩展名」不超预算。

    - 目录较浅时原样返回；目录较深时仅收缩主文件名尾部。
    - 平台前缀（【平台】）位于文件名最前，截断时不会丢失来源信息。
    - 目录本身已接近/超过预算时尽力而为（至少保留 1 个字符）。
    - 为可能的冲突后缀 `` (2)`` 预留空间，追加后缀后仍不越界。
    """
    formats = list(formats) if formats else list(DEFAULT_FORMATS)
    longest_ext = max((len(f".{fmt}") for fmt in formats), default=len(".xlsx"))
    collision_reserve = len(" (2)")
    budget = (
        max_path_length
        - len(os.path.abspath(output_dir))
        - len(os.sep)
        - longest_ext
        - collision_reserve
    )
    if len(base_name) <= max(budget, 0):
        return base_name
    if budget <= 0:
        return base_name[:1] or "playlist"
    return base_name[:budget].rstrip(" .") or "playlist"


def _clean_component(value: Optional[str]) -> str:
    """清洗单个名称片段；完全非法或为空时返回空字符串（不会污染为 'playlist'）。"""
    if not value:
        return ""
    if not re.sub(r'[\\/:*?"<>|\s\x00-\x1f\x7f]+', '', str(value)):
        return ""
    return sanitize_filename(str(value))


def build_export_base_name(
    name: Optional[str],
    creator: Optional[str] = None,
    platform: Optional[str] = None,
) -> str:
    """
    构建统一导出基准名：``【平台】歌单名 - 作者``（无作者时省略 `` - 作者``）。
    平台前缀放在最前方，确保文件名因长度截断时永远不会丢失来源信息。
    """
    safe_name = _clean_component(name) or "playlist"
    safe_creator = _clean_component(creator)
    stem = f"{safe_name} - {safe_creator}" if safe_creator else safe_name
    return sanitize_filename(f"【{get_platform_display_name(platform)}】{stem}")


def _base_name_taken(base_name: str, output_dir: str, formats: Iterable[str]) -> bool:
    for fmt in formats:
        if os.path.exists(os.path.join(output_dir, f"{base_name}.{fmt}")):
            return True
    return False


def ensure_unique_base_name(
    base_name: str,
    output_dir: str,
    formats: Optional[List[str]] = None,
    reserved: Optional[Set[str]] = None,
    max_path_length: int = MAX_TOTAL_PATH_LENGTH,
) -> str:
    """
    防覆盖基准名：若同一批次已占用或目标目录中已存在同名文件，
    依次追加 Windows 风格后缀 `` (2)``、`` (3)`` ……，绝不静默覆盖。
    同时执行 MAX_PATH 总路径预算守卫（见 ``fit_base_name_to_path_budget``）。
    """
    formats = list(formats) if formats else list(DEFAULT_FORMATS)
    safe_base = sanitize_filename(base_name) or "playlist"
    safe_base = fit_base_name_to_path_budget(safe_base, output_dir, formats, max_path_length)

    candidate = safe_base
    counter = 2
    while (reserved is not None and candidate in reserved) or _base_name_taken(
        candidate, output_dir, formats
    ):
        candidate = f"{safe_base} ({counter})"
        counter += 1

    if reserved is not None:
        reserved.add(candidate)
    return candidate
