import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kuwoProvider } from './index';
import { matchesKuwoInput, extractKuwoPlaylistId } from './input';
import { normalizeKuwoTrack, normalizeKuwoPlaylist } from './normalize';
import { fetchKuwoPlaylist } from './client';
import { ProviderError } from '../../models/playlist';
import type { RawKuwoPlaylistResponse, RawKuwoSong } from './types';

describe('Kuwo Music Provider — Input Matching & ID Extraction', () => {
  it('matches valid Kuwo Web & H5 URLs', () => {
    expect(matchesKuwoInput('https://www.kuwo.cn/playlist_detail/2311665489')).toBe(true);
    expect(matchesKuwoInput('http://kuwo.cn/playlist_detail/3003374223')).toBe(true);
    expect(matchesKuwoInput('https://m.kuwo.cn/newh5app/playlist_detail/2311665489?t=plantform&from=ar')).toBe(true);
    expect(matchesKuwoInput('https://m.kuwo.cn/playlist_detail/2311665489')).toBe(true);
    expect(matchesKuwoInput('【歌单】我喜欢听 https://m.kuwo.cn/newh5app/playlist_detail/2311665489 来自酷我音乐')).toBe(true);
  });

  it('rejects unrelated URLs', () => {
    expect(matchesKuwoInput('https://music.163.com/#/playlist?id=123')).toBe(false);
    expect(matchesKuwoInput('https://y.qq.com/n/ryqq/playlist/123')).toBe(false);
    expect(matchesKuwoInput('https://www.kugou.com/songlist/123/')).toBe(false);
    expect(matchesKuwoInput('')).toBe(false);
  });

  it('extracts playlist ID accurately', () => {
    expect(extractKuwoPlaylistId('https://www.kuwo.cn/playlist_detail/2311665489')).toBe('2311665489');
    expect(extractKuwoPlaylistId('https://m.kuwo.cn/newh5app/playlist_detail/3003374223?t=plantform&from=ar')).toBe('3003374223');
    expect(extractKuwoPlaylistId('http://kuwo.cn/api/www/playlist/playListInfo?pid=2311665489')).toBe('2311665489');
    expect(extractKuwoPlaylistId('2311665489')).toBe('2311665489');
    expect(extractKuwoPlaylistId('【歌单】我喜欢听 https://m.kuwo.cn/newh5app/playlist_detail/2311665489 来自酷我音乐')).toBe('2311665489');
  });

  it('provider extractId returns string or null gracefully', () => {
    expect(kuwoProvider.extractId('https://www.kuwo.cn/playlist_detail/2311665489')).toBe('2311665489');
    expect(kuwoProvider.extractId('invalid-url-without-id')).toBeNull();
  });
});

describe('Kuwo Music Provider — Data Normalization', () => {
  it('normalizes raw tracks correctly with HTML unescaping and VIP detection', () => {
    const rawSong: RawKuwoSong = {
      rid: 332106,
      name: '你若成风 &amp; 晴天',
      artist: '许嵩 &amp; 莫诗旎',
      album: '许嵩&lt;早期单曲集&gt;',
      duration: 221,
      pic: 'https://img.kuwo.cn/pic.jpg',
      releaseDate: '2007-06-02',
      isListenFee: true,
      online: 1,
    };

    const track = normalizeKuwoTrack(rawSong, 1);
    expect(track.index).toBe(1);
    expect(track.id).toBe('332106');
    expect(track.title).toBe('你若成风 & 晴天');
    expect(track.artist).toBe('许嵩 & 莫诗旎');
    expect(track.album).toBe('许嵩<早期单曲集>');
    expect(track.durationMs).toBe(221000);
    expect(track.coverUrl).toBe('https://img.kuwo.cn/pic.jpg');
    expect(track.releaseDate).toBe('2007-06-02');
    expect(track.isVip).toBe(true);
    expect(track.isAvailable).toBe(true);
    expect(track.status).toBe('vip');
    expect(track.sourceUrl).toBe('https://www.kuwo.cn/play_detail/332106');
  });

  it('marks offline songs as unplayable', () => {
    const rawSong: RawKuwoSong = {
      rid: 99999,
      name: '下架曲目',
      artist: '测试歌手',
      online: 0,
    };

    const track = normalizeKuwoTrack(rawSong, 2);
    expect(track.isAvailable).toBe(false);
    expect(track.status).toBe('unplayable');
  });

  it('normalizes playlist metadata properly', () => {
    const rawData = {
      name: '我喜欢听 &amp; 流行精选',
      uname: '冷汐O&amp;O',
      total: 100,
      img: 'https://img.kuwo.cn/cover.jpg',
      info: '这是歌单描述 &lt;简介&gt;',
      listencnt: 8888,
    };

    const playlist = normalizeKuwoPlaylist('2311665489', rawData, []);
    expect(playlist.platform).toBe('kuwo');
    expect(playlist.id).toBe('2311665489');
    expect(playlist.name).toBe('我喜欢听 & 流行精选');
    expect(playlist.creator).toBe('冷汐O&O');
    expect(playlist.trackCount).toBe(100);
    expect(playlist.coverUrl).toBe('https://img.kuwo.cn/cover.jpg');
    expect(playlist.description).toBe('这是歌单描述 <简介>');
    expect(playlist.playCount).toBe(8888);
    expect(playlist.sourceUrl).toBe('https://www.kuwo.cn/playlist_detail/2311665489');
  });
});

