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
from cli.core.ui import resolve_export_formats


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



def test_export_format_selection_semantics():
    assert resolve_export_formats("") == ["xlsx", "json", "csv", "txt", "m3u8"]
    assert resolve_export_formats("all") == ["xlsx", "json", "csv", "txt", "m3u8"]
    assert resolve_export_formats("1,2") == ["xlsx", "json"]
    assert resolve_export_formats("1, 2") == ["xlsx", "json"]
    assert resolve_export_formats("(1, 2)") == ["xlsx", "json"]
    assert resolve_export_formats("(1,2)") == ["xlsx", "json"]
    assert resolve_export_formats("（1，2）") == ["xlsx", "json"]
    assert resolve_export_formats("(2)") == ["json"]
    assert resolve_export_formats("3") == ["csv"]
    assert resolve_export_formats("xlsx,json") == ["xlsx", "json"]
    assert resolve_export_formats("0") == []
    assert resolve_export_formats("(0)") == []


def test_home_banner_and_menu_copy(capsys):
    from cli.core.ui import print_banner, print_main_menu

    print_banner()
    print_main_menu([
        {"name": "网易云音乐", "desc": "歌单链接 / 短链 / ID / 用户歌单"},
        {"name": "QQ 音乐", "desc": "歌单链接 / 短链 / ID / QQ号"},
    ])

    out = capsys.readouterr().out
    assert "Playlist Out CLI · 把你的歌单带走" in out
    assert "你的歌单，不应该只困在一个音乐平台里。" in out
    assert "解析、导出，并把歌单继续带进支持的开源播放器。" in out
    assert "作者：LengxiQwQ" in out
    assert "GitHub 开源仓库" in out
    assert "在线网页版" in out
    assert "直接粘贴链接或分享文案即可自动识别平台。" in out
    assert "只有歌单 ID？先输入平台编号。" in out
    assert "─" * 64 in out
    assert "当前已接入平台" not in out
    assert "使用方式：" not in out


def test_interactive_export_flow_ui_divider(capsys, tmp_path):
    from cli.main import run_export_flow
    playlist = NormalizedPlaylist(
        platform="kuwo",
        id="2311665489",
        name="我喜欢听",
        creator="kw1982280723",
        tracks=[
            NormalizedTrack(index=1, title="歌曲1", artist="歌手1")
        ]
    )

    out_dir = str(tmp_path / "interactive_out")
    # Simulate user inputting "(2)" for format choice
    with patch("builtins.input", return_value="(2)"):
        run_export_flow(playlist, output_dir=out_dir, default_formats=["all"], reveal_folder=False, interactive=True)

    out = capsys.readouterr().out
    assert "导出格式" in out
    assert "─" * 64 in out
    assert "正在导出..." in out
    assert (tmp_path / "interactive_out" / "我喜欢听.json").exists()


def test_print_exit_banner(capsys):
    from cli.core.ui import print_exit_banner, REPO_URL

    print_exit_banner()
    out = capsys.readouterr().out
    assert "─" * 64 in out
    assert "感谢使用！欢迎在 " in out
    assert "GitHub" in out
    assert " 给个 Star ⭐️" in out
    assert REPO_URL in out
    assert "Playlist Out - Paste. Parse. Export." in out
    assert out.endswith("\n\n")


# ─────────────────────────────────────────────────────────────
# Phase 0.1: 行为基线保护测试 (Baseline Protection Tests)
# ─────────────────────────────────────────────────────────────

def test_cli_kugou_explicit_platform_success(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="kugou",
        id="546903",
        name="酷狗测试歌单",
        creator="酷狗作者",
        tracks=[NormalizedTrack(index=1, title="酷狗歌曲", artist="酷狗歌手")]
    )
    out_dir = str(tmp_path / "kugou_out")
    test_args = ["main.py", "546903", "-p", "kugou", "-o", out_dir, "-f", "json", "--no-open"]
    with patch.object(sys, "argv", test_args):
        with patch.object(PlatformRegistry.get("kugou"), "fetch_playlist", return_value=mock_playlist) as mock_fetch:
            main()
            mock_fetch.assert_called_once()
    assert (tmp_path / "kugou_out" / "酷狗测试歌单.json").exists()


def test_cli_kuwo_explicit_platform_success(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="kuwo",
        id="2311665489",
        name="酷我测试歌单",
        creator="酷我作者",
        tracks=[NormalizedTrack(index=1, title="酷我歌曲", artist="酷我歌手")]
    )
    out_dir = str(tmp_path / "kuwo_out")
    test_args = ["main.py", "2311665489", "-p", "kuwo", "-o", out_dir, "-f", "txt", "--no-open"]
    with patch.object(sys, "argv", test_args):
        with patch.object(PlatformRegistry.get("kuwo"), "fetch_playlist", return_value=mock_playlist) as mock_fetch:
            main()
            mock_fetch.assert_called_once()
    assert (tmp_path / "kuwo_out" / "酷我测试歌单.txt").exists()


