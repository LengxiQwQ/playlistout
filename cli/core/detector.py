# -*- coding: utf-8 -*-
"""
Playlist Out CLI Smart Link & Platform Detector
===============================================
Analyzes freeform text, links, shortlinks, and IDs to accurately determine
which music platform the input belongs to.
"""

import re
from dataclasses import dataclass
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
    MIGU = "migu"
    AMBIGUOUS_DIGITS = "ambiguous_digits"
    UNKNOWN = "unknown"


class TargetKind(str, Enum):
    PLAYLIST = "playlist"
    USER = "user"
    AMBIGUOUS = "ambiguous"
    UNKNOWN = "unknown"


@dataclass
class DetectedTarget:
    platform: PlatformType
    kind: TargetKind
    value: str
    raw_input: str
    # 明确歌单目标标记：输入本身是歌单链接 / 歌单标签 / 平台歌单 ID（而非用户标识）。
    # --user 强制用户模式不会清除此标记，供 CLI 做互斥校验。
    is_playlist_input: bool = False



def extract_clean_url_or_input(input_text: str) -> str:
    """
    清洗用户输入文案，提取纯净 URL 或 ID。
    100% 对标 Web 端 extractCleanUrlOrInput 规范：
    - 在汉字、中文全角标点、引号、括号边界严格截断，杜绝文案污染
    - 匹配无协议前缀的常见音乐域名
    - 匹配带有标签前缀的纯数字 (如 QQ: 123456, 歌单: 123456, UID: 123456)
    """
    if not input_text or not isinstance(input_text, str):
        return ""
    trimmed = input_text.strip()

    # 非 http/https 协议头直接返回（如 javascript: 等）
    if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*://', trimmed) and not re.match(r'^https?://', trimmed, re.I):
        return trimmed

    # 1. 匹配完整 http:// 或 https:// 链接
    # 遇到空白、汉字、中文标点、各类引号括号时立即截断
    m = re.search(r'https?://[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"\'<>`()\[\]{}]+', trimmed, re.I)
    if m:
        url = m.group(0)
        return re.sub(r'[.,;:!?，。！？@]+$', '', url)

    # 2. 匹配无协议前缀的各大音乐平台域名
    m_bare = re.search(
        r'(?:^|[^\w.-])((?:(?:(?:[a-zA-Z0-9-]+\.)*y|music)\.qq\.com|(?:y\.)?music\.163\.com|163cn\.tv|(?:m\.|t\d?\.)?kugou\.com|(?:qishui\.|music\.)douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com|(?:[a-zA-Z0-9-]+\.)*kuwo\.cn|(?:c\.|music\.|m\.music\.|h5\.nf\.)?migu\.cn)[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"\'<>`()\[\]{}]+)',
        trimmed,
        re.I
    )
    if m_bare and m_bare.group(1):
        url = m_bare.group(1)
        return f"https://{re.sub(r'[.,;:!?，。！？@]+$', '', url)}"

    # 3. 匹配带有标签前缀的纯数字 ID 或 QQ号 (如 "QQ: 3197635836", "歌单：2756674066", "UID: 1825474783")
    num_match = re.search(r'(?:qq|uin|uid|账号|用户|歌单)?[:：\s]*(\d{4,20})\b', trimmed, re.I)
    if num_match and num_match.group(1):
        if re.match(r'^[\D\s]{0,10}\d{4,20}[\D\s]{0,10}$', trimmed):
            return num_match.group(1)

    return trimmed


