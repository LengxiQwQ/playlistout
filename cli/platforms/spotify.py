# Protocol reference: AliAkhtari78/SpotifyScraper (MIT); see THIRD-PARTY-NOTICES.md.
from urllib.parse import urlparse, urljoin
import json
import re
from .base import BasePlatformAdapter
from .registry import register_platform
from .international import _Requests, _total, _url, _track
from ..core.models import NormalizedPlaylist


@register_platform
class SpotifyAdapter(BasePlatformAdapter):
    platform_id = 'spotify'
    display_name = 'Spotify'
    description = '公开歌单长链接（免登录）'
    aliases = ['spotify']
    supports_playlist = True
    supports_user_playlists = False
    requires_user_auth = False
    supported_channels = ()

    def fetch_playlist(self, raw_input, **options):
        net = _Requests({'spotify.link', 'spoti.fi', 'open.spotify.com', 'api-partner.spotify.com'})
        try:
            if urlparse(raw_input).hostname in {'spotify.link', 'spoti.fi'}:
                net.get(raw_input)
                raw_input = net.last_url
            pid = _url(raw_input, 'open.spotify.com', r'/(?:intl-[A-Za-z-]+/)?playlist/([A-Za-z0-9]{22})/?')[1]
            html = net.get('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC')
            m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
            if not m:
                raise ValueError('Spotify 网页格式已变化')
            session = json.loads(m[1])['props']['pageProps']['state']['settings']['session']
            if not session.get('isAnonymous'):
                raise ValueError('无法取得匿名访问令牌')
            headers = {'authorization': 'Bearer ' + session['accessToken']}
            tracks, offset, playlist = [], 0, None
            from urllib.parse import urlencode
            while True:
                query = urlencode({'operationName': 'fetchPlaylist', 'variables': json.dumps({'uri': f'spotify:playlist:{pid}', 'offset': offset, 'limit': 100, 'enableWatchFeedEntrypoint': False}), 'extensions': json.dumps({'persistedQuery': {'version': 1, 'sha256Hash': 'a65e12194ed5fc443a1cdebed5fabe33ca5b07b987185d63c72483867ad13cb4'}})})
                data = json.loads(net.get('https://api-partner.spotify.com/pathfinder/v1/query?' + query, headers))
                p = data.get('data', {}).get('playlistV2') or {}
                if data.get('errors') or not p.get('name'):
                    raise ValueError('Spotify 无法返回公开歌单')
                total = _total(p.get('content', {}).get('totalCount'))
                if playlist and playlist.track_count != total:
                    raise ValueError('歌单在解析期间发生变化')
                if not playlist:
                    images = p.get('images', {}).get('items', [])
                    playlist = NormalizedPlaylist(platform='spotify', id=pid, name=p['name'], creator=p.get('ownerV2', {}).get('data', {}).get('name', ''), description=p.get('description', ''), source_url=f'https://open.spotify.com/playlist/{pid}', track_count=total, cover_url=(images[0].get('sources') or [{}])[0].get('url', '') if images else '', tracks=tracks)
                items = p['content'].get('items') or []
                if not items and offset < total:
                    raise ValueError('Spotify 分页提前结束')
                for item in items:
                    t = (item.get('itemV2') or {}).get('data') or {}
                    if t.get('__typename') != 'Track':
                        raise ValueError('歌单含无法解析的条目，未导出部分结果')
                    tid = (t.get('uri') or '').split(':')[-1]
                    album = t.get('albumOfTrack') or {}
                    artists = ', '.join(a.get('profile', {}).get('name', '') for a in t.get('artists', {}).get('items', []))
                    tracks.append(_track(len(tracks)+1, t.get('name'), artists, id=tid, album=album.get('name', ''), duration_ms=(t.get('trackDuration') or t.get('duration') or {}).get('totalMilliseconds'), track_number=t.get('trackNumber'), source_url=f'https://open.spotify.com/track/{tid}', cover_url=(album.get('coverArt', {}).get('sources') or [{}])[0].get('url', '')))
                offset += len(items)
                if offset >= total:
                    if len(tracks) != total:
                        raise ValueError('歌单数量不符')
                    return playlist
        finally:
            net.session.close()
