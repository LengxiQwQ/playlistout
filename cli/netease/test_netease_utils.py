from netease_playlist_export import extract_playlist_id, extract_user_id, determine_track_status

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
