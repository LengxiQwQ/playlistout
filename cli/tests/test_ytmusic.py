# -*- coding: utf-8 -*-
import json
import pytest
from cli.platforms.ytmusic import YouTubeMusicAdapter, _extract_ytmusic_id


def test_ytmusic_id_extraction():
    adapter = YouTubeMusicAdapter()
    url1 = "https://music.youtube.com/playlist?list=PLrAlXlWqjN2test1234567890"
    assert _extract_ytmusic_id(url1) == "PLrAlXlWqjN2test1234567890"
    assert adapter.can_handle(url1) is True

    url2 = "https://www.youtube.com/playlist?list=PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_"
    assert _extract_ytmusic_id(url2) == "PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_"
    assert adapter.can_handle(url2) is True

    url3 = "https://music.youtube.com/playlist?list=RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ"
    assert _extract_ytmusic_id(url3) == "RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ"
    assert adapter.can_handle(url3) is True

    # 纯 ID
    assert _extract_ytmusic_id("PL123456789012345678") == "PL123456789012345678"
    assert adapter.can_handle("PL123456789012345678") is True

    # 非法输入
    assert _extract_ytmusic_id("https://open.spotify.com/playlist/123") is None
    assert adapter.can_handle("https://open.spotify.com/playlist/123") is False
    assert adapter.can_handle("") is False


