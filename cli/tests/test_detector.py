# -*- coding: utf-8 -*-
"""
Tests for Smart Link & Platform Detector
"""

import pytest
from unittest.mock import patch, MagicMock
from cli.core.detector import (
    SmartDetector,
    PlatformType,
    TargetKind,
    DetectedTarget,
    extract_url_from_text,
    extract_clean_url_or_input,
    extract_user_profile_target,
)


def test_extract_url_from_text():
    raw_text = "5.55 复制打开抖音，看看【小明发布的音乐】 https://v.douyin.com/abc1234/ 欢迎收听！"
    assert extract_url_from_text(raw_text) == "https://v.douyin.com/abc1234/"

    bare_text = "分享链接 163cn.tv/bhsHbRfW 快来听"
    assert extract_url_from_text(bare_text) == "https://163cn.tv/bhsHbRfW"

    no_url = "纯文字没有任何链接"
    assert extract_url_from_text(no_url) is None


def test_detect_netease_urls():
    p, _ = SmartDetector.detect("https://music.163.com/playlist?id=2756674066", resolve_redirect=False)
    assert p == PlatformType.NETEASE

    p, _ = SmartDetector.detect("https://music.163.com/#/playlist?id=2756674066", resolve_redirect=False)
    assert p == PlatformType.NETEASE

    p, _ = SmartDetector.detect("https://163cn.tv/bhsHbRfW", resolve_redirect=False)
    assert p == PlatformType.NETEASE


def test_detect_qqmusic_urls():
    p, _ = SmartDetector.detect("https://y.qq.com/n/ryqq/playlist/9044196528", resolve_redirect=False)
    assert p == PlatformType.QQMUSIC

    p, _ = SmartDetector.detect("https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528", resolve_redirect=False)
    assert p == PlatformType.QQMUSIC

    p, _ = SmartDetector.detect("https://c6.y.qq.com/base/fcgi-bin/u?__=xxx", resolve_redirect=False)
    assert p == PlatformType.QQMUSIC


def test_detect_kuwo_urls():
    p, _ = SmartDetector.detect("https://www.kuwo.cn/playlist_detail/2311665489", resolve_redirect=False)
    assert p == PlatformType.KUWO

    p, _ = SmartDetector.detect("https://m.kuwo.cn/newh5app/playlist_detail/2311665489", resolve_redirect=False)
    assert p == PlatformType.KUWO


def test_detect_qishui_urls_and_ids():
    p, _ = SmartDetector.detect("https://music.douyin.com/qishui/share/playlist?playlist_id=7087507348697186339", resolve_redirect=False)
    assert p == PlatformType.QISHUI

    p, _ = SmartDetector.detect("https://qishui.com/share/playlist?playlist_id=7087507348697186339", resolve_redirect=False)
    assert p == PlatformType.QISHUI

    # 19 位纯数字 Snowflake ID 默认进入 AMBIGUOUS_DIGITS (不再无条件强判汽水)
    p, text = SmartDetector.detect("7087507348697186339", resolve_redirect=False)
    assert p == PlatformType.AMBIGUOUS_DIGITS
    assert text == "7087507348697186339"

    # 通过 resolve_target 指定 -p qishui 时明确为汽水歌单
    t = SmartDetector.resolve_target("7087507348697186339", platform="qishui")
    assert t.platform == PlatformType.QISHUI
    assert t.kind == TargetKind.PLAYLIST
    assert t.value == "7087507348697186339"


def test_detect_kugou_urls():
    p, _ = SmartDetector.detect("https://www.kugou.com/yy/special/single/546903.html", resolve_redirect=False)
    assert p == PlatformType.KUGOU

    p, _ = SmartDetector.detect("https://activity.kugou.com/h5/songlist/?global_specialid=collection_3_1504683618_2_0", resolve_redirect=False)
    assert p == PlatformType.KUGOU

    p, _ = SmartDetector.detect("https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/", resolve_redirect=False)
    assert p == PlatformType.KUGOU


def test_detect_ambiguous_digits():
    p, text = SmartDetector.detect("12345678", resolve_redirect=False)
    assert p == PlatformType.AMBIGUOUS_DIGITS
    assert text == "12345678"

    p, text = SmartDetector.detect("2756674066", resolve_redirect=False)
    assert p == PlatformType.AMBIGUOUS_DIGITS
    assert text == "2756674066"


