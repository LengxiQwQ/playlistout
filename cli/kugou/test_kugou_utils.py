# -*- coding: utf-8 -*-
"""
Kugou CLI Exporter Unit Tests
"""

import os
import json
import csv
import pytest
from unittest.mock import patch, MagicMock

from kugou_playlist_export import (
    extract_kugou_target,
    sign_kugou_login,
    sign_kugou_gateway,
    clean_audio_extension,
    extract_title_and_artists,
    normalize_cover_url,
    normalize_kugou_track,
    load_auth_credentials,
    save_auth_credentials,
    clear_auth_credentials,
    poll_kugou_qr_status,
    export_xlsx,
    export_csv,
    export_json,
    export_txt,
    export_m3u8,
    fetch_special_playlist,
    fetch_collection_playlist,
    fetch_songlist_h5,
    fetch_cloudlist_playlist,
)


class TestTargetExtraction:
    def test_special_playlist_url(self):
        target = extract_kugou_target("https://www.kugou.com/yy/special/single/546903.html")
        assert target is not None
        assert target["type"] == "special"
        assert target["id"] == "546903"

    def test_collection_playlist_param(self):
        url = "https://activity.kugou.com/h5/songlist/?global_specialid=collection_3_1504683618_2_0&specialid=123"
        target = extract_kugou_target(url)
        assert target is not None
        assert target["type"] == "collection"
        assert target["id"] == "collection_3_1504683618_2_0"
        assert target["specialid"] == 123

    def test_collection_id_standalone(self):
        target = extract_kugou_target("collection_3_1504683618_2_0")
        assert target is not None
        assert target["type"] == "collection"
        assert target["id"] == "collection_3_1504683618_2_0"

    def test_gcid_songlist_url(self):
        target = extract_kugou_target("https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/")
        assert target is not None
        assert target["type"] == "songlist"
        assert target["id"] == "gcid_3zr52qfrzaz06a"

    def test_raw_cid_songlist(self):
        target = extract_kugou_target("https://activity.kugou.com/share?src_cid=3zr52qfrzaz06a")
        assert target is not None
        assert target["type"] == "songlist"
        assert target["id"] == "gcid_3zr52qfrzaz06a"

    def test_cloudlist_listid(self):
        target = extract_kugou_target("https://m.kugou.com/songlist/?listid=4")
        assert target is not None
        assert target["type"] == "cloudlist"
        assert target["id"] == "4"

    def test_cloudlist_prefix(self):
        target = extract_kugou_target("kugou_cloudlist_123456")
        assert target is not None
        assert target["type"] == "cloudlist"
        assert target["id"] == "123456"

    def test_cloudlist_numeric_id(self):
        target = extract_kugou_target("1425711902")
        assert target is not None
        assert target["type"] == "cloudlist"
        assert target["id"] == "1425711902"

    def test_invalid_input(self):
        assert extract_kugou_target("") is None
        assert extract_kugou_target("   ") is None
        assert extract_kugou_target("https://example.com/other") is None


class TestSignatures:
    def test_sign_kugou_login(self):
        params = {"appid": "3116", "clientver": "11440", "clienttime": "1700000000"}
        sig = sign_kugou_login(params)
        assert isinstance(sig, str)
        assert len(sig) == 32
        assert sig == sign_kugou_login(params)

    def test_sign_kugou_gateway(self):
        params = {"appid": "3116", "token": "test_token", "userid": "123456"}
        data_str = json.dumps({"test": 1}, separators=(",", ":"))
        sig = sign_kugou_gateway(params, data_str)
        assert isinstance(sig, str)
        assert len(sig) == 32


