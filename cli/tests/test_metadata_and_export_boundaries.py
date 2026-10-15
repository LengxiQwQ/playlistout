# -*- coding: utf-8 -*-
"""
Tests for Phase 5: Metadata hardening, Windows reserved filenames, M3U8 dual behavior, and IPv4 fallback.
"""

import json
import os
import socket
from unittest.mock import patch, MagicMock
import pytest
import requests

from cli.core.ui import sanitize_filename, WINDOWS_RESERVED_NAMES
from cli.core.models import NormalizedPlaylist, NormalizedTrack
from cli.core.batch import preprocess_playlist
from cli.core.exporter import export_json, export_xlsx, export_m3u8
from cli.core.http import reset_gai_family, ipv4_fallback_context, request_with_ipv4_fallback, resolve_shortlink
from cli.platforms.registry import PlatformRegistry
from cli.qqmusic.qq_music_playlist_export import QQPlaylistResult
from cli.netease.netease_playlist_export import NetEasePlaylistResult
from cli.kuwo.kuwo_playlist_export import KuwoPlaylistResult
from cli.qishui.qishui_playlist_export import QishuiPlaylistResult


# ─────────────────────────────────────────────────────────────
# 1. Windows 文件名合规与保留字规避测试
# ─────────────────────────────────────────────────────────────

def test_windows_reserved_names_sanitization():
    # 测试 Windows 保留名称（不区分大小写）
    assert sanitize_filename("CON") == "_CON"
    assert sanitize_filename("con") == "_con"
    assert sanitize_filename("PRN") == "_PRN"
    assert sanitize_filename("aux") == "_aux"
    assert sanitize_filename("NUL") == "_NUL"
    assert sanitize_filename("COM1") == "_COM1"
    assert sanitize_filename("com9") == "_com9"
    assert sanitize_filename("LPT1") == "_LPT1"
    assert sanitize_filename("lpt8") == "_lpt8"

    # 带扩展名基名也是保留名称的情况
    assert sanitize_filename("CON.txt") == "_CON.txt"
    assert sanitize_filename("aux.json") == "_aux.json"

    # 尾部句点与空格剥离
    assert sanitize_filename("歌单名称...   ") == "歌单名称"
    assert sanitize_filename("My Playlist. ") == "My Playlist"

    # 非法字符与控制字符替换为下划线
    assert sanitize_filename('a/b\\c:d*e?f"g<h>i|j') == "a_b_c_d_e_f_g_h_i_j"
    assert sanitize_filename("歌\x00单\x1f名\x7f称") == "歌单名称"

    # 空标题或仅含空格/点时的默认兜底
    assert sanitize_filename("") == "playlist"
    assert sanitize_filename("   ") == "playlist"
    assert sanitize_filename("...") == "playlist"
    assert sanitize_filename(None) == "playlist"

    # 超长文件名截断
    long_name = "A" * 200
    res = sanitize_filename(long_name, max_length=150)
    assert len(res) == 150
    assert res == "A" * 150


# ─────────────────────────────────────────────────────────────
# 2. M3U8 双重模式测试 (真实 playback_url vs 本地匹配模板)
# ─────────────────────────────────────────────────────────────

def test_m3u8_dual_mode_export(tmp_path):
    pl = NormalizedPlaylist(
        platform="netease",
        id="12345",
        name="M3U8测试歌单",
        tracks=[
            # 歌曲 1：含有真实 playback_url（如直链或流媒体）
            NormalizedTrack(
                index=1,
                title="流媒体歌曲",
                artist="在线艺人",
                duration_ms=180000,
                playback_url="https://audio.example.com/stream/song1.mp3"
            ),
            # 歌曲 2：无 playback_url（走本地媒体匹配模板）
            NormalizedTrack(
                index=2,
                title="本地歌曲",
                artist="本地艺人",
                duration_ms=240000,
                playback_url=None
            ),
        ]
    )

    out_file = str(tmp_path / "test_playlist.m3u8")
    export_m3u8(pl, out_file)

    with open(out_file, "r", encoding="utf-8") as f:
        content = f.read()

    lines = [line.strip() for line in content.splitlines() if line.strip()]
    assert lines[0] == "#EXTM3U"
    assert lines[1] == "#PLAYLIST:M3U8测试歌单"

    # 第一首：写真实 playback_url
    assert lines[2] == "#EXTINF:180,在线艺人 - 流媒体歌曲"
    assert lines[3] == "https://audio.example.com/stream/song1.mp3"

    # 第二首：写本地媒体匹配模板 ('歌手 - 歌名.mp3')
    assert lines[4] == "#EXTINF:240,本地艺人 - 本地歌曲"
    assert lines[5] == "本地艺人 - 本地歌曲.mp3"


