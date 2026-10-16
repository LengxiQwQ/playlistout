# -*- coding: utf-8 -*-
"""
PlaylistOut Migu Music Platform Adapter
=======================================
Integrates Migu Music (migu.cn) into the unified CLI.
"""

from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import NormalizedPlaylist, NormalizedTrack

from cli.migu.migu_playlist_export import (
    extract_playlist_id,
    get_playlist_info,
)


def normalize_migu_info(info, playlist_id: Optional[str] = None) -> NormalizedPlaylist:
    playlist_title, raw_tracks, author, cover_url, resolved_pid = info
    pid = str(playlist_id or resolved_pid or "")
    tracks = []
    for i, t in enumerate(raw_tracks, 1):
        name = t[0] if len(t) > 0 else ""
        singers = t[1] if len(t) > 1 else ""
        album = t[2] if len(t) > 2 else ""
        duration_str = t[3] if len(t) > 3 else ""
        status_text = t[4] if len(t) > 4 else "正常"
        cover = t[5] if len(t) > 5 else ""
        tid = t[6] if len(t) > 6 else ""
        dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
        release_date = t[8] if len(t) > 8 else None
        max_quality = t[9] if len(t) > 9 else None

        is_vip = (status_text == "VIP专享")
        is_avail = (status_text != "下架/无版权")
        source_url = f"https://music.migu.cn/v5/#/song/{tid}" if tid else None

        tracks.append(
            NormalizedTrack(
                index=i,
                title=name or "未知歌曲",
                artist=singers or "未知歌手",
                album=album or "",
                id=str(tid or ""),
                cover_url=cover or "",
                duration_ms=dt_ms,
                duration_str=duration_str,
                release_date=release_date,
                is_available=is_avail,
                is_vip=is_vip,
                status="unplayable" if not is_avail else ("vip" if is_vip else "playable"),
                status_text=status_text or "正常",
                max_quality=max_quality,
                source_url=source_url,
            )
        )

    extra = getattr(info, "extra_meta", {}) if hasattr(info, "extra_meta") else (info[5] if len(info) > 5 and isinstance(info[5], dict) else {})
    track_count = extra.get("track_count")
    loaded_count = len(tracks)
    is_partial = bool(track_count and loaded_count < track_count)

    return NormalizedPlaylist(
        platform="migu",
        id=pid,
        name=playlist_title.strip() if playlist_title else f"咪咕歌单_{pid}",
        creator=author or "咪咕音乐用户",
        cover_url=cover_url or "",
        description=extra.get("description") or "",
        source_url=f"https://music.migu.cn/v5/#/playlist/{pid}",
        track_count=track_count,
        play_count=extra.get("play_count"),
        tags=extra.get("tags") or [],
        is_partial=is_partial,
        tracks=tracks,
    )


@register_platform
class MiguAdapter(BasePlatformAdapter):
    platform_id = "migu"
    display_name = "咪咕音乐"
    description = "歌单链接 / 分享短链 / 歌单 ID"
    aliases = ["migu", "mg"]
    supports_playlist = True
    supports_user_playlists = False
    requires_user_auth = False
    supported_channels = ()

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        pid = extract_playlist_id(text)
        if not pid:
            return None

        info = get_playlist_info(pid)
        if not info:
            return None

        return normalize_migu_info(info, pid)
