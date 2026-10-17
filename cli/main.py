# -*- coding: utf-8 -*-
"""
Playlist Out CLI
================
Main entry point for exporting playlists from QQ Music, NetEase Cloud Music,
Kugou Music, Kuwo Music, Qishui (Douyin) Music, and Migu Music.
"""

import os
import re
import sys
import time
import argparse
from typing import Optional, List

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
    print_title,
    prompt_input,
    set_color_enabled,
    supports_color,
    color_green,
    color_yellow,
    color_red,
    color_cyan,
    color_bold,
    color_blue,
    get_platform_brand_color,
)
from cli.core.detector import (
    SmartDetector,
    PlatformType,
    TargetKind,
    DetectedTarget,
    extract_clean_url_or_input,
)
from cli.core.exporter import perform_export
from cli.core.batch import run_batch_flow, preprocess_playlist
from cli.core.telemetry import report_resolve, set_telemetry_enabled
from cli.platforms.registry import PlatformRegistry


def run_export_flow(playlist: NormalizedPlaylist, output_dir: str, default_formats: list, reveal_folder: bool, interactive: bool) -> List[str]:
    """展示简洁歌单摘要并执行导出"""
    dup_count = preprocess_playlist(playlist)
    tracks = playlist.tracks
    unavail = sum(1 for t in tracks if not t.is_available)
    vip_cnt = sum(1 for t in tracks if t.is_vip)

    if interactive:
        print("")
    print_title("歌单详情", emoji="🎵")
    print(f"  歌单：{playlist.name}")
    print(f"  作者：{playlist.creator or '未知'}")
    expected_count = playlist.track_count if (playlist.track_count and playlist.track_count > len(tracks)) else len(tracks)
    if playlist.is_partial or expected_count > len(tracks):
        partial_msg = f"{len(tracks)} / {expected_count} 首 (部分已加载)"
        if supports_color():
            partial_msg = color_yellow(partial_msg)
        print(f"  歌曲：{partial_msg}")
        if playlist.platform == "kugou":
            print("  💡 提示：酷狗普通歌单未登录受官方接口限制仅返回前 10 首；扫码登录后即可导出完整歌单（输入 login 登录；概念版集合歌单免登全量）。")
    else:
        print(f"  歌曲：{len(tracks)} 首")
    if playlist.formatted_duration:
        print(f"  时长：{playlist.formatted_duration}")

    status_parts = []
    if vip_cnt:
        vip_text = f"VIP {vip_cnt}"
        status_parts.append(color_yellow(vip_text) if supports_color() else vip_text)
    if unavail:
        unavail_text = f"无版权/下架 {unavail}"
        status_parts.append(color_red(unavail_text) if supports_color() else unavail_text)
    if dup_count:
        status_parts.append(f"重复 {dup_count}")

    if status_parts:
        print(f"  状态：{' · '.join(status_parts)}")
    else:
        normal_msg = color_green("全部正常") if supports_color() else "全部正常"
        print(f"  状态：{normal_msg}")

    formats = default_formats
    if interactive:
        print("")
        print_format_menu()
        try:
            fmt_choice = prompt_input("选择格式，可多选，例如 (1, 2)", divider_on_empty=True)
            formats = resolve_export_formats(fmt_choice)
            if not formats:
                print("已返回，不导出。")
                return []
        except (KeyboardInterrupt, EOFError):
            print("\n已取消导出。\n")
            return []
    else:
        print("")

    return perform_export(playlist, output_dir=output_dir, formats=formats, reveal_folder_flag=reveal_folder)


