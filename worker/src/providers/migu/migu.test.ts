import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { miguProvider } from './index';
import { matchesMiguInput, extractMiguPlaylistId, resolveShortLinkIfNeeded } from './input';
import { normalizeMiguTrack, normalizeMiguPlaylist } from './normalize';
import { fetchMiguPlaylist } from './client';
import { ProviderError } from '../../models/playlist';
import type { RawMiguPlaylistResponse, RawMiguSongItem, RawMiguSongListResponse } from './types';

describe('Migu Music Provider — Input Matching & ID Extraction', () => {
  it('matches valid Migu Web & H5 & shortlink URLs and share text', () => {
    expect(matchesMiguInput('https://c.migu.cn/0mp9YM?ifrom=33cd5775f04cbe24c3c95a47621c0172')).toBe(true);
    expect(
      matchesMiguInput(
        '分享歌单 | 歌单1 https://c.migu.cn/0mp9YM?ifrom=33cd5775f04cbe24c3c95a47621c0172 （@咪咕音乐）',
      ),
    ).toBe(true);
    expect(matchesMiguInput('https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196')).toBe(true);
    expect(matchesMiguInput('https://music.migu.cn/v5/#/playlist/236858196')).toBe(true);
    expect(matchesMiguInput('https://music.migu.cn/v3/music/playlist/236858196')).toBe(true);
    expect(matchesMiguInput('这是来自咪咕音乐的歌单分享')).toBe(true);
  });

  it('rejects unrelated URLs', () => {
    expect(matchesMiguInput('https://music.163.com/#/playlist?id=123')).toBe(false);
    expect(matchesMiguInput('https://y.qq.com/n/ryqq/playlist/123')).toBe(false);
    expect(matchesMiguInput('https://www.kugou.com/songlist/123/')).toBe(false);
    expect(matchesMiguInput('https://www.kuwo.cn/playlist_detail/123')).toBe(false);
    expect(matchesMiguInput('')).toBe(false);
  });

  it('extracts playlist ID from direct URLs, query params, and raw IDs', async () => {
    expect(await extractMiguPlaylistId('236858196')).toBe('236858196');
    expect(
      await extractMiguPlaylistId(
        'https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196&channel=0147151',
      ),
    ).toBe('236858196');
    expect(await extractMiguPlaylistId('https://music.migu.cn/v5/#/playlist/236858196')).toBe('236858196');
  });

  it('resolves short link via 302 redirect and extracts playlist ID', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('c.migu.cn/0mp9YM')) {
        return new Response(null, {
          status: 302,
          headers: {
            Location:
              'https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196&channel=0147151',
          },
        });
      }
      return new Response('Not Found', { status: 404 });
    });

    try {
      const pid = await extractMiguPlaylistId('https://c.migu.cn/0mp9YM');
      expect(pid).toBe('236858196');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('provider extractId returns string or null synchronously', () => {
    expect(miguProvider.extractId('236858196')).toBe('236858196');
    expect(miguProvider.extractId('https://music.migu.cn/v5/#/playlist/236858196')).toBe('236858196');
    expect(miguProvider.extractId('https://h5.nf.migu.cn/app/v4/p/share/playlist/index.html?id=236858196')).toBe(
      '236858196',
    );
    expect(miguProvider.extractId('invalid-url-without-id')).toBeNull();
  });
});

