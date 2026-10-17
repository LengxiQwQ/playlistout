# -*- coding: utf-8 -*-
"""
Playlist Out CLI Platforms Package
==================================
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
from .migu import MiguAdapter

from cli.core.http import reset_gai_family

# 确保所有内置适配器加载后重置网络栈策略为标准双栈
reset_gai_family()

__all__ = [
    "BasePlatformAdapter",
    "PlatformRegistry",
    "register_platform",
    "NetEaseAdapter",
    "QQMusicAdapter",
    "KugouAdapter",
    "KuwoAdapter",
    "QishuiAdapter",
    "MiguAdapter",
]
