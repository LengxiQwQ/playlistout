# -*- coding: utf-8 -*-
"""
Playlist Out CLI HTTP Layer
===========================
Session management, IPv4 prioritization, and shortlink redirect resolution.
"""

import re
import socket
import threading
from contextlib import contextmanager
from typing import Optional
import requests

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

MOBILE_USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
)


def reset_gai_family():
    """重置 urllib3 的网络栈解析策略为系统默认双栈 (支持 IPv6)"""
    try:
        import urllib3.util.connection as urllib3_cn
        from urllib3.util.connection import HAS_IPV6
        urllib3_cn.allowed_gai_family = lambda: (socket.AF_UNSPEC if HAS_IPV6 else socket.AF_INET)
    except Exception:
        pass


# urllib3 的网络族解析开关是进程级全局变量；用模块级可重入锁串行化 IPv4
# fallback 窗口，避免并发调用时互相踩踏（CLI 自身为单线程执行模型）。
_ipv4_fallback_lock = threading.RLock()


@contextmanager
def ipv4_fallback_context():
    """
    在发生连接错误或特定超时时，临时切换到仅 IPv4 重试的上下文。

    线程安全与隔离契约：
    - 通过模块级 ``RLock`` 串行化整个 fallback 窗口，保证并发调用时全局网络族
      开关的切换与恢复顺序正确（支持嵌套）。
    - ``allowed_gai_family`` 为进程级全局开关：fallback 窗口内其他线程发起的
      新连接会短暂同样走 IPv4。CLI 本身为单线程执行模型；如将本模块用于并发
      场景，请让并发请求各自使用独立的 ``requests.Session`` 并接受这一短暂降级。
    """
    with _ipv4_fallback_lock:
        orig = None
        try:
            import urllib3.util.connection as urllib3_cn
            orig = getattr(urllib3_cn, "allowed_gai_family", None)
            urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
            yield
        finally:
            try:
                if orig is not None:
                    import urllib3.util.connection as urllib3_cn
                    urllib3_cn.allowed_gai_family = orig
                else:
                    reset_gai_family()
            except Exception:
                pass


def request_with_ipv4_fallback(method: str, url: str, **kwargs) -> requests.Response:
    """
    发起 HTTP 请求。
    首先使用系统标准双栈网络（支持 IPv6）。
    若遇到连接超时或握手失败等 ConnectionError，自动回退到 IPv4-only 重试一次。
    """
    try:
        return requests.request(method, url, **kwargs)
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as initial_err:
        try:
            with ipv4_fallback_context():
                return requests.request(method, url, **kwargs)
        except Exception:
            raise initial_err


# 初始化时确保遵循双栈网络策略
reset_gai_family()


def get_default_headers(mobile: bool = False) -> dict:
    return {
        "User-Agent": MOBILE_USER_AGENT if mobile else DEFAULT_USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }


def resolve_shortlink(url_or_text: str, timeout: int = 8, max_hops: int = 3) -> str:
    """
    解析短链接重定向，返回展开后的真实 URL。
    支持最多 3 跳重定向（如 c6.y.qq.com -> taoge -> ryqq，或 163cn.tv，或 qishui /s/）。
    采用智能双栈 + IPv4 降级重试机制。若非短链或解析超时则原样返回。
    """
    if not url_or_text:
        return ""
    text = url_or_text.strip()

    # 尝试提取文本中可能存在的 URL（优先在非汉字/非标点处截断）
    m = re.search(r'https?://[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"\'<>`()\[\]{}]+', text)
    if not m:
        # 支持无协议前缀的常见短链
        m_bare = re.search(
            r'(?:^|[^\w.-])((?:(?:[a-zA-Z0-9-]+\.)*(?:y\.qq\.com|163cn\.tv|kugou\.com|kuwo\.cn|douyin\.com|qishui\.com|migu\.cn))[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"\'<>`()\[\]{}]+)',
            text
        )
        if m_bare:
            target_url = f"https://{m_bare.group(1)}".rstrip('.,;:!?，。！？@')
        else:
            return text
    else:
        target_url = m.group(0).rstrip('.,;:!?，。！？@')

    current_url = target_url
    for _ in range(max_hops):
        try:
            resp = request_with_ipv4_fallback(
                "GET",
                current_url,
                headers=get_default_headers(mobile=True),
                allow_redirects=False,
                timeout=timeout
            )
            if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                from urllib.parse import urljoin
                loc = resp.headers["Location"].strip()
                current_url = urljoin(current_url, loc)
                # 如果已经到达明确的目标落地页且不再是短链路径，可以提前退出
                if not any(s in current_url for s in ("163cn.tv", "fcgi-bin/u", "/s/", "t.kuwo.cn", "c.migu.cn", "t.kugou.com", "t1.kugou.com", "t2.kugou.com", "t3.kugou.com")):
                    break
            else:
                break
        except Exception:
            break

    return current_url

