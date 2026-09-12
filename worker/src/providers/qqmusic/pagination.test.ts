import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchQQPlaylist } from './client';
import { normalizeQQTrack, normalizeCYQQResponse, normalizeMusicUResponse } from './normalize';
import { ProviderError } from '../../models/playlist';

function makeMockSong(id: number, prefix = 'Song') {
  return {
    songid: id,
    songmid: `mid_${id}`,
    songname: `${prefix} ${id}`,
    singer: [{ id: 100 + id, mid: `sin_${id}`, name: `Artist ${id}` }],
    albumname: `Album ${id}`,
    interval: 180,
  };
}

describe('Deterministic QQ Music Pagination & Fail-Closed Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches multi-page playlist (>1000 songs) across multiple requests', async () => {
    const totalSongs = 1200;
    const page1Songs = Array.from({ length: 1000 }, (_, i) => makeMockSong(i + 1));
    const page2Songs = Array.from({ length: 200 }, (_, i) => makeMockSong(1001 + i));

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const songBegin = parsedUrl.searchParams.get('song_begin');
      const songNum = parsedUrl.searchParams.get('song_num');

      if (songBegin === '0') {
        expect(songNum).toBe('1000');
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                dissname: 'Large 1200 Playlist',
                nickname: 'Curator',
                total_song_num: totalSongs,
                cur_song_num: 1000,
                songlist: page1Songs,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } else if (songBegin === '1000') {
        expect(songNum).toBe('200');
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                dissname: 'Large 1200 Playlist',
                total_song_num: totalSongs,
                cur_song_num: 200,
                songlist: page2Songs,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected call with song_begin=${songBegin}`);
    });

    globalThis.fetch = fetchMock;

    const result = await fetchQQPlaylist('1234567890');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.trackCount).toBe(1200);
    expect(result.tracks).toHaveLength(1200);
    expect(result.tracks[0].title).toBe('Song 1');
    expect(result.tracks[0].index).toBe(1);
    expect(result.tracks[999].title).toBe('Song 1000');
    expect(result.tracks[999].index).toBe(1000);
    expect(result.tracks[1000].title).toBe('Song 1001');
    expect(result.tracks[1000].index).toBe(1001);
    expect(result.tracks[1199].title).toBe('Song 1200');
    expect(result.tracks[1199].index).toBe(1200);
  });

  it('fails closed with INCOMPLETE_PLAYLIST when upstream returns fewer tracks than total_song_num', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const songBegin = parsedUrl.searchParams.get('song_begin');

      if (songBegin === '0') {
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                dissname: 'Incomplete Playlist',
                total_song_num: 1500,
                cur_song_num: 1000,
                songlist: Array.from({ length: 1000 }, (_, i) => makeMockSong(i + 1)),
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } else {
        // Page 2 unexpectedly returns empty songlist
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                total_song_num: 1500,
                cur_song_num: 0,
                songlist: [],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
    });

    globalThis.fetch = fetchMock;

    await expect(fetchQQPlaylist('1234567890')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQPlaylist('1234567890');
    } catch (err) {
      const pErr = err as ProviderError;
      expect(pErr.code).toBe('INCOMPLETE_PLAYLIST');
      expect(pErr.statusCode).toBe(502);
      expect(pErr.details).toEqual({ expectedCount: 1500, actualCount: 1000 });
    }
  });

  it('fails closed when upstream ignores offset and returns repeated page 1 songs (stalled pagination)', async () => {
    const page1Songs = Array.from({ length: 1000 }, (_, i) => makeMockSong(i + 1));

    const fetchMock = vi.fn().mockImplementation(async () => {
      // Always returns page 1 songs regardless of song_begin offset
      return new Response(
        JSON.stringify({
          code: 0,
          cdlist: [
            {
              disstid: '1234567890',
              dissname: 'Stalled Playlist',
              total_song_num: 2000,
              cur_song_num: 1000,
              songlist: page1Songs,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    globalThis.fetch = fetchMock;

    await expect(fetchQQPlaylist('1234567890')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQPlaylist('1234567890');
    } catch (err) {
      const pErr = err as ProviderError;
      expect(pErr.code).toBe('INCOMPLETE_PLAYLIST');
      expect(pErr.message).toContain('Stalled pagination: Upstream ignored offset and returned repeated songs');
    }
  });

  it('preserves legitimate duplicate tracks across page boundaries (e.g. #1000 and #1001 are identical Song A)', async () => {
    // Total expected: 1002 tracks
    // Page 1: 999 different tracks + #1000 is Song A
    const songA = {
      songid: 88888,
      songmid: 'mid_song_a',
      songname: '晴天',
      singer: [{ id: 4558, mid: '002JAY', name: '周杰伦' }],
      albumname: '叶惠美',
      interval: 269,
    };
    const songB = {
      songid: 99999,
      songmid: 'mid_song_b',
      songname: '夜曲',
      singer: [{ id: 4558, mid: '002JAY', name: '周杰伦' }],
      albumname: '十一月的萧邦',
      interval: 226,
    };

    const page1Songs = [
      ...Array.from({ length: 999 }, (_, i) => makeMockSong(i + 1)),
      songA, // #1000 is Song A
    ];
    // Page 2: #1001 is ALSO Song A (user legitimately added it twice), #1002 is Song B
    const page2Songs = [
      songA, // #1001 is Song A
      songB, // #1002 is Song B
    ];

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const songBegin = parsedUrl.searchParams.get('song_begin');

      if (songBegin === '0') {
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                dissname: 'Duplicate Tracks Boundary Playlist',
                total_song_num: 1002,
                cur_song_num: 1000,
                song_begin: 0,
                songlist: page1Songs,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } else if (songBegin === '1000') {
        return new Response(
          JSON.stringify({
            code: 0,
            cdlist: [
              {
                disstid: '1234567890',
                dissname: 'Duplicate Tracks Boundary Playlist',
                total_song_num: 1002,
                cur_song_num: 2,
                song_begin: 1000,
                songlist: page2Songs,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected call with song_begin=${songBegin}`);
    });

    globalThis.fetch = fetchMock;

    const result = await fetchQQPlaylist('1234567890');
    expect(result.trackCount).toBe(1002);
    expect(result.tracks).toHaveLength(1002);

    // #1000 (0-indexed 999) must be Song A
    const track1000 = result.tracks[999];
    expect(track1000.index).toBe(1000);
    expect(track1000.title).toBe('晴天');
    expect(track1000.id).toBe('mid_song_a');
    expect(track1000.artists).toEqual(['周杰伦']);

    // #1001 (0-indexed 1000) must ALSO be Song A (never stripped by false overlap detection)
    const track1001 = result.tracks[1000];
    expect(track1001.index).toBe(1001);
    expect(track1001.title).toBe('晴天');
    expect(track1001.id).toBe('mid_song_a');
    expect(track1001.artists).toEqual(['周杰伦']);

    // #1002 (0-indexed 1001) must be Song B
    const track1002 = result.tracks[1001];
    expect(track1002.index).toBe(1002);
    expect(track1002.title).toBe('夜曲');
    expect(track1002.id).toBe('mid_song_b');
  });

  it('fails closed when initial songlist is empty but total_song_num > 0', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          cdlist: [
            {
              disstid: '1234567890',
              dissname: 'Empty But Promised Songs',
              total_song_num: 50,
              cur_song_num: 0,
              songlist: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    globalThis.fetch = fetchMock;

    await expect(fetchQQPlaylist('1234567890')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQPlaylist('1234567890');
    } catch (err) {
      const pErr = err as ProviderError;
      expect(pErr.code).toBe('INCOMPLETE_PLAYLIST');
      expect(pErr.statusCode).toBe(502);
    }
  });

  it('paginates fallback musicu endpoint when primary fails and playlist > 1000 songs', async () => {
    const page1Songs = Array.from({ length: 1000 }, (_, i) => makeMockSong(i + 1));
    const page2Songs = Array.from({ length: 150 }, (_, i) => makeMockSong(1001 + i));

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('c.y.qq.com')) {
        // Primary fails with 500
        return new Response('Internal Server Error', { status: 500 });
      }

      if (url.includes('u.y.qq.com')) {
        const body = JSON.parse(init?.body as string);
        const param = body.playlist.param;

        if (param.song_begin === 0) {
          return new Response(
            JSON.stringify({
              code: 0,
              playlist: {
                code: 0,
                data: {
                  code: 0,
                  dirinfo: {
                    id: 1234567890,
                    title: 'Fallback Multi-Page',
                    songnum: 1150,
                  },
                  songlist: page1Songs,
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } else if (param.song_begin === 1000) {
          expect(param.onlysonglist).toBe(1);
          expect(param.song_num).toBe(150);
          return new Response(
            JSON.stringify({
              code: 0,
              playlist: {
                code: 0,
                data: {
                  code: 0,
                  songlist: page2Songs,
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    globalThis.fetch = fetchMock;

    const result = await fetchQQPlaylist('1234567890');
    expect(result.trackCount).toBe(1150);
    expect(result.tracks).toHaveLength(1150);
    expect(result.tracks[0].title).toBe('Song 1');
    expect(result.tracks[1149].title).toBe('Song 1150');
  });

  it('fails closed when fallback musicu returns fewer tracks than songnum', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('c.y.qq.com')) {
        return new Response('Primary Down', { status: 502 });
      }

      if (url.includes('u.y.qq.com')) {
        const body = JSON.parse(init?.body as string);
        const param = body.playlist.param;

        if (param.song_begin === 0) {
          return new Response(
            JSON.stringify({
              code: 0,
              playlist: {
                code: 0,
                data: {
                  code: 0,
                  dirinfo: {
                    id: 1234567890,
                    title: 'Fallback Incomplete',
                    songnum: 1500,
                  },
                  songlist: Array.from({ length: 1000 }, (_, i) => makeMockSong(i + 1)),
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } else {
          return new Response(
            JSON.stringify({
              code: 0,
              playlist: {
                code: 0,
                data: {
                  code: 0,
                  songlist: [],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    globalThis.fetch = fetchMock;

    await expect(fetchQQPlaylist('1234567890')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQPlaylist('1234567890');
    } catch (err) {
      const pErr = err as ProviderError;
      expect(pErr.code).toBe('INCOMPLETE_PLAYLIST');
    }
  });

  it('normalizes tracks with empty artists to [] without fabricating 未知歌手', () => {
    const track = normalizeQQTrack(
      {
        songid: 888,
        songmid: '008empty',
        songname: 'Track With No Singer',
        singer: [],
        albumname: 'Some Album',
      },
      1,
    );

    expect(track.artists).toEqual([]);
    expect(track.artists).not.toContain('未知歌手');
  });

  it('enforces fail-closed completeness check directly in normalizeCYQQResponse', () => {
    const rawCdlist = {
      code: 0,
      cdlist: [
        {
          disstid: '123',
          dissname: 'Test Diss',
          total_song_num: 5,
          cur_song_num: 1,
          songlist: [makeMockSong(1)],
        },
      ],
    };

    expect(() => normalizeCYQQResponse(rawCdlist, '123')).toThrowError(ProviderError);
    try {
      normalizeCYQQResponse(rawCdlist, '123');
    } catch (err) {
      expect((err as ProviderError).code).toBe('INCOMPLETE_PLAYLIST');
    }
  });

  it('enforces fail-closed completeness check directly in normalizeMusicUResponse', () => {
    const rawMusicU = {
      code: 0,
      playlist: {
        code: 0,
        data: {
          code: 0,
          dirinfo: {
            title: 'Test MusicU',
            total_song_num: 10,
          },
          songlist: [makeMockSong(1)],
        },
      },
    };

    expect(() => normalizeMusicUResponse(rawMusicU, '123')).toThrowError(ProviderError);
    try {
      normalizeMusicUResponse(rawMusicU, '123');
    } catch (err) {
      expect((err as ProviderError).code).toBe('INCOMPLETE_PLAYLIST');
    }
  });

  it('fails closed when playlist size exceeds MAX_PAGES bounds (bounded pagination)', async () => {
    // MAX_PAGES = 50, each page 1000 songs -> 50,000 songs.
    // If upstream promises 60,000 songs, after 50 pages it must terminate the loop and fail closed.
    let pageCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const songBegin = Number(parsedUrl.searchParams.get('song_begin') || 0);
      pageCount++;
      return new Response(
        JSON.stringify({
          code: 0,
          cdlist: [
            {
              disstid: '1234567890',
              dissname: 'Oversized Playlist',
              total_song_num: 60000,
              cur_song_num: 1000,
              song_begin: songBegin,
              songlist: Array.from({ length: 1000 }, (_, i) => makeMockSong(songBegin + i + 1)),
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    globalThis.fetch = fetchMock;

    let thrownError: unknown;
    try {
      await fetchQQPlaylist('1234567890');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ProviderError);
    const pErr = thrownError as ProviderError;
    expect(pErr.code).toBe('INCOMPLETE_PLAYLIST');
    expect(pErr.statusCode).toBe(502);
    expect(pErr.details).toEqual({ expectedCount: 60000, actualCount: 50000 });

    // Primary fetched exactly 50 pages (MAX_PAGES), plus 1 fallback attempt
    expect(pageCount).toBe(51);
  });
});