class TestTrackNormalization:
    def test_clean_audio_extension(self):
        assert clean_audio_extension("光辉岁月.mp3") == "光辉岁月"
        assert clean_audio_extension("海阔天空.FLAC") == "海阔天空"
        assert clean_audio_extension("无名之辈") == "无名之辈"

    def test_extract_title_and_artists_singerinfo(self):
        raw = {
            "name": "周杰伦, 阿信 - 说好不哭.mp3",
            "singerinfo": [{"name": "周杰伦"}, {"name": "阿信"}],
        }
        title, artist = extract_title_and_artists(raw)
        assert title == "说好不哭"
        assert artist == "周杰伦, 阿信"

    def test_extract_title_and_artists_singername(self):
        raw = {
            "name": "陈奕迅 - 富士山下",
            "singername": "陈奕迅",
        }
        title, artist = extract_title_and_artists(raw)
        assert title == "富士山下"
        assert artist == "陈奕迅"

    def test_extract_title_and_artists_hyphen_split(self):
        raw = {"name": "Beyond - 海阔天空"}
        title, artist = extract_title_and_artists(raw)
        assert title == "海阔天空"
        assert artist == "Beyond"

    def test_normalize_cover_url(self):
        raw = "http://c1.kgimg.com/stdmusic/{size}/20210314/20210314100214878628.jpg"
        clean = normalize_cover_url(raw)
        assert clean.startswith("https://")
        assert "{size}" not in clean
        assert "400" in clean

    def test_normalize_kugou_track(self):
        raw_song = {
            "hash": "ABCDEF123456",
            "name": "林俊杰 - 江南",
            "singername": "林俊杰",
            "album_name": "第二天堂",
            "timelen": 255000,
            "privilege": 10,
            "sqhash": "SQHASH123",
            "cover": "http://img.kugou.com/{size}/test.jpg",
        }
        track = normalize_kugou_track(raw_song, 1)
        assert track["index"] == 1
        assert track["title"] == "江南"
        assert track["artist"] == "林俊杰"
        assert track["album"] == "第二天堂"
        assert track["id"] == "ABCDEF123456"
        assert track["duration_ms"] == 255000
        assert track["duration_str"] == "04:15"
        assert track["is_vip"] is True
        assert track["status_text"] == "VIP专享"
        assert track["max_quality"] == "FLAC"
        assert track["source_url"] == "https://www.kugou.com/song/#hash=ABCDEF123456"


class TestAuthPersistence:
    def test_save_and_load_credentials(self, tmp_path, monkeypatch):
        auth_file = tmp_path / "kugou_auth.json"
        monkeypatch.setattr("kugou_playlist_export.DEFAULT_AUTH_FILE", str(auth_file))
        monkeypatch.setattr("kugou_playlist_export.LOCAL_AUTH_FILE", str(tmp_path / "local.json"))

        assert load_auth_credentials() == (None, None, {})

        # Save credentials
        save_auth_credentials("test_token_123", "99887766", source="qr")
        assert auth_file.exists()

        # Load back
        token, userid, meta = load_auth_credentials()
        assert token == "test_token_123"
        assert userid == "99887766"
        assert meta["source"] == "qr"

        # Clear credentials
        clear_auth_credentials()
        assert not auth_file.exists()
        assert load_auth_credentials() == (None, None, {})


