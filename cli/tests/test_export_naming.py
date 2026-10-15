# -*- coding: utf-8 -*-
"""
统一导出命名规范测试
====================
覆盖：``【平台】歌单名 - 作者.ext`` 基准名、未知平台回退、重名 `` (2)`` 递增，
以及命名映射与各平台 adapter.display_name 的一致性。
"""

import os

from cli.core.exporter import perform_export
from cli.core.models import NormalizedPlaylist, NormalizedTrack
from cli.core.naming import (
    PLATFORM_DISPLAY_NAMES,
    build_export_base_name,
    ensure_unique_base_name,
    get_platform_display_name,
)


def test_platform_display_names_match_adapters():
    """命名映射必须与各平台 adapter.display_name 保持一致，防止两边漂移。"""
    from cli.platforms.registry import PlatformRegistry

    adapters = {a.platform_id: a.display_name for a in PlatformRegistry.list_all()}
    for platform_id, display_name in PLATFORM_DISPLAY_NAMES.items():
        if platform_id in adapters:
            assert adapters[platform_id] == display_name, platform_id


def test_build_export_base_name_with_creator():
    assert build_export_base_name("夜曲精选", "周杰伦", "qqmusic") == "【QQ 音乐】夜曲精选 - 周杰伦"
    assert build_export_base_name("华语精选", "音乐研究所", "netease") == "【网易云音乐】华语精选 - 音乐研究所"


def test_build_export_base_name_without_creator():
    assert build_export_base_name("酷狗热歌", None, "kugou") == "【酷狗音乐】酷狗热歌"
    assert build_export_base_name("酷我榜单", "", "kuwo") == "【酷我音乐】酷我榜单"


def test_build_export_base_name_fallbacks():
    # 未知平台回退为通用名称
    assert build_export_base_name("测试歌单", None, "xiami") == "【音乐平台】测试歌单"
    # 空名称回退为 playlist
    assert build_export_base_name("", None, "qishui") == "【汽水音乐】playlist"
    # 完全非法的作者不会污染文件名
    assert build_export_base_name("歌单", "///", "qishui") == "【汽水音乐】歌单"


def test_get_platform_display_name():
    assert get_platform_display_name("QQMusic") == "QQ 音乐"
    assert get_platform_display_name("qishui") == "汽水音乐"
    assert get_platform_display_name(None) == "音乐平台"


def test_ensure_unique_base_name_disk_and_reserved(tmp_path):
    out_dir = str(tmp_path)
    reserved = set()

    assert ensure_unique_base_name("歌单", out_dir, ["json"], reserved) == "歌单"

    # 磁盘已存在同名文件 → (2)
    (tmp_path / "歌单.json").write_text("{}", encoding="utf-8")
    assert ensure_unique_base_name("歌单", out_dir, ["json"], reserved) == "歌单 (2)"

    # 批次集合占用 → 继续递增
    assert ensure_unique_base_name("歌单", out_dir, ["json"], reserved) == "歌单 (3)"


def test_perform_export_unified_name_and_no_overwrite(tmp_path):
    playlist = NormalizedPlaylist(
        platform="qqmusic",
        id="7011264340",
        name="测试歌单",
        creator="某作者",
        tracks=[NormalizedTrack(index=1, title="晴天", artist="周杰伦")],
    )
    out_dir = str(tmp_path / "output")

    first = perform_export(
        playlist, output_dir=out_dir, formats=["json"], reveal_folder_flag=False
    )
    assert os.path.basename(first[0]) == "【QQ 音乐】测试歌单 - 某作者.json"

    second = perform_export(
        playlist, output_dir=out_dir, formats=["json"], reveal_folder_flag=False
    )
    assert os.path.basename(second[0]) == "【QQ 音乐】测试歌单 - 某作者 (2).json"
