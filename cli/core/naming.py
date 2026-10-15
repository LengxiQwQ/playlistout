# -*- coding: utf-8 -*-
"""
PlaylistOut Unified Export Naming
=================================
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
}

DEFAULT_PLATFORM_NAME = "音乐平台"
DEFAULT_FORMATS = ["xlsx", "json", "csv", "txt", "m3u8"]


def get_platform_display_name(platform: Optional[str]) -> str:
    """返回平台的用户可见名称，未知平台回退为通用名称。"""
    return PLATFORM_DISPLAY_NAMES.get((platform or "").strip().lower(), DEFAULT_PLATFORM_NAME)


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
) -> str:
    """
    防覆盖基准名：若同一批次已占用或目标目录中已存在同名文件，
    依次追加 Windows 风格后缀 `` (2)``、`` (3)`` ……，绝不静默覆盖。
    """
    formats = list(formats) if formats else list(DEFAULT_FORMATS)
    safe_base = sanitize_filename(base_name) or "playlist"

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