class TestQRPolling:
    @patch("requests.get")
    def test_poll_kugou_qr_status_waiting(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": 1, "data": {"status": 1}}
        mock_get.return_value = mock_resp

        status, token, userid, msg = poll_kugou_qr_status("qr_123")
        assert status == "waiting"
        assert token is None

    @patch("requests.get")
    def test_poll_kugou_qr_status_scanned(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": 1, "data": {"status": 2}}
        mock_get.return_value = mock_resp

        status, token, userid, msg = poll_kugou_qr_status("qr_123")
        assert status == "scanned"
        assert token is None

    @patch("requests.get")
    def test_poll_kugou_qr_status_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": 1,
            "data": {"status": 4, "token": "my_valid_token", "userid": "12345678"},
        }
        mock_get.return_value = mock_resp

        status, token, userid, msg = poll_kugou_qr_status("qr_123")
        assert status == "success"
        assert token == "my_valid_token"
        assert userid == "12345678"

    @patch("requests.get")
    def test_poll_kugou_qr_status_expired(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": 1, "data": {"status": 3}}
        mock_get.return_value = mock_resp

        status, token, userid, msg = poll_kugou_qr_status("qr_123")
        assert status == "expired"


class TestExporters:
    @pytest.fixture
    def sample_playlist(self):
        return {
            "id": "test_pl_1",
            "name": "测试歌单",
            "creator": "测试作者",
            "cover_url": "https://example.com/cover.jpg",
            "description": "歌单描述说明",
            "track_count": 2,
            "play_count": 100,
            "source_url": "https://www.kugou.com/yy/special/single/546903.html",
            "tracks": [
                {
                    "index": 1,
                    "title": "晴天",
                    "artist": "周杰伦",
                    "album": "叶惠美",
                    "id": "HASH_QINGTIAN",
                    "duration_ms": 269000,
                    "duration_str": "04:29",
                    "is_available": True,
                    "is_vip": False,
                    "status_text": "正常",
                    "max_quality": "FLAC",
                    "cover_url": "https://example.com/1.jpg",
                    "source_url": "https://www.kugou.com/song/#hash=HASH_QINGTIAN",
                },
                {
                    "index": 2,
                    "title": "稻香",
                    "artist": "周杰伦",
                    "album": "魔杰座",
                    "id": "HASH_DAOXIANG",
                    "duration_ms": 223000,
                    "duration_str": "03:43",
                    "is_available": True,
                    "is_vip": True,
                    "status_text": "VIP专享",
                    "max_quality": "320kbps",
                    "cover_url": "https://example.com/2.jpg",
                    "source_url": "https://www.kugou.com/song/#hash=HASH_DAOXIANG",
                },
            ],
        }

    def test_export_xlsx(self, tmp_path, sample_playlist):
        out_file = tmp_path / "test.xlsx"
        export_xlsx(sample_playlist, str(out_file))
        assert out_file.exists()
        assert out_file.stat().st_size > 0

    def test_export_csv(self, tmp_path, sample_playlist):
        out_file = tmp_path / "test.csv"
        export_csv(sample_playlist, str(out_file))
        assert out_file.exists()
        with open(out_file, "r", encoding="utf-8-sig") as f:
            reader = list(csv.reader(f))
            assert len(reader) == 3  # header + 2 tracks
            assert reader[0][1] == "歌曲名称"
            assert reader[1][1] == "晴天"
            assert reader[2][1] == "稻香"

    def test_export_json(self, tmp_path, sample_playlist):
        out_file = tmp_path / "test.json"
        export_json(sample_playlist, str(out_file))
        assert out_file.exists()
        with open(out_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert data["generator"] == "PlaylistOut"
            assert data["generatorUrl"] == "https://playlistout.lengxiqwq.com"
            assert data["exportedFrom"] == "PlaylistOutCLI"
            assert "exportedAt" in data
            assert data["name"] == "测试歌单"
            assert data["creator"] == "测试作者"
            assert data["coverUrl"] == "https://example.com/cover.jpg"
            assert data["platform"] == "kugou"
            assert data["id"] == "test_pl_1"
            assert data["sourceUrl"] == "https://www.kugou.com/yy/special/single/546903.html"
            assert data["trackCount"] == 2
            assert data["loadedTrackCount"] == 2
            assert data["isPartial"] is False
            assert data["totalDuration"] == "8 分钟"
            assert data["totalDurationMs"] == 492000
            assert data["loadedDuration"] == "8 分钟"
            assert data["loadedDurationMs"] == 492000
            assert data["playCount"] == 100
            assert data["description"] == "歌单描述说明"
            assert len(data["tracks"]) == 2
            t1 = data["tracks"][0]
            assert t1["index"] == 1
            assert t1["title"] == "晴天"
            assert t1["artist"] == "周杰伦"
            assert t1["album"] == "叶惠美"
            assert t1["id"] == "HASH_QINGTIAN"
            assert t1["durationMs"] == 269000
            assert t1["sourceUrl"] == "https://www.kugou.com/song/#hash=HASH_QINGTIAN"
            assert t1["coverUrl"] == "https://example.com/1.jpg"
            assert t1["isVip"] is False
            assert t1["isAvailable"] is True
            assert t1["status"] == "playable"
            assert t1["statusText"] == "正常"
            assert t1["maxQuality"] == "FLAC"
            t2 = data["tracks"][1]
            assert t2["isVip"] is True
            assert t2["status"] == "vip"
            assert t2["statusText"] == "VIP专享"
            assert t2["maxQuality"] == "320kbps"

    def test_export_txt(self, tmp_path, sample_playlist):
        out_file = tmp_path / "test.txt"
        export_txt(sample_playlist, str(out_file))
        assert out_file.exists()
        content = out_file.read_text(encoding="utf-8")
        assert "测试歌单" in content
        assert "1. 晴天 - 周杰伦" in content
        assert "2. 稻香 - 周杰伦" in content

    def test_export_m3u8(self, tmp_path, sample_playlist):
        out_file = tmp_path / "test.m3u8"
        export_m3u8(sample_playlist, str(out_file))
        assert out_file.exists()
        content = out_file.read_text(encoding="utf-8")
        assert "#EXTM3U" in content
        assert "#EXTINF:269,周杰伦 - 晴天" in content
        assert "HASH_QINGTIAN" in content


class TestFetchersMocked:
    @patch("requests.get")
    def test_fetch_special_playlist_mock(self, mock_get):
        info_mock = MagicMock()
        info_mock.status_code = 200
        info_mock.json.return_value = {
            "status": 1,
            "data": {
                "specialname": "经典老歌专题",
                "nickname": "官方编辑",
                "songcount": 1,
                "playcount": 5000,
            },
        }

        song_mock = MagicMock()
        song_mock.status_code = 200
        song_mock.json.return_value = {
            "status": 1,
            "data": {
                "info": [
                    {
                        "hash": "HASH_TEST_1",
                        "name": "张学友 - 吻别",
                        "singername": "张学友",
                        "timelen": 300000,
                    }
                ],
                "total": 1,
            },
        }

        mock_get.side_effect = [info_mock, song_mock]
        pl = fetch_special_playlist("546903")
        assert pl["name"] == "经典老歌专题"
        assert pl["track_count"] == 1
        assert pl["tracks"][0]["title"] == "吻别"

    @patch("requests.get")
    def test_fetch_collection_playlist_mock(self, mock_get):
        info_mock = MagicMock()
        info_mock.status_code = 200
        info_mock.json.return_value = {
            "status": 1,
            "data": {
                "specialname": "概念版精选",
                "nickname": "音乐达人",
            },
        }

        song_mock = MagicMock()
        song_mock.status_code = 200
        song_mock.json.return_value = {
            "status": 1,
            "data": {
                "count": 1,
                "info": [
                    {
                        "hash": "COL_HASH_1",
                        "name": "王菲 - 红豆",
                        "singername": "王菲",
                    }
                ],
            },
        }

        mock_get.side_effect = [info_mock, song_mock]
        pl = fetch_collection_playlist("collection_3_1504683618_2_0")
        assert pl["name"] == "概念版精选"
        assert pl["track_count"] == 1
        assert pl["tracks"][0]["title"] == "红豆"

    @patch("requests.get")
    def test_fetch_songlist_h5_mock(self, mock_get):
        h5_mock = MagicMock()
        h5_mock.status_code = 200
        h5_payload = {
            "info": {
                "listinfo": {"name": "H5分享歌单", "nickname": "分享者"},
                "songs": [{"hash": "H5_HASH", "name": "陈奕迅 - 十年"}],
            }
        }
        h5_mock.text = f"<html><body><script>window.$output = {json.dumps(h5_payload)};</script></body></html>"
        mock_get.return_value = h5_mock

        pl = fetch_songlist_h5("gcid_test123")
        assert pl["name"] == "H5分享歌单"
        assert pl["track_count"] == 1
        assert pl["tracks"][0]["title"] == "十年"

    @patch("requests.post")
    def test_fetch_cloudlist_playlist_mock(self, mock_post):
        post_mock = MagicMock()
        post_mock.status_code = 200
        post_mock.json.return_value = {
            "status": 1,
            "data": {
                "count": 2,
                "info": [
                    {"hash": "CLOUD_2", "name": "歌2", "sort": 1},
                    {"hash": "CLOUD_1", "name": "歌1", "sort": 0},
                ],
            },
        }
        mock_post.return_value = post_mock

        pl = fetch_cloudlist_playlist("4", token="fake_token", userid="12345")
        assert pl["name"] == "我喜欢"
        assert pl["track_count"] == 2
        # Verify sort order preserved: sort 0 first, sort 1 second
        assert pl["tracks"][0]["title"] == "歌1"
        assert pl["tracks"][1]["title"] == "歌2"


def test_resolve_export_formats_and_ui():
    from kugou_playlist_export import resolve_export_formats, terminal_link, REPO_URL, AUTHOR_URL
    assert resolve_export_formats("1") == ["xlsx"]
    assert resolve_export_formats("2") == ["csv"]
    assert resolve_export_formats("3") == ["json"]
    assert resolve_export_formats("4") == ["txt"]
    assert resolve_export_formats("5") == ["m3u8"]
    assert resolve_export_formats("0") == ["xlsx", "csv", "json", "txt", "m3u8"]
    assert resolve_export_formats("") == ["xlsx", "csv", "json", "txt", "m3u8"]
    assert resolve_export_formats("any_other") == ["xlsx", "csv", "json", "txt", "m3u8"]
    link = terminal_link(REPO_URL, "PlaylistOut")
    assert REPO_URL in link and "\033]8;;" in link
    assert AUTHOR_URL == "https://github.com/LengxiQwQ"


def test_perform_export_output_dir(tmp_path):
    from kugou_playlist_export import perform_export
    out_dir = str(tmp_path / "output")
    sample_pl = {
        "id": "546903",
        "name": "酷狗测试歌单",
        "creator": "测试者",
        "track_count": 1,
        "tracks": [
            {
                "index": 1,
                "title": "晴天",
                "artist": "周杰伦",
                "album": "叶惠美",
                "duration_ms": 269000,
                "duration_str": "04:29",
                "status_text": "正常",
                "max_quality": "FLAC",
                "source_url": "https://www.kugou.com/song/#hash=123",
            }
        ],
    }
    files = perform_export(sample_pl, output_dir=out_dir, formats=["3"], reveal_folder_flag=False)
    assert len(files) == 1
    assert files[0].endswith(".json")
    assert os.path.exists(files[0])

