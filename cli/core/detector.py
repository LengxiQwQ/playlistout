# -*- coding: utf-8 -*-
"""
PlaylistOut Smart Link & Platform Detector
==========================================
Analyzes freeform text, links, shortlinks, and IDs to accurately determine
which music platform the input belongs to.
"""

import re
from enum import Enum
from typing import Tuple, Optional
from urllib.parse import urlparse

from .http import resolve_shortlink


class PlatformType(str, Enum):
    QQMUSIC = "qqmusic"
    NETEASE = "netease"
    KUGOU = "kugou"
    KUWO = "kuwo"
    QISHUI = "qishui"
    AMBIGUOUS_DIGITS = "ambiguous_digits"
    UNKNOWN = "unknown"


def extract_url_from_text(text: str) -> Optional[str]:
    """从包含表情包、文字的分享文案中提取有效 URL"""
    if not text:
        return None
    # 匹配完整 http/https 链接
    m = re.search(r'https?://[^\s<>"]+', text)
    if m:
        return m.group(0).rstrip('，。！？、；）》〉]}>')
    
    # 匹配无协议前缀的短链域名
    m_bare = re.search(
        r'(?:^|[^\w.-])((?:[a-zA-Z0-9-]+\.)*(?:y\.qq\.com|163cn\.tv|kugou\.com|kuwo\.cn|douyin\.com|qishui\.com)/\S*)',
        text
    )
    if m_bare:
        return f"https://{m_bare.group(1)}".rstrip('，。！？、；）》〉]}>')
    return None


class SmartDetector:
    """智能平台识别引擎"""

    @classmethod
    def detect(cls, raw_input: str, resolve_redirect: bool = True) -> Tuple[PlatformType, str]:
        """
        分析输入并返回 (PlatformType, 清洗后的有效文本/URL/ID)
        """
        if not raw_input:
            return PlatformType.UNKNOWN, ""

        text = raw_input.strip()

        # 1. 检查是否为纯数字 ID
        if re.fullmatch(r'\d+', text):
            # 纯数字是天然有歧义的 (可能是网易云歌单、QQ音乐歌单、QQ号、酷我歌单或酷狗ID)
            # 特殊情况：如果是 18~19 位大整数，通常是汽水音乐的 Snowflake ID
            if len(text) in (18, 19):
                return PlatformType.QISHUI, text
            return PlatformType.AMBIGUOUS_DIGITS, text

        # 2. 检查酷狗特有的特殊参数或标识
        if "global_specialid=collection_" in text or "gcid_" in text or "src_cid=" in text:
            return PlatformType.KUGOU, text

        # 3. 提取其中的 URL
        extracted_url = extract_url_from_text(text)
        url_to_check = extracted_url or text

        # 4. 如果是短链且允许重定向，先解析重定向
        is_shortlink = any(s in url_to_check for s in ("163cn.tv", "c6.y.qq.com", "t.kugou.com", "t1.kugou.com", "t2.kugou.com", "t3.kugou.com", "t.kuwo.cn", "v.douyin.com", "/s/"))
        if is_shortlink and resolve_redirect:
            resolved = resolve_shortlink(url_to_check)
            if resolved:
                url_to_check = resolved

        # 5. 域名特征匹配
        parsed = urlparse(url_to_check)
        hostname = (parsed.hostname or "").lower()

        # 网易云音乐
        if "163.com" in hostname or "163cn.tv" in hostname or "music.163.com" in url_to_check:
            return PlatformType.NETEASE, url_to_check

        # QQ 音乐
        if "y.qq.com" in hostname or "qq.com" in hostname:
            return PlatformType.QQMUSIC, url_to_check

        # 酷狗音乐
        if "kugou.com" in hostname:
            return PlatformType.KUGOU, url_to_check

        # 酷我音乐
        if "kuwo.cn" in hostname:
            return PlatformType.KUWO, url_to_check

        # 汽水音乐 / 抖音音乐
        if "qishui.douyin.com" in hostname or "qishui.com" in hostname or "music.douyin.com" in hostname or "v.douyin.com" in hostname:
            return PlatformType.QISHUI, url_to_check

        # 6. 文案关键词兜底检测
        if "汽水音乐" in text or "qishui" in text:
            return PlatformType.QISHUI, url_to_check
        if "网易云音乐" in text or "163.com" in text:
            return PlatformType.NETEASE, url_to_check
        if "QQ音乐" in text or "qqmusic" in text:
            return PlatformType.QQMUSIC, url_to_check
        if "酷狗音乐" in text or "kugou" in text:
            return PlatformType.KUGOU, url_to_check
        if "酷我音乐" in text or "kuwo" in text:
            return PlatformType.KUWO, url_to_check

        # 无法识别
        return PlatformType.UNKNOWN, text