def get_platform_prompt_hint(adapter) -> str:
    """根据当前选定平台返回对应的交互输入提示语 (包含品牌主题色徽标)"""
    if not adapter:
        return "粘贴歌单链接，或输入平台编号："
    pid = adapter.platform_id
    badge = f"[{adapter.display_name}]"
    colored_badge = get_platform_brand_color(pid, badge)
    if pid == "qqmusic":
        return f"{colored_badge} 粘贴歌单链接/分享短链，或输入歌单 ID、用户 QQ号（输入 0 返回）："
    elif pid == "netease":
        return f"{colored_badge} 粘贴歌单链接/分享短链，或输入歌单 ID、用户 UID（输入 0 返回）："
    elif pid == "kugou":
        return f"{colored_badge} 粘贴歌单链接/分享短链或输入歌单 ID（输入 login 登录，输入 my 导出我的歌单，输入 0 返回）："
    elif pid == "kuwo":
        return f"{colored_badge} 粘贴歌单链接/分享短链，或输入歌单 ID（输入 0 返回）："
    elif pid == "migu":
        return f"{colored_badge} 粘贴歌单链接/分享短链，或输入歌单 ID（输入 0 返回）："
    elif pid == "qishui":
        return f"{colored_badge} 粘贴歌单链接、抖音分享文案，或输入歌单 ID（输入 0 返回）："
    return f"{colored_badge} 粘贴歌单链接或输入歌单 ID（输入 0 返回）："


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
        description="Playlist Out CLI 全平台音乐歌单统一导出工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
支持平台：
  - 网易云音乐 (163 / netease)
  - QQ 音乐   (qq / qqmusic)
  - 酷狗音乐   (kugou / kg)
  - 酷我音乐   (kuwo / kw)
  - 汽水音乐   (qishui / qs / douyin)
  - 咪咕音乐   (migu / mg)

