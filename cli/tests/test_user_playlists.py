# -*- coding: utf-8 -*-
"""
Tests for Phase 2: User Playlist Capabilities across Platform Adapters
======================================================================
Verifies adapter contracts, user playlist retrieval, models, and CLI dispatch.
"""

import sys
from unittest.mock import patch, MagicMock
import pytest

from cli.platforms.registry import PlatformRegistry
from cli.core.models import NormalizedUserPlaylists, UserPlaylistSummary, NormalizedPlaylist, NormalizedTrack
from cli.core.detector import TargetKind, PlatformType, SmartDetector


def test_adapter_user_playlist_capabilities():
    """验证 5 大平台对用户歌单能力声明的准确性"""
    qq = PlatformRegistry.get("qqmusic")
    assert qq.supports_user_playlists is True
    assert qq.requires_user_auth is False

    wyy = PlatformRegistry.get("netease")
    assert wyy.supports_user_playlists is True
    assert wyy.requires_user_auth is False

    kg = PlatformRegistry.get("kugou")
    assert kg.supports_user_playlists is True
    assert kg.requires_user_auth is True

    kw = PlatformRegistry.get("kuwo")
    assert kw.supports_user_playlists is False
    assert kw.requires_user_auth is False

    qs = PlatformRegistry.get("qishui")
    assert qs.supports_user_playlists is False
    assert qs.requires_user_auth is False


def test_qqmusic_fetch_user_playlists_mocked():
    """验证 QQ 音乐适配器 fetch_user_playlists 行为与数据规整"""
    qq = PlatformRegistry.get("qqmusic")

    mock_raw_data = (
        "测试QQ用户",
        [
            {"id": "1001", "name": "我的收藏", "song_cnt": 25},
            {"id": "1002", "name": "自建歌单2", "track_count": 50},
        ],
    )

    with patch("cli.platforms.qqmusic.get_user_playlists", return_value=mock_raw_data) as mock_get:
        res = qq.fetch_user_playlists("QQ: 1160951354")
        assert mock_get.called
        assert isinstance(res, NormalizedUserPlaylists)
        assert res.platform == "qqmusic"
        assert res.user_id == "1160951354"
        assert res.nickname == "测试QQ用户"
        assert len(res.playlists) == 2
        assert res.playlists[0].id == "1001"
        assert res.playlists[0].name == "我的收藏"
        assert res.playlists[0].track_count == 25
        assert res.playlists[0].is_created is True
        assert len(res.created_playlists) == 2


def test_netease_fetch_user_playlists_mocked():
    """验证网易云音乐适配器区分自建歌单与收藏歌单"""
    wyy = PlatformRegistry.get("netease")

    mock_raw_data = (
        "网易云达人",
        [
            {"id": "2001", "name": "我喜欢的音乐", "track_count": 100, "is_created": True},
            {"id": "2002", "name": "自建歌单", "track_count": 30, "is_created": True},
            {"id": "3001", "name": "收藏的华语流行", "track_count": 80, "is_created": False},
        ],
    )

    with patch("cli.platforms.netease.get_user_playlists", return_value=mock_raw_data) as mock_get:
        res = wyy.fetch_user_playlists("https://music.163.com/user/1825474783")
        assert mock_get.called
        assert isinstance(res, NormalizedUserPlaylists)
        assert res.platform == "netease"
        assert res.user_id == "1825474783"
        assert res.nickname == "网易云达人"
        assert len(res.playlists) == 3
        assert len(res.created_playlists) == 2
        assert len(res.subscribed_playlists) == 1
        assert res.created_playlists[0].id == "2001"
        assert res.subscribed_playlists[0].id == "3001"


def test_kugou_fetch_user_playlists_mocked():
    """验证酷狗音乐适配器自建云端歌单抓取与过滤逻辑"""
    kg = PlatformRegistry.get("kugou")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": 1,
        "data": {
            "total": 3,
            "info": [
                {"listid": "4", "name": "我喜欢", "count": 60, "type": 0, "list_create_userid": "88888"},
                {"listid": "501", "name": "我的自建歌单", "count": 20, "type": 0, "list_create_userid": "88888"},
                {"listid": "999", "name": "别人创建被我收藏的歌单", "count": 50, "type": 1, "list_create_userid": "99999"},
            ],
        },
    }

    with patch("requests.post", return_value=mock_resp):
        res = kg.fetch_user_playlists("88888", token="mock_token", userid="88888")
        assert isinstance(res, NormalizedUserPlaylists)
        assert res.platform == "kugou"
        assert res.user_id == "88888"
        # 仅保留自建歌单（排除了 type == 1 的收藏歌单）
        assert len(res.playlists) == 2
        assert res.playlists[0].id == "4"
        assert res.playlists[0].name == "我喜欢"
        assert res.playlists[0].track_count == 60
        assert res.playlists[1].id == "501"


def test_kugou_fetch_user_playlists_unauthenticated():
    """验证未登录状态下酷狗用户模式安全失败并友好提示"""
    kg = PlatformRegistry.get("kugou")
    with patch("cli.platforms.kugou.load_auth_credentials", return_value=(None, None, {})):
        res = kg.fetch_user_playlists("88888")
        assert res is None


def test_kuwo_and_qishui_reject_user_playlists():
    """验证酷我和汽水适配器明确不支持用户歌单模式"""
    kw = PlatformRegistry.get("kuwo")
    assert kw.fetch_user_playlists("12345") is None

    qs = PlatformRegistry.get("qishui")
    assert qs.fetch_user_playlists("12345") is None


def test_cli_user_mode_unsupported_platform(capsys):
    """验证向不支持用户模式的平台传 --user 时退出码非 0 且 stderr 报错"""
    from cli.main import main

    test_args = ["main.py", "123456", "-p", "kuwo", "--user"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code != 0
        captured = capsys.readouterr()
        assert "不支持导出用户歌单列表" in captured.err


def test_cli_user_mode_qqmusic_end_to_end(tmp_path):
    """验证统一 CLI 端到端分发用户歌单批量流程"""
    from cli.main import main

    mock_user_pls = NormalizedUserPlaylists(
        platform="qqmusic",
        user_id="1160951354",
        nickname="端到端测试用户",
        playlists=[
            UserPlaylistSummary(id="pl_1", name="歌单一", is_created=True),
            UserPlaylistSummary(id="pl_2", name="歌单二", is_created=True),
        ],
    )

    mock_track = NormalizedTrack(index=1, title="测试曲", artist="测试家")
    mock_pl_obj = NormalizedPlaylist(
        platform="qqmusic",
        id="pl_1",
        name="测试歌单",
        tracks=[mock_track],
    )

    qq_adapter = PlatformRegistry.get("qqmusic")
    with patch.object(qq_adapter, "fetch_user_playlists", return_value=mock_user_pls) as mock_fetch_user, \
         patch.object(qq_adapter, "fetch_playlist", return_value=mock_pl_obj) as mock_fetch_pl, \
         patch("cli.core.batch.perform_export", return_value=["dummy.json"]) as mock_export:

        test_args = [
            "main.py",
            "1160951354",
            "-p", "qqmusic",
            "--user",
            "-f", "json",
            "-o", str(tmp_path),
            "--no-open",
        ]
        with patch.object(sys, "argv", test_args):
            main()

        assert mock_fetch_user.called
        assert mock_fetch_pl.call_count == 2
        assert mock_export.call_count == 2
