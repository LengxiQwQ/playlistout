from netease_playlist_export import extract_playlist_id, extract_user_id, determine_track_status, export_m3u8
import tempfile
import os

def test_extract_id_from_number():
    assert extract_playlist_id("2756674066") == "2756674066"

def test_extract_id_from_url():
    assert extract_playlist_id("https://music.163.com/playlist?id=2756674066") == "2756674066"
    assert extract_playlist_id("https://music.163.com/#/playlist?id=2756674066") == "2756674066"

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
