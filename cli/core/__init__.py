# -*- coding: utf-8 -*-
"""
PlaylistOut CLI Core Package
============================
Platform-agnostic utilities: models, detection, HTTP, UI, and unified export engines.
"""

from .detector import PlatformType, TargetKind, DetectedTarget, SmartDetector
from .models import NormalizedPlaylist, NormalizedTrack

