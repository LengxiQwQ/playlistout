# -*- coding: utf-8 -*-
"""
PlaylistOut Unified CLI
=======================
Main entry point for exporting playlists from QQ Music, NetEase Cloud Music,
Kugou Music, Kuwo Music, and Qishui (Douyin) Music.
"""

import os
import sys
import argparse

# 确保项目根目录与 cli 目录在 sys.path 中
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_CURRENT_DIR, ".."))
for _p in (_REPO_ROOT, _CURRENT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# 针对 Windows 控制台尽量启用 UTF-8 编码避免特殊字符乱码
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from cli.core.models import NormalizedPlaylist
from cli.core.version import get_version
from cli.core.ui import (
    print_banner,
    print_main_menu,
    print_format_menu,
    resolve_export_formats,
    print_exit_banner,
    print_divider,
)
from cli.core.detector import SmartDetector, PlatformType, TargetKind, DetectedTarget
from cli.core.exporter import perform_export
from cli.core.batch import run_batch_flow, preprocess_playlist
from cli.platforms.registry import PlatformRegistry


def run_export_flow(playlist: NormalizedPlaylist, output_dir: str, default_formats: list, reveal_folder: bool, interactive: bool) -> List[str]:
    """展示简洁歌单摘要并执行导出"""
    dup_count = preprocess_playlist(playlist)
    tracks = playlist.tracks
    unavail = sum(1 for t in tracks if not t.is_available)
    vip_cnt = sum(1 for t in tracks if t.is_vip)

    print("\n✓ 获取成功\n")
    print(f"  歌单：{playlist.name}")
    print(f"  作者：{playlist.creator or '未知'}")
    expected_count = playlist.track_count if (playlist.track_count and playlist.track_count > len(tracks)) else len(tracks)
    if playlist.is_partial or expected_count > len(tracks):
        print(f"  歌曲：{len(tracks)} / {expected_count} 首 (部分已加载)")
    else:
        print(f"  歌曲：{len(tracks)} 首")
    if playlist.formatted_duration:
        print(f"  时长：{playlist.formatted_duration}")

    status_parts = []
    if vip_cnt:
        status_parts.append(f"VIP {vip_cnt}")
    if unavail:
        status_parts.append(f"无版权/下架 {unavail}")
    if dup_count:
        status_parts.append(f"重复 {dup_count}")
    print(f"  状态：{' · '.join(status_parts) if status_parts else '全部正常'}")

    formats = default_formats
    if interactive:
        print_format_menu()
        fmt_choice = input("> 选择格式，可多选，例如 (1, 2)：").strip()
        print_divider()
        formats = resolve_export_formats(fmt_choice)
        if not formats:
            print("已返回，不导出。")
            return []
    else:
        print("")

    return perform_export(playlist, output_dir=output_dir, formats=formats, reveal_folder_flag=reveal_folder)


def get_cli_invocation_name(is_frozen: bool = None, sys_platform: str = None) -> str:
    """Determine user-facing command invocation string based on runtime mode."""
    if is_frozen is None:
        is_frozen = getattr(sys, "frozen", False)
    if sys_platform is None:
        sys_platform = sys.platform

    if not is_frozen:
        return "python cli/main.py"
    if sys_platform == "win32":
        return "PlaylistOut.exe"
    return "./PlaylistOut"


def main():
    cli_ver = get_version()
    inv_cmd = get_cli_invocation_name()

    parser = argparse.ArgumentParser(
        prog=inv_cmd,
        description="PlaylistOut 全平台音乐歌单统一导出工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
支持平台：
  - 网易云音乐 (163 / netease)
  - QQ 音乐   (qq / qqmusic)
  - 酷狗音乐   (kugou / kg)
  - 酷我音乐   (kuwo / kw)
  - 汽水音乐   (qishui / qs / douyin)

使用模式示例：
  1. 智能自动识别模式：
     {inv_cmd} "https://music.163.com/playlist?id=2756674066"
     {inv_cmd} "https://y.qq.com/n/ryqq/playlist/9044196528"
  2. 显式指定平台模式 (适用于纯数字 ID)：
     {inv_cmd} "2756674066" -p netease
     {inv_cmd} "9044196528" -p qq -f xlsx,csv
  3. 交互模式 (无参数直接运行)：
     {inv_cmd}
        """
    )

    parser.add_argument("-v", "--version", action="version", version=f"PlaylistOut CLI v{cli_ver}")
    parser.add_argument("--self-test", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--debug", action="store_true", help="显示详细错误堆栈信息 (调试模式)")
    parser.add_argument("input", nargs="?", help="歌单链接、短链、分享文案或纯数字 ID")
    parser.add_argument("-i", "--id", dest="opt_id", help="歌单链接、短链或 ID")
    parser.add_argument("-p", "--platform", help="显式指定目标平台 (netease, qqmusic, kugou, kuwo, qishui 等)")
    parser.add_argument("-o", "--output-dir", default="output", help="导出目录 (默认: output)")
    parser.add_argument("-f", "--format", default="all", help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (默认: all)")
    parser.add_argument("--no-open", action="store_true", help="导出完成后不自动打开文件夹")

    # 平台专属参数透传
    parser.add_argument("--user", action="store_true", help="指定目标为用户（用于纯数字 UID / QQ号等脚本调用）")
    parser.add_argument("--channel", choices=["qishui", "douyin"], default=None, help="[汽水] 解析通道: qishui 官方正版 / douyin 全量原声")
    login_group = parser.add_mutually_exclusive_group()
    login_group.add_argument("--login", action="store_true", help="[酷狗] 调出终端扫码或凭证登录")
    login_group.add_argument("--logout", action="store_true", help="[酷狗] 清除本地保存的登录凭证")
    parser.add_argument("--token", help="[酷狗] 手动传入 Token")
    parser.add_argument("--userid", help="[酷狗] 手动传入 UserID")

    args = parser.parse_args()

    if args.self_test:
        from cli.core.self_test import run_self_test
        sys.exit(run_self_test())

    # 导出格式严格校验 (非交互或命令行传参模式)
    try:
        formats = resolve_export_formats(args.format, strict=True)
        if not formats:
            print("× 导出格式无效。请指定有效格式 (例如: -f json 或 -f xlsx,csv)。", file=sys.stderr)
            sys.exit(2)
    except ValueError as ve:
        print(f"× {ve}", file=sys.stderr)
        sys.exit(2)

    # 平台专属参数有效性校验
    plt_id = None
    if args.platform:
        plt_norm = args.platform.lower().strip()
        reg_entry = PlatformRegistry.get(plt_norm)
        if not reg_entry:
            print(f"× 不支持的平台 '{args.platform}'。可选平台: netease, qqmusic, kugou, kuwo, qishui", file=sys.stderr)
            sys.exit(2)
        plt_id = reg_entry.platform_id

    if args.channel is not None:
        if plt_id:
            adapter = PlatformRegistry.get(plt_id)
            if adapter and not adapter.supported_channels:
                print(f"× 参数 --channel 仅适用于汽水音乐平台 (qishui)，当前指定平台为 '{args.platform}'。", file=sys.stderr)
                sys.exit(2)
        if not plt_id and not (args.opt_id or args.input):
            print("× 参数 --channel 仅适用于汽水音乐平台 (qishui)，请配合 -p qishui 或汽水链接使用。", file=sys.stderr)
            sys.exit(2)

    kugou_auth_args = [arg_name for arg_name, val in [("--token", args.token), ("--userid", args.userid), ("--login", args.login), ("--logout", args.logout)] if val]
    if kugou_auth_args:
        if plt_id:
            adapter = PlatformRegistry.get(plt_id)
            if adapter and not adapter.requires_user_auth:
                print(f"× 参数 {', '.join(kugou_auth_args)} 仅适用于酷狗音乐平台 (kugou)，当前指定平台为 '{args.platform}'。", file=sys.stderr)
                sys.exit(2)

    if args.user and plt_id:
        adapter = PlatformRegistry.get(plt_id)
        if adapter and not adapter.supports_user_playlists:
            print(f"× 平台 '{adapter.display_name}' 当前不支持导出用户歌单列表。", file=sys.stderr)
            sys.exit(2)

    # 处理全局平台专属快捷操作 (如酷狗登录/注销)
    if args.login or args.logout:
        kugou_adapter = PlatformRegistry.get("kugou")
        if kugou_adapter:
            kugou_adapter.handle_interactive("login" if args.login else "logout")
            if not args.input and not args.opt_id:
                return

    raw_input = args.opt_id or args.input
    output_dir = args.output_dir if args.output_dir else "output"
    reveal_folder = not args.no_open

    # ─────────────────────────────────────────────────────────────
    # 模式一：非交互命令行模式
    # ─────────────────────────────────────────────────────────────
    if raw_input:
        target = SmartDetector.resolve_target(
            raw_input=raw_input,
            platform=args.platform,
            is_user=getattr(args, "user", False),
            resolve_redirect=True
        )

        if target.kind == TargetKind.AMBIGUOUS or target.platform == PlatformType.AMBIGUOUS_DIGITS:
            print(
                f"× 输入 '{raw_input}' 是纯数字 ID，无法自动确定平台。\n"
                "请使用 -p/--platform 参数指定平台 (例如: -p netease 或 -p qqmusic)。",
                file=sys.stderr
            )
            sys.exit(1)
        elif target.kind == TargetKind.UNKNOWN or target.platform == PlatformType.UNKNOWN:
            print("× 无法识别歌单链接。请检查链接，或使用 -p/--platform 指定平台。", file=sys.stderr)
            sys.exit(1)

        adapter = PlatformRegistry.get(target.platform.value)
        if not adapter:
            print(f"× 不支持的平台 '{target.platform.value}'。可选平台: netease, qqmusic, kugou, kuwo, qishui", file=sys.stderr)
            sys.exit(2)

        # 平台专属参数与识别出的目标平台校验 (针对未传 -p 但通过 URL 识别的情况)
        if args.channel is not None and not adapter.supported_channels:
            print(f"× 参数 --channel 仅适用于汽水音乐平台 (qishui)，当前目标平台为 '{target.platform.value}'。", file=sys.stderr)
            sys.exit(2)

        if kugou_auth_args and not adapter.requires_user_auth:
            print(f"× 参数 {', '.join(kugou_auth_args)} 仅适用于酷狗音乐平台 (kugou)，当前目标平台为 '{target.platform.value}'。", file=sys.stderr)
            sys.exit(2)

        target_text = target.value

        # Phase 3: 统一用户模式批量导出
        if target.kind == TargetKind.USER:
            if not adapter.supports_user_playlists:
                print(f"× 平台 '{adapter.display_name}' 当前不支持导出用户歌单列表。", file=sys.stderr)
                sys.exit(2)

            print(f"✓ 已识别：{adapter.display_name} (用户模式)")
            print(f"→ 正在获取用户歌单列表：{target_text}...")
            user_playlists = adapter.fetch_user_playlists(
                target_text,
                token=args.token,
                userid=args.userid,
            )
            if not user_playlists or not user_playlists.playlists:
                print("× 获取用户歌单失败。请检查用户标识是否正确、歌单是否公开，或登录凭证是否有效。", file=sys.stderr)
                sys.exit(1)

            batch_res = run_batch_flow(
                adapter=adapter,
                user_playlists=user_playlists,
                output_dir=output_dir,
                formats=formats,
                interactive=False,
                reveal_folder_flag=reveal_folder,
                token=args.token,
                userid=args.userid,
            )
            if batch_res.success == 0:
                print("× 未能成功导出任何歌单。", file=sys.stderr)
                sys.exit(1)
            return

        print(f"✓ 已识别：{adapter.display_name}")
        print("→ 正在获取歌单...")
        playlist = adapter.fetch_playlist(
            target_text,
            channel=args.channel or "qishui",
            token=args.token,
            userid=args.userid,
        )
        if not playlist or not playlist.tracks:
            # 尝试专属交互流（如酷狗凭证管理等）
            handled = adapter.handle_interactive(
                target_text,
                output_dir=output_dir,
                no_open=args.no_open
            )
            if handled:
                return

            print("× 获取歌单失败。请检查链接是否有效、歌单是否公开，或稍后重试。", file=sys.stderr)
            sys.exit(1)

        exported_files = run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=False)
        if not exported_files:
            print("× 未能成功导出任何文件。", file=sys.stderr)
            sys.exit(1)
        return


    # ─────────────────────────────────────────────────────────────
    # 模式二：交互式终端模式
    # ─────────────────────────────────────────────────────────────
    print_banner()
    adapters_list = PlatformRegistry.list_all()
    print_main_menu(PlatformRegistry.get_summary_list())

    try:
        while True:
            user_input = input("> 粘贴歌单链接，或输入平台编号：").strip()
            if not user_input:
                continue
            if user_input in ("0", "q", "quit", "exit"):
                print_exit_banner()
                break
            print_divider()

            if user_input.lower() in ("login", "logout"):
                kg = PlatformRegistry.get("kugou")
                if kg:
                    kg.handle_interactive(user_input.lower())
                continue

            target_adapter = None
            target_query = user_input

            if user_input.isdigit() and 1 <= int(user_input) <= len(adapters_list):
                selected_adapter = adapters_list[int(user_input) - 1]
                print(f"✓ 已选择：{selected_adapter.display_name}")
                sub_input = input("> 粘贴歌单链接、短链或输入歌单 ID（0 返回）：").strip()
                if not sub_input:
                    continue
                if sub_input in ("0", "q", "quit", "exit"):
                    continue
                print_divider()
                target_adapter = selected_adapter
                target_query = sub_input

            target = SmartDetector.resolve_target(
                target_query,
                platform=target_adapter.platform_id if target_adapter else None,
                resolve_redirect=True
            )
            if target.kind == TargetKind.AMBIGUOUS or target.platform == PlatformType.AMBIGUOUS_DIGITS:
                if not target_adapter:
                    print(f"! 检测到纯数字 ID：{target_query}")
                    print("  请选择它所属的平台：")
                    for idx, a in enumerate(adapters_list, 1):
                        print(f"  {idx}  {a.display_name}")
                    print("  0  返回")
                    p_sel = input("> 选择平台编号：").strip()
                    if not p_sel or p_sel in ("0", "q", "quit", "exit"):
                        continue
                    if not (p_sel.isdigit() and 1 <= int(p_sel) <= len(adapters_list)):
                        print("! 请输入 1-5 中的有效平台编号。")
                        continue
                    print_divider()
                    target_adapter = adapters_list[int(p_sel) - 1]
                    print(f"✓ 已选择：{target_adapter.display_name}")

                if target_adapter and target_adapter.supports_user_playlists:
                    print("  这是：")
                    print("  [1] 歌单 ID (默认)")
                    print("  [2] 用户 / QQ号 / UID")
                    k_sel = input("> 选择类型 [1/2]：").strip()
                    if k_sel == "2":
                        target = DetectedTarget(
                            platform=PlatformType(target_adapter.platform_id),
                            kind=TargetKind.USER,
                            value=target_query,
                            raw_input=target_query,
                        )
                    else:
                        target = DetectedTarget(
                            platform=PlatformType(target_adapter.platform_id),
                            kind=TargetKind.PLAYLIST,
                            value=target_query,
                            raw_input=target_query,
                        )
            elif target.platform != PlatformType.UNKNOWN:
                if not target_adapter:
                    target_adapter = PlatformRegistry.get(target.platform.value)
                    if target_adapter:
                        print(f"✓ 已识别：{target_adapter.display_name}")
                target_query = target.value
            else:
                target_query = target.value
                if target_adapter:
                    print(f"✓ 已识别：{target_adapter.display_name}")

            if not target_adapter:
                print("× 没有识别出歌单链接。")
                print("  可以尝试：")
                print("  • 直接粘贴完整歌单链接或分享文案")
                print("  • 如果只有歌单 ID，先输入平台编号")
                continue

            try:
                handled = target_adapter.handle_interactive(
                    target_query,
                    output_dir=output_dir,
                    no_open=args.no_open
                )
                if handled:
                    continue

                if target.kind == TargetKind.USER:
                    if not target_adapter.supports_user_playlists:
                        print(f"! 平台 '{target_adapter.display_name}' 暂不支持导出用户歌单列表。")
                        continue

                    print(f"→ 正在获取用户歌单列表：{target.value}...")
                    user_pls = target_adapter.fetch_user_playlists(
                        target.value,
                        token=args.token,
                        userid=args.userid,
                    )
                    if not user_pls or not user_pls.playlists:
                        print("× 获取用户歌单失败。请检查用户标识是否正确、歌单是否公开，或账号凭证是否有效。")
                        continue

                    run_batch_flow(
                        adapter=target_adapter,
                        user_playlists=user_pls,
                        output_dir=output_dir,
                        formats=None,
                        interactive=True,
                        reveal_folder_flag=reveal_folder,
                        token=args.token,
                        userid=args.userid,
                    )
                    continue

                print("→ 正在获取歌单...")
                playlist = target_adapter.fetch_playlist(
                    target_query,
                    channel=args.channel,
                    token=args.token,
                    userid=args.userid,
                )
                if not playlist or not playlist.tracks:
                    print("\n× 获取歌单失败。")
                    print("  请检查链接是否有效、歌单是否公开，或稍后重试。")
                    continue

                run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=True)
                print()
            except (KeyboardInterrupt, EOFError):
                raise
            except Exception as loop_err:
                if args.debug or os.environ.get("PLAYLISTOUT_DEBUG"):
                    import traceback
                    traceback.print_exc()
                else:
                    print(f"\n× 处理歌单时出错：{loop_err}")

    except (KeyboardInterrupt, EOFError):
        print_exit_banner()


def run_cli_entry():
    """统一最外层入口封装，集中处理退出码、未捕获异常与终端暂停"""
    try:
        main()
    except SystemExit as se:
        code = se.code if isinstance(se.code, int) else (0 if se.code is None else 1)
        if sys.platform == "win32" and sys.stdin and sys.stdin.isatty():
            if len(sys.argv) <= 1 and code != 0:
                try:
                    input("\n按回车键关闭窗口...")
                except Exception:
                    pass
        sys.exit(code)
    except (KeyboardInterrupt, EOFError):
        print_exit_banner()
        sys.exit(0)
    except Exception as e:
        is_debug = "--debug" in sys.argv or bool(os.environ.get("PLAYLISTOUT_DEBUG"))
        if is_debug:
            import traceback
            traceback.print_exc()
        else:
            print(f"\n× 程序发生异常：{e}", file=sys.stderr)

        if sys.platform == "win32" and sys.stdin and sys.stdin.isatty():
            if len(sys.argv) <= 1:
                try:
                    input("\n按回车键关闭窗口...")
                except Exception:
                    pass
        sys.exit(1)


if __name__ == "__main__":
    run_cli_entry()
