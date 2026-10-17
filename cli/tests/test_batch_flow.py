# -*- coding: utf-8 -*-
"""
Tests for Phase 3: Unified Batch Playlist Export Flow
=====================================================
Verifies selection parsing, collision-safe naming, preprocessing,
headless batch execution, format propagation, and error tolerance.
"""

import os
from unittest.mock import MagicMock, patch
import pytest

from cli.core.models import NormalizedPlaylist, NormalizedTrack, NormalizedUserPlaylists, UserPlaylistSummary
from cli.core.batch import (
    parse_playlist_selection,
    resolve_collision_safe_base_name,
    preprocess_playlist,
    run_batch_flow,
    BatchResult,
)


def test_parse_playlist_selection():
    """验证多种选歌单语法解析 (all, 单选, 多选, 范围, 符号容错)"""
    # 1. all
    assert parse_playlist_selection("all", 5) == [1, 2, 3, 4, 5]
    assert parse_playlist_selection("全部", 3) == [1, 2, 3]
    assert parse_playlist_selection("*", 4) == [1, 2, 3, 4]

    # 2. 取消/返回
    assert parse_playlist_selection("0", 5) == []
    assert parse_playlist_selection("", 5) == []
    assert parse_playlist_selection("q", 5) == []

    # 3. 单选
    assert parse_playlist_selection("3", 5) == [3]

    # 4. 逗号分隔 (支持中英文逗号与空格)
    assert parse_playlist_selection("1, 3, 5", 5) == [1, 3, 5]
    assert parse_playlist_selection("1，2，4", 5) == [1, 2, 4]

    # 5. 范围语法 (1-3, 2~4)
    assert parse_playlist_selection("1-3", 5) == [1, 2, 3]
    assert parse_playlist_selection("2~4", 5) == [2, 3, 4]
    assert parse_playlist_selection("1-2, 4-5", 5) == [1, 2, 4, 5]

    # 6. 超限与去重
    assert parse_playlist_selection("1, 2, 2, 99", 5) == [1, 2]


def test_resolve_collision_safe_base_name(tmp_path):
    """验证同名歌单碰撞保护，避免静默覆盖"""
    existing_names = set()
    out_dir = str(tmp_path)

    # 1. 首次出现：纯净原名
    name1 = resolve_collision_safe_base_name("我的精选", existing_names, out_dir)
    assert name1 == "我的精选"
    assert "我的精选" in existing_names

    # 2. 批次内同名歌单：追加 (2) 消除歧义
    name2 = resolve_collision_safe_base_name("我的精选", existing_names, out_dir)
    assert name2 == "我的精选 (2)"
    assert "我的精选 (2)" in existing_names

    # 3. 磁盘已有文件冲突保护
    disk_file = tmp_path / "流行榜单.json"
    disk_file.write_text("{}", encoding="utf-8")

    name3 = resolve_collision_safe_base_name("流行榜单", existing_names, out_dir, formats=["json"])
    assert name3 == "流行榜单 (2)"

    # 4. 再次碰撞继续递增
    name4 = resolve_collision_safe_base_name("流行榜单", existing_names, out_dir, formats=["json"])
    assert name4 == "流行榜单 (3)"


def test_preprocess_playlist_duplicates():
    """验证统一预处理正确标记重复歌曲"""
    tracks = [
        NormalizedTrack(index=1, title="晴天", artist="周杰伦"),
        NormalizedTrack(index=2, title="晴天", artist="周杰伦"),
        NormalizedTrack(index=3, title="七里香", artist="周杰伦"),
    ]
    pl = NormalizedPlaylist(platform="qqmusic", id="123", name="测试", tracks=tracks)
    dup_count = preprocess_playlist(pl)

    assert dup_count == 1
    assert not pl.tracks[0].is_duplicate
    assert pl.tracks[1].is_duplicate
    assert not pl.tracks[2].is_duplicate


def test_run_batch_flow_headless_success(tmp_path):
    """验证非交互 (Headless) 批量导出：无任何 input()，严格透传 format，进度与统计完整"""
    adapter = MagicMock()

    t1 = NormalizedTrack(index=1, title="歌1", artist="唱1")
    t2 = NormalizedTrack(index=2, title="歌2", artist="唱2")
    pl1 = NormalizedPlaylist(platform="netease", id="p1", name="自建歌单A", tracks=[t1])
    pl2 = NormalizedPlaylist(platform="netease", id="p2", name="自建歌单B", tracks=[t2])

    adapter.fetch_playlist.side_effect = lambda pid, **kwargs: pl1 if pid == "p1" else pl2

    user_pls = NormalizedUserPlaylists(
        platform="netease",
        user_id="test_uid_123",
        nickname="测试用户",
        playlists=[
            UserPlaylistSummary(id="p1", name="自建歌单A", is_created=True),
            UserPlaylistSummary(id="p2", name="自建歌单B", is_created=True),
        ],
    )

    result = run_batch_flow(
        adapter=adapter,
        user_playlists=user_pls,
        output_dir=str(tmp_path),
        formats=["json"],
        interactive=False,
        reveal_folder_flag=False,
    )

    assert isinstance(result, BatchResult)
    assert result.total == 2
    assert result.success == 2
    assert result.failed == 0
    assert len(result.failures) == 0
    # 只导出 JSON 格式
    assert len(result.exported_files) == 2
    for f in result.exported_files:
        assert f.endswith(".json")
        assert os.path.exists(f)


