import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ytmusicId } from './input';
import { normalizeYoutubeMusicTrack, normalizeYoutubeMusicPlaylist } from './normalize';
import { ytmusicProvider } from './provider';
import { fetchYoutubeMusicPlaylist } from './client';

describe('YouTube Music Provider - Input Extraction', () => {
  it('extracts playlist ID from music.youtube.com URLs', () => {
    const url = 'https://music.youtube.com/playlist?list=PLrAlXlWqjN2test1234567890';
    expect(ytmusicId(url)).toBe('PLrAlXlWqjN2test1234567890');
  });

  it('extracts playlist ID from youtube.com URLs', () => {
    const url = 'https://www.youtube.com/playlist?list=PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_';
    expect(ytmusicId(url)).toBe('PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_');
  });

  it('extracts playlist ID from album / mix IDs (RDCL, OLAK)', () => {
    const rd = 'RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ';
    expect(ytmusicId(`https://music.youtube.com/playlist?list=${rd}`)).toBe(rd);
    expect(ytmusicId(rd)).toBe(rd);

    const olak = 'OLAK5uy_example1234567890';
    expect(ytmusicId(olak)).toBe(olak);
  });

  it('returns null on invalid inputs', () => {
    expect(ytmusicId('')).toBeNull();
    expect(ytmusicId('https://example.com/playlist?list=123')).toBeNull();
    expect(ytmusicId('invalid_short_id')).toBeNull();
  });

  it('provider matches works correctly', () => {
    expect(ytmusicProvider.matches('https://music.youtube.com/playlist?list=PL123456789012345678')).toBe(true);
    expect(ytmusicProvider.matches('https://open.spotify.com/playlist/123')).toBe(false);
  });
});

