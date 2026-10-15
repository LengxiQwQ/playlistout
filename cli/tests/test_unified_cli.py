# -*- coding: utf-8 -*-
"""
Tests for Unified CLI Dispatcher and Registry
"""

import sys
from unittest.mock import patch, MagicMock
import pytest

from cli.platforms.registry import PlatformRegistry
from cli.core.models import NormalizedPlaylist, NormalizedTrack
from cli.main import main


def test_registry_registration_and_aliases():
    adapters = PlatformRegistry.list_all()
    assert len(adapters) >= 5

    # 验证各平台 ID 与别名正确映射
    assert PlatformRegistry.get("netease").platform_id == "netease"
    assert PlatformRegistry.get("163").platform_id == "netease"
    assert PlatformRegistry.get("wyy").platform_id == "netease"

    assert PlatformRegistry.get("qqmusic").platform_id == "qqmusic"
    assert PlatformRegistry.get("qq").platform_id == "qqmusic"

    assert PlatformRegistry.get("kugou").platform_id == "kugou"
    assert PlatformRegistry.get("kg").platform_id == "kugou"

    assert PlatformRegistry.get("kuwo").platform_id == "kuwo"
    assert PlatformRegistry.get("kw").platform_id == "kuwo"

    assert PlatformRegistry.get("qishui").platform_id == "qishui"
    assert PlatformRegistry.get("douyin").platform_id == "qishui"


def test_cli_ambiguous_digits_without_platform(capsys):
    test_args = ["main.py", "12345678"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 1

    captured = capsys.readouterr()
    assert "纯数字" in captured.err
    assert "--platform" in captured.err


def test_cli_explicit_platform_success(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="netease",
        id="12345",
        name="测试歌单",
        creator="作者",
        tracks=[
            NormalizedTrack(index=1, title="测试歌", artist="测试歌手")
        ]
    )

    out_dir = str(tmp_path / "cli_out")
    test_args = [
        "main.py",
        "12345",
        "-p", "netease",
        "-o", out_dir,
        "-f", "csv",
        "--no-open"
    ]

    with patch.object(sys, "argv", test_args):
        with patch.object(
            PlatformRegistry.get("netease"),
            "fetch_playlist",
            return_value=mock_playlist
        ) as mock_fetch:
            main()
            mock_fetch.assert_called_once_with("12345", channel="qishui", token=None, userid=None)

    assert (tmp_path / "cli_out" / "测试歌单.csv").exists()


def test_cli_auto_detect_success(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="qqmusic",
        id="9044196528",
        name="QQ测试歌单",
        creator="QQ用户",
        tracks=[
            NormalizedTrack(index=1, title="七里香", artist="周杰伦")
        ]
    )

    out_dir = str(tmp_path / "cli_auto_out")
    test_args = [
        "main.py",
        "https://y.qq.com/n/ryqq/playlist/9044196528",
        "-o", out_dir,
        "-f", "txt",
        "--no-open"
    ]

    with patch.object(sys, "argv", test_args):
        with patch.object(
            PlatformRegistry.get("qqmusic"),
            "fetch_playlist",
            return_value=mock_playlist
        ) as mock_fetch:
            main()
            mock_fetch.assert_called_once()

    assert (tmp_path / "cli_auto_out" / "QQ测试歌单.txt").exists()


def test_cli_version_flag(capsys):
    from cli.core.version import get_version
    test_args = ["main.py", "--version"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 0

    captured = capsys.readouterr()
    expected_version_str = f"PlaylistOut CLI v{get_version()}"
    assert expected_version_str in captured.out


def test_cli_self_test_flag():
    test_args = ["main.py", "--self-test"]
    with patch.object(sys, "argv", test_args):
        with pytest.raises(SystemExit) as exc:
            main()
        assert exc.value.code == 0


def test_get_cli_invocation_name():
    from cli.main import get_cli_invocation_name

    # Source mode
    assert get_cli_invocation_name(is_frozen=False, sys_platform="win32") == "python cli/main.py"
    assert get_cli_invocation_name(is_frozen=False, sys_platform="linux") == "python cli/main.py"
    assert get_cli_invocation_name(is_frozen=False, sys_platform="darwin") == "python cli/main.py"

    # Frozen Windows mode
    assert get_cli_invocation_name(is_frozen=True, sys_platform="win32") == "PlaylistOut.exe"

    # Frozen POSIX mode (Linux / macOS)
    assert get_cli_invocation_name(is_frozen=True, sys_platform="linux") == "./PlaylistOut"
    assert get_cli_invocation_name(is_frozen=True, sys_platform="darwin") == "./PlaylistOut"


def test_cli_help_flag_source_and_frozen(capsys):
    # Test help output in source mode
    with patch("sys.frozen", False, create=True):
        with patch.object(sys, "argv", ["main.py", "--help"]):
            with pytest.raises(SystemExit) as exc:
                main()
            assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "usage: python cli/main.py" in out
    assert 'python cli/main.py "https://music.163.com/playlist?id=2756674066"' in out

    # Test help output in frozen Windows mode
    with patch("sys.frozen", True, create=True):
        with patch("sys.platform", "win32"):
            with patch.object(sys, "argv", ["main.py", "--help"]):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "usage: PlaylistOut.exe" in out
    assert 'PlaylistOut.exe "https://music.163.com/playlist?id=2756674066"' in out

    # Test help output in frozen Linux mode
    with patch("sys.frozen", True, create=True):
        with patch("sys.platform", "linux"):
            with patch.object(sys, "argv", ["main.py", "--help"]):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "usage: ./PlaylistOut" in out
    assert './PlaylistOut "https://music.163.com/playlist?id=2756674066"' in out

