import csv
import json
from unittest.mock import patch

import pytest
from openpyxl import load_workbook

from cli.core.detector import SmartDetector
from cli.core.exporter import perform_export
from cli.core.models import NormalizedPlaylist
from cli.platforms.international import _Requests, _total, _track, _url
from cli.platforms.spotify import SpotifyAdapter
from cli.platforms.applemusic import AppleMusicAdapter


@pytest.mark.parametrize('platform,url', [
    ('spotify', 'https://open.spotify.com/playlist/1234567890123456789012'),
    ('applemusic', 'https://music.apple.com/cn/playlist/pl.u-example'),
])
def test_detection_and_all_exports_keep_unknown_and_duplicates(tmp_path, monkeypatch, platform, url):
    monkeypatch.setenv('PLAYLISTOUT_NO_TELEMETRY', '1')
    assert SmartDetector.detect(url, resolve_redirect=False)[0].value == platform
    tracks = [_track(i, '=Example', 'Artist', id='same', source_url=url) for i in (1, 2)]
    playlist = NormalizedPlaylist(platform=platform, id='example', name='Example', track_count=2, tracks=tracks)
    paths = perform_export(playlist, str(tmp_path), show_header=False, show_summary=False)
    assert len(paths) == 6
    data = json.loads(next(tmp_path.glob('*.json')).read_text(encoding='utf-8'))
    assert len(data['tracks']) == 2
    assert data['tracks'][0]['status'] == 'unknown'
    assert 'isAvailable' not in data['tracks'][0]
    assert 'isVip' not in data['tracks'][0]
    with next(tmp_path.glob('*.csv')).open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 2 and rows[0]['vip'] == '' and rows[0]['status'] == 'unknown'
    assert rows[0]['title'] == "'=Example"
    book = load_workbook(next(tmp_path.glob('*.xlsx')), read_only=True)
    rows = list(book['Tracks'].values)
    assert len(rows) == 3 and rows[1][8] is None and rows[1][9] == 'unknown'
    book.close()


def test_budget_and_host_guard_prevent_untrusted_requests():
    net = _Requests({'open.spotify.com'})
    try:
        with patch.object(net.session, 'get') as get:
            with pytest.raises(ValueError):
                net.get('https://open.spotify.com.evil.test/')
            get.assert_not_called()
            net.count = 40
            with pytest.raises(ValueError):
                net.get('https://open.spotify.com/')
            get.assert_not_called()
    finally:
        net.session.close()


def test_invalid_total_and_nonplaylist_inputs_fail_closed():
    for value in [None, -1, 3001, True]:
        with pytest.raises(ValueError):
            _total(value)
    assert _total(0) == 0
    for adapter, url in [(SpotifyAdapter(), 'https://open.spotify.com/track/1234567890123456789012'),
                         (AppleMusicAdapter(), 'https://music.apple.com/cn/album/example/123')]:
        with pytest.raises(ValueError):
            adapter.fetch_playlist(url)


