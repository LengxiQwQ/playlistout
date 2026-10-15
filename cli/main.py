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
from cli.core.ui import (
    print_banner,
    print_main_menu,
    print_format_menu,
    resolve_export_formats,
    print_exit_banner,
)
from cli.core.detector import SmartDetector, PlatformType
from cli.core.exporter import perform_export
from cli.platforms.registry import PlatformRegistry


def run_export_flow(playlist: NormalizedPlaylist, output_dir: str, default_formats: list, reveal_folder: bool, interactive: bool):
    """展示歌单统计并执行导出"""
    dup_count = playlist.mark_duplicates()
    tracks = playlist.tracks
    unavail = sum(1 for t in tracks if not t.is_available)
    vip_cnt = sum(1 for t in tracks if t.is_vip)
    normal_cnt = len(tracks) - unavail - vip_cnt

    print(f"\n歌单：{playlist.name}（作者：{playlist.creator or '未知'}，共 {len(tracks)} 首）")
    dup_msg = f"，发现重复单曲 {dup_count} 首" if dup_count > 0 else ""
    print(f"状态统计：正常 {normal_cnt} 首，VIP专享 {vip_cnt} 首，下架/无版权 {unavail} 首{dup_msg}")
    if playlist.formatted_duration:
        print(f"总计播放时长：{playlist.formatted_duration}")

    formats = default_formats
    if interactive:
        print_format_menu()
        fmt_input = input("请输入格式编号 [1-5 / 0 全部导出] (默认: 0): ").strip()
        print("=" * 64)
        formats = resolve_export_formats(fmt_input)

    perform_export(playlist, output_dir=output_dir, formats=formats, reveal_folder_flag=reveal_folder)



