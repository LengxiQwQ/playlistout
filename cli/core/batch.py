# -*- coding: utf-8 -*-
"""
PlaylistOut Unified Batch Playlist Export Flow
==============================================
Standardized user playlist selection, preprocessing, collision-safe naming,
batch progress tracking, and structured result aggregation across all adapters.
"""

import os
import re
from dataclasses import dataclass, field
from typing import List, Optional, Set, Any

from .models import NormalizedPlaylist, NormalizedUserPlaylists, UserPlaylistSummary
from .naming import build_export_base_name, ensure_unique_base_name
from .ui import (
    print_format_menu,
    resolve_export_formats,
    reveal_folder,
    print_divider,
    print_title,
    prompt_input,
    supports_color,
    color_green,
    color_yellow,
    color_red,
    color_cyan,
    color_bold,
)
from .exporter import perform_export


@dataclass
class BatchFailure:
    """Details of a single failed playlist in a batch operation."""
    playlist_id: str
    playlist_name: str
    error: str


@dataclass
class BatchResult:
    """Structured summary of a batch export operation."""
    total: int
    success: int
    failed: int
    exported_files: List[str] = field(default_factory=list)
    failures: List[BatchFailure] = field(default_factory=list)


def parse_playlist_selection(choice_str: str, max_items: int) -> List[int]:
    """
    解析用户选择的歌单序号字符串。
    支持：
    - 'all' / '全部': 所有歌单 (1 到 max_items)
    - 单选: '3' -> [3]
    - 多选 (逗号分隔，中英文逗号皆可): '1, 3, 5' -> [1, 3, 5]
    - 连续范围: '1-3' -> [1, 2, 3], '2-4, 7' -> [2, 3, 4, 7]
    - '0' 或空: [] (表示取消/返回)
    返回去重且升序排序的 1-indexed 序号列表。
    """
    raw = str(choice_str or "").strip()
    if not raw or raw in ("0", "q", "quit", "exit"):
        return []

    if raw.lower() in ("all", "全部", "*"):
        return list(range(1, max_items + 1))

    # 标准化分隔符（中英文逗号、分号、空格）
    normalized = raw.replace("，", ",").replace("；", ",").replace(";", ",")
    tokens = [t.strip() for t in re.split(r"[\s,]+", normalized) if t.strip()]

    selected: Set[int] = set()
    for tok in tokens:
        # 检查是否为范围格式，如 1-5 或 1~5
        range_match = re.match(r"^(\d+)\s*[-~至]\s*(\d+)$", tok)
        if range_match:
            start, end = int(range_match.group(1)), int(range_match.group(2))
            if start > end:
                start, end = end, start
            for idx in range(start, end + 1):
                if 1 <= idx <= max_items:
                    selected.add(idx)
        elif tok.isdigit():
            idx = int(tok)
            if 1 <= idx <= max_items:
                selected.add(idx)

    return sorted(list(selected))


def resolve_collision_safe_base_name(
    base_name: str,
    existing_names: Set[str],
    output_dir: str,
    formats: Optional[List[str]] = None,
) -> str:
    """
    计算碰撞安全的文件基准名。
    原则：
    - 正常情况下保持干净的基准名：'【平台】歌单名 - 作者'
    - 当同批次存在同名歌单，或目标目录下已存在同名文件时，追加 ' (2)'、' (3)' ……
    - 绝不允许静默覆盖不同歌单。
    """
    return ensure_unique_base_name(
        base_name,
        output_dir,
        formats=formats,
        reserved=existing_names,
    )


def preprocess_playlist(playlist: NormalizedPlaylist) -> int:
    """
    统一歌单数据预处理管道。
    对齐单歌单导出与批量导出的 duplicate 标记与 partial 元数据校验，
    无论单歌单还是批量导出均执行完全一致的处理。
    """
    dup_count = playlist.mark_duplicates()
    if playlist.track_count is not None and playlist.track_count > 0:
        if len(playlist.tracks) < playlist.track_count:
            playlist.is_partial = True
        elif len(playlist.tracks) >= playlist.track_count:
            playlist.is_partial = False
    return dup_count


