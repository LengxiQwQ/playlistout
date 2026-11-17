# Protocol reference: omkarcloud/apple-music-scraper (MIT); see THIRD-PARTY-NOTICES.md.
import base64
from urllib.parse import urlparse, urljoin
import json
import re
from .base import BasePlatformAdapter
from .registry import register_platform
from .international import _Requests, _total, _url, _track, _reverse_tracks
from ..core.models import NormalizedPlaylist


@register_platform
class AppleMusicAdapter(BasePlatformAdapter):
    platform_id = 'applemusic'
    display_name = 'Apple Music'
    description = '含地区代码的公开歌单长链接（免登录）'
    aliases = ['applemusic', 'apple-music', 'apple']
    supports_playlist = True
    supports_user_playlists = False
    requires_user_auth = False
    supported_channels = ()

    def fetch_playlist(self, raw_input, **options):
        net = _Requests({'geo.music.apple.com', 'music.apple.com', 'amp-api.music.apple.com'})
        try:
            if urlparse(raw_input).hostname == 'geo.music.apple.com':
                net.get(raw_input)
                raw_input = net.last_url
            match = _url(raw_input, 'music.apple.com', r'/([a-z]{2})/playlist/(?:[^/]+/)?(pl\.[A-Za-z0-9.-]+)/?')
            country, pid = match[1].lower(), match[2]
            html = net.get('https://music.apple.com/us/404', allow404=True)
            asset = re.search(r'src="(/assets/index~[^\"]+\.js)"', html)
            if not asset:
                raise ValueError('Apple Music 网页格式已变化')
            bundle = net.get('https://music.apple.com' + asset[1])
            token = None
            for candidate in re.findall(r'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}', bundle):
                try:
                    part = candidate.split('.')[1]
                    if json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4))).get('iss') == 'AMPWebPlay':
                        token = candidate
                        break
                except (ValueError, UnicodeDecodeError):
                    continue
            if not token:
                raise ValueError('Apple Music 令牌格式已变化')
            headers = {'authorization': 'Bearer ' + token, 'origin': 'https://music.apple.com', 'referer': 'https://music.apple.com/'}
            root = 'https://amp-api.music.apple.com'
            data = json.loads(net.get(f'{root}/v1/catalog/{country}/playlists/{pid}?include=tracks&extend=trackCount', headers))
            if not data.get('data'):
                raise ValueError('歌单未公开或在此地区不可用')
            p = data['data'][0]; a = p['attributes']; total = _total(a.get('trackCount'))
            block = p.get('relationships', {}).get('tracks'); tracks = []; seen = set()
            while True:
                if not isinstance(block, dict) or not isinstance(block.get('data'), list):
                    raise ValueError('缺少歌曲分页数据')
                for t in block['data']:
                    v = t.get('attributes') or {}
                    if t.get('type') != 'songs':
                        raise ValueError('歌单包含无法解析的条目')
                    art = v.get('artwork', {}).get('url', '').replace('{w}', '600').replace('{h}', '600')
                    tracks.append(_track(len(tracks)+1, v.get('name'), v.get('artistName'), id=t['id'], album=v.get('albumName', ''), duration_ms=v.get('durationInMillis'), isrc=v.get('isrc'), release_date=v.get('releaseDate'), track_number=v.get('trackNumber'), disc_number=v.get('discNumber'), source_url=v.get('url'), cover_url=art))
                next_link = block.get('next')
                if not next_link:
                    break
                u = urlparse(urljoin(root, next_link))
                if not block['data'] or len(tracks) >= total or next_link in seen or u.hostname != 'amp-api.music.apple.com' or u.path != f'/v1/catalog/{country}/playlists/{pid}/tracks':
                    raise ValueError('Apple Music 分页异常')
                seen.add(next_link)
                block = json.loads(net.get(u.geturl(), headers))
            if len(tracks) != total:
                raise ValueError('未取得完整歌单')
            _reverse_tracks(tracks)
            notes = a.get('description') or {}
            return NormalizedPlaylist(platform='applemusic', id=pid, name=a['name'], creator=a.get('curatorName', ''), description=notes.get('standard', '') if isinstance(notes, dict) else notes, source_url=f'https://music.apple.com/{country}/playlist/{pid}', cover_url=a.get('artwork', {}).get('url', '').replace('{w}', '600').replace('{h}', '600'), track_count=total, tracks=tracks)
        finally:
            net.session.close()