def main():
    parser = argparse.ArgumentParser(
        description="PlaylistOut 全平台音乐歌单统一导出工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
支持平台：
  - 网易云音乐 (163 / netease)
  - QQ 音乐   (qq / qqmusic)
  - 酷狗音乐   (kugou / kg)
  - 酷我音乐   (kuwo / kw)
  - 汽水音乐   (qishui / qs / douyin)

使用模式示例：
  1. 智能自动识别模式：
     python cli/main.py "https://music.163.com/playlist?id=2756674066"
     python cli/main.py "https://y.qq.com/n/ryqq/playlist/9044196528"
  2. 显式指定平台模式 (适用于纯数字 ID)：
     python cli/main.py "2756674066" -p netease
     python cli/main.py "9044196528" -p qq -f xlsx,csv
  3. 交互模式 (无参数直接运行)：
     python cli/main.py
        """
    )

    parser.add_argument("-v", "--version", action="version", version="PlaylistOut CLI v2.2.0")
    parser.add_argument("input", nargs="?", help="歌单链接、短链、分享文案或纯数字 ID")
    parser.add_argument("-i", "--id", dest="opt_id", help="歌单链接、短链或 ID")
    parser.add_argument("-p", "--platform", help="显式指定目标平台 (netease, qqmusic, kugou, kuwo, qishui 等)")
    parser.add_argument("-o", "--output-dir", default="output", help="导出目录 (默认: output)")
    parser.add_argument("-f", "--format", default="all", help="导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (默认: all)")
    parser.add_argument("--no-open", action="store_true", help="导出完成后不自动打开文件夹")

    # 平台专属参数透传
    parser.add_argument("--channel", choices=["qishui", "douyin"], default="qishui", help="[汽水] 解析通道: qishui 官方正版 / douyin 全量原声")
    parser.add_argument("--login", action="store_true", help="[酷狗] 调出终端扫码或凭证登录")
    parser.add_argument("--logout", action="store_true", help="[酷狗] 清除本地保存的登录凭证")
    parser.add_argument("--token", help="[酷狗] 手动传入 Token")
    parser.add_argument("--userid", help="[酷狗] 手动传入 UserID")

    args = parser.parse_args()

    # 处理全局平台专属快捷操作 (如酷狗登录/注销)
    if args.login or args.logout:
        kugou_adapter = PlatformRegistry.get("kugou")
        if kugou_adapter:
            kugou_adapter.handle_interactive("login" if args.login else "logout")
            if not args.input and not args.opt_id:
                return

    raw_input = args.opt_id or args.input
    output_dir = args.output_dir if args.output_dir else "output"
    formats = resolve_export_formats(args.format)
    reveal_folder = not args.no_open

    # ─────────────────────────────────────────────────────────────
    # 模式一：非交互命令行模式
    # ─────────────────────────────────────────────────────────────
    if raw_input:
        target_text = raw_input.strip()
        adapter = None

        if args.platform:
            adapter = PlatformRegistry.get(args.platform)
            if not adapter:
                print(f"错误: 不支持的平台 '{args.platform}'。可选平台: netease, qqmusic, kugou, kuwo, qishui", file=sys.stderr)
                sys.exit(1)
        else:
            ptype, detected_text = SmartDetector.detect(target_text)
            if ptype == PlatformType.AMBIGUOUS_DIGITS:
                print(
                    f"错误: 输入 '{target_text}' 为纯数字 ID，无法自动确定平台。\n"
                    "请使用 -p/--platform 参数指定平台 (例如: -p netease 或 -p qqmusic)。",
                    file=sys.stderr
                )
                sys.exit(1)
            elif ptype == PlatformType.UNKNOWN:
                print(f"错误: 无法识别输入的目标平台，请检查链接或使用 -p 显式指定。", file=sys.stderr)
                sys.exit(1)
            else:
                adapter = PlatformRegistry.get(ptype.value)
                target_text = detected_text

        if not adapter:
            print("错误: 未找到对应的平台适配器。", file=sys.stderr)
            sys.exit(1)

        print(f"[*] 目标平台: {adapter.display_name}")
        playlist = adapter.fetch_playlist(
            target_text,
            channel=args.channel,
            token=args.token,
            userid=args.userid,
        )
        if not playlist or not playlist.tracks:
            # 尝试专属交互流（如用户公开歌单列表、酷狗凭证）
            handled = adapter.handle_interactive(
                target_text,
                output_dir=output_dir,
                no_open=args.no_open
            )
            if handled:
                return

            print("错误: 获取歌单数据失败，请检查链接有效性或网络连接。", file=sys.stderr)
            sys.exit(1)

        run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=False)
        return


    # ─────────────────────────────────────────────────────────────
    # 模式二：交互式终端模式
    # ─────────────────────────────────────────────────────────────
    print_banner()
    adapters_list = PlatformRegistry.list_all()

    try:
        while True:
            print_main_menu(PlatformRegistry.get_summary_list())
            user_input = input("请输入歌单链接、短链，或选择平台编号 [1-5] (输入 0 退出)：").strip()
            print("=" * 64)

            if not user_input or user_input in ("0", "q", "quit", "exit"):
                print_exit_banner()
                break

            # 专属指令处理 (如酷狗登录)
            if user_input.lower() in ("login", "logout"):
                kg = PlatformRegistry.get("kugou")
                if kg:
                    kg.handle_interactive(user_input.lower())
                continue

            target_adapter = None
            target_query = user_input

            # A. 用户直接输入了平台序号 1~5 预选平台
            if user_input.isdigit() and 1 <= int(user_input) <= len(adapters_list):
                selected_adapter = adapters_list[int(user_input) - 1]
                print(f"\n[已锁定平台: {selected_adapter.display_name}]")
                sub_input = input(f"请输入 {selected_adapter.display_name} 的歌单链接、短链或 ID (输入 0 返回主菜单)：").strip()
                print("=" * 64)
                if not sub_input or sub_input in ("0", "q", "quit", "exit"):
                    continue
                target_adapter = selected_adapter
                target_query = sub_input

            # B. 智能自动识别用户粘贴的链接/文案
            if not target_adapter:
                ptype, detected_text = SmartDetector.detect(target_query)
                if ptype == PlatformType.AMBIGUOUS_DIGITS:
                    print(f"\n[?] 检测到纯数字 ID '{target_query}'，无法自动唯一确定平台。")
                    print("请选择对应的音乐平台：")
                    for idx, a in enumerate(adapters_list, 1):
                        print(f"  [{idx}] {a.display_name}")
                    print("  [0] 取消返回\n")
                    p_sel = input("请选择平台编号 [1-5] (默认: 1): ").strip()
                    print("=" * 64)
                    if p_sel in ("0", "q"):
                        continue
                    p_idx = int(p_sel) - 1 if p_sel.isdigit() and 1 <= int(p_sel) <= len(adapters_list) else 0
                    target_adapter = adapters_list[p_idx]
                elif ptype != PlatformType.UNKNOWN:
                    target_adapter = PlatformRegistry.get(ptype.value)
                    target_query = detected_text
                    if target_adapter:
                        print(f"\n[⚡ 智能识别] 目标平台: 【{target_adapter.display_name}】")

            if not target_adapter:
                print("❌ 无法识别输入的格式或链接，请重试或先输入 1-5 锁定平台。")
                print("=" * 64)
                continue

            # 检查平台特有交互流 (例如 QQ/网易云用户公开歌单列表批量)
            handled = target_adapter.handle_interactive(
                target_query,
                output_dir=output_dir,
                no_open=args.no_open
            )
            if handled:
                continue

            # 标准歌单抓取流程
            print(f"正在抓取歌单数据...")
            playlist = target_adapter.fetch_playlist(
                target_query,
                channel=args.channel,
                token=args.token,
                userid=args.userid,
            )
            if not playlist or not playlist.tracks:
                print("❌ 获取歌单失败，请检查链接有效性、是否为公开歌单或重试。")
                print("=" * 64)
                continue

            run_export_flow(playlist, output_dir, formats, reveal_folder, interactive=True)

    except (KeyboardInterrupt, EOFError):
        print_exit_banner()


if __name__ == "__main__":
    main()