def print_user_playlists_menu(user_playlists: NormalizedUserPlaylists) -> None:
    """打印用户公开歌单列表（支持区分自建与收藏歌单）"""
    pls = user_playlists.playlists
    created_pls = user_playlists.created_playlists
    sub_pls = user_playlists.subscribed_playlists

    print("")
    print_title("公开歌单列表", f"找到用户 {user_playlists.nickname} 的 {len(pls)} 个公开歌单", emoji="📂")
    if sub_pls:
        print(f"  自建歌单（{len(created_pls)} 个）：")
        for idx, p in enumerate(created_pls, 1):
            cnt_str = f" ({p.track_count}首)" if p.track_count is not None else ""
            num_str = color_bold(f"{idx:3d}.") if supports_color() else f"{idx:3d}."
            print(f"    {num_str} {p.name}{cnt_str}  [ID: {p.id}]")
        print(f"  收藏歌单（{len(sub_pls)} 个）：")
        for idx, p in enumerate(sub_pls, len(created_pls) + 1):
            cnt_str = f" ({p.track_count}首)" if p.track_count is not None else ""
            num_str = color_bold(f"{idx:3d}.") if supports_color() else f"{idx:3d}."
            print(f"    {num_str} {p.name}{cnt_str}  [ID: {p.id}]")
    else:
        for idx, p in enumerate(pls, 1):
            cnt_str = f" ({p.track_count}首)" if p.track_count is not None else ""
            num_str = color_bold(f"{idx:3d}.") if supports_color() else f"{idx:3d}."
            print(f"  {num_str} {p.name}{cnt_str}  [ID: {p.id}]")
    print("")