@pytest.mark.parametrize('adapter,url', [
    (SpotifyAdapter(), 'https://open.spotify.com/playlist/1234567890123456789012'),
    (AppleMusicAdapter(), 'https://music.apple.com/cn/playlist/pl.u-example'),
])
def test_complete_vendor_playlist_is_reversed_once_before_export(tmp_path, monkeypatch, adapter, url):
    import base64
    from urllib.parse import parse_qs, urlparse
    monkeypatch.setenv('PLAYLISTOUT_NO_TELEMETRY', '1')
    def read(net, target, headers=None, allow404=False):
        if '/embed/track/' in target:
            session = {'isAnonymous': True, 'accessToken': 'fixture-only'}
            return '<script id="__NEXT_DATA__" type="application/json">' + json.dumps({'props': {'pageProps': {'state': {'settings': {'session': session}}}}}) + '</script>'
        if target.endswith('/us/404'):
            return '<script src="/assets/index~fixture.js"></script>'
        if target.endswith('.js'):
            payload = base64.urlsafe_b64encode(json.dumps({'iss': 'AMPWebPlay'}).encode()).decode().rstrip('=')
            return 'eyJ' + 'a'*25 + '.' + payload + '.' + 'a'*30
        if 'spotify.com/pathfinder/' in target:
            offset = json.loads(parse_qs(urlparse(target).query)['variables'][0])['offset']
            names = ['older', 'middle'] if offset == 0 else ['newer']
            items = [{'itemV2': {'data': {'__typename': 'Track', 'uri': 'spotify:track:' + name, 'name': name, 'artists': {'items': [{'profile': {'name': 'Artist'}}]}}}} for name in names]
            return json.dumps({'data': {'playlistV2': {'name': 'Example', 'content': {'totalCount': 3, 'items': items}}}})
        items = lambda names: [{'type': 'songs', 'id': name, 'attributes': {'name': name, 'artistName': 'Artist'}} for name in names]
        if '/tracks?' in target:
            return json.dumps({'data': items(['newer'])})
        return json.dumps({'data': [{'attributes': {'name': 'Example', 'trackCount': 3}, 'relationships': {'tracks': {'data': items(['older', 'middle']), 'next': '/v1/catalog/cn/playlists/pl.u-example/tracks?offset=2'}}}]})
    with patch.object(_Requests, 'get', autospec=True, side_effect=read):
        playlist = adapter.fetch_playlist(url)
    assert [t.title for t in playlist.tracks] == ['newer', 'middle', 'older']
    assert [t.index for t in playlist.tracks] == [1, 2, 3]
    perform_export(playlist, str(tmp_path), formats=['json', 'csv'], show_header=False, show_summary=False)
    data = json.loads(next(tmp_path.glob('*.json')).read_text(encoding='utf-8'))
    assert [t['title'] for t in data['tracks']] == ['newer', 'middle', 'older']
    with next(tmp_path.glob('*.csv')).open(encoding='utf-8-sig', newline='') as stream:
        assert [row['title'] for row in csv.DictReader(stream)] == ['newer', 'middle', 'older']


def test_spotify_parses_local_and_episode_tracks_and_skips_invalid(monkeypatch):
    monkeypatch.setenv('PLAYLISTOUT_NO_TELEMETRY', '1')
    adapter = SpotifyAdapter()
    raw_items = [
        {'itemV2': {'data': {'__typename': 'Track', 'uri': 'spotify:track:t1', 'name': 'Track1', 'artists': {'items': [{'profile': {'name': 'Artist1'}}]}, 'albumOfTrack': {'name': 'Alb1', 'coverArt': {'sources': [{'url': 'https://c1'}]}}}}},
        {'itemV2': {'data': {'__typename': 'LocalTrack', 'uri': 'spotify:local:Art2:Alb2:Trk2:200', 'name': 'Local2', 'artistName': 'Artist2', 'albumName': 'Alb2'}}},
        {'itemV2': {'data': {'__typename': 'Episode', 'uri': 'spotify:episode:ep3', 'name': 'Ep3', 'podcastV2': {'data': {'name': 'PodShow'}}, 'coverArt': {'sources': [{'url': 'https://c3'}]}}}},
        {'itemV2': {'data': {'__typename': 'Corrupted'}}},  # Missing name, should be skipped
    ]

    def read(net, target, headers=None, allow404=False):
        if '/embed/track/' in target:
            session = {'isAnonymous': True, 'accessToken': 'fixture-only'}
            return '<script id="__NEXT_DATA__" type="application/json">' + json.dumps({'props': {'pageProps': {'state': {'settings': {'session': session}}}}}) + '</script>'
        if 'spotify.com/pathfinder/' in target:
            return json.dumps({'data': {'playlistV2': {'name': 'Mixed', 'content': {'totalCount': 4, 'items': raw_items}}}})
        raise ValueError('Unexpected URL: ' + target)

    with patch.object(_Requests, 'get', autospec=True, side_effect=read):
        playlist = adapter.fetch_playlist('https://open.spotify.com/playlist/1234567890123456789012')

    assert playlist.track_count == 3
    assert len(playlist.tracks) == 3
    # Tracks are reversed: Ep3 (index 1), Local2 (index 2), Track1 (index 3)
    ep, local, track = playlist.tracks
    assert ep.title == 'Ep3' and ep.artist == 'PodShow' and ep.cover_url == 'https://c3' and ep.index == 1
    assert local.title == 'Local2' and local.artist == 'Artist2' and local.cover_url == '' and local.index == 2
    assert track.title == 'Track1' and track.artist == 'Artist1' and track.cover_url == 'https://c1' and track.index == 3

