from netease_playlist_export import extract_playlist_id, extract_user_id, determine_track_status, export_m3u8, resolve_shortlink
from unittest.mock import patch, MagicMock
import tempfile
import os

def test_extract_id_from_number():
    assert extract_playlist_id("2756674066") == "2756674066"

def test_extract_id_from_url():
    assert extract_playlist_id("https://music.163.com/playlist?id=2756674066") == "2756674066"
    assert extract_playlist_id("https://music.163.com/#/playlist?id=2756674066") == "2756674066"

def test_resolve_shortlink():
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 302
        mock_resp.headers = {"Location": "https://music.163.com/playlist?id=18429425523"}
        mock_resp.url = "https://music.163.com/playlist?id=18429425523"
        mock_get.return_value = mock_resp

        assert resolve_shortlink("https://163cn.tv/bhsHbRfW") == "https://music.163.com/playlist?id=18429425523"
        assert resolve_shortlink("163cn.tv/bhsHbRfW") == "https://music.163.com/playlist?id=18429425523"
        assert extract_playlist_id("https://163cn.tv/bhsHbRfW") == "18429425523"
        assert extract_playlist_id("163cn.tv/bhsHbRfW") == "18429425523"

def test_extract_user_id():
    assert extract_user_id("1825474783") == "1825474783"
    assert extract_user_id("https://music.163.com/user/home?id=1825474783") == "1825474783"

def test_determine_track_status():
    assert determine_track_status({'fee': 0}, {'st': -100, 'pl': 0}) == '下架/无版权'
    assert determine_track_status({'fee': 1}, {'st': 0, 'pl': 320000}) == 'VIP专享'
    assert determine_track_status({'fee': 4}, {'st': 0, 'pl': 320000}) == '付费专辑'
    assert determine_track_status({'fee': 0}, {'st': 0, 'pl': 320000}) == '正常'

def test_export_m3u8():
    with tempfile.NamedTemporaryFile(suffix='.m3u8', delete=False) as f:
        tmp_name = f.name
    try:
        sample_tracks = [
            ("晴天", "周杰伦", "叶惠美", "04:29", "正常"),
            ("下架歌曲", "歌手A", "专辑A", "", "下架/无版权"),
        ]
        export_m3u8(tmp_name, "测试歌单", sample_tracks, "作者")
        with open(tmp_name, 'r', encoding='utf-8') as f:
            content = f.read()
        assert "#EXTM3U" in content
        assert "#PLAYLIST:测试歌单" in content
        assert "#EXTINF:269,周杰伦 - 晴天" in content
        assert "周杰伦 - 晴天.mp3" in content
        assert "#EXTINF:-1,歌手A - 下架歌曲" in content
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)

def test_export_json_cover_url():
    import json
    from netease_playlist_export import export_json
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        tmp_name = f.name
    try:
        sample_tracks = [
            ("晴天", "周杰伦", "叶惠美", "04:29", "正常", "https://p3.music.126.net/sample_cover.jpg"),
            ("七里香", "周杰伦", "七里香", "04:59", "正常", ""),
        ]
        export_json(tmp_name, "测试歌单", sample_tracks, "作者", "https://p1.music.126.net/playlist_cover.jpg", playlist_id="12345")
        with open(tmp_name, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert data["name"] == "测试歌单"
        assert data["creator"] == "作者"
        assert data["coverUrl"] == "https://p1.music.126.net/playlist_cover.jpg"
        assert data["platform"] == "netease"
        assert data["id"] == "12345"
        assert data["sourceUrl"] == "https://music.163.com/#/playlist?id=12345"
        assert data["trackCount"] == 2
        assert len(data["tracks"]) == 2
        assert data["tracks"][0]["title"] == "晴天"
        assert data["tracks"][0]["artist"] == "周杰伦"
        assert data["tracks"][0]["album"] == "叶惠美"
        assert data["tracks"][0]["durationMs"] == 269000
        assert data["tracks"][0]["status"] == "playable"
        assert data["tracks"][0]["statusText"] == "正常"
        assert data["tracks"][0]["coverUrl"] == "https://p3.music.126.net/sample_cover.jpg"
        assert "coverUrl" not in data["tracks"][1]
        for t in data["tracks"]:
            assert "artists" not in t
            assert "albumObj" not in t
            assert "rawIds" not in t
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)
