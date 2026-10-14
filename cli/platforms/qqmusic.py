# -*- coding: utf-8 -*-
"""
PlaylistOut QQ Music Platform Adapter
=====================================
Integrates QQ Music (y.qq.com) into the unified CLI.
"""

import sys
from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import NormalizedPlaylist, NormalizedTrack
from ..core.ui import print_format_menu, resolve_export_formats, print_exit_banner
from ..core.exporter import perform_export

# 引入已验证的底层 QQ 音乐核心抓取函数
from cli.qqmusic.qq_music_playlist_export import (
    extract_playlist_id,
    extract_user_uin,
    get_playlist_songs,
    get_user_playlists,
    batch_export_songs,
)


@register_platform
class QQMusicAdapter(BasePlatformAdapter):
    platform_id = "qqmusic"
    display_name = "QQ 音乐"
    description = "歌单链接 / 短链 (c6.y.qq.com) / ID / QQ号批量导出"
    aliases = ["qq", "qq-music", "tx", "tencent"]

    def can_handle(self, text: str) -> bool:
        if not text:
            return False
        return "qq.com" in text.lower() or "c6.y.qq.com" in text.lower()

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        pid = extract_playlist_id(text)
        if not pid:
            return None

        playlist_info = get_playlist_songs(pid)
        if not playlist_info or not playlist_info[1]:
            return None

        title, songs, author = playlist_info
        tracks = []
        for i, s in enumerate(songs, 1):
            name = s[0] if len(s) > 0 else ""
            singers = s[1] if len(s) > 1 else ""
            album = s[2] if len(s) > 2 else ""
            cover_url = s[3] if len(s) > 3 else ""
            mid = s[4] if len(s) > 4 else ""
            duration_ms = s[5] if len(s) > 5 else None
            release_date = s[6] if len(s) > 6 else None
            track_num = s[7] if len(s) > 7 else None
            disc_num = s[8] if len(s) > 8 else None
            mv_id = s[9] if len(s) > 9 else None
            status_text = s[10] if len(s) > 10 else "正常"
            max_quality = s[11] if len(s) > 11 else None

            is_vip = (status_text == "VIP专享")
            is_avail = (status_text != "下架/无版权")
            source_url = f"https://y.qq.com/n/ryqq/songDetail/{mid}" if mid else None
            mv_url = f"https://y.qq.com/n/ryqq/mv/{mv_id}" if mv_id else None

            tracks.append(
                NormalizedTrack(
                    index=i,
                    title=name or "未知歌曲",
                    artist=singers or "未知歌手",
                    album=album or "",
                    id=mid or "",
                    cover_url=cover_url or "",
                    duration_ms=duration_ms,
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
            name=title.strip() if title else f"QQ音乐歌单_{pid}",
            creator=author or "QQ音乐用户",
            source_url=f"https://y.qq.com/n/ryqq/playlist/{pid}",
            tracks=tracks,
        )

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        """支持 QQ 号多歌单批量导出的专属交互"""
        user_input = initial_input
        output_dir = options.get("output_dir", "output")
        reveal_flag = not options.get("no_open", False)

        if not user_input:
            return False

        is_just_digits = user_input.isdigit() and len(user_input) >= 4
        pid = extract_playlist_id(user_input)
        uin = extract_user_uin(user_input)

        # 如果同时匹配或专指 QQ 号
        if (is_just_digits and not pid) or (uin and not pid):
            target_uin = uin or user_input
            qq_info = get_user_playlists(target_uin)
            if qq_info:
                qq_nickname, qq_playlists = qq_info
                print(f"\n检测到QQ号，用户：{qq_nickname}，共发现 {len(qq_playlists)} 个公开歌单：")
                for i, pl in enumerate(qq_playlists, 1):
                    print(f"  {i:3d}. [{pl['id']}] {pl['name']}")
                batch_export_songs(
                    qq_playlists,
                    target_uin,
                    qq_nickname,
                    output_dir=output_dir,
                    reveal_folder_flag=reveal_flag
                )
                return True

        return False
