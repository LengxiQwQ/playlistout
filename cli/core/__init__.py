# -*- coding: utf-8 -*-
"""
Playlist Out CLI Core Package
=============================
Platform-agnostic utilities: models, detection, HTTP, UI, and unified export engines.
"""

from .detector import PlatformType, TargetKind, DetectedTarget, SmartDetector
from .models import (
    NormalizedPlaylist,
    NormalizedTrack,
    UserPlaylistSummary,
    NormalizedUserPlaylists,
)
from .batch import (
    BatchResult,
    BatchFailure,
    run_batch_flow,
    resolve_batch_target_playlists,
    parse_playlist_selection,
    resolve_collision_safe_base_name,
    preprocess_playlist,
)

