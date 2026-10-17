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
    assert len(adapters) == 6
    assert set(PlatformRegistry.platform_id_list()) == {"netease", "qqmusic", "kugou", "kuwo", "qishui", "migu"}

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
        # 使用方式错误（缺少 -p）：按 Phase 4.2 退出码语义以 2 退出
        assert exc.value.code == 2

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
            mock_fetch.assert_called_once_with("12345", channel="qishui", token=None, userid=None, allow_interactive=False)

    assert (tmp_path / "cli_out" / "【网易云音乐】测试歌单 - 作者.csv").exists()


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

    assert (tmp_path / "cli_auto_out" / "【QQ 音乐】QQ测试歌单 - QQ用户.txt").exists()


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
    assert (tmp_path / "interactive_out" / "【酷我音乐】我喜欢听 - kw1982280723.json").exists()


def test_print_exit_banner(capsys):
    from cli.core.ui import print_exit_banner, reset_exit_banner_state, REPO_URL

    reset_exit_banner_state()
    print_exit_banner()
    out = capsys.readouterr().out
    assert "─" * 64 in out
    assert "感谢使用！欢迎在 " in out
    assert "GitHub" in out
    assert " 点个 Star ⭐️" in out
    assert REPO_URL in out
    assert "Playlist Out - Paste. Parse. Export." in out
    assert out.endswith("\n\n")

    # Verify idempotency: second call does not print anything
    print_exit_banner()
    out2 = capsys.readouterr().out
    assert out2 == ""


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
    assert (tmp_path / "kugou_out" / "【酷狗音乐】酷狗测试歌单 - 酷狗作者.json").exists()


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
    assert (tmp_path / "kuwo_out" / "【酷我音乐】酷我测试歌单 - 酷我作者.txt").exists()


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
            mock_fetch.assert_called_once_with("7087507348697186339", channel="douyin", token=None, userid=None, allow_interactive=False)
    assert (tmp_path / "qishui_out" / "【汽水音乐】汽水测试歌单 - 汽水作者.csv").exists()


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
        assert (tmp_path / "all_formats_out" / f"【网易云音乐】全格式测试 - 全格式作者.{ext}").exists()


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


def test_ui_semantic_colors(monkeypatch):
    from cli.core.ui import (
        color_green,
        color_yellow,
        color_red,
        color_bold,
        color_cyan,
        color_amber,
        supports_color,
    )

    # Disabled color
    monkeypatch.delenv("FORCE_COLOR", raising=False)
    monkeypatch.setenv("NO_COLOR", "1")
    assert supports_color() is False
    assert color_green("成功") == "成功"
    assert color_yellow("VIP") == "VIP"
    assert color_red("下架") == "下架"
    assert color_bold("1") == "1"
    assert color_cyan("标题") == "标题"
    assert color_amber("品牌") == "品牌"

    # Enabled color via FORCE_COLOR
    monkeypatch.delenv("NO_COLOR", raising=False)
    monkeypatch.setenv("FORCE_COLOR", "1")
    assert supports_color() is True
    assert color_green("成功") == "\033[1;32m成功\033[0m"
    assert color_yellow("VIP") == "\033[1;33mVIP\033[0m"
    assert color_red("下架") == "\033[1;31m下架\033[0m"
    assert color_bold("1") == "\033[1m1\033[0m"
    assert color_cyan("标题") == "\033[1;36m标题\033[0m"
    assert color_amber("品牌") == "\033[1;33m品牌\033[0m"