def test_detect_unknown():
    p, _ = SmartDetector.detect("https://example.com/not_music", resolve_redirect=False)
    assert p == PlatformType.UNKNOWN

    p, _ = SmartDetector.detect("随机测试字符串", resolve_redirect=False)
    assert p == PlatformType.UNKNOWN


def test_detect_with_mocked_redirect():
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 302
        mock_resp.headers = {"Location": "https://music.163.com/playlist?id=18429425523"}
        mock_get.return_value = mock_resp

        p, resolved_url = SmartDetector.detect("https://163cn.tv/bhsHbRfW", resolve_redirect=True)
        assert p == PlatformType.NETEASE
        assert "music.163.com" in resolved_url


def test_extract_clean_url_or_input_app_share_texts():
    # 模拟各类移动端 App 分享文案污染
    netease_share = "分享网易云歌单：https://music.163.com/playlist?id=2756674066 来自网易云音乐客户端"
    assert extract_clean_url_or_input(netease_share) == "https://music.163.com/playlist?id=2756674066"

    qq_share = "【周杰伦精选】https://y.qq.com/n/ryqq/playlist/9044196528 (分享自QQ音乐)"
    assert extract_clean_url_or_input(qq_share) == "https://y.qq.com/n/ryqq/playlist/9044196528"

    # 无协议头的裸域名
    bare_domain = "来听听我的歌单 y.qq.com/n/ryqq/playlist/9044196528 超好听"
    assert extract_clean_url_or_input(bare_domain) == "https://y.qq.com/n/ryqq/playlist/9044196528"

    # 标号纯数字前缀清洗
    assert extract_clean_url_or_input("QQ: 3197635836") == "3197635836"
    assert extract_clean_url_or_input("歌单：2756674066") == "2756674066"
    assert extract_clean_url_or_input("UID: 1825474783") == "1825474783"


def test_extract_user_profile_target():
    # QQ 音乐用户主页检测
    qq_profile_1 = "https://y.qq.com/n/ryqq/profile/3197635836"
    assert extract_user_profile_target(qq_profile_1) == (PlatformType.QQMUSIC, "3197635836")

    qq_profile_2 = "https://y.qq.com/portal/profile.html?uin=3197635836"
    assert extract_user_profile_target(qq_profile_2) == (PlatformType.QQMUSIC, "3197635836")

    qq_share_profile = "https://i.y.qq.com/n2/m/share/profile_duo/index.html?uin=3197635836"
    assert extract_user_profile_target(qq_share_profile) == (PlatformType.QQMUSIC, "3197635836")

    # 网易云音乐用户主页检测
    netease_profile_1 = "https://music.163.com/#/user/home?id=1825474783"
    assert extract_user_profile_target(netease_profile_1) == (PlatformType.NETEASE, "1825474783")

    netease_profile_2 = "https://music.163.com/user/1825474783"
    assert extract_user_profile_target(netease_profile_2) == (PlatformType.NETEASE, "1825474783")

    # 酷狗音乐用户主页检测
    kugou_profile = "https://www.kugou.com/user/detail?uid=12345678"
    assert extract_user_profile_target(kugou_profile) == (PlatformType.KUGOU, "12345678")

    # 普通歌单链接不应被判定为用户主页
    assert extract_user_profile_target("https://music.163.com/playlist?id=2756674066") is None
    assert extract_user_profile_target("https://y.qq.com/n/ryqq/playlist/9044196528") is None


# ─────────────────────────────────────────────────────────────
# Phase 1: 统一目标识别与域名收紧测试
# ─────────────────────────────────────────────────────────────

def test_gap_non_music_qq_rejected():
    """非音乐 QQ 链接 (如新闻、文档、空间) 不得被误识别为 QQ 音乐"""
    p, _ = SmartDetector.detect("https://news.qq.com/article/12345", resolve_redirect=False)
    assert p == PlatformType.UNKNOWN


def test_gap_douyin_video_rejected():
    """普通抖音短视频/图文链接不得直接被当作汽水音乐歌单"""
    p, _ = SmartDetector.detect("https://www.douyin.com/video/7123456789012345678", resolve_redirect=False)
    assert p == PlatformType.UNKNOWN


