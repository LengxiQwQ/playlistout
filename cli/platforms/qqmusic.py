# -*- coding: utf-8 -*-
"""
PlaylistOut QQ Music Platform Adapter
=====================================
Integrates QQ Music (y.qq.com) into the unified CLI.
"""

import os
from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import (
    NormalizedPlaylist,
    NormalizedTrack,
    UserPlaylistSummary,
    NormalizedUserPlaylists,
)
from ..core.ui import print_format_menu, resolve_export_formats, reveal_folder, print_divider
from ..core.exporter import perform_export

# 引入已验证的底层 QQ 音乐核心抓取函数
from cli.qqmusic.qq_music_playlist_export import (
    extract_playlist_id,
    extract_user_uin,
    get_playlist_songs,
    get_user_playlists,
)


@register_platform
class QQMusicAdapter(BasePlatformAdapter):
    platform_id = "qqmusic"
    display_name = "QQ 音乐"
    description = "歌单链接 / 分享短链 / 歌单 ID / 用户 QQ号"
    aliases = ["qq", "qq-music", "tx", "tencent"]
    supports_playlist = True
    supports_user_playlists = True
    requires_user_auth = False
    supported_channels = ()

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

        extra = getattr(playlist_info, "extra_meta", {}) if hasattr(playlist_info, "extra_meta") else (playlist_info[3] if len(playlist_info) > 3 and isinstance(playlist_info[3], dict) else {})
        track_count = extra.get("track_count")
        loaded_count = len(tracks)
        is_partial = bool(track_count and loaded_count < track_count)

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=pid,
            name=title.strip() if title else f"QQ音乐歌单_{pid}",
            creator=author or "QQ音乐用户",
            description=extra.get("description") or "",
            source_url=f"https://y.qq.com/n/ryqq/playlist/{pid}",
            track_count=track_count,
            create_time=extra.get("create_time"),
            update_time=extra.get("update_time"),
            play_count=extra.get("play_count"),
            tags=extra.get("tags") or [],
            is_partial=is_partial,
            tracks=tracks,
        )

    def fetch_user_playlists(self, user_target: str, **options) -> Optional[NormalizedUserPlaylists]:
        """抓取 QQ 音乐用户公开自建歌单列表"""
        text = (user_target or "").strip()
        uin = extract_user_uin(text)
        if not uin:
            digits = "".join(filter(str.isdigit, text))
            if digits and len(digits) >= 4:
                uin = digits
        if not uin:
            return None

        qq_info = get_user_playlists(uin)
        if not qq_info:
            return None

        qq_nickname, qq_playlists = qq_info
        summaries = [
            UserPlaylistSummary(
                id=str(pl.get("id") or ""),
                name=pl.get("name") or f"QQ音乐歌单_{pl.get('id')}",
                track_count=pl.get("track_count") or pl.get("song_cnt"),
                source_url=f"https://y.qq.com/n/ryqq/playlist/{pl.get('id')}",
                is_created=True,
            )
            for pl in qq_playlists
            if pl.get("id")
        ]

        return NormalizedUserPlaylists(
            platform=self.platform_id,
            user_id=str(uin),
            nickname=qq_nickname or f"QQ用户_{uin}",
            playlists=summaries,
        )

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        return False
