# -*- coding: utf-8 -*-
"""
Tests for Smart Link & Platform Detector
"""

from unittest.mock import patch, MagicMock
from cli.core.detector import SmartDetector, PlatformType, extract_url_from_text


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

    # 19 位纯数字 Snowflake ID 判定为汽水音乐
    p, text = SmartDetector.detect("7087507348697186339", resolve_redirect=False)
    assert p == PlatformType.QISHUI
    assert text == "7087507348697186339"


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