def test_script_mode_disables_color(monkeypatch, capsys):
    """验证通过输入参数跑脚本时，严禁使用任何颜色，防止影响脚本运行"""
    from cli.core.ui import set_color_enabled, supports_color
    from cli.main import main
    from unittest.mock import patch

    # 模拟环境原本支持颜色
    set_color_enabled(None)
    monkeypatch.delenv("NO_COLOR", raising=False)
    monkeypatch.delenv("FORCE_COLOR", raising=False)

    # 传入命令行参数运行 (脚本传参模式)
    test_args = ["main.py", "https://music.163.com/playlist?id=123", "--no-open"]
    with patch("sys.argv", test_args):
        with patch("cli.core.detector.SmartDetector.resolve_target") as mock_target:
            from cli.core.detector import DetectedTarget, PlatformType, TargetKind
            mock_target.return_value = DetectedTarget(
                platform=PlatformType.NETEASE,
                kind=TargetKind.PLAYLIST,
                value="123",
                raw_input="https://music.163.com/playlist?id=123"
            )
            with patch("cli.platforms.registry.PlatformRegistry.get") as mock_reg:
                mock_adapter = MagicMock()
                mock_adapter.display_name = "网易云音乐"
                mock_adapter.supported_channels = ()
                mock_adapter.requires_user_auth = False
                mock_pl = MagicMock()
                mock_pl.tracks = [MagicMock()]
                mock_adapter.fetch_playlist.return_value = mock_pl
                mock_reg.return_value = mock_adapter

                with patch("cli.main.run_export_flow", return_value=["test.csv"]):
                    main()

    # 验证在脚本传参模式下，色彩覆盖已被强制禁用
    assert supports_color() is False
    out = capsys.readouterr().out
    assert "\033[" not in out  # 零 ANSI 转义码
    set_color_enabled(None)


def test_run_export_flow_status_colors(capsys, monkeypatch):
    """测试交互导出流中，歌曲状态指示色彩 (VIP黄、下架红、正常绿、重复无色)"""
    from cli.core.ui import set_color_enabled
    from cli.core.models import NormalizedPlaylist, NormalizedTrack
    from cli.main import run_export_flow

    set_color_enabled(None)
    monkeypatch.delenv("NO_COLOR", raising=False)
    monkeypatch.setenv("FORCE_COLOR", "1")

    # 1. 混合状态歌单 (含 VIP、下架、重复)
    tracks = [
        NormalizedTrack(index=1, title="Song A", artist="Art", is_vip=True, is_available=True),
        NormalizedTrack(index=2, title="Song B", artist="Art", is_vip=False, is_available=False),
        NormalizedTrack(index=3, title="Song A", artist="Art", is_vip=False, is_available=True), # 重复
    ]
    pl = NormalizedPlaylist(
        platform="netease",
        id="123",
        name="测试歌单",
        tracks=tracks,
        track_count=3
    )

    with patch("cli.main.perform_export", return_value=[]):
        with patch("cli.main.prompt_input", return_value="0"): # 取消导出
            run_export_flow(pl, output_dir="output", default_formats=[], reveal_folder=False, interactive=True)

    out = capsys.readouterr().out
    # VIP 标黄
    assert "\033[1;33mVIP 1\033[0m" in out
    # 下架标红
    assert "\033[1;31m无版权/下架 1\033[0m" in out
    # 重复不加颜色 (无 ANSI 包裹)
    assert "重复 1" in out
    assert "\033[35m重复" not in out
    assert "\033[90m" not in out  # 无暗灰色

    # 2. 全部正常歌单
    normal_tracks = [
        NormalizedTrack(index=1, title="Song 1", artist="Art", is_vip=False, is_available=True),
    ]
    pl_normal = NormalizedPlaylist(
        platform="netease",
        id="456",
        name="正常歌单",
        tracks=normal_tracks,
        track_count=1
    )
    with patch("cli.main.perform_export", return_value=[]):
        with patch("cli.main.prompt_input", return_value="0"):
            run_export_flow(pl_normal, output_dir="output", default_formats=[], reveal_folder=False, interactive=True)

    out_normal = capsys.readouterr().out
    assert "\033[1;32m全部正常\033[0m" in out_normal

    set_color_enabled(None)


