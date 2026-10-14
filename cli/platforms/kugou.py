# -*- coding: utf-8 -*-
"""
PlaylistOut Kugou Music Platform Adapter
========================================
Integrates Kugou Music (kugou.com) into the unified CLI.
Supports official special playlists, collection playlists, H5 share pages, and Cloudlists (with QR code auth).
"""

from typing import Optional

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import NormalizedPlaylist, NormalizedTrack

from cli.kugou.kugou_playlist_export import (
    extract_kugou_target,
    _fetch_kugou_playlist_by_target,
    interactive_login_menu,
    clear_auth_credentials,
    save_auth_credentials,
    load_auth_credentials,
)


@register_platform
class KugouAdapter(BasePlatformAdapter):
    platform_id = "kugou"
    display_name = "酷狗音乐"
    description = "官方精选 / 概念版集合 / H5分享短链 / 个人云端扫码登录"
    aliases = ["kugou", "kg"]

    def can_handle(self, text: str) -> bool:
        if not text:
            return False
        lower = text.lower()
        if "kugou.com" in lower:
            return True
        if "global_specialid=collection_" in lower or "gcid_" in lower or "src_cid=" in lower:
            return True
        return False

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        target = extract_kugou_target(text)
        if not target:
            return None

        cli_token = options.get("token")
        cli_userid = options.get("userid")

        playlist_data = _fetch_kugou_playlist_by_target(
            target,
            cli_token=cli_token,
            cli_userid=cli_userid
        )
        if not playlist_data or not playlist_data.get("tracks"):
            return None

        tracks = []
        for i, t in enumerate(playlist_data.get("tracks", []), 1):
            is_avail = bool(t.get("is_available", True))
            is_vip = bool(t.get("is_vip", False))
            status_text = t.get("status_text", "正常")

            tracks.append(
                NormalizedTrack(
                    index=i,
                    title=t.get("title") or "未知歌曲",
                    artist=t.get("artist") or "未知歌手",
                    album=t.get("album") or "",
                    id=str(t.get("id") or ""),
                    cover_url=t.get("cover_url") or "",
                    duration_ms=t.get("duration_ms"),
                    duration_str=t.get("duration_str") or "",
                    release_date=t.get("release_date"),
                    is_available=is_avail,
                    is_vip=is_vip,
                    status="unplayable" if not is_avail else ("vip" if is_vip else "playable"),
                    status_text=status_text,
                    max_quality=t.get("max_quality"),
                    source_url=t.get("source_url"),
                )
            )

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=str(playlist_data.get("id") or target.get("id") or ""),
            name=playlist_data.get("name") or "酷狗歌单",
            creator=playlist_data.get("creator") or "酷狗用户",
            cover_url=playlist_data.get("cover_url") or "",
            description=playlist_data.get("description") or "",
            source_url=playlist_data.get("source_url") or target.get("original_url") or "",
            tracks=tracks,
        )

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        """支持酷狗独有的 login / logout 命令行与终端指令"""
        if initial_input and initial_input.lower() in ("login", "--login"):
            interactive_login_menu()
            return True
        if initial_input and initial_input.lower() in ("logout", "--logout"):
            clear_auth_credentials()
            print("[✓] 酷狗登录凭证已成功清除。")
            return True
        return False
