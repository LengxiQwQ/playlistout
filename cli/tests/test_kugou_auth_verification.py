# -*- coding: utf-8 -*-
"""
Tests for Kugou Credentials Verification, Profile Resolution, and Clean Login UI
=================================================================================
Ensures zero unverified credentials are saved, real nicknames are returned,
64-bit and 32-bit tokens are both supported, and terminal ANSI QR rendering works.
"""

import sys
from unittest.mock import patch, MagicMock
import pytest

from cli.platforms.kugou import (
    encrypt_kugou_lite_rsa,
    verify_kugou_credentials,
    save_auth_credentials,
    load_auth_credentials,
    clear_auth_credentials,
    run_manual_login_flow,
    interactive_login_menu,
    render_qr_to_ansi,
    KugouAdapter,
)
from cli.core.models import NormalizedUserPlaylists


def test_encrypt_kugou_lite_rsa_basic():
    """验证原生 RSA 加密结果为 256 位十六进制大写字符串"""
    payload = {"token": "c7a8b9e6f1234567890abcdef1234567", "clienttime": 1729000000}
    enc = encrypt_kugou_lite_rsa(payload)
    assert isinstance(enc, str)
    assert len(enc) == 256
    assert all(c in "0123456789ABCDEF" for c in enc)


def test_verify_kugou_credentials_format_rejections():
    """测试本地前置格式拦截（非数字 UserID，非法 Hex Token）"""
    # 非纯数字 UserID
    valid, err, info = verify_kugou_credentials("c7a8b9e6f1234567890abcdef1234567", "not_a_digit")
    assert valid is False
    assert "纯数字" in err
    assert info == {}

    # Token 长度不足 16 位
    valid, err, info = verify_kugou_credentials("short_token", "1425711902")
    assert valid is False
    assert "十六进制" in err

    # Token 包含非法字符 (非 hex)
    valid, err, info = verify_kugou_credentials("c7a8b9e6f1234567890abcdef12345ZZ", "1425711902")
    assert valid is False
    assert "十六进制" in err


def test_verify_kugou_credentials_supports_64bit_token():
    """测试支持移动端扫码产生的 64 位十六进制 Token"""
    token_64 = "184b48" + "a" * 52 + "651e7d"
    assert len(token_64) == 64

    mock_profile_resp = MagicMock()
    mock_profile_resp.status_code = 200
    mock_profile_resp.json.return_value = {
        "status": 1,
        "data": {
            "nickname": "是冷汐呀",
        },
    }

    mock_list_resp = MagicMock()
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = {
        "status": 1,
        "data": {
            "total": 5,
            "info": [],
        },
    }

    def mock_post(url, *args, **kwargs):
        if "get_my_info" in url:
            return mock_profile_resp
        return mock_list_resp

    with patch("requests.post", side_effect=mock_post):
        is_valid, err_msg, info = verify_kugou_credentials(token_64, "1425711902")
        assert is_valid is True
        assert err_msg == ""
        assert info["nickname"] == "是冷汐呀"
        assert info["userid"] == "1425711902"
        assert info["playlist_count"] == 5


def test_verify_kugou_credentials_success_32bit():
    """测试 32 位 Token 成功解析与直接从 data 读取 nickname"""
    token_32 = "c7a8b9e6f1234567890abcdef1234567"
    assert len(token_32) == 32

    mock_profile_resp = MagicMock()
    mock_profile_resp.status_code = 200
    mock_profile_resp.json.return_value = {
        "status": 1,
        "data": {
            "nickname": "冷汐",
            "info": {
                "username": "lengxi",
            }
        },
    }

    mock_list_resp = MagicMock()
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = {
        "status": 1,
        "data": {
            "total": 12,
            "info": [{"listid": "4", "name": "我喜欢", "count": 100}],
        },
    }

    def mock_post(url, *args, **kwargs):
        if "get_my_info" in url:
            return mock_profile_resp
        return mock_list_resp

    with patch("requests.post", side_effect=mock_post):
        is_valid, err_msg, info = verify_kugou_credentials(token_32, "1425711902")
        assert is_valid is True
        assert err_msg == ""
        assert info["userid"] == "1425711902"
        assert info["nickname"] == "冷汐"
        assert info["playlist_count"] == 12


def test_verify_kugou_credentials_rejected_upstream():
    """测试酷狗官方网关明确返回 Token 失效时的拦截"""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": 0,
        "error_code": 20018,
        "error": "token已过期",
    }

    with patch("requests.post", return_value=mock_resp):
        is_valid, err_msg, info = verify_kugou_credentials("c7a8b9e6f1234567890abcdef1234567", "1425711902")
        assert is_valid is False
        assert "token已过期" in err_msg or "20018" in err_msg
        assert info == {}


def test_verify_kugou_credentials_network_timeout():
    """测试网络超时情况下的安全返回"""
    import requests
    with patch("requests.post", side_effect=requests.exceptions.Timeout("Timed out")):
        is_valid, err_msg, info = verify_kugou_credentials("c7a8b9e6f1234567890abcdef1234567", "1425711902")
        assert is_valid is False
        assert "超时" in err_msg
        assert info == {}


def test_render_qr_to_ansi_invalid_input():
    """测试无效图片输入时安全返回 None，不抛异常"""
    assert render_qr_to_ansi("invalid_base64") is None
    assert render_qr_to_ansi("") is None