def test_interactive_sticky_platform_and_return_menu(capsys, tmp_path):
    """
    验证交互模式下：
    1. 用户选择平台 (如 1 -> 网易云音乐)，导出完毕后依然停留在网易云平台提示；
    2. 用户输入 0 返回后，显示全部平台列表与提示，但不重复显示顶部软件介绍；
    3. 根菜单下输入 0 退出程序。
    """
    from cli.core.ui import reset_exit_banner_state
    reset_exit_banner_state()

    mock_track = NormalizedTrack(index=1, title="测试歌", artist="歌手")
    mock_pl = NormalizedPlaylist(
        platform="netease",
        id="111",
        name="测试歌单",
        tracks=[mock_track],
    )

    netease_adapter = PlatformRegistry.get("netease")
    # 模拟流程：
    # 1. 根菜单输入 '1' 选择网易云音乐
    # 2. 网易云模式下输入 '111' 歌单 ID
    # 3. 纯数字确认输入 '1' (默认歌单)
    # 4. 导出格式输入 '2' (JSON)
    # 5. 第一轮导出完成后，依然处于网易云模式，输入 '0' 返回主菜单
    # 6. 根主菜单输入 '0' 退出程序
    inputs = iter(["1", "111", "1", "2", "0", "0"])

    with patch.object(netease_adapter, "fetch_playlist", return_value=mock_pl) as mock_fetch, \
         patch("cli.main.perform_export", return_value=["dummy.json"]), \
         patch("builtins.input", lambda *args: next(inputs)), \
         patch.object(sys, "argv", ["main.py", "--no-open", "-o", str(tmp_path)]):

        main()
        assert mock_fetch.called

    out = capsys.readouterr().out
    # 1. 软件标题在最开始打印过一次
    assert "Playlist Out CLI · 把你的歌单带走" in out
    assert out.count("Playlist Out CLI · 把你的歌单带走") == 1

    # 2. 第一次选择网易云音乐
    assert "已选择：网易云音乐" in out
    assert "粘贴歌单链接/分享短链，或输入歌单 ID、用户 UID（输入 0 返回）：" in out

    # 3. 用户输入 0 返回后，显示平台列表，且不显示顶部 banner
    # 平台列表应该至少出现两次 (初次启动一次，输入 0 返回一次)
    assert out.count("1  网易云音乐") == 2
    assert out.count("2  QQ 音乐") == 2
    assert out.count("💡 直接粘贴链接或分享文案即可自动识别平台。") == 2

    # 4. 最终退出
    assert "感谢使用！欢迎在 " in out
    assert " 点个 Star ⭐️" in out


def test_interactive_ctrl_c_exits_directly(capsys, tmp_path):
    """
    验证交互模式下：
    在平台模式下按 Ctrl+C 会直接安全退出程序并打印感谢横幅，而不是返回主菜单；
    输入 0 才是返回主菜单。
    """
    from cli.core.ui import reset_exit_banner_state
    reset_exit_banner_state()

    call_count = 0

    def mock_input(*args):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return "2"  # 选择 QQ 音乐
        elif call_count == 2:
            raise KeyboardInterrupt  # 在 QQ 音乐提示下直接按 Ctrl+C

    with patch("builtins.input", side_effect=mock_input), \
         patch.object(sys, "argv", ["main.py", "--no-open", "-o", str(tmp_path)]):
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    out = capsys.readouterr().out
    assert "已选择：QQ 音乐" in out
    # 直接退出，不输出 "已返回。"
    assert "已返回。" not in out
    # 平台列表仅启动时打印一次，不会因为按 Ctrl+C 再次打印
    assert out.count("1  网易云音乐") == 1
    assert "感谢使用！欢迎在 " in out
    assert " 点个 Star ⭐️" in out