# ─────────────────────────────────────────────────────────────
# 3. Partial 判断与元数据导出一致性测试
# ─────────────────────────────────────────────────────────────

def test_partial_playlist_detection_and_consistency(tmp_path):
    # 构造部分导出的歌单：标定总数 50 首，实际抓取 2 首
    pl_partial = NormalizedPlaylist(
        platform="netease",
        id="123",
        name="部分加载歌单",
        creator="测试作者",
        track_count=50,
        create_time=1600000000,
        update_time=1610000000,
        play_count=9999,
        tags=["流行", "摇滚"],
        description="这是一个测试歌单描述",
        tracks=[
            NormalizedTrack(index=1, title="Song 1", artist="Artist 1", duration_ms=120000),
            NormalizedTrack(index=2, title="Song 2", artist="Artist 2", duration_ms=150000),
        ]
    )

    # 1. 验证 is_partial_export 属性与 preprocess_playlist
    assert pl_partial.is_partial_export is True
    preprocess_playlist(pl_partial)
    assert pl_partial.is_partial is True

    # 2. 验证 export_json
    json_path = str(tmp_path / "partial.json")
    export_json(pl_partial, json_path)
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["isPartial"] is True
    assert data["trackCount"] == 50
    assert data["loadedTrackCount"] == 2
    assert data["playCount"] == 9999
    assert data["tags"] == ["流行", "摇滚"]
    assert data["description"] == "这是一个测试歌单描述"

    # 3. 验证 export_xlsx 的 Playlist Info 工作表
    xlsx_path = str(tmp_path / "partial.xlsx")
    export_xlsx(pl_partial, xlsx_path)

    import openpyxl
    wb = openpyxl.load_workbook(xlsx_path)
    assert "Playlist Info" in wb.sheetnames
    ws_info = wb["Playlist Info"]
    info_dict = {row[0]: row[1] for row in ws_info.iter_rows(values_only=True) if row and len(row) >= 2}

    assert info_dict["trackCount"] == 50
    assert info_dict["loadedTrackCount"] == 2
    assert info_dict["isPartial"] is True
    assert info_dict["tags"] == "流行, 摇滚"
    assert info_dict["description"] == "这是一个测试歌单描述"

    # 4. 完整歌单：标定总数 2 首，实际抓取 2 首
    pl_full = NormalizedPlaylist(
        platform="qqmusic",
        id="456",
        name="完整歌单",
        track_count=2,
        tracks=[
            NormalizedTrack(index=1, title="Song 1", artist="Artist 1"),
            NormalizedTrack(index=2, title="Song 2", artist="Artist 2"),
        ]
    )
    assert pl_full.is_partial_export is False
    preprocess_playlist(pl_full)
    assert pl_full.is_partial is False


# ─────────────────────────────────────────────────────────────
# 4. 各平台 Adapter 底层元数据抽取测试
# ─────────────────────────────────────────────────────────────

