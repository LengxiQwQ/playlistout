# -*- coding: utf-8 -*-
"""
Tests for Migu Music Adapter and CLI Integration
"""

import json
from unittest.mock import patch, MagicMock

import pytest

from cli.platforms.registry import PlatformRegistry
from cli.core.detector import SmartDetector, PlatformType
from cli.migu.migu_playlist_export import (
    extract_playlist_id,
    determine_track_status,
    resolve_max_quality,
    MiguPlaylistResult,
)
from cli.core.exporter import perform_export


def test_migu_adapter_registration():
    adapter = PlatformRegistry.get("migu")
    assert adapter is not None
    assert adapter.platform_id == "migu"
    assert adapter.display_name == "咪咕音乐"

    # Alias check
    alias_adapter = PlatformRegistry.get("mg")
    assert alias_adapter is not None
    assert alias_adapter.platform_id == "migu"


def test_extract_migu_playlist_id():
    assert extract_playlist_id("236858196") == "236858196"
    assert (
        extract_playlist_id(
            "https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196&channel=0147151"
        )
        == "236858196"
    )
    assert (
        extract_playlist_id("https://music.migu.cn/v5/#/playlist/236858196")
        == "236858196"
    )
    assert (
        extract_playlist_id(
            "分享歌单 | 歌单1 https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196 （@咪咕音乐）"
        )
        == "236858196"
    )


def test_extract_migu_shortlink():
    with patch("cli.migu.migu_playlist_export.resolve_shortlink") as mock_resolve:
        mock_resolve.return_value = (
            "https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196"
        )
        assert (
            extract_playlist_id("https://c.migu.cn/0mp9YM?ifrom=test")
            == "236858196"
        )


def test_detector_migu():
    p, _ = SmartDetector.detect(
        "https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196",
        resolve_redirect=False,
    )
    assert p == PlatformType.MIGU

    p, _ = SmartDetector.detect(
        "https://music.migu.cn/v5/#/playlist/236858196", resolve_redirect=False
    )
    assert p == PlatformType.MIGU

    p, _ = SmartDetector.detect(
        "分享歌单：来自咪咕音乐的宝藏歌曲 https://c.migu.cn/abc",
        resolve_redirect=False,
    )
    assert p == PlatformType.MIGU


def test_track_status_and_quality():
    # 1. Normal
    normal_song = {
        "restrictType": 0,
        "copyrightType": 1,
        "showTags": [],
        "audioFormats": [{"formatType": "PQ", "showTagsNew": []}],
    }
    assert determine_track_status(normal_song) == "正常"
    assert resolve_max_quality(normal_song) == "128kbps"

    # 2. VIP
    vip_song = {
        "restrictType": 1,
        "copyrightType": 1,
        "showTags": ["vip"],
        "audioFormats": [
            {"formatType": "PQ", "showTagsNew": ["vip"]},
            {"formatType": "SQ", "showTagsNew": ["vip"]},
        ],
    }
    assert determine_track_status(vip_song) == "VIP专享"
    assert resolve_max_quality(vip_song) == "FLAC"

    # 3. Off-shelf
    off_shelf_song = {
        "restrictType": -1,
        "copyrightType": 0,
    }
    assert determine_track_status(off_shelf_song) == "下架/无版权"