def run_batch_flow(
    adapter: Any,
    user_playlists: NormalizedUserPlaylists,
    output_dir: str = "output",
    formats: Optional[List[str]] = None,
    interactive: bool = False,
    reveal_folder_flag: bool = True,
    selection_input: Optional[str] = None,
    **fetch_options
) -> BatchResult:
    """
    统一批量导出调度入口。
    QQ 音乐、网易云音乐、酷狗音乐等所有平台共用此流程。
    """
    if not user_playlists or not user_playlists.playlists:
        return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])

    all_pls = user_playlists.playlists
    target_pls: List[UserPlaylistSummary] = []

    # ─────────────────────────────────────────────────────────────
    # 步骤 1：确定要导出的歌单子集
    # ─────────────────────────────────────────────────────────────
    if interactive:
        print_user_playlists_menu(user_playlists)
        if user_playlists.subscribed_playlists:
            sel_prompt = "选择要导出的歌单序号（输入 all 导出全部自建歌单，可多选如 1,3,5 或 1-3，输入 0 返回）："
        else:
            sel_prompt = "选择要导出的歌单序号（输入 all 全部导出，可多选如 1,3,5 或 1-3，输入 0 返回）："
        try:
            sel_str = prompt_input(sel_prompt)
        except (KeyboardInterrupt, EOFError):
            print("\n已返回。\n")
            return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])
        if not sel_str or sel_str in ("0", "q", "quit", "exit"):
            return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])

        if sel_str.lower() in ("all", "全部"):
            target_pls = user_playlists.created_playlists or all_pls
        else:
            indices = parse_playlist_selection(sel_str, len(all_pls))
            if not indices:
                warn_msg = "⚠️ 未选择有效歌单。"
                print(color_yellow(warn_msg) if supports_color() else warn_msg)
                return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])
            target_pls = [all_pls[i - 1] for i in indices]

        # 交互模式确认格式
        print_format_menu()
        try:
            fmt_choice = prompt_input("选择格式，可多选，例如 (1, 2)：", divider_on_empty=True)
            formats = resolve_export_formats(fmt_choice)
            if not formats:
                print("已返回，不导出。")
                if interactive:
                    print("")
                return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])
        except (KeyboardInterrupt, EOFError):
            print("\n已取消批量导出。\n")
            return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])
    else:
        # 非交互 (Headless) 模式：严格使用传入参数，不发起任何 input()
        if selection_input:
            if selection_input.lower() in ("all", "全部"):
                target_pls = user_playlists.created_playlists or all_pls
            else:
                indices = parse_playlist_selection(selection_input, len(all_pls))
                target_pls = [all_pls[i - 1] for i in indices] if indices else (user_playlists.created_playlists or all_pls)
        else:
            # 默认导出用户创建的全部歌单（若无自建则全量）
            target_pls = user_playlists.created_playlists or all_pls

        if formats is None:
            formats = ["xlsx", "json", "csv", "txt", "m3u8"]

    if not target_pls:
        warn_msg = "⚠️ 没有可导出的歌单。"
        print(color_yellow(warn_msg) if supports_color() else warn_msg)
        return BatchResult(total=0, success=0, failed=0, exported_files=[], failures=[])

    # ─────────────────────────────────────────────────────────────
    # 步骤 2：批量执行抓取、预处理与碰撞安全导出
    # ─────────────────────────────────────────────────────────────
    target_dir = os.path.join(output_dir, str(user_playlists.user_id))
    os.makedirs(target_dir, exist_ok=True)

    batch_start = f"\n🚀 开始批量导出 {len(target_pls)} 个歌单..."
    print(color_cyan(batch_start) if supports_color() else batch_start)
    exported_files: List[str] = []
    failures: List[BatchFailure] = []
    used_base_names: Set[str] = set()

    for idx, pl_item in enumerate(target_pls, 1):
        idx_tag = color_bold(f"[{idx}/{len(target_pls)}]") if supports_color() else f"[{idx}/{len(target_pls)}]"
        print(f"\n  {idx_tag} {pl_item.name} (ID: {pl_item.id})")
        try:
            norm_pl = adapter.fetch_playlist(pl_item.id, **fetch_options)
            if not norm_pl or not norm_pl.tracks:
                failures.append(
                    BatchFailure(
                        playlist_id=pl_item.id,
                        playlist_name=pl_item.name,
                        error="无法读取歌单或歌单歌曲为空",
                    )
                )
                skip_msg = "    ❌ 无法读取这个歌单或歌单为空，已跳过"
                print(color_red(skip_msg) if supports_color() else skip_msg)
                continue

            # 统一预处理：mark_duplicates 与元数据标准化
            preprocess_playlist(norm_pl)

            # 计算防碰撞文件名（统一命名：【平台】歌单名 - 作者，(2)/(3) 递增防覆盖）
            base_name = resolve_collision_safe_base_name(
                build_export_base_name(norm_pl.name, norm_pl.creator, norm_pl.platform),
                used_base_names,
                target_dir,
                formats,
            )

            # 执行多格式安全导出（批量模式静默局部摘要，格式项缩进 4 格）
            files = perform_export(
                norm_pl,
                output_dir=target_dir,
                formats=formats,
                reveal_folder_flag=False,
                base_name=base_name,
                show_header=False,
                show_summary=False,
                indent="    ",
                auto_flush_telemetry=False,
            )
            if files:
                exported_files.extend(files)
            else:
                failures.append(
                    BatchFailure(
                        playlist_id=pl_item.id,
                        playlist_name=pl_item.name,
                        error="所有格式导出均失败",
                    )
                )
        except Exception as e:
            failures.append(
                BatchFailure(
                    playlist_id=pl_item.id,
                    playlist_name=pl_item.name,
                    error=str(e),
                )
            )
            err_msg = f"    ❌ 处理出错：{e}"
            print(color_red(err_msg) if supports_color() else err_msg)

    # 批量导出结束：将所有歌单的所有导出事件打包为单次 HTTP 请求统一发送，极大减少对 Worker 的请求频次
    try:
        from .telemetry import flush_telemetry
        flush_telemetry(wait=False)
    except Exception:
        pass

    # ─────────────────────────────────────────────────────────────
    # 步骤 3：汇系统计与反馈
    # ─────────────────────────────────────────────────────────────
    success_count = len(target_pls) - len(failures)
    failed_count = len(failures)

    success_line = f"\n✅ 批量导出完成：成功 {success_count}/{len(target_pls)} 个歌单"
    print(color_green(success_line) if supports_color() else success_line)
    if failures:
        warn_line = f"  ⚠️ 共有 {failed_count} 个歌单导出失败："
        print(color_yellow(warn_line) if supports_color() else warn_line)
        for f in failures:
            fail_line = f"    - {f.playlist_name} [ID: {f.playlist_id}]: {f.error}"
            print(color_red(fail_line) if supports_color() else fail_line)

    print(f"  📁 保存到：{os.path.abspath(target_dir)}")

    if success_count > 0 and reveal_folder_flag:
        reveal_folder(target_dir)

    if interactive:
        print("")

    return BatchResult(
        total=len(target_pls),
        success=success_count,
        failed=failed_count,
        exported_files=exported_files,
        failures=failures,
    )