describe('Migu Music Provider — Data Normalization', () => {
  it('normalizes playable and VIP tracks correctly', () => {
    const rawPlayableSong: RawMiguSongItem = {
      songId: '1004665871',
      songName: '推开世界的门',
      singerList: [{ name: '杨乃文' }],
      album: '离心力',
      duration: 282,
      img1: '/data/oss/resource/00/2u/cp/d2bb62df4fe94a33a01bcc7ad07b7597.webp',
      showTags: ['hq'],
      restrictType: 0,
      copyrightType: 1,
      audioFormats: [
        { formatType: 'PQ', showTagsNew: [] },
        { formatType: 'HQ', showTagsNew: ['vip'] },
      ],
    };

    const track = normalizeMiguTrack(rawPlayableSong, 1);
    expect(track.index).toBe(1);
    expect(track.id).toBe('1004665871');
    expect(track.title).toBe('推开世界的门');
    expect(track.artist).toBe('杨乃文');
    expect(track.album).toBe('离心力');
    expect(track.durationMs).toBe(282000);
    expect(track.coverUrl).toBe(
      'https://d.musicapp.migu.cn/data/oss/resource/00/2u/cp/d2bb62df4fe94a33a01bcc7ad07b7597.webp',
    );
    expect(track.sourceUrl).toBe('https://music.migu.cn/v5/#/song/1004665871');
    expect(track.isAvailable).toBe(true);
    expect(track.isVip).toBe(false);
    expect(track.status).toBe('playable');
    expect(track.statusText).toBe('正常');
    expect(track.maxQuality).toBe('320kbps');
  });

  it('normalizes VIP-only tracks', () => {
    const rawVipSong: RawMiguSongItem = {
      songId: '1000028036',
      songName: '找自己',
      singerList: [{ name: '陶喆' }],
      album: "I'm OK",
      duration: 307,
      showTags: ['vip', 'i24'],
      restrictType: 1,
      copyrightType: 1,
      audioFormats: [
        { formatType: 'PQ', showTagsNew: ['vip'] },
        { formatType: 'HQ', showTagsNew: ['vip'] },
        { formatType: 'ZQ24', showTagsNew: ['tl-vip', 'vip'] },
      ],
    };

    const track = normalizeMiguTrack(rawVipSong, 2);
    expect(track.isVip).toBe(true);
    expect(track.isAvailable).toBe(true);
    expect(track.status).toBe('vip');
    expect(track.statusText).toBe('VIP专享');
    expect(track.maxQuality).toBe('Hi-Res');
  });

  it('normalizes off-shelf / unplayable tracks', () => {
    const rawUnplayableSong: RawMiguSongItem = {
      songId: '1114912787',
      songName: '九万字',
      singerList: [{ name: '黄诗扶' }],
      album: '人间不值得',
      duration: 232,
      restrictType: -1,
      copyrightType: 0,
    };

    const track = normalizeMiguTrack(rawUnplayableSong, 3);
    expect(track.isAvailable).toBe(false);
    expect(track.status).toBe('unplayable');
    expect(track.statusText).toBe('下架/无版权');
  });

  it('normalizes playlist metadata', () => {
    const playlist = normalizeMiguPlaylist(
      {
        title: '我的测试歌单',
        ownerName: '测试用户',
        originalImgUrl: 'https://d.musicapp.migu.cn/cover.jpg',
        musicNum: 10,
      },
      [],
      '236858196',
    );

    expect(playlist.platform).toBe('migu');
    expect(playlist.id).toBe('236858196');
    expect(playlist.name).toBe('我的测试歌单');
    expect(playlist.creator).toBe('测试用户');
    expect(playlist.coverUrl).toBe('https://d.musicapp.migu.cn/cover.jpg');
    expect(playlist.trackCount).toBe(10);
  });
});

describe('Migu Music Provider — Client Fetching & Pagination', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches playlist with single page successfully', async () => {
    const mockMeta: RawMiguPlaylistResponse = {
      code: '000000',
      data: {
        title: '经典流行',
        ownerName: '音乐推荐官',
        musicNum: 2,
      },
    };

    const mockSongs: RawMiguSongListResponse = {
      code: '000000',
      data: {
        totalCount: 2,
        songList: [
          { songId: '1', songName: '歌曲一', singerList: [{ name: '歌手A' }] },
          { songId: '2', songName: '歌曲二', singerList: [{ name: '歌手B' }] },
        ],
      },
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/resource/playlist/v2.0')) {
        return new Response(JSON.stringify(mockMeta), { status: 200 });
      }
      if (url.includes('/resource/playlist/song/v2.0')) {
        return new Response(JSON.stringify(mockSongs), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    });

    const playlist = await fetchMiguPlaylist('236858196');
    expect(playlist.platform).toBe('migu');
    expect(playlist.name).toBe('经典流行');
    expect(playlist.creator).toBe('音乐推荐官');
    expect(playlist.tracks.length).toBe(2);
    expect(playlist.tracks[0].title).toBe('歌曲一');
    expect(playlist.tracks[1].title).toBe('歌曲二');
  });

  it('paginates when totalCount exceeds PAGE_SIZE (50)', async () => {
    const mockMeta: RawMiguPlaylistResponse = {
      code: '000000',
      data: {
        title: '超长歌单',
        ownerName: '收藏家',
        musicNum: 75,
      },
    };

    const page1Songs: RawMiguSongItem[] = Array.from({ length: 50 }, (_, i) => ({
      songId: `s_${i + 1}`,
      songName: `歌曲_${i + 1}`,
      singerList: [{ name: '歌手' }],
    }));

    const page2Songs: RawMiguSongItem[] = Array.from({ length: 25 }, (_, i) => ({
      songId: `s_${i + 51}`,
      songName: `歌曲_${i + 51}`,
      singerList: [{ name: '歌手' }],
    }));

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/resource/playlist/v2.0')) {
        return new Response(JSON.stringify(mockMeta), { status: 200 });
      }
      if (url.includes('pageNo=1')) {
        return new Response(JSON.stringify({ code: '000000', data: { totalCount: 75, songList: page1Songs } }), {
          status: 200,
        });
      }
      if (url.includes('pageNo=2')) {
        return new Response(JSON.stringify({ code: '000000', data: { totalCount: 75, songList: page2Songs } }), {
          status: 200,
        });
      }
      return new Response('Not Found', { status: 404 });
    });

    const playlist = await fetchMiguPlaylist('236858196');
    expect(playlist.tracks.length).toBe(75);
    expect(playlist.tracks[0].title).toBe('歌曲_1');
    expect(playlist.tracks[74].title).toBe('歌曲_75');
  });

  it('throws 404 when upstream reports playlist error or not found', async () => {
    const mockError: RawMiguPlaylistResponse = {
      code: '300001',
      info: '歌单不存在',
    };

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockError), { status: 200 }));

    await expect(fetchMiguPlaylist('999999999')).rejects.toThrow(ProviderError);
  });
});
