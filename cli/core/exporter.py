# -*- coding: utf-8 -*-
"""
PlaylistOut Unified Exporter
============================
Export normalized playlists to XLSX, CSV, Canonical JSON, TXT, and M3U8.
"""

import os
import csv
import json
from datetime import datetime
from typing import List, Optional

from .models import NormalizedPlaylist, NormalizedTrack
from .ui import sanitize_filename, reveal_folder, WEB_URL


def export_xlsx(playlist: NormalizedPlaylist, output_file: str):
    """导出为美化版 Excel 表格文件"""
    import openpyxl
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "歌单歌曲"

    # 歌单元数据头栏
    ws.append(["歌单名称", playlist.name or "未命名歌单"])
    ws.append(["歌单作者", playlist.creator or "未知"])
    ws.append(["歌曲总数", f"{len(playlist.tracks)} 首"])
    if playlist.formatted_duration:
        ws.append(["总计播放时长", playlist.formatted_duration])
    ws.append([])

    # 歌曲表格头
    headers = ["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"]
    ws.append(headers)

    for i, t in enumerate(playlist.tracks, 1):
        dur = t.duration_str
        if not dur and t.duration_ms:
            sec = int(t.duration_ms // 1000)
            dur = f"{sec // 60:02d}:{sec % 60:02d}"
        ws.append([i, t.title or "", t.artist or "", t.album or "", dur or "", t.status_text or "正常"])

    # 自动列宽调整
    for col_idx in range(1, len(headers) + 1):
        col_letter = get_column_letter(col_idx)
        max_len = 0
        for cell in ws[col_letter]:
            val = str(cell.value or "")
            # 中文字符按宽度 2 计算
            clen = sum(2 if ord(c) > 127 else 1 for c in val)
            if clen > max_len:
                max_len = clen
        ws.column_dimensions[col_letter].width = min(max(10, int(max_len * 1.1) + 2), 60)

    wb.save(output_file)


def export_csv(playlist: NormalizedPlaylist, output_file: str):
    """导出为带有 UTF-8 BOM 的标准 CSV 表格"""
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"])
        for i, t in enumerate(playlist.tracks, 1):
            dur = t.duration_str
            if not dur and t.duration_ms:
                sec = int(t.duration_ms // 1000)
                dur = f"{sec // 60:02d}:{sec % 60:02d}"
            writer.writerow([
                i,
                (t.title or "").replace("\r", " ").replace("\n", " "),
                (t.artist or "").replace("\r", " ").replace("\n", " "),
                (t.album or "").replace("\r", " ").replace("\n", " "),
                dur or "",
                t.status_text or "正常"
            ])


def export_json(playlist: NormalizedPlaylist, output_file: str):
    """导出为符合 PlaylistOut 官方规范的 Canonical JSON"""
    tracks_json = [t.to_canonical_dict() for t in playlist.tracks]

    payload = {
        "generator": "PlaylistOut",
        "generatorUrl": WEB_URL,
        "exportedFrom": "PlaylistOutCLI",
        "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "name": playlist.name or "歌单",
    }
    if playlist.creator:
        payload["creator"] = playlist.creator
    if playlist.cover_url:
        payload["coverUrl"] = playlist.cover_url
    if playlist.description:
        payload["description"] = playlist.description

    payload["platform"] = playlist.platform
    if playlist.id:
        payload["id"] = playlist.id
    if playlist.source_url:
        payload["sourceUrl"] = playlist.source_url

    payload["trackCount"] = len(playlist.tracks)
    payload["loadedTrackCount"] = len(playlist.tracks)
    payload["isPartial"] = False

    dur_ms = playlist.total_duration_ms
    dur_str = playlist.formatted_duration
    if dur_ms > 0:
        if dur_str:
            payload["totalDuration"] = dur_str
        payload["totalDurationMs"] = dur_ms
        if dur_str:
            payload["loadedDuration"] = dur_str
        payload["loadedDurationMs"] = dur_ms

    payload["tracks"] = tracks_json

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def export_txt(playlist: NormalizedPlaylist, output_file: str):
    """导出为纯文本歌曲清单"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"歌单：{playlist.name}\n")
        if playlist.creator:
            f.write(f"作者：{playlist.creator}\n")
        f.write(f"歌曲数：{len(playlist.tracks)}\n")
        f.write("=" * 40 + "\n\n")
        for i, t in enumerate(playlist.tracks, 1):
            artist = t.artist or "未知歌手"
            title = t.title or "未知歌曲"
            f.write(f"{i}. {title} - {artist}\n")


def export_m3u8(playlist: NormalizedPlaylist, output_file: str):
    """导出为通用播放列表 M3U8 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        f.write(f"#PLAYLIST:{playlist.name}\n")
        for t in playlist.tracks:
            artist = t.artist or "未知歌手"
            title = t.title or "未知歌曲"
            dur_sec = int(t.duration_ms // 1000) if t.duration_ms else -1
            clean_title = (title or "").replace("\r", " ").replace("\n", " ").strip()
            clean_artist = (artist or "").replace("\r", " ").replace("\n", " ").strip()
            f.write(f"#EXTINF:{dur_sec},{clean_artist} - {clean_title}\n")
            f.write(f"{clean_artist} - {clean_title}.mp3\n")


def perform_export(
    playlist: NormalizedPlaylist,
    output_dir: str = "output",
    formats: Optional[List[str]] = None,
    reveal_folder_flag: bool = True
) -> List[str]:
    """统一执行导出并格式化打印结果"""
    formats = formats or ["xlsx", "csv", "json", "txt", "m3u8"]
    safe_title = sanitize_filename(playlist.name) or "playlist"
    os.makedirs(output_dir, exist_ok=True)

    exported_files = []
    print(f"\n[*] 开始导出歌单《{playlist.name}》 (共 {len(playlist.tracks)} 首歌曲)...\n")

    for fmt in formats:
        target_path = os.path.join(output_dir, f"{safe_title}.{fmt}")
        try:
            if fmt == "xlsx":
                export_xlsx(playlist, target_path)
            elif fmt == "csv":
                export_csv(playlist, target_path)
            elif fmt == "json":
                export_json(playlist, target_path)
            elif fmt == "txt":
                export_txt(playlist, target_path)
            elif fmt == "m3u8":
                export_m3u8(playlist, target_path)
            else:
                continue
            exported_files.append(target_path)
            print(f"  [✓] {fmt.upper():<5} -> {os.path.abspath(target_path)}")
        except Exception as e:
            print(f"  [✗] {fmt.upper():<5} 导出失败: {e}")

    print(f"\n[🎉] 导出完成！共 {len(playlist.tracks)} 首歌曲，已存入: {os.path.abspath(output_dir)}")
    print("=" * 64)

    if exported_files and reveal_folder_flag:
        reveal_folder(exported_files[0])

    return exported_files
