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
