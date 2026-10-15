# -*- coding: utf-8 -*-
"""
Tests for Phase 6: Adapter Capabilities & Unified Detection Source
===================================================================
Verifies:
1. Unified capability matrix contract across all platform adapters.
2. Single-source-of-truth delegation: BasePlatformAdapter.can_handle() delegates to SmartDetector.
3. Removal of dead get_supported_args API.
4. Clean extensibility for future platform integrations.
"""

import pytest
from cli.platforms.base import BasePlatformAdapter
from cli.platforms.registry import PlatformRegistry
from cli.platforms.qqmusic import QQMusicAdapter
from cli.platforms.netease import NetEaseAdapter
from cli.platforms.kugou import KugouAdapter
from cli.platforms.kuwo import KuwoAdapter
from cli.platforms.qishui import QishuiAdapter


def test_adapter_capabilities_contract():
    """验证所有已注册适配器均满足统一能力矩阵契约"""
    adapters = PlatformRegistry.list_all()
    assert len(adapters) >= 5

    for a in adapters:
        assert hasattr(a, "supports_playlist")
        assert isinstance(a.supports_playlist, bool)
        assert a.supports_playlist is True

        assert hasattr(a, "supports_user_playlists")
        assert isinstance(a.supports_user_playlists, bool)

        assert hasattr(a, "requires_user_auth")
        assert isinstance(a.requires_user_auth, bool)

        assert hasattr(a, "supported_channels")
        assert isinstance(a.supported_channels, tuple)


def test_adapter_individual_capabilities():
    """验证各平台具体能力的对齐"""
    qq = PlatformRegistry.get("qqmusic")
    assert qq.supports_playlist is True
    assert qq.supports_user_playlists is True
    assert qq.requires_user_auth is False
    assert qq.supported_channels == ()

    wyy = PlatformRegistry.get("netease")
    assert wyy.supports_playlist is True
    assert wyy.supports_user_playlists is True
    assert wyy.requires_user_auth is False
    assert wyy.supported_channels == ()

    kg = PlatformRegistry.get("kugou")
    assert kg.supports_playlist is True
    assert kg.supports_user_playlists is True
    assert kg.requires_user_auth is True
    assert kg.supported_channels == ()

    kw = PlatformRegistry.get("kuwo")
    assert kw.supports_playlist is True
    assert kw.supports_user_playlists is False
    assert kw.requires_user_auth is False
    assert kw.supported_channels == ()

    qs = PlatformRegistry.get("qishui")
    assert qs.supports_playlist is True
    assert qs.supports_user_playlists is False
    assert qs.requires_user_auth is False
    assert qs.supported_channels == ("qishui", "douyin")


def test_base_adapter_can_handle_delegation():
    """
    验证 BasePlatformAdapter.can_handle() 统一委托 SmartDetector，
    杜绝平台适配器与 Detector 之间的两套域名匹配规则漂移。
    """
    qq = QQMusicAdapter()
    wyy = NetEaseAdapter()
    kg = KugouAdapter()
    kw = KuwoAdapter()
    qs = QishuiAdapter()

    # QQ 音乐
    assert qq.can_handle("https://y.qq.com/n/ryqq/playlist/123456") is True
    assert qq.can_handle("https://news.qq.com/article/123") is False  # 非音乐 QQ 域名被过滤
    assert qq.can_handle("https://music.163.com/playlist?id=123") is False

    # 网易云音乐
    assert wyy.can_handle("https://music.163.com/playlist?id=123456") is True
    assert wyy.can_handle("https://163cn.tv/abc") is True
    assert wyy.can_handle("https://y.qq.com/n/ryqq/playlist/123") is False

    # 酷狗音乐
    assert kg.can_handle("https://www.kugou.com/songlist/123") is True
    assert kg.can_handle("gcid_abcdef123456") is True
    assert kg.can_handle("https://www.kuwo.cn/playlist/123") is False

    # 酷我音乐
    assert kw.can_handle("https://www.kuwo.cn/playlist_detail/123") is True
    assert kw.can_handle("https://www.kugou.com/songlist/123") is False

    # 汽水音乐 (Douyin 视频不误判)
    assert qs.can_handle("https://v.douyin.com/abc") is True
    assert qs.can_handle("https://qishui.douyin.com/playlist/123") is True
    assert qs.can_handle("https://www.douyin.com/video/123456789") is False  # 普通抖音视频不误判
    assert qs.can_handle("https://music.163.com/playlist?id=123") is False


def test_dead_api_get_supported_args_removed():
    """验证 BasePlatformAdapter 中未使用的死接口 get_supported_args 已彻底移除"""
    assert not hasattr(BasePlatformAdapter, "get_supported_args")
    for a in PlatformRegistry.list_all():
        assert "get_supported_args" not in a.__class__.__dict__