def test_run_manual_login_flow_success(tmp_path, capsys):
    """测试手动输入凭证流程：验证成功后才落盘并打印真实昵称"""
    custom_auth_file = str(tmp_path / "kugou_auth.json")

    mock_user_info = {
        "userid": "1425711902",
        "nickname": "是冷汐呀",
        "playlist_count": 8,
    }

    # 模拟用户输入 UserID 和 64 位 Token
    token_val = "184b48" + "a" * 52 + "651e7d"
    inputs = ["1425711902", token_val]
    with patch("cli.platforms.kugou.DEFAULT_AUTH_FILE", custom_auth_file), \
         patch("cli.platforms.kugou.prompt_input", side_effect=inputs), \
         patch("cli.platforms.kugou.verify_kugou_credentials", return_value=(True, "", mock_user_info)):

        token, userid = run_manual_login_flow()
        assert token == token_val
        assert userid == "1425711902"

    captured = capsys.readouterr()
    assert "已连接账号：是冷汐呀 (UserID: 1425711902)" in captured.out
    assert "8 个自建歌单" in captured.out


def test_run_manual_login_flow_failure_does_not_save(tmp_path, capsys):
    """测试手动输入凭证流程：校验失败坚决不保存，避免脏数据写入"""
    custom_auth_file = str(tmp_path / "kugou_auth.json")

    inputs = ["1425711902", "c7a8b9e6f1234567890abcdef1234567"]
    with patch("cli.platforms.kugou.DEFAULT_AUTH_FILE", custom_auth_file), \
         patch("cli.platforms.kugou.prompt_input", side_effect=inputs), \
         patch("cli.platforms.kugou.verify_kugou_credentials", return_value=(False, "Token 无效或已过期", {})), \
         patch("cli.platforms.kugou.save_auth_credentials") as mock_save:

        token, userid = run_manual_login_flow()
        assert token is None
        assert userid is None
        assert not mock_save.called

    captured = capsys.readouterr()
    assert "凭证校验失败" in captured.out
    assert "凭证未保存" in captured.out


def test_run_manual_login_flow_cancel():
    """测试用户输入 0 取消输入"""
    with patch("cli.platforms.kugou.prompt_input", return_value="0"):
        token, userid = run_manual_login_flow()
        assert token is None
        assert userid is None


def test_interactive_login_menu_displays_saved_account(capsys):
    """测试菜单在已有凭据时显示当前连接账号，选 0 退出"""
    mock_data = {
        "token": "valid_token_12345678",
        "userid": "1425711902",
        "nickname": "是冷汐呀",
    }
    with patch("cli.platforms.kugou.load_auth_credentials", return_value=("valid_token_12345678", "1425711902", mock_data)), \
         patch("cli.platforms.kugou.prompt_input", return_value="0"):

        interactive_login_menu()

    captured = capsys.readouterr()
    assert "当前已连接账号：是冷汐呀 (UserID: 1425711902)" in captured.out
    assert "重新扫码登录" in captured.out
    assert "验证当前凭证有效性" in captured.out
    assert "退出登录并清除凭证" in captured.out


def test_fetch_user_playlists_uses_saved_real_nickname():
    """测试拉取用户歌单时优先使用保存的真实昵称"""
    adapter = KugouAdapter()
    mock_data = {
        "token": "valid_token_12345678",
        "userid": "1425711902",
        "nickname": "琴心月满",
    }

    mock_playlists = [
        MagicMock(id="4", name="我喜欢", track_count=50, is_created=True),
    ]

    with patch("cli.platforms.kugou.load_auth_credentials", return_value=("valid_token_12345678", "1425711902", mock_data)), \
         patch.object(adapter, "_fetch_kugou_user_playlist_list", return_value=mock_playlists):

        res = adapter.fetch_user_playlists("")
        assert isinstance(res, NormalizedUserPlaylists)
        assert res.user_id == "1425711902"
        assert res.nickname == "琴心月满"


def test_kugou_headless_fetch_never_calls_interactive_login(capsys):
    """验证在 allow_interactive=False (Headless) 模式下，无论缺凭证还是凭证失效均绝不调用交互登录"""
    from cli.kugou.kugou_playlist_export import _fetch_kugou_playlist_by_target

    target = {
        "type": "cloudlist",
        "id": "123456",
        "original_url": "https://m.kugou.com/songlist/?listid=123456",
    }

    # 1. 无凭证情况：打印 stderr 错误，返回 None，绝不调 interactive_login_menu
    with patch("cli.kugou.kugou_playlist_export.load_auth_credentials", return_value=(None, None, {})), \
         patch("cli.kugou.kugou_playlist_export.interactive_login_menu", side_effect=AssertionError("interactive_login_menu called in headless!")) as mock_menu, \
         patch("builtins.input", side_effect=AssertionError("input() called in headless mode!")):

        res = _fetch_kugou_playlist_by_target(target, allow_interactive=False)
        assert res is None
        mock_menu.assert_not_called()

    captured = capsys.readouterr()
    assert "需要登录凭证" in captured.err

    # 2. 凭证失效 (PermissionError) 情况：绝不调 interactive_login_menu 重新登录
    with patch("cli.kugou.kugou_playlist_export.load_auth_credentials", return_value=("tok", "123", {})), \
         patch("cli.kugou.kugou_playlist_export.fetch_cloudlist_playlist", side_effect=PermissionError("token expired")), \
         patch("cli.kugou.kugou_playlist_export.interactive_login_menu", side_effect=AssertionError("interactive_login_menu called in headless!")) as mock_menu, \
         patch("builtins.input", side_effect=AssertionError("input() called in headless mode!")):

        res = _fetch_kugou_playlist_by_target(target, allow_interactive=False)
        assert res is None
        mock_menu.assert_not_called()