def test_platform_brand_colors_and_badges(capsys):
    """验证各平台专属品牌色及 [平台名称] 提示徽标与对齐"""
    from cli.core.ui import (
        set_color_enabled,
        color_blue,
        get_platform_brand_color,
        print_main_menu,
    )
    from cli.main import get_platform_prompt_hint

    # 1. 禁用颜色测试
    set_color_enabled(False)
    assert color_blue("测试") == "测试"
    assert get_platform_brand_color("netease", "网易云") == "网易云"
    assert get_platform_brand_color("qqmusic", "QQ音乐") == "QQ音乐"
    assert get_platform_brand_color("kugou", "酷狗") == "酷狗"
    assert get_platform_brand_color("kuwo", "酷我") == "酷我"
    assert get_platform_brand_color("qishui", "汽水") == "汽水"

    netease_adapter = PlatformRegistry.get("netease")
    hint_no_color = get_platform_prompt_hint(netease_adapter)
    assert hint_no_color.startswith("[网易云音乐] 粘贴歌单链接/分享短链")

    # 2. 启用颜色测试
    set_color_enabled(True)
    try:
        assert "\033[1;34m酷狗\033[0m" == color_blue("酷狗")
        assert "\033[1;31m网易云\033[0m" == get_platform_brand_color("netease", "网易云")
        assert "\033[1;32mQQ音乐\033[0m" == get_platform_brand_color("qqmusic", "QQ音乐")
        assert "\033[1;34m酷狗音乐\033[0m" == get_platform_brand_color("kugou", "酷狗音乐")
        assert "\033[1;33m酷我音乐\033[0m" == get_platform_brand_color("kuwo", "酷我音乐")
        assert "\033[1;36m汽水音乐\033[0m" == get_platform_brand_color("qishui", "汽水音乐")

        # 别名映射测试
        assert "\033[1;31m网易云\033[0m" == get_platform_brand_color("163", "网易云")
        assert "\033[1;32mQQ\033[0m" == get_platform_brand_color("qq", "QQ")
        assert "\033[1;34mKG\033[0m" == get_platform_brand_color("kg", "KG")
        assert "\033[1;33mKW\033[0m" == get_platform_brand_color("kw", "KW")
        assert "\033[1;36m抖音\033[0m" == get_platform_brand_color("douyin", "抖音")

        # 徽标提示语彩色测试
        hint_colored = get_platform_prompt_hint(netease_adapter)
        assert "\033[1;31m[网易云音乐]\033[0m" in hint_colored
        assert "粘贴歌单链接/分享短链" in hint_colored

        qq_adapter = PlatformRegistry.get("qqmusic")
        hint_qq = get_platform_prompt_hint(qq_adapter)
        assert "\033[1;32m[QQ 音乐]\033[0m" in hint_qq

        kugou_adapter = PlatformRegistry.get("kugou")
        hint_kg = get_platform_prompt_hint(kugou_adapter)
        assert "\033[1;34m[酷狗音乐]\033[0m" in hint_kg

        kuwo_adapter = PlatformRegistry.get("kuwo")
        hint_kw = get_platform_prompt_hint(kuwo_adapter)
        assert "\033[1;33m[酷我音乐]\033[0m" in hint_kw

        qishui_adapter = PlatformRegistry.get("qishui")
        hint_qs = get_platform_prompt_hint(qishui_adapter)
        assert "\033[1;36m[汽水音乐]\033[0m" in hint_qs

        # 根菜单无平台时，不显示徽标
        assert get_platform_prompt_hint(None) == "粘贴歌单链接，或输入平台编号："

        # 主菜单输出测试
        summary = PlatformRegistry.get_summary_list()
        print_main_menu(summary)
        out = capsys.readouterr().out
        assert "\033[1;31m网易云音乐\033[0m" in out
        assert "\033[1;32mQQ 音乐\033[0m" in out
        assert "\033[1;34m酷狗音乐\033[0m" in out
        assert "\033[1;33m酷我音乐\033[0m" in out
        assert "\033[1;36m汽水音乐\033[0m" in out
    finally:
        set_color_enabled(None)





