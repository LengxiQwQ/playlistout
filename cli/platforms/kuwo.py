# -*- coding: utf-8 -*-
"""
PlaylistOut Kuwo Music Platform Adapter
=======================================
Integrates Kuwo Music (kuwo.cn) into the unified CLI.
"""

from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import NormalizedPlaylist, NormalizedTrack

from cli.kuwo.kuwo_playlist_export import (
    extract_playlist_id,
    get_playlist_info,
)


@register_platform
class KuwoAdapter(BasePlatformAdapter):
    platform_id = "kuwo"
    display_name = "酷我音乐"
    description = "歌单链接 / 短链 / ID"
    aliases = ["kuwo", "kw"]

    def can_handle(self, text: str) -> bool:
        if not text:
            return False
        return "kuwo.cn" in text.lower()

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        pid = extract_playlist_id(text)
        if not pid:
            return None

        info = get_playlist_info(pid)
        if not info:
            return None

        playlist_title, raw_tracks, author, cover_url, playlist_id = info
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

            is_vip = (status_text == "VIP专享")
            is_avail = (status_text != "下架/无版权")
            source_url = f"https://www.kuwo.cn/play_detail/{tid}" if tid else None

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
                    source_url=source_url,
                )
            )

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=str(playlist_id or pid),
            name=playlist_title.strip() if playlist_title else f"酷我歌单_{pid}",
            creator=author or "酷我用户",
            cover_url=cover_url or "",
            source_url=f"https://www.kuwo.cn/playlist_detail/{pid}",
            tracks=tracks,
        )