describe('YouTube Music Provider - Normalization with YouTube Namespace', () => {
  it('normalizes single track with all canonical and youtube private fields', () => {
    const mockItem = {
      musicResponsiveListItemRenderer: {
        flexColumns: [
          {
            musicResponsiveListItemFlexColumnRenderer: {
              text: {
                runs: [
                  {
                    text: 'Blinding Lights',
                    navigationEndpoint: {
                      watchEndpoint: {
                        videoId: '4NRXx6U8ABQ',
                        watchEndpointMusicSupportedConfigs: {
                          watchEndpointMusicConfig: {
                            musicVideoType: 'MUSIC_VIDEO_TYPE_ATV',
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            musicResponsiveListItemFlexColumnRenderer: {
              text: {
                runs: [
                  {
                    text: 'The Weeknd',
                    navigationEndpoint: {
                      browseEndpoint: {
                        browseId: 'UC0WP5P-ufpRfjbNrmOWwLBQ',
                      },
                    },
                  },
                  { text: ' • ' },
                  {
                    text: 'After Hours',
                    navigationEndpoint: {
                      browseEndpoint: {
                        browseId: 'MPREb_PxmzvDuqOnC',
                      },
                    },
                  },
                  { text: ' • ' },
                  { text: '3:20' },
                ],
              },
            },
          },
        ],
        thumbnail: {
          musicThumbnailRenderer: {
            thumbnail: {
              thumbnails: [
                { url: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg', width: 320 },
                { url: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', width: 480 },
              ],
            },
          },
        },
        badges: [
          {
            musicInlineBadgeRenderer: {
              icon: { iconType: 'MUSIC_EXPLICIT_BADGE' },
              accessibilityData: { accessibilityData: { label: 'Explicit' } },
            },
          },
        ],
        playlistItemData: {
          videoId: 'SET_VIDEO_ID_123',
        },
      },
    };

    const track = normalizeYoutubeMusicTrack(mockItem, 1);
    expect(track).not.toBeNull();
    if (!track) return;

    // Canonical fields
    expect(track.index).toBe(1);
    expect(track.title).toBe('Blinding Lights');
    expect(track.artist).toBe('The Weeknd');
    expect(track.album).toBe('After Hours');
    expect(track.id).toBe('4NRXx6U8ABQ');
    expect(track.durationMs).toBe(200000);
    expect(track.coverUrl).toBe('https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg');
    expect(track.sourceUrl).toBe('https://music.youtube.com/watch?v=4NRXx6U8ABQ');
    expect(track.isAvailable).toBe(true);
    expect(track.status).toBe('playable');

    // Private YouTube namespace fields
    expect(track.youtube).toBeDefined();
    expect(track.youtube?.videoId).toBe('4NRXx6U8ABQ');
    expect(track.youtube?.videoUrl).toBe('https://www.youtube.com/watch?v=4NRXx6U8ABQ');
    expect(track.youtube?.musicUrl).toBe('https://music.youtube.com/watch?v=4NRXx6U8ABQ');
    expect(track.youtube?.videoType).toBe('MUSIC_VIDEO_TYPE_ATV');
    expect(track.youtube?.isExplicit).toBe(true);
    expect(track.youtube?.channelId).toBe('UC0WP5P-ufpRfjbNrmOWwLBQ');
    expect(track.youtube?.channelUrl).toBe('https://www.youtube.com/channel/UC0WP5P-ufpRfjbNrmOWwLBQ');
    expect(track.youtube?.setVideoId).toBe('SET_VIDEO_ID_123');
  });

  it('handles unplayable/disabled track correctly', () => {
    const mockDisabledItem = {
      musicResponsiveListItemRenderer: {
        disabled: true,
        flexColumns: [
          {
            musicResponsiveListItemFlexColumnRenderer: {
              text: {
                runs: [{ text: 'Unavailable Song' }],
              },
            },
          },
          {
            musicResponsiveListItemFlexColumnRenderer: {
              text: {
                runs: [{ text: 'Artist' }],
              },
            },
          },
        ],
      },
    };

    const track = normalizeYoutubeMusicTrack(mockDisabledItem, 2);
    expect(track).not.toBeNull();
    expect(track?.isAvailable).toBe(false);
    expect(track?.status).toBe('unplayable');
    expect(track?.statusText).toBe('下架/不可播');
  });

  it('normalizes playlist header and root metadata with youtube namespace', () => {
    const mockInitialData = {
      header: {
        musicDetailHeaderRenderer: {
          title: { runs: [{ text: "Today's Biggest Hits" }] },
          description: { runs: [{ text: 'Top songs worldwide.' }] },
          subtitle: {
            runs: [
              {
                text: 'YouTube Music',
                navigationEndpoint: {
                  browseEndpoint: { browseId: 'UCJ22hnoC6e_kXz_2_Jv9q-w' },
                },
              },
            ],
          },
          secondSubtitle: {
            runs: [{ text: '50 songs' }, { text: ' • ' }, { text: '2 hours, 45 minutes' }],
          },
          thumbnail: {
            croppedSquareThumbnailRenderer: {
              thumbnails: [{ url: 'https://lh3.googleusercontent.com/cover=w544', width: 544 }],
            },
          },
        },
      },
    };

    const playlist = normalizeYoutubeMusicPlaylist('PL1234567890', mockInitialData, []);
    expect(playlist.platform).toBe('ytmusic');
    expect(playlist.id).toBe('PL1234567890');
    expect(playlist.name).toBe("Today's Biggest Hits");
    expect(playlist.creator).toBe('YouTube Music');
    expect(playlist.description).toBe('Top songs worldwide.');
    expect(playlist.trackCount).toBe(50);
    expect(playlist.sourceUrl).toBe('https://music.youtube.com/playlist?list=PL1234567890');

    // Root YouTube metadata
    expect(playlist.youtube).toBeDefined();
    expect(playlist.youtube?.playlistId).toBe('PL1234567890');
    expect(playlist.youtube?.channelId).toBe('UCJ22hnoC6e_kXz_2_Jv9q-w');
    expect(playlist.youtube?.channelUrl).toBe('https://www.youtube.com/channel/UCJ22hnoC6e_kXz_2_Jv9q-w');
    expect(playlist.youtube?.privacy).toBe('PUBLIC');
  });
});

describe('YouTube Music Provider - Mocked Client Flow', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches playlist and handles continuation pagination', async () => {
    const mockFirstResponse = {
      header: {
        musicDetailHeaderRenderer: {
          title: { runs: [{ text: 'Mock YTM Playlist' }] },
        },
      },
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicPlaylistShelfRenderer: {
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Track 1' }] },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Artist 1' }] },
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                          continuations: [
                            {
                              nextContinuationData: {
                                continuation: 'TOKEN_PAGE_2',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };

    const mockSecondResponse = {
      continuationContents: {
        musicPlaylistShelfContinuation: {
          contents: [
            {
              musicResponsiveListItemRenderer: {
                flexColumns: [
                  {
                    musicResponsiveListItemFlexColumnRenderer: {
                      text: { runs: [{ text: 'Track 2' }] },
                    },
                  },
                  {
                    musicResponsiveListItemFlexColumnRenderer: {
                      text: { runs: [{ text: 'Artist 2' }] },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      const resData = callCount === 1 ? mockFirstResponse : mockSecondResponse;
      return new Response(JSON.stringify(resData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const playlist = await fetchYoutubeMusicPlaylist('https://music.youtube.com/playlist?list=PL123456789012345678');
    expect(callCount).toBe(2);
    expect(playlist.tracks.length).toBe(2);
    // 逆序校验 (和 Apple Music、Spotify 统一倒序并重新编号)
    expect(playlist.tracks[0].title).toBe('Track 2');
    expect(playlist.tracks[1].title).toBe('Track 1');
    expect(playlist.tracks[0].artist).toBe('Artist 2');
    expect(playlist.tracks[1].artist).toBe('Artist 1');
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[1].index).toBe(2);
  });

  it('throws PLAYLIST_NOT_FOUND when alert error received', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          alerts: [
            {
              alertRenderer: {
                type: 'ERROR',
                text: { runs: [{ text: 'The playlist does not exist.' }] },
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    });

    await expect(fetchYoutubeMusicPlaylist('PL123456789012345678')).rejects.toThrow('The playlist does not exist.');
  });
});