使用模式示例：
  1. 智能自动识别模式：
     {inv_cmd} "https://music.163.com/playlist?id=2756674066"
     {inv_cmd} "https://y.qq.com/n/ryqq/playlist/9044196528"
  2. 显式指定平台模式 (适用于纯数字 ID)：
     {inv_cmd} "2756674066" -p netease
     {inv_cmd} "9044196528" -p qq -f xlsx,csv
  3. 酷狗凭证配置 (纯命令行非交互模式，支持使用网页版获取的 UserID 与 Token)：
     {inv_cmd} -p kugou --token <TOKEN> --userid <USERID>
  4. 交互模式 (无参数直接运行)：
     {inv_cmd}
        """
    )

    parser.add_argument("-v", "--version", action="version", version=f"Playlist Out CLI v{cli_ver}")
    parser.add_argument("--self-test", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--debug", action="store_true", help="显示详细错误堆栈信息 (调试模式)")
    parser.add_argument("input", nargs="?", help="歌单链接、短链、分享文案或纯数字 ID")
    parser.add_argument("-i", "--id", dest="opt_id", help="歌单链接、短链或 ID")
    parser.add_argument("-p", "--platform", help="显式指定目标平台 (netease, qqmusic, kugou, kuwo, qishui, migu 等)")
    parser.add_argument("-o", "--output-dir", default="output", help="导出目录 (默认: output)")
    parser.add_argument("-f", "--format", default="all", help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (默认: all)")
    parser.add_argument("--no-open", action="store_true", help="导出完成后不自动打开文件夹")

    # 平台专属参数透传
    parser.add_argument("-u", "--user", action="store_true", help="指定目标为用户（用于纯数字 UID / QQ号等脚本调用；歌单链接/歌单标签与 --user 互斥）")
    parser.add_argument("-s", "--select", dest="selection", help="用户歌单批量模式下选择要导出的歌单序号 (例如: 1 或 1,3,5 或 1-3 或 all)")
    parser.add_argument("--channel", choices=["qishui", "douyin"], default=None, help="[汽水] 解析通道: qishui 官方正版 / douyin 全量原声")
    login_group = parser.add_mutually_exclusive_group()
    login_group.add_argument("--login", action="store_true", help="[酷狗] 调出终端扫码或凭证登录")
    login_group.add_argument("--logout", action="store_true", help="[酷狗] 清除本地保存的登录凭证")
    parser.add_argument("--token", help="[酷狗] 手动传入 Token")
    parser.add_argument("--userid", help="[酷狗] 手动传入 UserID")
    parser.add_argument("--save-auth", action="store_true", help="[酷狗] 将传入的 --token 与 --userid 永久保存到本地登录配置")
    parser.add_argument("--no-telemetry", action="store_true", help="禁用匿名使用统计上报")

    args = parser.parse_args()

    if args.no_telemetry:
        set_telemetry_enabled(False)

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
            print(f"× 不支持的平台 '{args.platform}'。可选平台: {', '.join(PlatformRegistry.platform_id_list())}", file=sys.stderr)
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

    kugou_auth_args = [
        arg_name for arg_name, val in [
            ("--token", args.token),
            ("--userid", args.userid),
            ("--save-auth", getattr(args, "save_auth", False)),
            ("--login", args.login),
            ("--logout", args.logout),
        ] if val
    ]
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

    raw_input = args.opt_id or args.input
    has_token = bool(args.token)
    has_userid = bool(args.userid)

    # ─────────────────────────────────────────────────────────────
    # 酷狗登录凭证与身份管理 (纯命令行优先，严格隔离交互菜单)
    # ─────────────────────────────────────────────────────────────
    # 1. 处理 --logout 凭证清除
    if args.logout:
        kugou_adapter = PlatformRegistry.get("kugou")
        if kugou_adapter:
            kugou_adapter.handle_interactive("logout")
            if not raw_input:
                return

    # 2. 处理纯命令行非交互式凭证配置与在线验活
    # 触发条件：
    # - 传入了 --token 与 --userid 且没有提供待导出歌单链接/ID (纯凭证配置指令)
    # - 或显式指定了 --save-auth
    # - 或显式指定了 --login 并同时提供了 --token / --userid
    should_configure_auth = (
        (has_token and has_userid and not raw_input)
        or (has_token and has_userid and getattr(args, "save_auth", False))
        or (args.login and (has_token or has_userid))
    )

    if should_configure_auth:
        if not (has_token and has_userid):
            print("× 酷狗登录凭证需要成对传入 --token 与 --userid。", file=sys.stderr)
            sys.exit(2)

        from cli.platforms.kugou import configure_auth_non_interactive
        success, msg, auth_path = configure_auth_non_interactive(args.token, args.userid)
        if success:
            print(f"✓ 酷狗凭证校验成功！{msg}")
            if auth_path:
                print(f"✓ 登录凭证已安全保存至: {auth_path}")
            if not raw_input:
                return
        else:
            print(f"× 酷狗凭证校验失败：{msg}", file=sys.stderr)
            sys.exit(1)

    # 3. 处理单边传参拦截：只传了 token 或只传了 userid，且没有目标歌单
    if (has_token ^ has_userid) and not raw_input:
        print("× 酷狗登录凭证需要成对传入 --token 与 --userid。", file=sys.stderr)
        sys.exit(2)

    # 4. 处理显式 --login 且未传凭据 (调出终端扫码登录菜单)
    if args.login:
        kugou_adapter = PlatformRegistry.get("kugou")
        if kugou_adapter:
            kugou_adapter.handle_interactive("login")
            if not raw_input:
                return

    output_dir = args.output_dir if args.output_dir else "output"
    reveal_folder = not args.no_open

    # 检查是否为酷狗 Headless 用户歌单模式 (通过 -p kugou --user 且无需额外提供 input)
    is_headless_kugou_user = bool(getattr(args, "user", False) and plt_id == "kugou" and not raw_input)

    # 严格校验：若显式传了 --user 但未提供输入目标且非已登录酷狗，报错提示并退出
    if getattr(args, "user", False) and not raw_input and not is_headless_kugou_user:
        print("× 用户歌单模式需要提供目标用户 ID、QQ 号或主页链接 (酷狗平台已登录时可免传)。", file=sys.stderr)
        sys.exit(2)

    # 严格校验：若传了 --select 但未进入用户模式或无目标输入，报错提示并退出
    if getattr(args, "selection", None) and not (raw_input or is_headless_kugou_user):
        print("× 参数 --select 仅适用于用户歌单批量模式 (例如配合 --user 或用户主页链接使用)。", file=sys.stderr)
        sys.exit(2)

    # ─────────────────────────────────────────────────────────────
    # 模式判定：非交互命令行模式 vs 交互式终端模式
    # ─────────────────────────────────────────────────────────────
    has_target = bool(raw_input or is_headless_kugou_user)
    has_explicit_cli_flags = bool(
        args.platform
        or args.channel
        or args.selection
        or getattr(args, "user", False)
        or args.token
        or args.userid
        or getattr(args, "save_auth", False)
        or getattr(args, "opt_id", None)
    )

    if not has_target:
        if has_explicit_cli_flags:
            # 用户在命令行指定了平台/选项，但未提供目标歌单 URL 或 ID，拦截退化进交互式
            print(
                "× 缺少目标歌单链接或 ID。\n"
                "  用法示例：\n"
                f"    {inv_cmd} \"<url>\"\n"
                f"    {inv_cmd} \"<url>\" -p kugou -f json\n"
                f"    {inv_cmd} -p kugou --token <TOKEN> --userid <USERID>\n"
                "  无参数直接运行将启动交互式终端。",
                file=sys.stderr,
            )
            sys.exit(2)

    # ─────────────────────────────────────────────────────────────
    # 模式一：非交互命令行模式 (通过输入参数跑脚本)
    # ─────────────────────────────────────────────────────────────
    if has_target:
        # 严格铁律：通过输入参数跑脚本时，严禁使用任何颜色，防止影响脚本解析与运行
        set_color_enabled(False)
        if is_headless_kugou_user:
            target = DetectedTarget(
                platform=PlatformType.KUGOU,
                kind=TargetKind.USER,
                value="",
                raw_input="",
                is_playlist_input=False,
            )
        else:
            target = SmartDetector.resolve_target(
                raw_input=raw_input,
                platform=args.platform,
                is_user=getattr(args, "user", False),
                resolve_redirect=True
            )

        # --user 与明确歌单目标互斥：歌单链接 / 歌单标签 / 平台歌单 ID 不接受用户模式，
        # 避免被强制走用户流程后在运行期产生误导性的抓取失败。
        if getattr(args, "user", False) and getattr(target, "is_playlist_input", False):
            print(
                "× 输入是歌单目标（歌单链接 / 歌单标签），与 --user（用户歌单模式）互斥。\n"
                "  如需导出用户歌单，请使用用户主页链接，或 'QQ号: xxx' / 'UID: xxx' 形式的用户标识。",
                file=sys.stderr
            )
            sys.exit(2)

        if target.kind != TargetKind.USER and getattr(args, "selection", None):
            print("× 参数 --select 仅适用于用户歌单批量模式 (例如配合 --user 或用户主页链接使用)。", file=sys.stderr)
            sys.exit(2)

        if target.kind == TargetKind.AMBIGUOUS or target.platform == PlatformType.AMBIGUOUS_DIGITS:
            print(
                f"× 输入 '{raw_input}' 是纯数字 ID，无法自动确定平台。\n"
                "请使用 -p/--platform 参数指定平台 (例如: -p netease 或 -p qqmusic)。",
                file=sys.stderr
            )
            sys.exit(2)
        elif target.kind == TargetKind.UNKNOWN or target.platform == PlatformType.UNKNOWN:
            print("× 无法识别歌单链接。请检查链接，或使用 -p/--platform 指定平台。", file=sys.stderr)
            sys.exit(1)

        adapter = PlatformRegistry.get(target.platform.value)
        if not adapter:
            print(f"× 不支持的平台 '{target.platform.value}'。可选平台: {', '.join(PlatformRegistry.platform_id_list())}", file=sys.stderr)
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
                print(f"❌ 平台 '{adapter.display_name}' 当前不支持导出用户歌单列表。", file=sys.stderr)
                sys.exit(2)

            print(f"✅ 已识别：{adapter.display_name} (用户模式)")
            desc_target = f"：{target_text}" if target_text else ""
            print(f"🚀 正在获取用户歌单列表{desc_target}...")
            t_user_start = time.time()
            user_playlists = adapter.fetch_user_playlists(
                target_text,
                token=args.token,
                userid=args.userid,
            )
            user_latency = int((time.time() - t_user_start) * 1000)
            if not user_playlists or not user_playlists.playlists:
                report_resolve(adapter.platform_id, "failure", latency_ms=user_latency, failure_code="user_not_found")
                print("❌ 获取用户歌单失败。请检查用户标识是否正确、歌单是否公开，或登录凭证是否有效。", file=sys.stderr)
                sys.exit(1)

            report_resolve(adapter.platform_id, "success_user", track_count=len(user_playlists.playlists), latency_ms=user_latency)
            batch_res = run_batch_flow(
                adapter=adapter,
                user_playlists=user_playlists,
                output_dir=output_dir,
                formats=formats,
                interactive=False,
                selection_input=args.selection,
                reveal_folder_flag=reveal_folder,
                token=args.token,
                userid=args.userid,
            )
            if batch_res.total == 0:
                sys.exit(2 if args.selection else 1)
            if batch_res.success == 0:
                print("❌ 未能成功导出任何歌单。", file=sys.stderr)
                sys.exit(1)
            return

        print(f"✅ 已识别：{adapter.display_name}")
        print("🚀 正在获取歌单...")
        t_pl_start = time.time()
        playlist = adapter.fetch_playlist(
            target_text,
            channel=args.channel or "qishui",
            token=args.token,
            userid=args.userid,
            allow_interactive=False,
        )
        pl_latency = int((time.time() - t_pl_start) * 1000)
        if not playlist or not playlist.tracks:
            # 严格模式：headless 模式下若传入了明确的 login/logout 指令则处理，否则绝不调起任何交互输入
            if target_text and target_text.lower() in ("login", "logout", "--login", "--logout"):
                if target_text.lower() in ("login", "--login") and not (sys.stdin and hasattr(sys.stdin, "isatty") and sys.stdin.isatty()):
                    print("× 非交互终端环境下无法调出扫码登录，请使用 --token 与 --userid 传入凭证。", file=sys.stderr)
                    sys.exit(2)
                handled = adapter.handle_interactive(
                    target_text,
                    output_dir=output_dir,
                    no_open=args.no_open
                )
                if handled:
                    return

            report_resolve(adapter.platform_id, "failure", latency_ms=pl_latency, failure_code="upstream_error")
            print("❌ 获取歌单失败。请检查链接是否有效、歌单是否公开，或稍后重试。", file=sys.stderr)
            sys.exit(1)

        report_resolve(adapter.platform_id, "success_playlist", track_count=len(playlist.tracks), latency_ms=pl_latency)
        exported_files = run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=False)
        if not exported_files:
            print("❌ 未能成功导出任何文件。", file=sys.stderr)
            sys.exit(1)
        return


    # ─────────────────────────────────────────────────────────────
    # 模式二：交互式终端模式
    # ─────────────────────────────────────────────────────────────
    set_color_enabled(None)
    print_banner()
    adapters_list = PlatformRegistry.list_all()
    summary_list = PlatformRegistry.get_summary_list()
    print_main_menu(summary_list)

    current_adapter = None

    try:
        while True:
            hint = get_platform_prompt_hint(current_adapter)
            user_input = prompt_input(hint)

            if not user_input:
                print("")
                continue

            if user_input.lower() in ("0", "q", "quit", "exit"):
                if current_adapter is not None:
                    current_adapter = None
                    print_main_menu(summary_list)
                    continue
                else:
                    print_exit_banner(include_divider=False)
                    break

            if user_input.lower() in ("login", "logout"):
                kg = PlatformRegistry.get("kugou")
                if kg:
                    kg.handle_interactive(user_input.lower())
                print("")
                continue

            # 根菜单下输入 1~5 选择平台
            if current_adapter is None and user_input.isdigit() and 1 <= int(user_input) <= len(adapters_list):
                selected_adapter = adapters_list[int(user_input) - 1]
                current_adapter = selected_adapter
                sel_name = get_platform_brand_color(selected_adapter.platform_id, selected_adapter.display_name)
                print(f"✅ 已选择：{sel_name}\n")
                continue

            target_adapter = None
            target_query = user_input

            # 检测输入是否包含明确的特定平台特征 (例如 URL 域名、酷狗特有参数等)
            detected_ptype, _ = SmartDetector.detect(target_query)
            if detected_ptype not in (PlatformType.UNKNOWN, PlatformType.AMBIGUOUS_DIGITS):
                target_adapter = PlatformRegistry.get(detected_ptype.value)
            else:
                target_adapter = current_adapter

            # 若根菜单下未指定平台且为纯数字，提示纯数字所属平台选择
            if not target_adapter and (detected_ptype == PlatformType.AMBIGUOUS_DIGITS or target_query.isdigit()):
                print_title("纯数字平台选择", f"检测到纯数字：{target_query}，请选择它所属的平台：", emoji="🧭")
                for idx, a in enumerate(adapters_list, 1):
                    num_str = color_bold(str(idx)) if supports_color() else str(idx)
                    colored_name = get_platform_brand_color(a.platform_id, a.display_name)
                    print(f"  {num_str}  {colored_name}")
                k0 = color_bold("0") if supports_color() else "0"
                print(f"  {k0}  返回")
                try:
                    p_sel = prompt_input("选择平台编号")
                except (KeyboardInterrupt, EOFError):
                    print("\n已返回。\n")
                    continue
                if not p_sel or p_sel in ("0", "q", "quit", "exit"):
                    print_main_menu(summary_list)
                    continue
                if not (p_sel.isdigit() and 1 <= int(p_sel) <= len(adapters_list)):
                    warn_invalid = f"⚠️ 请输入 1-{len(adapters_list)} 中的有效平台编号。"
                    print(color_yellow(warn_invalid) if supports_color() else warn_invalid)
                    print("")
                    continue
                target_adapter = adapters_list[int(p_sel) - 1]
                sel_name = get_platform_brand_color(target_adapter.platform_id, target_adapter.display_name)
                print(f"✅ 已选择：{sel_name}\n")

            if not target_adapter:
                print(color_red("❌ 没有识别出歌单链接。") if supports_color() else "❌ 没有识别出歌单链接。")
                print("  💡 可以尝试：")
                print("  • 直接粘贴完整歌单链接或分享文案")
                print("  • 如果只有歌单 ID，先输入平台编号")
                print("")
                continue

            # 锁定当前平台为目标平台，后续轮次继续默认该平台
            was_locked = (current_adapter == target_adapter)
            current_adapter = target_adapter

            # 仅当输入了明确的 URL/文案且之前未锁定该平台时，提示已识别平台
            if detected_ptype not in (PlatformType.UNKNOWN, PlatformType.AMBIGUOUS_DIGITS) and not was_locked:
                rec_name = get_platform_brand_color(target_adapter.platform_id, target_adapter.display_name)
                print(f"✅ 已识别：{rec_name}")

            is_pure_digit = bool(re.fullmatch(r'\d+', extract_clean_url_or_input(target_query)))
            has_explicit_tag = bool(re.search(r'(?:qq|uin|uid|账号|用户|歌单|playlist)[:：\s]*\d+', target_query, re.I))
            supports_public_user_query = bool(target_adapter and target_adapter.platform_id in ("qqmusic", "netease"))

            # 交互模式快捷指令与消歧：
            # 1. 酷狗处于锁定状态时，输入 my / user / 我 / 自建 快速导出当前登录账号自建歌单
            if target_adapter and target_adapter.platform_id == "kugou" and target_query.lower() in ("my", "user", "me", "mine", "我的", "自建"):
                target = DetectedTarget(
                    platform=PlatformType.KUGOU,
                    kind=TargetKind.USER,
                    value="",
                    raw_input=target_query,
                )
            # 2. 交互模式纯数字消歧：仅当目标平台支持免登用户歌单查询 (QQ 音乐 QQ号 / 网易云 UID) 时，才询问是歌单 ID 还是用户标识
            elif is_pure_digit and not has_explicit_tag and supports_public_user_query:
                print_title("纯数字类型确认", "检测到纯数字，请确认查询目标：", emoji="🔍")
                k1 = color_bold("1") if supports_color() else "1"
                k2 = color_bold("2") if supports_color() else "2"
                print(f"  {k1}  歌单 ID (默认)")
                if target_adapter.platform_id == "qqmusic":
                    print(f"  {k2}  用户 QQ号 (一键导出该用户全部公开歌单)")
                else:
                    print(f"  {k2}  用户 UID (一键导出该用户全部自建/公开歌单)")
                print("")
                try:
                    k_sel = prompt_input("选择类型 [1/2]", divider_on_empty=True)
                except (KeyboardInterrupt, EOFError):
                    print("\n已返回。\n")
                    continue
                if k_sel in ("0", "q", "quit", "exit"):
                    print("已返回。\n")
                    continue
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
            else:
                target = SmartDetector.resolve_target(
                    target_query,
                    platform=target_adapter.platform_id if target_adapter else None,
                    resolve_redirect=True
                )

            if not target_adapter:
                print(color_red("❌ 没有识别出歌单链接。") if supports_color() else "❌ 没有识别出歌单链接。")
                print("  💡 可以尝试：")
                print("  • 直接粘贴完整歌单链接或分享文案")
                print("  • 如果只有歌单 ID，先输入平台编号")
                print("")
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
                        warn_not_support = f"⚠️ 平台 '{target_adapter.display_name}' 暂不支持导出用户歌单列表。"
                        print(color_yellow(warn_not_support) if supports_color() else warn_not_support)
                        print("")
                        continue

                    desc_target = f"：{target.value}" if target.value else ""
                    fetch_user_msg = f"🚀 正在获取用户歌单列表{desc_target}..."
                    print(color_cyan(fetch_user_msg) if supports_color() else fetch_user_msg)
                    t_iuser_start = time.time()
                    user_pls = target_adapter.fetch_user_playlists(
                        target.value,
                        token=args.token,
                        userid=args.userid,
                    )
                    iuser_lat = int((time.time() - t_iuser_start) * 1000)
                    if not user_pls or not user_pls.playlists:
                        report_resolve(target_adapter.platform_id, "failure", latency_ms=iuser_lat, failure_code="user_not_found")
                        err_user_msg = "❌ 获取用户歌单失败。请检查用户标识是否正确、歌单是否公开，或账号凭证是否有效。"
                        print(color_red(err_user_msg) if supports_color() else err_user_msg)
                        print("")
                        continue

                    report_resolve(target_adapter.platform_id, "success_user", track_count=len(user_pls.playlists), latency_ms=iuser_lat)
                    run_batch_flow(
                        adapter=target_adapter,
                        user_playlists=user_pls,
                        output_dir=output_dir,
                        formats=None,
                        interactive=True,
                        selection_input=args.selection,
                        reveal_folder_flag=reveal_folder,
                        token=args.token,
                        userid=args.userid,
                    )
                    continue

                fetch_msg = "🚀 正在获取歌单..."
                print(color_cyan(fetch_msg) if supports_color() else fetch_msg)
                t_ipl_start = time.time()
                playlist = target_adapter.fetch_playlist(
                    target_query,
                    channel=args.channel or "qishui",
                    token=args.token,
                    userid=args.userid,
                    allow_interactive=True,
                )
                ipl_lat = int((time.time() - t_ipl_start) * 1000)
                if not playlist or not playlist.tracks:
                    report_resolve(target_adapter.platform_id, "failure", latency_ms=ipl_lat, failure_code="upstream_error")
                    fail_fetch_msg = "\n❌ 获取歌单失败。"
                    print(color_red(fail_fetch_msg) if supports_color() else fail_fetch_msg)
                    print("  💡 请检查链接是否有效、歌单是否公开，或稍后重试。")
                    print("")
                    continue

                report_resolve(target_adapter.platform_id, "success_playlist", track_count=len(playlist.tracks), latency_ms=ipl_lat)
                run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=True)
                print("")
            except (KeyboardInterrupt, EOFError):
                print("\n已取消。\n")
                continue
            except Exception as loop_err:
                if args.debug or os.environ.get("PLAYLISTOUT_DEBUG"):
                    import traceback
                    traceback.print_exc()
                else:
                    err_msg = f"\n❌ 处理歌单时出错：{loop_err}"
                    print(color_red(err_msg) if supports_color() else err_msg)
                    print("")

    except (KeyboardInterrupt, EOFError):
        print_exit_banner()
        keep_console_alive_on_exit()
        sys.exit(0)


_CONSOLE_ALIVE_INVOKED = False


def reset_console_alive_state():
    """重置终端保活触发标记 (测试专用)"""
    global _CONSOLE_ALIVE_INVOKED
    _CONSOLE_ALIVE_INVOKED = False


def is_standalone_console() -> bool:
    """
    检测当前是否为 Windows 资源管理器双击新建的独立控制台窗口。
    - 在独立控制台中，附着的控制台进程列表通常只有当前进程与系统控制台宿主 (<= 2)。
    - 若从已有 CMD/PowerShell 终端启动，进程数通常 >= 3。
    """
    if sys.platform != "win32":
        return False
    if not (sys.stdin and hasattr(sys.stdin, "isatty") and sys.stdin.isatty()):
        return False
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    try:
        import ctypes
        if not hasattr(ctypes, "windll"):
            return False
        pids = (ctypes.c_uint * 2)()
        count = ctypes.windll.kernel32.GetConsoleProcessList(pids, 2)
        return count <= 2
    except Exception:
        return False


def keep_console_alive_on_exit():
    """
    当程序在 Windows 独立控制台（如双击打开的单文件 exe）中退出时，
    无缝转入系统交互命令行模式，防止窗口闪退，完整保留退出横幅并提供可交互终端。
    """
    global _CONSOLE_ALIVE_INVOKED
    if _CONSOLE_ALIVE_INVOKED:
        return
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return
    if is_standalone_console() and len(sys.argv) <= 1:
        _CONSOLE_ALIVE_INVOKED = True
        try:
            # 移交当前窗口给系统 CMD，窗口不关闭且保持交互命令行
            os.system("cmd /k")
        except Exception:
            pass


def run_cli_entry():
    """统一最外层入口封装，集中处理退出码、未捕获异常与终端保活"""
    try:
        main()
        keep_console_alive_on_exit()
    except SystemExit as se:
        code = se.code if isinstance(se.code, int) else (0 if se.code is None else 1)
        if code == 0:
            keep_console_alive_on_exit()
        elif sys.platform == "win32" and sys.stdin and sys.stdin.isatty():
            if len(sys.argv) <= 1 and code != 0:
                try:
                    input("\n按回车键关闭窗口...")
                except Exception:
                    pass
        sys.exit(code)
    except (KeyboardInterrupt, EOFError):
        print_exit_banner()
        keep_console_alive_on_exit()
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
