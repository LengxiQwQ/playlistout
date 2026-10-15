# -*- coding: utf-8 -*-
"""
PlaylistOut NetEase Platform Adapter
====================================
Integrates NetEase Cloud Music (music.163.com / 163cn.tv) into the unified CLI.
"""

from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import NormalizedPlaylist, NormalizedTrack
from ..core.ui import print_format_menu, resolve_export_formats, reveal_folder, print_divider
from ..core.exporter import perform_export

from cli.netease.netease_playlist_export import (
    extract_playlist_id,
    extract_user_id,
    get_playlist_data,
    get_user_playlists,
)


@register_platform
class NetEaseAdapter(BasePlatformAdapter):
    platform_id = "netease"
    display_name = "网易云音乐"
    description = "歌单链接 / 短链 / ID / 用户歌单"
    aliases = ["163", "netease", "wyy", "cloudmusic"]

    def can_handle(self, text: str) -> bool:
        if not text:
            return False
        lower = text.lower()
        return "163.com" in lower or "163cn.tv" in lower

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        pid = extract_playlist_id(text)
        if not pid:
            return None

        data = get_playlist_data(pid)
        if not data:
            return None

        title, raw_tracks, author = data[:3]
        playlist_cover = data[3] if len(data) > 3 else ""

        tracks = []
        for i, t in enumerate(raw_tracks, 1):
            if isinstance(t, dict):
                name = t.get("title") or t.get("name") or ""
                singers = t.get("artist") or t.get("artists") or ""
                album = t.get("album") or ""
                duration_str = t.get("duration") or ""
                status_text = t.get("statusText") or t.get("status") or "正常"
                cover_url = t.get("coverUrl") or t.get("cover") or ""
                tid_str = t.get("id") or ""
                dt_ms = t.get("durationMs")
                release_date = t.get("releaseDate")
                track_num = t.get("trackNumber")
                disc_num = t.get("discNumber")
                mv_id = t.get("mvId")
                max_quality = t.get("maxQuality")
            else:
                name = t[0] if len(t) > 0 else ""
                singers = t[1] if len(t) > 1 else ""
                album = t[2] if len(t) > 2 else ""
                duration_str = t[3] if len(t) > 3 else ""
                status_text = t[4] if len(t) > 4 else "正常"
                cover_url = t[5] if len(t) > 5 else ""
                tid_str = t[6] if len(t) > 6 else ""
                dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
                release_date = t[8] if len(t) > 8 else None
                track_num = t[9] if len(t) > 9 else None
                disc_num = t[10] if len(t) > 10 else None
                mv_id = t[11] if len(t) > 11 else None
                max_quality = t[12] if len(t) > 12 else None

            artist_str = str(singers).replace(" / ", ", ").strip() if singers else "未知歌手"
            is_vip = (status_text == "VIP专享")
            is_avail = (status_text != "下架/无版权")
            source_url = f"https://music.163.com/#/song?id={tid_str}" if tid_str else None
            mv_url = f"https://music.163.com/#/mv?id={mv_id}" if mv_id else None

            tracks.append(
                NormalizedTrack(
                    index=i,
                    title=name or "未知歌曲",
                    artist=artist_str,
                    album=album or "",
                    id=str(tid_str or ""),
                    cover_url=cover_url or "",
                    duration_ms=dt_ms,
                    duration_str=duration_str,
                    release_date=release_date,
                    track_number=track_num,
                    disc_number=disc_num,
                    is_available=is_avail,
                    is_vip=is_vip,
                    status="unplayable" if not is_avail else ("vip" if is_vip else "playable"),
                    status_text=status_text or "正常",
                    max_quality=max_quality,
                    source_url=source_url,
                    mv_id=mv_id,
                    mv_url=mv_url,
                )
            )

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=pid,
            name=title.strip() if title else f"网易云歌单_{pid}",
            creator=author or "网易云用户",
            cover_url=playlist_cover,
            source_url=f"https://music.163.com/#/playlist?id={pid}",
            tracks=tracks,
        )

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        """支持网易云用户公开歌单列表批量导出的专属交互"""
        user_input = initial_input
        output_dir = options.get("output_dir", "output")
        reveal_flag = not options.get("no_open", False)

        if not user_input:
            return False

        user_id = extract_user_id(user_input)
        playlist_id = extract_playlist_id(user_input)

        if user_id and ("user" in user_input or "home" in user_input) and not playlist_id:
            user_data = get_user_playlists(user_id)
            if not user_data:
                return False

            nickname, pls = user_data
            created_pls = [p for p in pls if p.get('is_created')]
            sub_pls = [p for p in pls if not p.get('is_created')]

            print(f"\n✓ 找到用户 {nickname} 的 {len(pls)} 个公开歌单")
            print(f"  创建的歌单（{len(created_pls)} 个）：")
            for idx, p in enumerate(created_pls, 1):
                print(f"    {idx}. {p['name']} ({p.get('track_count', 0)}首) [ID: {p['id']}]")
            if sub_pls:
                print(f"  收藏的歌单（{len(sub_pls)} 个）：")
                for idx, p in enumerate(sub_pls, len(created_pls) + 1):
                    print(f"    {idx}. {p['name']} ({p.get('track_count', 0)}首) [ID: {p['id']}]")

            sel = input("\n> 选择要导出的歌单序号（all 导出自己创建的全部歌单，0 返回）：").strip()
            if not sel or sel == "0":
                return True
            print_divider()

            to_export = []
            if sel.lower() == "all":
                to_export = created_pls
            elif sel.isdigit() and 1 <= int(sel) <= len(pls):
                to_export = [pls[int(sel) - 1]]

            if not to_export:
                print("! 没有选择有效的歌单。")
                return True

            print_format_menu()
            fmt_input = input("> 选择格式，可多选，例如 (1, 2)：").strip()
            print_divider()
            formats = resolve_export_formats(fmt_input)
            if not formats:
                print("已返回，不导出。")
                return True

            for pl in to_export:
                norm_pl = self.fetch_playlist(pl['id'])
                if norm_pl:
                    perform_export(norm_pl, output_dir=output_dir, formats=formats, reveal_folder_flag=False)

            if to_export and reveal_flag:
                reveal_folder(output_dir)
            return True

        return False
