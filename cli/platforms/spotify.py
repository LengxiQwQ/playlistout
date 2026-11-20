# Protocol reference: AliAkhtari78/SpotifyScraper (MIT); see THIRD-PARTY-NOTICES.md.
from urllib.parse import urlparse, urljoin
import json
import re
from .base import BasePlatformAdapter
from .registry import register_platform
from .international import _Requests, _total, _url, _track, _reverse_tracks
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
                    name = t.get('name')
                    if not name:
                        continue
                    typename = t.get('__typename')
                    uri = t.get('uri') or ''
                    uri_parts = uri.split(':')
                    raw_id = uri_parts[-1] if uri_parts else uri

                    artists = ''
                    album_name = ''
                    cover_url = ''
                    source_url = uri
                    duration_ms = (t.get('trackDuration') or t.get('localTrackDuration') or t.get('duration') or {}).get('totalMilliseconds')

                    if typename == 'Track':
                        album = t.get('albumOfTrack') or {}
                        album_name = album.get('name', '')
                        cover_url = (album.get('coverArt', {}).get('sources') or [{}])[0].get('url', '')
                        artists = ', '.join(a.get('profile', {}).get('name', '') for a in t.get('artists', {}).get('items', []) if a.get('profile', {}).get('name'))
                        if raw_id:
                            source_url = f'https://open.spotify.com/track/{raw_id}'
                        tid = raw_id
                    elif typename == 'LocalTrack':
                        album_name = t.get('albumName') or ''
                        artists = t.get('artistName') or ''
                        tid = uri.replace('spotify:', '') if uri else raw_id
                        source_url = uri
                    elif typename == 'Episode':
                        podcast = (t.get('podcastV2') or {}).get('data') or t.get('show') or {}
                        album_name = podcast.get('name') or ''
                        artists = podcast.get('name') or '播客节目'
                        cover_url = (t.get('coverArt', {}).get('sources') or [{}])[0].get('url', '')
                        if raw_id:
                            source_url = f'https://open.spotify.com/episode/{raw_id}'
                        tid = raw_id
                    else:
                        album = t.get('albumOfTrack') or {}
                        album_name = t.get('albumName') or album.get('name', '')
                        cover_url = (album.get('coverArt', {}).get('sources') or t.get('coverArt', {}).get('sources') or [{}])[0].get('url', '')
                        artists = t.get('artistName') or ', '.join(a.get('profile', {}).get('name', '') for a in t.get('artists', {}).get('items', []) if a.get('profile', {}).get('name'))
                        tid = raw_id

                    if not artists:
                        artists = '未知歌手'

                    tracks.append(_track(
                        len(tracks) + 1,
                        name,
                        artists,
                        id=tid or uri,
                        album=album_name,
                        duration_ms=duration_ms,
                        track_number=t.get('trackNumber'),
                        source_url=source_url,
                        cover_url=cover_url,
                    ))
                offset += len(items)
                if offset >= total:
                    break
            if not tracks and total > 0:
                raise ValueError('歌单未取得任何有效曲目')
            if playlist:
                playlist.track_count = len(tracks)
            _reverse_tracks(tracks)
            return playlist
        finally:
            net.session.close()
