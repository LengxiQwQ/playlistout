# -*- coding: utf-8 -*-
"""
Tests for Unified CLI Arguments Validation, Exit Codes, and Entry Wrapper Semantics
"""

import sys
from unittest.mock import patch, MagicMock
import pytest

from cli.main import main, run_cli_entry
from cli.core.models import NormalizedPlaylist, NormalizedTrack, UserPlaylistSummary, NormalizedUserPlaylists
from cli.core.batch import BatchResult


def test_cli_mutually_exclusive_login_logout(capsys):
    """验证 --login 与 --logout 互斥，同时传入时 argparse 报错并以代码 2 退出"""
    test_args = ["main.py", "--login", "--logout"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "not allowed with argument" in captured.err or "--logout" in captured.err


def test_cli_invalid_format_tokens(capsys):
    """验证非法导出格式 (-f jsno) 拒绝静默退化，明确报错并以代码 2 退出"""
    test_args = ["main.py", "12345", "-p", "netease", "-f", "jsno"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "不支持的导出格式" in captured.err or "无效" in captured.err
    assert "jsno" in captured.err


def test_cli_format_zero_in_headless_mode(capsys):
    """验证非交互模式下传入 -f 0 报错并以代码 2 退出"""
    test_args = ["main.py", "12345", "-p", "netease", "-f", "0"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "仅用于交互菜单返回" in captured.err or "无效" in captured.err


def test_cli_unknown_platform_flag(capsys):
    """验证指定不存在的平台 (-p unknown_plat) 以代码 2 退出并列出可选平台"""
    test_args = ["main.py", "12345", "-p", "unknown_plat"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "不支持的平台 'unknown_plat'" in captured.err


def test_cli_mismatched_channel_platform(capsys):
    """验证 --channel 传给非汽水平台 (-p netease --channel douyin) 以代码 2 退出"""
    test_args = ["main.py", "12345", "-p", "netease", "--channel", "douyin"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "--channel" in captured.err
    assert "汽水" in captured.err


def test_cli_mismatched_channel_with_url(capsys):
    """验证未传 -p 但 URL 为网易云时，传入 --channel 以代码 2 退出"""
    test_args = ["main.py", "https://music.163.com/playlist?id=12345", "--channel", "douyin"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "--channel" in captured.err
    assert "汽水" in captured.err


def test_cli_channel_without_qishui_no_input(capsys):
    """验证未传链接且未指定 qishui 平台时，直接传入 --channel 以代码 2 退出"""
    test_args = ["main.py", "--channel", "douyin"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "--channel" in captured.err


def test_cli_mismatched_kugou_auth_platform(capsys):
    """验证酷狗专属认证参数传给其他平台 (-p qqmusic --token 123) 以代码 2 退出"""
    test_args = ["main.py", "12345", "-p", "qqmusic", "--token", "test_tok"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "--token" in captured.err
    assert "酷狗" in captured.err


def test_cli_mismatched_kugou_auth_with_url(capsys):
    """验证未传 -p 但 URL 为 QQ 音乐时，传入酷狗专属认证参数以代码 2 退出"""
    test_args = ["main.py", "https://y.qq.com/n/ryqq/playlist/12345", "--userid", "123456"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "--userid" in captured.err
    assert "酷狗" in captured.err


def test_cli_unsupported_user_platform(capsys):
    """验证不支持用户歌单的平台 (-p kuwo --user) 以代码 2 退出"""
    test_args = ["main.py", "12345", "-p", "kuwo", "--user"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 2

    captured = capsys.readouterr()
    assert "当前不支持导出用户歌单列表" in captured.err


def test_cli_zero_files_exported_exit_code(capsys):
    """验证当单歌单抓取成功但 0 个文件导出成功时，以代码 1 退出"""
    dummy_pl = NormalizedPlaylist(
        platform="netease",
        id="12345",
        name="测试歌单",
        tracks=[NormalizedTrack(index=1, title="Song", artist="Artist")]
    )

    test_args = ["main.py", "12345", "-p", "netease", "-f", "json", "--no-open"]
    with patch.object(sys, "argv", test_args):
        with patch("cli.platforms.netease.NetEaseAdapter.fetch_playlist", return_value=dummy_pl):
            with patch("cli.main.run_export_flow", return_value=[]):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 1

    captured = capsys.readouterr()
    assert "未能成功导出任何文件" in captured.err


def test_cli_zero_batch_exported_exit_code(capsys):
    """验证当用户模式下 batch flow 导出 0 个成功歌单时，以代码 1 退出"""
    dummy_user_pls = NormalizedUserPlaylists(
        platform="qqmusic",
        user_id="1160951354",
        nickname="测试用户",
        playlists=[
            UserPlaylistSummary(id="pl_1", name="歌单1", track_count=1)
        ]
    )
    failed_batch_res = BatchResult(
        total=1,
        success=0,
        failed=1,
        exported_files=[],
        failures=[("歌单1", "网络异常")]
    )

    test_args = ["main.py", "1160951354", "-p", "qqmusic", "--user", "-f", "json", "--no-open"]
    with patch.object(sys, "argv", test_args):
        with patch("cli.platforms.qqmusic.QQMusicAdapter.fetch_user_playlists", return_value=dummy_user_pls):
            with patch("cli.main.run_batch_flow", return_value=failed_batch_res):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 1

    captured = capsys.readouterr()
    assert "未能成功导出任何歌单" in captured.err


def test_cli_successful_export_exit_code(tmp_path):
    """验证正常单歌单导出成功执行完毕"""
    dummy_pl = NormalizedPlaylist(
        platform="netease",
        id="12345",
        name="测试歌单",
        tracks=[NormalizedTrack(index=1, title="Song", artist="Artist")]
    )

    out_dir = str(tmp_path / "out")
    test_args = ["main.py", "12345", "-p", "netease", "-o", out_dir, "-f", "json", "--no-open"]
    with patch.object(sys, "argv", test_args):
        with patch("cli.platforms.netease.NetEaseAdapter.fetch_playlist", return_value=dummy_pl):
            # 正常执行不抛出 SystemExit 或正常 return
            main()


def test_run_cli_entry_exit_code_propagation():
    """验证 run_cli_entry 正常透传 SystemExit 的退出码"""
    with patch("cli.main.main", side_effect=SystemExit(2)):
        with pytest.raises(SystemExit) as exc:
            run_cli_entry()
        assert exc.value.code == 2


def test_run_cli_entry_keyboard_interrupt():
    """验证 run_cli_entry 捕获 KeyboardInterrupt 并以 0 退出"""
    with patch("cli.main.main", side_effect=KeyboardInterrupt):
        with pytest.raises(SystemExit) as exc:
            run_cli_entry()
        assert exc.value.code == 0


def test_run_cli_entry_generic_exception(capsys):
    """验证 run_cli_entry 捕获未知异常并以 1 退出"""
    with patch("cli.main.main", side_effect=RuntimeError("严重崩溃")):
        with pytest.raises(SystemExit) as exc:
            run_cli_entry()
        assert exc.value.code == 1

    captured = capsys.readouterr()
    assert "程序发生异常：严重崩溃" in captured.err