def test_cli_qishui_explicit_platform_and_channel(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="qishui",
        id="7087507348697186339",
        name="汽水测试歌单",
        creator="汽水作者",
        tracks=[NormalizedTrack(index=1, title="汽水歌曲", artist="汽水歌手")]
    )
    out_dir = str(tmp_path / "qishui_out")
    test_args = [
        "main.py",
        "7087507348697186339",
        "-p", "qishui",
        "--channel", "douyin",
        "-o", out_dir,
        "-f", "csv",
        "--no-open"
    ]
    with patch.object(sys, "argv", test_args):
        with patch.object(PlatformRegistry.get("qishui"), "fetch_playlist", return_value=mock_playlist) as mock_fetch:
            main()
            mock_fetch.assert_called_once_with("7087507348697186339", channel="douyin", token=None, userid=None)
    assert (tmp_path / "qishui_out" / "汽水测试歌单.csv").exists()


def test_cli_all_five_formats_exported(tmp_path):
    mock_playlist = NormalizedPlaylist(
        platform="netease",
        id="99999",
        name="全格式测试",
        creator="全格式作者",
        tracks=[NormalizedTrack(index=1, title="全格式歌", artist="全格式歌手")]
    )
    out_dir = str(tmp_path / "all_formats_out")
    test_args = [
        "main.py",
        "99999",
        "-p", "netease",
        "-o", out_dir,
        "-f", "xlsx,json,csv,txt,m3u8",
        "--no-open"
    ]
    with patch.object(sys, "argv", test_args):
        with patch.object(PlatformRegistry.get("netease"), "fetch_playlist", return_value=mock_playlist):
            main()

    for ext in ["xlsx", "json", "csv", "txt", "m3u8"]:
        assert (tmp_path / "all_formats_out" / f"全格式测试.{ext}").exists()


def test_cli_kugou_login_logout_flags():
    # 测试 --login
    test_args_login = ["main.py", "--login", "-p", "kugou"]
    with patch.object(sys, "argv", test_args_login):
        with patch.object(PlatformRegistry.get("kugou"), "handle_interactive") as mock_interactive:
            main()
            mock_interactive.assert_called_once_with("login")

    # 测试 --logout
    test_args_logout = ["main.py", "--logout", "-p", "kugou"]
    with patch.object(sys, "argv", test_args_logout):
        with patch.object(PlatformRegistry.get("kugou"), "handle_interactive") as mock_interactive:
            main()
            mock_interactive.assert_called_once_with("logout")


def test_cli_module_execution():
    import subprocess
    result = subprocess.run(
        [sys.executable, "-m", "cli", "--version"],
        capture_output=True,
        text=True,
        check=False
    )
    assert result.returncode == 0
    assert "PlaylistOut CLI v" in result.stdout


def test_ui_color_and_banner_amber(capsys, monkeypatch):
    from cli.core.ui import print_banner, supports_color

    # In capsys non-tty, supports_color should be False by default
    assert supports_color() is False
    print_banner()
    out = capsys.readouterr().out
    assert "Playlist Out CLI · 把你的歌单带走" in out
    assert "\033[1;33m" not in out

    # Forced color test
    monkeypatch.setenv("FORCE_COLOR", "1")
    assert supports_color() is True
    print_banner()
    out_colored = capsys.readouterr().out
    assert "\033[1;33mPlaylist Out CLI · 把你的歌单带走\033[0m" in out_colored


def test_ui_title_formatting_and_cyan(capsys, monkeypatch):
    from cli.core.ui import print_title, format_title

    # Non-color mode
    monkeypatch.delenv("FORCE_COLOR", raising=False)
    monkeypatch.setenv("NO_COLOR", "1")
    print_title("测试标题", subtitle="辅助提示说明", emoji="🎵")
    out = capsys.readouterr().out
    assert "🎵 测试标题" in out
    assert "  辅助提示说明" in out
    assert "\033[1;36m" not in out

    # Color mode
    monkeypatch.delenv("NO_COLOR", raising=False)
    monkeypatch.setenv("FORCE_COLOR", "1")
    print_title("测试标题", subtitle="辅助提示说明", emoji="🎵")
    out_colored = capsys.readouterr().out
    assert "\033[1;36m🎵 测试标题\033[0m" in out_colored


def test_ui_prompt_input_newline_and_divider(capsys):
    from cli.core.ui import prompt_input

    # Verify prompt_input outputs prompt text on line 1, reads input with '> ', and outputs divider
    with patch("builtins.input", return_value="test_input"):
        val = prompt_input("请输入测试项目：")
        assert val == "test_input"

    out = capsys.readouterr().out
    # Check prompt on its own line followed by divider with empty lines
    assert "请输入测试项目：" in out
    assert "\n\n─" in out or "\n─" in out
    assert "─" * 64 in out

    # Verify default empty input does not output divider
    with patch("builtins.input", return_value=""):
        val = prompt_input("回车测试：")
        assert val == ""

    out_empty = capsys.readouterr().out
    assert "─" * 64 not in out_empty

    # Verify divider_on_empty=True outputs divider even on empty input
    with patch("builtins.input", return_value=""):
        val = prompt_input("默认全部测试：", divider_on_empty=True)
        assert val == ""

    out_default = capsys.readouterr().out
    assert "─" * 64 in out_default




