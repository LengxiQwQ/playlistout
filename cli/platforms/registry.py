# -*- coding: utf-8 -*-
"""
Playlist Out CLI Platform Registry
==================================
Registry and factory for all music platform adapters.
Enables clean OCP (Open-Closed Principle) extensibility.
"""

from typing import Dict, List, Optional, Type
from .base import BasePlatformAdapter


class PlatformRegistry:
    """平台适配器注册中心"""
    _adapters: Dict[str, BasePlatformAdapter] = {}
    _alias_map: Dict[str, str] = {}

    @classmethod
    def register(cls, adapter_cls: Type[BasePlatformAdapter]) -> Type[BasePlatformAdapter]:
        """装饰器：注册一个新的平台适配器"""
        adapter = adapter_cls()
        pid = adapter.platform_id.lower()
        cls._adapters[pid] = adapter
        cls._alias_map[pid] = pid

        for alias in adapter.aliases:
            cls._alias_map[alias.lower()] = pid

        return adapter_cls

    @classmethod
    def get(cls, name_or_alias: str) -> Optional[BasePlatformAdapter]:
        """根据平台 ID 或别名获取适配器实例"""
        if not name_or_alias:
            return None
        key = name_or_alias.strip().lower()
        target_id = cls._alias_map.get(key, key)
        return cls._adapters.get(target_id)

    @classmethod
    def list_all(cls) -> List[BasePlatformAdapter]:
        """列出所有已注册的适配器实例"""
        return list(cls._adapters.values())

    @classmethod
    def platform_id_list(cls) -> List[str]:
        """按注册顺序返回全部平台 ID（供 help / 错误提示动态生成，杜绝硬编码漂移）"""
        return list(cls._adapters.keys())

    @classmethod
    def get_summary_list(cls) -> List[dict]:
        """获取供 UI 菜单展示的概要信息"""
        return [
            {
                "id": a.platform_id,
                "name": a.display_name,
                "desc": a.description,
            }
            for a in cls._adapters.values()
        ]


# 注册装饰器快捷别名
register_platform = PlatformRegistry.register