def test_run_batch_flow_partial_failure_tolerance(tmp_path):
    """验证批量导出容错性：单个歌单失败不影响其余歌单，失败结果被准确记录"""
    adapter = MagicMock()

    t1 = NormalizedTrack(index=1, title="歌1", artist="唱1")
    pl1 = NormalizedPlaylist(platform="qqmusic", id="p1", name="正常歌单", tracks=[t1])

    # p1 成功, p2 抓取返回 None (如已失效/受限)
    adapter.fetch_playlist.side_effect = lambda pid, **kwargs: pl1 if pid == "p1" else None

    user_pls = NormalizedUserPlaylists(
        platform="qqmusic",
        user_id="qq_111",
        nickname="QQ测试",
        playlists=[
            UserPlaylistSummary(id="p1", name="正常歌单", is_created=True),
            UserPlaylistSummary(id="p2", name="私密或失效歌单", is_created=True),
        ],
    )

    result = run_batch_flow(
        adapter=adapter,
        user_playlists=user_pls,
        output_dir=str(tmp_path),
        formats=["txt"],
        interactive=False,
        reveal_folder_flag=False,
    )

    assert result.total == 2
    assert result.success == 1
    assert result.failed == 1
    assert len(result.failures) == 1
    assert result.failures[0].playlist_id == "p2"


def test_run_batch_flow_interactive_selection(tmp_path):
    """验证交互模式下选择子集与格式交互解析"""
    adapter = MagicMock()
    t = NormalizedTrack(index=1, title="测试曲", artist="测试家")
    pl = NormalizedPlaylist(platform="netease", id="p2", name="歌单2", tracks=[t])
    adapter.fetch_playlist.return_value = pl

    user_pls = NormalizedUserPlaylists(
        platform="netease",
        user_id="uid_222",
        nickname="交互用户",
        playlists=[
            UserPlaylistSummary(id="p1", name="歌单1", is_created=True),
            UserPlaylistSummary(id="p2", name="歌单2", is_created=True),
            UserPlaylistSummary(id="p3", name="歌单3", is_created=True),
        ],
    )

    # 模拟用户输入：选择第 2 个歌单，格式选 2 (JSON)
    with patch("builtins.input", side_effect=["2", "2"]):
        result = run_batch_flow(
            adapter=adapter,
            user_playlists=user_pls,
            output_dir=str(tmp_path),
            interactive=True,
            reveal_folder_flag=False,
        )

    assert result.total == 1
    assert result.success == 1
    assert len(result.exported_files) == 1
    assert result.exported_files[0].endswith(".json")


def test_run_batch_flow_headless_selection_subset(tmp_path):
    """验证非交互模式下通过 selection_input 正确导出指定子集歌单"""
    adapter = MagicMock()
    t = NormalizedTrack(index=1, title="测试曲", artist="测试家")
    adapter.fetch_playlist.side_effect = lambda pid, **kwargs: NormalizedPlaylist(
        platform="netease", id=pid, name=f"歌单_{pid}", tracks=[t]
    )

    user_pls = NormalizedUserPlaylists(
        platform="netease",
        user_id="uid_batch_subset",
        nickname="批量测试用户",
        playlists=[
            UserPlaylistSummary(id="p1", name="歌单1", is_created=True),
            UserPlaylistSummary(id="p2", name="歌单2", is_created=True),
            UserPlaylistSummary(id="p3", name="歌单3", is_created=True),
        ],
    )

    result = run_batch_flow(
        adapter=adapter,
        user_playlists=user_pls,
        output_dir=str(tmp_path),
        formats=["txt"],
        interactive=False,
        selection_input="1,3",
        reveal_folder_flag=False,
    )

    assert result.total == 2
    assert result.success == 2
    assert adapter.fetch_playlist.call_count == 2
    called_pids = [call.args[0] for call in adapter.fetch_playlist.call_args_list]
    assert called_pids == ["p1", "p3"]


def test_run_batch_flow_headless_invalid_selection_fails_closed(tmp_path, capsys):
    """验证非交互模式下传入越界或非法序号严格 fail-closed，杜绝静默全量导出"""
    adapter = MagicMock()
    user_pls = NormalizedUserPlaylists(
        platform="netease",
        user_id="uid_invalid_sel",
        nickname="越界测试用户",
        playlists=[
            UserPlaylistSummary(id="p1", name="歌单1", is_created=True),
            UserPlaylistSummary(id="p2", name="歌单2", is_created=True),
        ],
    )

    result = run_batch_flow(
        adapter=adapter,
        user_playlists=user_pls,
        output_dir=str(tmp_path),
        formats=["json"],
        interactive=False,
        selection_input="999",
        reveal_folder_flag=False,
    )

    assert result.total == 0
    assert result.success == 0
    assert not adapter.fetch_playlist.called
    captured = capsys.readouterr()
    assert "歌单选择 '999' 无效或超出可用序号范围" in captured.err
