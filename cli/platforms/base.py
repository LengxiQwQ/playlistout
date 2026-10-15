# -*- coding: utf-8 -*-
"""
PlaylistOut Base Platform Adapter
=================================
Abstract base class defining the contract for all music platform integrations.
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

from ..core.models import NormalizedPlaylist, NormalizedUserPlaylists


class BasePlatformAdapter(ABC):
    """
    平台适配器抽象基类。
    所有新接入的音乐平台（如 Spotify, Apple Music, Bilibili）均须继承此基类。
    """
    platform_id: str = ""
    display_name: str = ""
    description: str = ""
    aliases: List[str] = []
    supports_user_playlists: bool = False
    requires_user_auth: bool = False

    @abstractmethod
    def can_handle(self, text: str) -> bool:
        """判断给定的 URL、短链或文本是否属于当前平台"""
        pass

    @abstractmethod
    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        """抓取并构建标准歌单对象。成功返回 NormalizedPlaylist，失败返回 None。"""
        pass

    def fetch_user_playlists(
        self, user_target: str, **options
    ) -> Optional[NormalizedUserPlaylists]:
        """
        抓取并构建用户公开/自建歌单集合。
        子类若支持需设置 supports_user_playlists = True 并实现该方法。
        成功返回 NormalizedUserPlaylists，不支持或失败返回 None。
        """
        return None

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        """
        处理该平台的专属交互流程（如酷狗扫码登录/凭证管理）。
        子类若未重写，则走标准单歌单抓取流程。
        返回 True 表示已完成处理，False 表示回退到默认流程。
        """
        return False

    def get_supported_args(self) -> Dict[str, Any]:
        """返回该平台特有的 CLI 参数声明（供统一 CLI 动态注册）"""
        return {}
