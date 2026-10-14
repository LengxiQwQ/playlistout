# -*- coding: utf-8 -*-
"""
PlaylistOut HTTP Layer
======================
Session management, IPv4 prioritization, and shortlink redirect resolution.
"""

import re
import socket
import requests
from typing import Optional

# 优先 IPv4 避免国内部分运营商 IPv6 握手超时
try:
    import urllib3.util.connection as urllib3_cn
    urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

MOBILE_USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
)


def get_default_headers(mobile: bool = False) -> dict:
    return {
        "User-Agent": MOBILE_USER_AGENT if mobile else DEFAULT_USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }


def resolve_shortlink(url_or_text: str, timeout: int = 8) -> str:
    """
    解析短链接重定向，返回展开后的真实 URL。
    若非短链或解析超时则原样返回。
    """
    if not url_or_text:
        return ""
    text = url_or_text.strip()

    # 尝试提取文本中可能存在的 URL
    m = re.search(r'https?://[^\s<>"]+', text)
    if not m:
        # 支持无协议前缀的常见短链
        m_bare = re.search(
            r'(?:^|[^\w.-])((?:[a-zA-Z0-9-]+\.)*(?:y\.qq\.com|163cn\.tv|kugou\.com|kuwo\.cn|douyin\.com|qishui\.com)/\S*)',
            text
        )
        if m_bare:
            target_url = f"https://{m_bare.group(1)}"
        else:
            return text
    else:
        target_url = m.group(0)

    try:
        resp = requests.get(
            target_url,
            headers=get_default_headers(mobile=True),
            allow_redirects=False,
            timeout=timeout
        )
        if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
            loc = resp.headers["Location"]
            if loc.startswith("/"):
                # 拼接完整域名
                from urllib.parse import urlparse
                parsed = urlparse(target_url)
                loc = f"{parsed.scheme}://{parsed.netloc}{loc}"
            return loc
        elif resp.status_code == 200:
            return resp.url or target_url
    except Exception:
        pass

    return target_url