def extract_user_profile_target(input_text: str) -> Optional[Tuple[PlatformType, str]]:
    """
    检查输入是否为用户主页链接并提取用户 ID / UIN。
    对齐 Web 端 extractUinFromProfileUrl 逻辑：
    - QQ 音乐用户主页: /profile, /portal/profile, ?uin=, ?hostuin=
    - 网易云用户主页: /user/home?id=, /user/<id>, /m/user/
    - 酷狗用户主页: kugou.com 带有 uid / userid
    """
    if not input_text:
        return None
    cleaned = extract_clean_url_or_input(input_text)
    try:
        url_to_parse = cleaned if re.match(r'^https?://', cleaned, re.I) else f"https://{cleaned}"
        clean_url = url_to_parse.replace("#/", "")
        parsed = urlparse(clean_url)
        hostname = (parsed.hostname or "").lower()

        # QQ 音乐用户主页
        if "y.qq.com" in hostname or "music.qq.com" in hostname:
            is_playlist = any(p in parsed.path for p in ("/playlist", "/taoge", "/playsquare")) or any(
                k in parsed.query for k in ("disstid=", "dissid=", "tid=")
            )
            is_profile = "/profile" in parsed.path or "uin=" in parsed.query or "hostuin=" in parsed.query
            if is_profile and not is_playlist:
                m_uin = re.search(r'(?:^|[?&])(?:uin|hostuin)=(\d{4,15})', parsed.query)
                if m_uin:
                    return PlatformType.QQMUSIC, m_uin.group(1)
                m_path = re.search(r'/profile/(\d{4,15})', parsed.path)
                if m_path:
                    return PlatformType.QQMUSIC, m_path.group(1)

        # 网易云音乐用户主页
        if "music.163.com" in hostname or "163.com" in hostname:
            is_playlist = "/playlist" in parsed.path or "/song" in parsed.path
            is_profile = "/user" in parsed.path or "/home" in parsed.path
            if is_profile and not is_playlist:
                m_id = re.search(r'(?:^|[?&])id=(\d{4,18})', parsed.query)
                if m_id:
                    return PlatformType.NETEASE, m_id.group(1)
                m_path = re.search(r'/user/(?:home/)?(\d{4,18})', parsed.path)
                if m_path:
                    return PlatformType.NETEASE, m_path.group(1)

        # 酷狗音乐用户主页
        if "kugou.com" in hostname:
            is_profile = "/user" in parsed.path or "/profile" in parsed.path or "uid=" in parsed.query or "userid=" in parsed.query
            if is_profile and "/songlist" not in parsed.path and "global_specialid=" not in parsed.query:
                m_uid = re.search(r'(?:^|[?&])(?:uid|userid)=(\d{4,18})', parsed.query)
                if m_uid:
                    return PlatformType.KUGOU, m_uid.group(1)
    except Exception:
        pass

    return None