def test_ytmusic_fetch_playlist_and_continuation(monkeypatch):
    adapter = YouTubeMusicAdapter()

    mock_first_page = {
        "header": {
            "musicDetailHeaderRenderer": {
                "title": {"runs": [{"text": "YTM Test Playlist"}]},
                "description": {"runs": [{"text": "Sample description."}]},
                "subtitle": {
                    "runs": [
                        {
                            "text": "Artist Channel",
                            "navigationEndpoint": {
                                "browseEndpoint": {"browseId": "UC1234567890"}
                            }
                        }
                    ]
                },
                "thumbnail": {
                    "croppedSquareThumbnailRenderer": {
                        "thumbnails": [{"url": "https://lh3.googleusercontent.com/test_cover", "width": 544}]
                    }
                }
            }
        },
        "contents": {
            "singleColumnBrowseResultsRenderer": {
                "tabs": [
                    {
                        "tabRenderer": {
                            "content": {
                                "sectionListRenderer": {
                                    "contents": [
                                        {
                                            "musicPlaylistShelfRenderer": {
                                                "contents": [
                                                    {
                                                        "musicResponsiveListItemRenderer": {
                                                            "flexColumns": [
                                                                {
                                                                    "musicResponsiveListItemFlexColumnRenderer": {
                                                                        "text": {
                                                                            "runs": [
                                                                                {
                                                                                    "text": "Track 1",
                                                                                    "navigationEndpoint": {
                                                                                        "watchEndpoint": {
                                                                                            "videoId": "vid_001",
                                                                                            "watchEndpointMusicSupportedConfigs": {
                                                                                                "watchEndpointMusicConfig": {
                                                                                                    "musicVideoType": "MUSIC_VIDEO_TYPE_ATV"
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                },
                                                                {
                                                                    "musicResponsiveListItemFlexColumnRenderer": {
                                                                        "text": {
                                                                            "runs": [
                                                                                {
                                                                                    "text": "Singer A",
                                                                                    "navigationEndpoint": {
                                                                                        "browseEndpoint": {"browseId": "UC_SINGER_A"}
                                                                                    }
                                                                                },
                                                                                {"text": " • "},
                                                                                {
                                                                                    "text": "Album A",
                                                                                    "navigationEndpoint": {
                                                                                        "browseEndpoint": {"browseId": "MPRE_ALBUM_A"}
                                                                                    }
                                                                                },
                                                                                {"text": " • "},
                                                                                {"text": "3:45"}
                                                                            ]
                                                                        }
                                                                    }
                                                                }
                                                            ],
                                                            "thumbnail": {
                                                                "musicThumbnailRenderer": {
                                                                    "thumbnail": {
                                                                        "thumbnails": [{"url": "https://i.ytimg.com/vi/vid_001/hqdefault.jpg", "width": 480}]
                                                                    }
                                                                }
                                                            },
                                                            "badges": [
                                                                {
                                                                    "musicInlineBadgeRenderer": {
                                                                        "icon": {"iconType": "MUSIC_EXPLICIT_BADGE"}
                                                                    }
                                                                }
                                                            ],
                                                            "playlistItemData": {
                                                                "videoId": "SET_001"
                                                            }
                                                        }
                                                    }
                                                ],
                                                "continuations": [
                                                    {
                                                        "nextContinuationData": {
                                                            "continuation": "TOKEN_PAGE_2"
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
    }

    mock_second_page = {
        "continuationContents": {
            "musicPlaylistShelfContinuation": {
                "contents": [
                    {
                        "musicResponsiveListItemRenderer": {
                            "flexColumns": [
                                {
                                    "musicResponsiveListItemFlexColumnRenderer": {
                                        "text": {
                                            "runs": [
                                                {
                                                    "text": "Track 2",
                                                    "navigationEndpoint": {
                                                        "watchEndpoint": {
                                                            "videoId": "vid_002"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    "musicResponsiveListItemFlexColumnRenderer": {
                                        "text": {
                                            "runs": [
                                                {"text": "Singer B"},
                                                {"text": " • "},
                                                {"text": "2:30"}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    }

    call_count = 0

    def mock_post(self, url, json_data=None, data=None, headers=None, allow404=False):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return json.dumps(mock_first_page)
        return json.dumps(mock_second_page)

    from cli.platforms.international import _Requests
    monkeypatch.setattr(_Requests, "post", mock_post)

    playlist = adapter.fetch_playlist("https://music.youtube.com/playlist?list=PL123456789012345678")
    assert playlist is not None
    assert call_count == 2
    assert playlist.platform == "ytmusic"
    assert playlist.id == "PL123456789012345678"
    assert playlist.name == "YTM Test Playlist"
    assert playlist.creator == "Artist Channel"
    assert len(playlist.tracks) == 2

    # Track 1 校验
    t1 = playlist.tracks[0]
    assert t1.title == "Track 1"
    assert t1.artist == "Singer A"
    assert t1.album == "Album A"
    assert t1.duration_ms == 225000
    assert t1.id == "vid_001"
    assert t1.source_url == "https://music.youtube.com/watch?v=vid_001"

    # 专属命名空间
    yt1 = t1.raw_extra.get("youtube")
    assert yt1 is not None
    assert yt1["videoId"] == "vid_001"
    assert yt1["videoUrl"] == "https://www.youtube.com/watch?v=vid_001"
    assert yt1["musicUrl"] == "https://music.youtube.com/watch?v=vid_001"
    assert yt1["videoType"] == "MUSIC_VIDEO_TYPE_ATV"
    assert yt1["isExplicit"] is True
    assert yt1["channelId"] == "UC_SINGER_A"
    assert yt1["channelUrl"] == "https://www.youtube.com/channel/UC_SINGER_A"
    assert yt1["setVideoId"] == "SET_001"

    # Canonical 字典导出检验
    t1_dict = t1.to_canonical_dict()
    assert "youtube" in t1_dict
    assert t1_dict["youtube"]["videoId"] == "vid_001"
    assert t1_dict["youtube"]["isExplicit"] is True


def test_ytmusic_error_alert(monkeypatch):
    adapter = YouTubeMusicAdapter()

    def mock_post(self, url, json_data=None, data=None, headers=None, allow404=False):
        return json.dumps({
            "alerts": [
                {
                    "alertRenderer": {
                        "type": "ERROR",
                        "text": {"runs": [{"text": "The playlist does not exist."}]}
                    }
                }
            ]
        })

    from cli.platforms.international import _Requests
    monkeypatch.setattr(_Requests, "post", mock_post)

    with pytest.raises(ValueError, match="The playlist does not exist."):
        adapter.fetch_playlist("PL123456789012345678")