def test_gap_19_digits_not_forced_qishui():
    """18/19 位纯数字 ID 应进入受控歧义处理，而不是无条件强判汽水音乐"""
    p, _ = SmartDetector.detect("7087507348697186339", resolve_redirect=False)
    assert p == PlatformType.AMBIGUOUS_DIGITS


def test_resolve_target_comprehensive():
    """验证 SmartDetector.resolve_target 对所有平台、歌单与用户目标的准确解析"""

    # 1. QQ 歌单 URL -> playlist
    t = SmartDetector.resolve_target("https://y.qq.com/n/ryqq/playlist/9044196528", resolve_redirect=False)
    assert t.platform == PlatformType.QQMUSIC
    assert t.kind == TargetKind.PLAYLIST
    assert "9044196528" in t.value

    # 2. QQ 用户主页 -> user
    t = SmartDetector.resolve_target("https://y.qq.com/n/ryqq/profile/3197635836", resolve_redirect=False)
    assert t.platform == PlatformType.QQMUSIC
    assert t.kind == TargetKind.USER
    assert t.value == "3197635836"

    # 3. QQ 号标签输入 -> user
    t = SmartDetector.resolve_target("QQ号: 1160951354", resolve_redirect=False)
    assert t.platform == PlatformType.QQMUSIC
    assert t.kind == TargetKind.USER
    assert t.value == "1160951354"

    t = SmartDetector.resolve_target("QQ: 1160951354", resolve_redirect=False)
    assert t.platform == PlatformType.QQMUSIC
    assert t.kind == TargetKind.USER
    assert t.value == "1160951354"

    # 4. 网易云歌单 URL -> playlist
    t = SmartDetector.resolve_target("https://music.163.com/playlist?id=2756674066", resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.PLAYLIST

    # 5. 网易云用户主页 -> user
    t = SmartDetector.resolve_target("https://music.163.com/user/1825474783", resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.USER
    assert t.value == "1825474783"

    # 6. UID 标签输入 -> user
    t = SmartDetector.resolve_target("UID: 1825474783", resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.USER
    assert t.value == "1825474783"

    t = SmartDetector.resolve_target("用户: 1825474783", resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.USER
    assert t.value == "1825474783"

    # 7. 酷狗用户主页 -> user
    t = SmartDetector.resolve_target("https://www.kugou.com/user/detail?uid=12345678", resolve_redirect=False)
    assert t.platform == PlatformType.KUGOU
    assert t.kind == TargetKind.USER
    assert t.value == "12345678"

    # 8. 普通 qq.com / douyin.com 页面 -> unknown
    t = SmartDetector.resolve_target("https://news.qq.com/article/12345", resolve_redirect=False)
    assert t.platform == PlatformType.UNKNOWN
    assert t.kind == TargetKind.UNKNOWN

    t = SmartDetector.resolve_target("https://www.douyin.com/video/7123456789012345678", resolve_redirect=False)
    assert t.platform == PlatformType.UNKNOWN
    assert t.kind == TargetKind.UNKNOWN

    # 9. 纯数字 ID 歧义与参数控制
    # 无平台: ambiguous
    t = SmartDetector.resolve_target("2756674066", resolve_redirect=False)
    assert t.platform == PlatformType.AMBIGUOUS_DIGITS
    assert t.kind == TargetKind.AMBIGUOUS
    assert t.value == "2756674066"

    # 指定 -p netease: playlist
    t = SmartDetector.resolve_target("2756674066", platform="netease", resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.PLAYLIST
    assert t.value == "2756674066"

    # 指定 -p netease + is_user: user
    t = SmartDetector.resolve_target("1825474783", platform="netease", is_user=True, resolve_redirect=False)
    assert t.platform == PlatformType.NETEASE
    assert t.kind == TargetKind.USER
    assert t.value == "1825474783"

    # 指定 -p qqmusic + is_user: user
    t = SmartDetector.resolve_target("1160951354", platform="qqmusic", is_user=True, resolve_redirect=False)
    assert t.platform == PlatformType.QQMUSIC
    assert t.kind == TargetKind.USER
    assert t.value == "1160951354"



