# -*- coding: utf-8 -*-
"""
PlaylistOut NetEase Platform Adapter
====================================
Integrates NetEase Cloud Music (music.163.com / 163cn.tv) into the unified CLI.
"""

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
    supports_playlist = True
    supports_user_playlists = True
    requires_user_auth = False
    supported_channels = ()

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

        extra = getattr(data, "extra_meta", {}) if hasattr(data, "extra_meta") else (data[4] if len(data) > 4 and isinstance(data[4], dict) else {})
        track_count = extra.get("track_count")
        loaded_count = len(tracks)
        is_partial = bool(track_count and loaded_count < track_count)

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=pid,
            name=title.strip() if title else f"网易云歌单_{pid}",
            creator=author or "网易云用户",
            cover_url=playlist_cover,
            description=extra.get("description") or "",
            source_url=f"https://music.163.com/#/playlist?id={pid}",
            track_count=track_count,
            create_time=extra.get("create_time"),
            update_time=extra.get("update_time"),
            play_count=extra.get("play_count"),
            tags=extra.get("tags") or [],
            is_partial=is_partial,
            tracks=tracks,
        )

    def fetch_user_playlists(self, user_target: str, **options) -> Optional[NormalizedUserPlaylists]:
        """抓取网易云音乐用户公开歌单列表（含自建与收藏）"""
        text = (user_target or "").strip()
        user_id = extract_user_id(text)
        if not user_id:
            digits = "".join(filter(str.isdigit, text))
            if digits and len(digits) >= 4:
                user_id = digits
        if not user_id:
            return None

        user_data = get_user_playlists(user_id)
        if not user_data:
            return None

        nickname, pls = user_data
        summaries = [
            UserPlaylistSummary(
                id=str(p.get("id") or ""),
                name=p.get("name") or f"网易云歌单_{p.get('id')}",
                track_count=p.get("track_count"),
                source_url=f"https://music.163.com/#/playlist?id={p.get('id')}",
                is_created=bool(p.get("is_created", True)),
            )
            for p in pls
            if p.get("id")
        ]

        return NormalizedUserPlaylists(
            platform=self.platform_id,
            user_id=str(user_id),
            nickname=nickname or f"网易云用户_{user_id}",
            playlists=summaries,
        )

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        return False
