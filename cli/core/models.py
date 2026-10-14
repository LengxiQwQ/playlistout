# -*- coding: utf-8 -*-
"""
PlaylistOut Normalized Data Models
===================================
Standardized representation of playlists, tracks, and export configurations
across all supported music platforms.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class NormalizedTrack:
    """Standardized music track representation."""
    index: int
    title: str
    artist: str
    album: str = ""
    id: str = ""
    cover_url: str = ""
    duration_ms: Optional[int] = None
    duration_str: str = ""
    release_date: Optional[str] = None
    track_number: Optional[int] = None
    disc_number: Optional[int] = None
    is_available: bool = True
    is_vip: bool = False
    status: str = "playable"           # playable, vip, paid, unplayable, geo_blocked
    status_text: str = "正常"          # 正常, VIP专享, 下架/无版权, 付费专辑, 仅海外受限
    max_quality: Optional[str] = None  # FLAC, Hi-Res, 320kbps, etc.
    source_url: Optional[str] = None
    mv_id: Optional[str] = None
    mv_url: Optional[str] = None
    raw_extra: Dict[str, Any] = field(default_factory=dict)

    def to_canonical_dict(self) -> Dict[str, Any]:
        """Convert to official PlaylistOut Canonical JSON track format."""
        entry: Dict[str, Any] = {
            "index": self.index,
            "title": str(self.title or "未知歌曲").strip(),
            "artist": str(self.artist or "未知歌手").strip(),
        }
        if self.album and str(self.album).strip() and str(self.album).strip() != "未知专辑":
            entry["album"] = str(self.album).strip()
        if self.id and str(self.id).strip():
            entry["id"] = str(self.id).strip()
        if self.duration_ms is not None and self.duration_ms > 0:
            entry["durationMs"] = int(self.duration_ms)
        if self.release_date and str(self.release_date).strip():
            entry["releaseDate"] = str(self.release_date).strip()
        if self.track_number and isinstance(self.track_number, int) and self.track_number > 0:
            entry["trackNumber"] = self.track_number
        if self.disc_number and isinstance(self.disc_number, int) and self.disc_number > 0:
            entry["discNumber"] = self.disc_number
        if self.source_url and str(self.source_url).strip():
            entry["sourceUrl"] = str(self.source_url).strip()
        if self.cover_url and str(self.cover_url).strip():
            entry["coverUrl"] = str(self.cover_url).strip()

        entry["isVip"] = bool(self.is_vip)
        entry["isAvailable"] = bool(self.is_available)
        entry["status"] = self.status
        entry["statusText"] = self.status_text or "正常"

        if self.max_quality and str(self.max_quality).strip():
            entry["maxQuality"] = str(self.max_quality).strip()
        if self.mv_id and str(self.mv_id).strip():
            entry["mvId"] = str(self.mv_id).strip()
        if self.mv_url and str(self.mv_url).strip():
            entry["mvUrl"] = str(self.mv_url).strip()

        return entry


@dataclass
class NormalizedPlaylist:
    """Standardized music playlist representation."""
    platform: str
    id: str
    name: str
    creator: str = ""
    cover_url: str = ""
    description: str = ""
    source_url: str = ""
    track_count: Optional[int] = None
    tracks: List[NormalizedTrack] = field(default_factory=list)
    raw_extra: Dict[str, Any] = field(default_factory=dict)

    @property
    def loaded_count(self) -> int:
        return len(self.tracks)

    @property
    def total_duration_ms(self) -> int:
        return sum(t.duration_ms or 0 for t in self.tracks if (t.duration_ms or 0) > 0)

    @property
    def formatted_duration(self) -> str:
        ms = self.total_duration_ms
        if ms <= 0:
            return ""
        seconds = int(ms // 1000)
        minutes = int(seconds // 60)
        hours = int(minutes // 60)
        rem_min = int(minutes % 60)
        if hours > 0:
            return f"{hours} 小时 {rem_min} 分钟" if rem_min > 0 else f"{hours} 小时"
        return f"{minutes} 分钟"