def test_migu_fetch_and_export_all_formats(tmp_path):
    adapter = PlatformRegistry.get("migu")
    assert adapter is not None

    mock_tracks = [
        (
            "推开世界的门",
            "杨乃文",
            "离心力",
            "04:42",
            "正常",
            "https://d.musicapp.migu.cn/cover1.jpg",
            "1004665871",
            282000,
            "2016-11-15",
            "HQ",
        ),
        (
            "找自己",
            "陶喆",
            "I'm OK",
            "05:07",
            "VIP专享",
            "https://d.musicapp.migu.cn/cover2.jpg",
            "1000028036",
            307000,
            "1999-12-10",
            "Hi-Res",
        ),
        (
            "九万字",
            "黄诗扶",
            "人间不值得",
            "03:52",
            "下架/无版权",
            "",
            "1114912787",
            232000,
            "2018-12-28",
            None,
        ),
    ]

    mock_result = MiguPlaylistResult(
        "测试歌单",
        mock_tracks,
        "测试作者",
        "https://d.musicapp.migu.cn/pcover.jpg",
        "236858196",
        {
            "track_count": 3,
            "play_count": 100,
            "tags": [],
            "description": "测试简介",
        },
    )

    with patch(
        "cli.platforms.migu.extract_playlist_id", return_value="236858196"
    ):
        with patch(
            "cli.platforms.migu.get_playlist_info", return_value=mock_result
        ):
            playlist = adapter.fetch_playlist("236858196")

    assert playlist is not None
    assert playlist.platform == "migu"
    assert playlist.id == "236858196"
    assert playlist.name == "测试歌单"
    assert playlist.creator == "测试作者"
    assert len(playlist.tracks) == 3

    t1, t2, t3 = playlist.tracks
    assert t1.title == "推开世界的门"
    assert t1.is_available is True
    assert t1.is_vip is False
    assert t1.status == "playable"

    assert t2.title == "找自己"
    assert t2.is_vip is True
    assert t2.status == "vip"
    assert t2.max_quality == "Hi-Res"

    assert t3.title == "九万字"
    assert t3.is_available is False
    assert t3.status == "unplayable"

    # Test export to all 5 formats
    out_dir = str(tmp_path / "migu_out")
    generated = perform_export(
        playlist,
        out_dir,
        formats=["xlsx", "csv", "json", "txt", "m3u8"],
        reveal_folder_flag=False,
    )

    assert len(generated) == 5
    base_name = "【咪咕音乐】测试歌单 - 测试作者"
    assert (tmp_path / "migu_out" / f"{base_name}.xlsx").exists()
    assert (tmp_path / "migu_out" / f"{base_name}.csv").exists()
    assert (tmp_path / "migu_out" / f"{base_name}.json").exists()
    assert (tmp_path / "migu_out" / f"{base_name}.txt").exists()
    assert (tmp_path / "migu_out" / f"{base_name}.m3u8").exists()

    # Validate JSON Canonical structure
    with open(
        tmp_path / "migu_out" / f"{base_name}.json", "r", encoding="utf-8"
    ) as f:
        data = json.load(f)
    assert data["platform"] == "migu"
    assert data["name"] == "测试歌单"
    assert len(data["tracks"]) == 3
    assert data["tracks"][0]["title"] == "推开世界的门"
    assert data["tracks"][1]["isVip"] is True
    assert data["tracks"][2]["isAvailable"] is False


def test_migu_standalone_script_export(tmp_path):
    from cli.migu.migu_playlist_export import perform_export as migu_script_perform_export

    mock_tracks = [
        (
            "推开世界的门",
            "杨乃文",
            "离心力",
            "04:42",
            "正常",
            "https://d.musicapp.migu.cn/cover1.jpg",
            "1004665871",
            282000,
            "2016-11-15",
            "HQ",
        )
    ]
    mock_result = MiguPlaylistResult(
        "独立测试歌单",
        mock_tracks,
        "独立测试作者",
        "https://d.musicapp.migu.cn/cover.jpg",
        "236858196",
        {"track_count": 1},
    )

    out_dir = str(tmp_path / "standalone_out")
    generated = migu_script_perform_export(
        mock_result,
        output_dir=out_dir,
        formats=["json", "txt"],
        reveal_folder=False,
    )

    assert len(generated) == 2
    base_name = "【咪咕音乐】独立测试歌单 - 独立测试作者"
    assert (tmp_path / "standalone_out" / f"{base_name}.json").exists()
    assert (tmp_path / "standalone_out" / f"{base_name}.txt").exists()

