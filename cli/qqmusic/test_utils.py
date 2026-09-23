from qq_music_playlist_export import extract_playlist_id

def test_extract_id_from_number():
    assert extract_playlist_id("123456789") == "123456789"

def test_extract_id_from_url():
    assert extract_playlist_id("https://y.qq.com/n/ryqq/playlist/9044196528") == "9044196528"
    assert extract_playlist_id("https://y.qq.com/n/ryqq_v2/playlist/9044196528?ADTAG=h5_share_playlist") == "9044196528"
    assert extract_playlist_id("https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx") == "9044196528"
    assert extract_playlist_id("https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528") == "9044196528"
    assert extract_playlist_id("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=9044196528") == "9044196528"

def test_extract_id_from_text():
    assert extract_playlist_id("歌单ID: 9044196528") == "9044196528"
    assert extract_playlist_id("分享歌单 https://y.qq.com/n/ryqq_v2/playlist/9044196528 欢迎收听") == "9044196528"
