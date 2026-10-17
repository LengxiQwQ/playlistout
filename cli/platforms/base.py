# -*- coding: utf-8 -*-
"""
Playlist Out CLI Base Platform Adapter
======================================
Abstract base class defining the contract for all music platform integrations.
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Tuple

from ..core.models import NormalizedPlaylist, NormalizedUserPlaylists


class BasePlatformAdapter(ABC):
    """
    平台适配器抽象基类。
    所有新接入的音乐平台均须继承此基类。
    """
    platform_id: str = ""
    display_name: str = ""
    description: str = ""
    aliases: List[str] = []

    # 统一能力声明 (Capability Matrix)
    supports_playlist: bool = True
    supports_user_playlists: bool = False
    requires_user_auth: bool = False
    supported_channels: Tuple[str, ...] = ()

    def can_handle(self, text: str) -> bool:
        """
        判断给定的 URL、短链或文本是否属于当前平台。
        统一委托 SmartDetector 作为单一事实源判定，杜绝双源规则漂移。
        """
        if not text:
            return False
        from ..core.detector import SmartDetector
        ptype, _ = SmartDetector.detect(text, resolve_redirect=False)
        return ptype.value == self.platform_id

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