describe('Kuwo Music Provider — Upstream Client & Fetch Flow', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and normalizes a single-page playlist successfully', async () => {
    const mockResponse: RawKuwoPlaylistResponse = {
      code: 200,
      curTime: Date.now(),
      data: {
        name: '单页测试歌单',
        uname: '测试创建者',
        total: 2,
        img: 'https://img.kuwo.cn/p.jpg',
        musicList: [
          { rid: 101, name: '歌曲1', artist: '歌手1', duration: 180, online: 1 },
          { rid: 102, name: '歌曲2', artist: '歌手2', duration: 200, online: 1 },
        ],
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const playlist = await fetchKuwoPlaylist('2311665489');
    expect(playlist.platform).toBe('kuwo');
    expect(playlist.name).toBe('单页测试歌单');
    expect(playlist.trackCount).toBe(2);
    expect(playlist.tracks).toHaveLength(2);
    expect(playlist.tracks[0].title).toBe('歌曲1');
    expect(playlist.tracks[1].title).toBe('歌曲2');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles multi-page pagination for playlists with > 100 tracks', async () => {
    const page1Songs: RawKuwoSong[] = Array.from({ length: 100 }, (_, i) => ({
      rid: 1000 + i,
      name: `歌曲_${i + 1}`,
      artist: '歌手',
      duration: 180,
      online: 1,
    }));

    const page2Songs: RawKuwoSong[] = Array.from({ length: 50 }, (_, i) => ({
      rid: 2000 + i,
      name: `歌曲_${100 + i + 1}`,
      artist: '歌手',
      duration: 180,
      online: 1,
    }));

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const parsed = new URL(url);
      const pn = parsed.searchParams.get('pn');
      if (pn === '1') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            data: {
              name: '大歌单测试',
              uname: '达人',
              total: 150,
              musicList: page1Songs,
            },
          }),
        };
      } else if (pn === '2') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            data: {
              name: '大歌单测试',
              uname: '达人',
              total: 150,
              musicList: page2Songs,
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const playlist = await kuwoProvider.parse('2311665489');
    expect(playlist.trackCount).toBe(150);
    expect(playlist.tracks).toHaveLength(150);
    expect(playlist.tracks[0].title).toBe('歌曲_1');
    expect(playlist.tracks[99].title).toBe('歌曲_100');
    expect(playlist.tracks[100].title).toBe('歌曲_101');
    expect(playlist.tracks[149].title).toBe('歌曲_150');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws PLAYLIST_NOT_FOUND when upstream returns empty or non-existent playlist', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        data: {
          name: '',
          uname: '',
          total: 0,
          musicList: [],
        },
      }),
    } as unknown as Response);

    await expect(fetchKuwoPlaylist('9999999999')).rejects.toThrow(ProviderError);
    await expect(fetchKuwoPlaylist('9999999999')).rejects.toMatchObject({
      code: 'PLAYLIST_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('throws UPSTREAM_ERROR when network fails or returns 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(fetchKuwoPlaylist('2311665489')).rejects.toThrow(ProviderError);
    await expect(fetchKuwoPlaylist('2311665489')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      statusCode: 502,
    });
  });

  it('throws PARSE_ERROR when JSON is malformed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token < in JSON');
      },
    } as unknown as Response);

    await expect(fetchKuwoPlaylist('2311665489')).rejects.toThrow(ProviderError);
    await expect(fetchKuwoPlaylist('2311665489')).rejects.toMatchObject({
      code: 'PARSE_ERROR',
      statusCode: 502,
    });
  });
});
