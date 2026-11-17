"""Local-only public playlist adapters; no PlaylistOut API dependency.

Protocol references (MIT): AliAkhtari78/SpotifyScraper @ 9cbf05a,
omkarcloud/apple-music-scraper @ f7606f8. See THIRD-PARTY-NOTICES.md.
"""
import re
import time
from urllib.parse import urlparse, urljoin

import requests

from ..core.models import NormalizedTrack


class _Requests:
    def __init__(self, hosts):
        self.hosts = hosts
        self.session = requests.Session()
        self.count = 0
        self.last_url = ''
        self.deadline = time.monotonic() + 25

    def get(self, url, headers=None, allow404=False):
        for hop in range(4):
            u = urlparse(url)
            if u.scheme != 'https' or u.hostname not in self.hosts or u.username or u.password or u.port:
                raise ValueError('不支持的上游地址')
            self.count += 1
            remaining = self.deadline - time.monotonic()
            if self.count > 40 or remaining <= 0:
                raise ValueError('歌单解析超过请求预算')
            with self.session.get(url, headers=headers, timeout=max(.1, remaining), allow_redirects=False, stream=True) as r:
                if 300 <= r.status_code < 400:
                    if hop == 3 or not r.headers.get('location'):
                        raise ValueError('跳转次数过多')
                    next_url = urljoin(url, r.headers['location'])
                    if urlparse(next_url).netloc != u.netloc:
                        headers = None
                    url = next_url
                    continue
                if r.status_code != 200 and not (allow404 and r.status_code == 404):
                    # Do not expose upstream response bodies, tokens or request headers.
                    raise ValueError(f'上游访问失败（HTTP {r.status_code}）')
                chunks, size = [], 0
                for chunk in r.iter_content(65536):
                    size += len(chunk)
                    if size > 8 * 1024 * 1024 or time.monotonic() > self.deadline:
                        raise ValueError('上游响应超过安全预算')
                    chunks.append(chunk)
                self.last_url = url
                return b''.join(chunks).decode('utf-8')
        raise ValueError('无法解析跳转')


def _total(value):
    if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 3000:
        raise ValueError('无法确认歌单总数或歌单超过 3000 首')
    return value


def _url(raw, host, pattern):
    u = urlparse(raw)
    if u.scheme != 'https' or u.hostname != host or u.username or u.password or u.port:
        raise ValueError('请提供公开歌单的 HTTPS 长链接')
    m = re.fullmatch(pattern, u.path, re.I)
    if not m:
        raise ValueError('请提供公开歌单链接，不能使用歌曲、专辑或用户主页链接')
    return m


def _track(index, title, artist, **kwargs):
    if not title or not artist:
        raise ValueError('歌曲缺少必要信息，未导出部分歌单')
    return NormalizedTrack(index=index, title=title, artist=artist, status='unknown',
                           status_text='未知', is_available=None, is_vip=None, **kwargs)
