from qq_music_playlist_export import extract_playlist_id, extract_user_uin, export_to_m3u8, resolve_shortlink
from unittest.mock import patch, MagicMock
import tempfile
import os

def test_extract_id_from_number():
    assert extract_playlist_id("123456789") == "123456789"

def test_extract_id_from_url():
    assert extract_playlist_id("https://y.qq.com/n/ryqq/playlist/9044196528") == "9044196528"
    assert extract_playlist_id("https://y.qq.com/n/ryqq_v2/playlist/9044196528?ADTAG=h5_share_playlist") == "9044196528"
    assert extract_playlist_id("https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx") == "9044196528"
    assert extract_playlist_id("https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528") == "9044196528"
    assert extract_playlist_id("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=9044196528") == "9044196528"

def test_resolve_shortlink():
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 302
        mock_resp.headers = {"Location": "https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540"}
        mock_resp.url = "https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540"
        mock_get.return_value = mock_resp

        assert resolve_shortlink("https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI") == "https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540"
        assert resolve_shortlink("c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI") == "https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540"
        assert extract_playlist_id("https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI") == "9138517540"
        assert extract_playlist_id("c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI") == "9138517540"

def test_extract_id_from_text():
    assert extract_playlist_id("歌单ID: 9044196528") == "9044196528"
    assert extract_playlist_id("分享歌单 https://y.qq.com/n/ryqq_v2/playlist/9044196528 欢迎收听") == "9044196528"

def test_export_to_m3u8():
    with tempfile.NamedTemporaryFile(suffix='.m3u8', delete=False) as f:
        tmp_name = f.name
    try:
        sample_songs = [
            ("晴天", "周杰伦", "叶惠美"),
            ("七里香", "", "七里香"),
        ]
        export_to_m3u8(sample_songs, tmp_name, "Jay歌单")
        with open(tmp_name, 'r', encoding='utf-8') as f:
            content = f.read()
        assert "#EXTM3U" in content
        assert "#PLAYLIST:Jay歌单" in content
        assert "#EXTINF:-1,周杰伦 - 晴天" in content
        assert "周杰伦 - 晴天.mp3" in content
        assert "#EXTINF:-1,七里香" in content
        assert "七里香.mp3" in content
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)

def test_export_to_json_cover_url():
    import json
    from qq_music_playlist_export import export_to_json
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        tmp_name = f.name
    try:
        sample_songs = [
            ("晴天", "周杰伦", "叶惠美", "https://y.gtimg.cn/music/photo_new/T002R300x300M000003ALB.jpg"),
            ("七里香", "周杰伦", "七里香"),
        ]
        export_to_json(sample_songs, tmp_name, playlist_title="Jay歌单", author="Jay")
        with open(tmp_name, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert data["name"] == "Jay歌单"
        assert data["creator"] == "Jay"
        assert data["platform"] == "qqmusic"
        assert data["trackCount"] == 2
        assert len(data["tracks"]) == 2
        assert data["tracks"][0]["title"] == "晴天"
        assert data["tracks"][0]["artist"] == "周杰伦"
        assert data["tracks"][0]["album"] == "叶惠美"
        assert data["tracks"][0]["coverUrl"] == "https://y.gtimg.cn/music/photo_new/T002R300x300M000003ALB.jpg"
        assert "coverUrl" not in data["tracks"][1]
        # Verify no deprecated fields exist
        for t in data["tracks"]:
            assert "artists" not in t
            assert "albumObj" not in t
            assert "rawIds" not in t
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)