def test_adapter_metadata_extraction_mocked():
    # 1. QQ 音乐适配器元数据提取
    qq_adapter = PlatformRegistry.get("qqmusic")
    mock_qq_extra = {
        "track_count": 30,
        "create_time": 1590000000,
        "update_time": 1600000000,
        "play_count": 52000,
        "tags": ["流行"],
        "description": "QQ歌单描述",
    }
    mock_qq_result = QQPlaylistResult(
        "QQ歌单标题",
        [("歌曲A", "歌手A", "专辑A", "", "mid_1", 200000, None, None, None, None, "正常", "FLAC")],
        "QQ作者",
        mock_qq_extra
    )
    with patch("cli.platforms.qqmusic.extract_playlist_id", return_value="123456"):
        with patch("cli.platforms.qqmusic.get_playlist_songs", return_value=mock_qq_result):
            pl = qq_adapter.fetch_playlist("123456")
            assert pl is not None
            assert pl.track_count == 30
            assert pl.is_partial is True  # 1 < 30
            assert pl.play_count == 52000
            assert pl.tags == ["流行"]
            assert pl.description == "QQ歌单描述"
            assert pl.create_time == 1590000000

    # 2. 网易云适配器元数据提取
    netease_adapter = PlatformRegistry.get("netease")
    mock_ne_extra = {
        "track_count": 25,
        "create_time": 1580000000,
        "update_time": 1590000000,
        "play_count": 8888,
        "tags": ["华语", "民谣"],
        "description": "网易云歌单描述",
    }
    mock_ne_result = NetEasePlaylistResult(
        "网易云歌单标题",
        [("歌曲B", "歌手B", "专辑B", "03:20", "正常", "", "tid_1", 200000, None, None, None, None, None)],
        "网易云作者",
        "https://p1.music.126.net/cover.jpg",
        mock_ne_extra
    )
    with patch("cli.platforms.netease.extract_playlist_id", return_value="2756674066"):
        with patch("cli.platforms.netease.get_playlist_data", return_value=mock_ne_result):
            pl = netease_adapter.fetch_playlist("2756674066")
            assert pl is not None
            assert pl.track_count == 25
            assert pl.is_partial is True
            assert pl.play_count == 8888
            assert pl.tags == ["华语", "民谣"]
            assert pl.description == "网易云歌单描述"
            assert pl.cover_url == "https://p1.music.126.net/cover.jpg"

    # 3. 酷我适配器元数据提取
    kuwo_adapter = PlatformRegistry.get("kuwo")
    mock_kw_extra = {
        "track_count": 40,
        "play_count": 1234,
        "tags": ["经典"],
        "description": "酷我歌单描述",
    }
    mock_kw_result = KuwoPlaylistResult(
        "酷我歌单标题",
        [("歌曲C", "歌手C", "专辑C", "04:10", "正常", "", "rid_1", 250000, None, "FLAC")],
        "酷我作者",
        "https://img.kuwo.cn/cover.jpg",
        "987654",
        mock_kw_extra
    )
    with patch("cli.platforms.kuwo.extract_playlist_id", return_value="987654"):
        with patch("cli.platforms.kuwo.get_playlist_info", return_value=mock_kw_result):
            pl = kuwo_adapter.fetch_playlist("987654")
            assert pl is not None
            assert pl.track_count == 40
            assert pl.is_partial is True
            assert pl.play_count == 1234
            assert pl.tags == ["经典"]
            assert pl.description == "酷我歌单描述"

    # 4. 汽水适配器元数据提取
    qishui_adapter = PlatformRegistry.get("qishui")
    mock_qs_extra = {
        "track_count": 15,
        "description": "汽水歌单描述",
    }
    mock_qs_result = QishuiPlaylistResult(
        "汽水歌单标题",
        [("歌曲D", "歌手D", "专辑D", "02:50", "正常", "", "tid_d", 170000, None)],
        "汽水作者",
        "https://p1.douyin.com/cover.jpg",
        "7087507348697186339",
        mock_qs_extra
    )
    with patch("cli.platforms.qishui.extract_playlist_id", return_value="7087507348697186339"):
        with patch("cli.platforms.qishui.get_playlist_info", return_value=mock_qs_result):
            pl = qishui_adapter.fetch_playlist("7087507348697186339")
            assert pl is not None
            assert pl.track_count == 15
            assert pl.is_partial is True
            assert pl.description == "汽水歌单描述"


# ─────────────────────────────────────────────────────────────
# 5. 可控 IPv4 网络回退机制测试
# ─────────────────────────────────────────────────────────────

def test_request_with_ipv4_fallback_success_on_retry():
    """验证标准请求遭遇 ConnectionError 时，自动通过 IPv4 fallback 重试"""
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    call_count = 0

    def fake_request(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise requests.exceptions.ConnectionError("IPv6 route unreachable")
        return mock_resp

    with patch("requests.request", side_effect=fake_request):
        resp = request_with_ipv4_fallback("GET", "https://example.com/api")
        assert resp == mock_resp
        assert call_count == 2


def test_reset_gai_family():
    """验证 reset_gai_family 能正常恢复 urllib3 的双栈网络解析"""
    try:
        import urllib3.util.connection as urllib3_cn
        from urllib3.util.connection import HAS_IPV6
        # 先临时改为 AF_INET
        urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
        assert urllib3_cn.allowed_gai_family() == socket.AF_INET

        # 调用 reset 恢复
        reset_gai_family()
        expected = socket.AF_UNSPEC if HAS_IPV6 else socket.AF_INET
        assert urllib3_cn.allowed_gai_family() == expected
    except ImportError:
        pass