def extract_url_from_text(text: str) -> Optional[str]:

    """从包含表情包、文字的分享文案中提取有效 URL"""
    cleaned = extract_clean_url_or_input(text)
    if cleaned and (cleaned.startswith("http://") or cleaned.startswith("https://")):
        return cleaned
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

        cleaned = extract_clean_url_or_input(raw_input)
        text = cleaned.strip()

        # 1. 检查是否为纯数字 ID
        if re.fullmatch(r'\d+', text):
            # 纯数字天然具有歧义 (可能是各平台歌单 ID、用户 ID 或 QQ号)
            # 18~19 位 Snowflake ID 也不再无条件强判汽水，统一由 resolve_target 结合参数判定
            return PlatformType.AMBIGUOUS_DIGITS, text

        # 2. 检查酷狗特有的特殊参数或标识 (gcid_, collection_, src_cid, 或 raw gcid CID)
        if "global_specialid=collection_" in text or "gcid_" in text or "src_cid=" in text:
            return PlatformType.KUGOU, text
        if re.fullmatch(r'gcid_[a-zA-Z0-9]+', text, re.I):
            return PlatformType.KUGOU, text

        # 3. 提取有效 URL
        url_to_check = text if (text.startswith("http://") or text.startswith("https://")) else (extract_url_from_text(text) or text)

        # 4. 如果是短链且允许重定向，先解析多跳重定向
        is_shortlink = (
            any(s in url_to_check for s in ("163cn.tv", "c6.y.qq.com", "fcgi-bin/u", "t.kugou.com", "t1.kugou.com", "t2.kugou.com", "t3.kugou.com", "t.kuwo.cn", "v.douyin.com", "/s/"))
            or bool(re.search(r'(?:^|[/.\b])c\.migu\.cn', url_to_check))
        )
        if is_shortlink and resolve_redirect:
            resolved = resolve_shortlink(url_to_check)
            if resolved:
                url_to_check = resolved

        # 5. 域名特征匹配 (严格收紧域名白名单，杜绝非音乐域名误判)
        parsed = urlparse(url_to_check)
        hostname = (parsed.hostname or "").lower()

        # 网易云音乐
        if "163.com" in hostname or "163cn.tv" in hostname or "music.163.com" in url_to_check:
            return PlatformType.NETEASE, url_to_check

        # QQ 音乐 (收紧：仅匹配音乐专属二级/三级域名，或明确带有音乐路径的 qq.com)
        qq_music_hosts = ("y.qq.com", "music.qq.com", "i.y.qq.com", "c6.y.qq.com", "c.y.qq.com", "y.gtimg.cn")
        if any(h in hostname for h in qq_music_hosts):
            return PlatformType.QQMUSIC, url_to_check
        if hostname == "qq.com" and any(p in parsed.path for p in ("/music", "/playlist", "/profile", "/taoge")):
            return PlatformType.QQMUSIC, url_to_check

        # 酷狗音乐
        if "kugou.com" in hostname:
            return PlatformType.KUGOU, url_to_check

        # 酷我音乐
        if "kuwo.cn" in hostname:
            return PlatformType.KUWO, url_to_check

        # 咪咕音乐
        if "migu.cn" in hostname:
            return PlatformType.MIGU, url_to_check

        # 汽水音乐 / 抖音音乐 (收紧：普通抖音短视频/图文不得误判为汽水歌单)
        if any(h in hostname for h in ("qishui.douyin.com", "qishui.com", "music.douyin.com", "v.douyin.com")):
            return PlatformType.QISHUI, url_to_check
        if "douyin.com" in hostname:
            is_douyin_music = (
                "/qishui/" in parsed.path
                or "/music/" in parsed.path
                or "/playlist" in parsed.path
                or "/collection" in parsed.path
                or any(k in parsed.query for k in ("playlist_id=", "music_id="))
            )
            if is_douyin_music:
                return PlatformType.QISHUI, url_to_check

        # 6. 文案关键词兜底检测
        raw_strip = raw_input.strip()
        if "汽水音乐" in raw_strip or "qishui" in raw_strip.lower():
            return PlatformType.QISHUI, url_to_check
        if "咪咕音乐" in raw_strip or "migu" in raw_strip.lower():
            return PlatformType.MIGU, url_to_check
        if "网易云音乐" in raw_strip or "163.com" in raw_strip.lower():
            return PlatformType.NETEASE, url_to_check
        if "QQ音乐" in raw_strip or "qqmusic" in raw_strip.lower():
            return PlatformType.QQMUSIC, url_to_check
        if "酷狗音乐" in raw_strip or "kugou" in raw_strip.lower():
            return PlatformType.KUGOU, url_to_check
        if "酷我音乐" in raw_strip or "kuwo" in raw_strip.lower():
            return PlatformType.KUWO, url_to_check

        # 无法识别
        return PlatformType.UNKNOWN, text

    @classmethod
    def resolve_target(
        cls,
        raw_input: str,
        platform: Optional[str] = None,
        is_user: bool = False,
        resolve_redirect: bool = True
    ) -> DetectedTarget:
        """
        高层统一目标解析器：识别平台、对象类型 (歌单/用户) 与标准值。
        """
        if not raw_input or not isinstance(raw_input, str):
            return DetectedTarget(
                platform=PlatformType.UNKNOWN,
                kind=TargetKind.UNKNOWN,
                value="",
                raw_input=raw_input or ""
            )

        raw_strip = raw_input.strip()

        # 标准化 platform 参数 (兼容别名)
        explicit_platform: Optional[PlatformType] = None
        if platform:
            norm_p = str(platform).strip().lower()
            if norm_p in ("qqmusic", "qq", "qq-music", "tx", "tencent"):
                explicit_platform = PlatformType.QQMUSIC
            elif norm_p in ("netease", "163", "wyy"):
                explicit_platform = PlatformType.NETEASE
            elif norm_p in ("kugou", "kg"):
                explicit_platform = PlatformType.KUGOU
            elif norm_p in ("kuwo", "kw"):
                explicit_platform = PlatformType.KUWO
            elif norm_p in ("qishui", "douyin"):
                explicit_platform = PlatformType.QISHUI
            elif norm_p in ("migu", "mg"):
                explicit_platform = PlatformType.MIGU

        # 1. 检查带标签前缀的用户或歌单输入 (保留标签语义)
        m_qq = re.search(r'(?:qq|uin|qq号)[:：\s]*(\d{4,15})\b', raw_strip, re.I)
        if m_qq and re.match(r'^[\D\s]{0,10}\d{4,15}[\D\s]{0,10}$', raw_strip):
            p = explicit_platform or PlatformType.QQMUSIC
            return DetectedTarget(
                platform=p,
                kind=TargetKind.USER,
                value=m_qq.group(1),
                raw_input=raw_input
            )

        m_uid = re.search(r'(?:uid|用户|账号)[:：\s]*(\d{4,18})\b', raw_strip, re.I)
        if m_uid and re.match(r'^[\D\s]{0,10}\d{4,18}[\D\s]{0,10}$', raw_strip):
            p = explicit_platform or PlatformType.NETEASE
            return DetectedTarget(
                platform=p,
                kind=TargetKind.USER,
                value=m_uid.group(1),
                raw_input=raw_input
            )

        m_pl = re.search(r'(?:歌单|歌单号|playlist)[:：\s]*(\d{4,20})\b', raw_strip, re.I)
        if m_pl and re.match(r'^[\D\s]{0,10}\d{4,20}[\D\s]{0,10}$', raw_strip):
            p = explicit_platform or PlatformType.AMBIGUOUS_DIGITS
            k = TargetKind.PLAYLIST if explicit_platform else TargetKind.AMBIGUOUS
            return DetectedTarget(
                platform=p,
                kind=k,
                value=m_pl.group(1),
                raw_input=raw_input,
                is_playlist_input=True
            )

        # 2. 检查用户主页 URL
        prof = extract_user_profile_target(raw_strip)
        if prof:
            p = explicit_platform or prof[0]
            return DetectedTarget(
                platform=p,
                kind=TargetKind.USER,
                value=prof[1],
                raw_input=raw_input
            )

        # 3. 检查纯数字输入
        cleaned = extract_clean_url_or_input(raw_strip)
        if re.fullmatch(r'\d+', cleaned):
            if is_user:
                p = explicit_platform or PlatformType.AMBIGUOUS_DIGITS
                k = TargetKind.USER if explicit_platform else TargetKind.AMBIGUOUS
                return DetectedTarget(platform=p, kind=k, value=cleaned, raw_input=raw_input)
            else:
                if explicit_platform:
                    return DetectedTarget(platform=explicit_platform, kind=TargetKind.PLAYLIST, value=cleaned, raw_input=raw_input)
                else:
                    return DetectedTarget(platform=PlatformType.AMBIGUOUS_DIGITS, kind=TargetKind.AMBIGUOUS, value=cleaned, raw_input=raw_input)

        # 4. 调用底层 detect 解析 URL / 文案
        ptype, detected_text = cls.detect(raw_strip, resolve_redirect=resolve_redirect)

        # 检查重定向后的有效链接是否为用户主页
        if detected_text and (detected_text.startswith("http://") or detected_text.startswith("https://")):
            prof_after = extract_user_profile_target(detected_text)
            if prof_after:
                p = explicit_platform or prof_after[0]
                return DetectedTarget(
                    platform=p,
                    kind=TargetKind.USER,
                    value=prof_after[1],
                    raw_input=raw_input
                )

        if ptype == PlatformType.UNKNOWN:
            if explicit_platform:
                k = TargetKind.USER if is_user else TargetKind.PLAYLIST
                return DetectedTarget(platform=explicit_platform, kind=k, value=detected_text, raw_input=raw_input)
            return DetectedTarget(platform=PlatformType.UNKNOWN, kind=TargetKind.UNKNOWN, value=detected_text, raw_input=raw_input)

        if ptype == PlatformType.AMBIGUOUS_DIGITS:
            if explicit_platform:
                k = TargetKind.USER if is_user else TargetKind.PLAYLIST
                return DetectedTarget(platform=explicit_platform, kind=k, value=detected_text, raw_input=raw_input)
            return DetectedTarget(platform=PlatformType.AMBIGUOUS_DIGITS, kind=TargetKind.AMBIGUOUS, value=detected_text, raw_input=raw_input)

        # 识别到了平台，根据 is_user 决定 target kind
        final_platform = explicit_platform or ptype
        final_kind = TargetKind.USER if is_user else TargetKind.PLAYLIST
        # 歌单目标标记：URL / 平台歌单 ID（如 gcid_xxx）视为明确歌单；分享文案等模糊输入不标记
        looks_like_playlist_target = bool(
            detected_text and (
                re.match(r'^https?://', detected_text)
                or re.fullmatch(r'[A-Za-z0-9_\-:]{4,}', detected_text)
            )
        )
        return DetectedTarget(
            platform=final_platform,
            kind=final_kind,
            value=detected_text,
            raw_input=raw_input,
            is_playlist_input=looks_like_playlist_target
        )


