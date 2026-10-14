# -*- coding: utf-8 -*-
"""
PlaylistOut Platforms Package
=============================
Exports the registry, base adapter, and automatically discovers & registers all adapters.
"""

from .base import BasePlatformAdapter
from .registry import PlatformRegistry, register_platform

# 导入所有内置适配器触发自动注册
from .netease import NetEaseAdapter
from .qqmusic import QQMusicAdapter
from .kugou import KugouAdapter
from .kuwo import KuwoAdapter
from .qishui import QishuiAdapter

__all__ = [
    "BasePlatformAdapter",
    "PlatformRegistry",
    "register_platform",
    "NetEaseAdapter",
    "QQMusicAdapter",
    "KugouAdapter",
    "KuwoAdapter",
    "QishuiAdapter",
]
