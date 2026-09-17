import { describe, it, expect, vi } from 'vitest';
import { matchesNeteaseInput, extractNeteasePlaylistId, extractNeteaseUserId } from './input';
import {
  determineNeteaseTrackStatus,
  normalizeNeteaseTrack,
  normalizeNeteasePlaylist,
  type RawNeteaseSong,
  type RawNeteasePrivilege,
} from './normalize';

describe('NetEase Provider Input & Matching', () => {
  it('identifies valid NetEase inputs', () => {
    expect(matchesNeteaseInput('https://music.163.com/playlist?id=2756674066')).toBe(true);
    expect(matchesNeteaseInput('https://music.163.com/#/playlist?id=2756674066')).toBe(true);
    expect(matchesNeteaseInput('https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783')).toBe(true);
    expect(matchesNeteaseInput('https://163cn.tv/bgpHWLfw')).toBe(true);
    expect(matchesNeteaseInput('https://y.music.163.com/m/playlist?id=2756674066')).toBe(true);
    expect(matchesNeteaseInput('分享歌单 https://music.163.com/playlist?id=2756674066 (来自网易云音乐)')).toBe(true);
  });

  it('rejects non-NetEase inputs', () => {
    expect(matchesNeteaseInput('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe(false);
    expect(matchesNeteaseInput('https://open.spotify.com/playlist/123')).toBe(false);
    expect(matchesNeteaseInput('')).toBe(false);
  });

  it('extracts playlist ID from direct URLs and numeric IDs', async () => {
    expect(await extractNeteasePlaylistId('2756674066')).toBe('2756674066');
    expect(await extractNeteasePlaylistId('https://music.163.com/playlist?id=2756674066')).toBe('2756674066');
    expect(await extractNeteasePlaylistId('https://music.163.com/#/playlist?id=2756674066')).toBe('2756674066');
    expect(await extractNeteasePlaylistId('https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783')).toBe('2756674066');
  });

  it('throws on invalid playlist inputs and user profile URLs', async () => {
    await expect(extractNeteasePlaylistId('not-a-link')).rejects.toThrow();
    await expect(extractNeteasePlaylistId('https://music.163.com/user?id=1825474783')).rejects.toThrow();
    await expect(extractNeteasePlaylistId('https://music.163.com/user/home?id=1825474783')).rejects.toThrow();
  });

  it('extracts user ID from direct profile URLs and numeric IDs', async () => {
    expect(await extractNeteaseUserId('1825474783')).toBe('1825474783');
    expect(await extractNeteaseUserId('https://music.163.com/user/home?id=1825474783')).toBe('1825474783');
    expect(await extractNeteaseUserId('https://music.163.com/#/user/home?id=1825474783')).toBe('1825474783');
    expect(await extractNeteaseUserId('https://music.163.com/user?id=1825474783')).toBe('1825474783');
  });
});

describe('NetEase Song Status & Normalization', () => {
  it('correctly classifies greyed out / unplayable / copyright expired tracks', () => {
    const unplayableSong: RawNeteaseSong = { id: 1, name: '下架歌曲', fee: 0 };
    const unplayablePriv: RawNeteasePrivilege = { id: 1, st: -100, pl: 0 };
    const status = determineNeteaseTrackStatus(unplayableSong, unplayablePriv);
    expect(status.isAvailable).toBe(false);
    expect(status.status).toBe('unplayable');
    expect(status.statusText).toBe('下架/无版权');
  });

  it('correctly classifies overseas geo-restricted tracks as normal playable domestically', () => {
    const geoSong: RawNeteaseSong = { id: 10, name: '大陆限定歌曲', fee: 0 };
    const geoPriv: RawNeteasePrivilege = { id: 10, st: -200, pl: 0 };
    const status = determineNeteaseTrackStatus(geoSong, geoPriv);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(false);
    expect(status.status).toBe('playable');
    expect(status.statusText).toBe('正常');
  });

  it('correctly classifies VIP tracks', () => {
    const vipSong: RawNeteaseSong = { id: 2, name: 'VIP 歌曲', fee: 1 };
    const vipPriv: RawNeteasePrivilege = { id: 2, st: 0, pl: 320000 };
    const status = determineNeteaseTrackStatus(vipSong, vipPriv);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(true);
    expect(status.status).toBe('vip');
    expect(status.statusText).toBe('VIP专享');
  });

  it('correctly classifies paid album tracks', () => {
    const paidSong: RawNeteaseSong = { id: 3, name: '数字专辑歌曲', fee: 4 };
    const paidPriv: RawNeteasePrivilege = { id: 3, st: 0, pl: 320000 };
    const status = determineNeteaseTrackStatus(paidSong, paidPriv);
    expect(status.isAvailable).toBe(true);
    expect(status.status).toBe('paid');
    expect(status.statusText).toBe('付费专辑');
  });

  it('correctly classifies standard playable tracks', () => {
    const normalSong: RawNeteaseSong = { id: 4, name: '普通免费歌曲', fee: 0 };
    const normalPriv: RawNeteasePrivilege = { id: 4, st: 0, pl: 320000 };
    const status = determineNeteaseTrackStatus(normalSong, normalPriv);
    expect(status.isAvailable).toBe(true);
    expect(status.status).toBe('playable');
    expect(status.statusText).toBe('正常');
  });

  it('normalizes track fields completely', () => {
    const rawSong: RawNeteaseSong = {
      id: 2123827852,
      name: 'みなごろし',
      ar: [{ id: 101, name: 'なきそ' }, { id: 102, name: '歌愛ユキ' }],
      al: { id: 201, name: 'みなごろし', picUrl: 'http://p4.music.126.net/test.jpg' },
      dt: 125294,
      fee: 8,
    };
    const priv: RawNeteasePrivilege = { id: 2123827852, st: -100, pl: 0 };

    const track = normalizeNeteaseTrack(rawSong, 1, priv);
    expect(track.index).toBe(1);
    expect(track.id).toBe('2123827852');
    expect(track.title).toBe('みなごろし');
    expect(track.artists).toEqual(['なきそ', '歌愛ユキ']);
    expect(track.album).toBe('みなごろし');
    expect(track.durationMs).toBe(125294);
    expect(track.sourceUrl).toBe('https://music.163.com/#/song?id=2123827852');
    expect(track.coverUrl).toBe('https://p4.music.126.net/test.jpg');
    expect(track.isAvailable).toBe(false);
    expect(track.status).toBe('unplayable');
    expect(track.statusText).toBe('下架/无版权');
  });

  it('normalizes playlist metadata completely', () => {
    const detail = {
      id: 2756674066,
      name: '是冷汐呀233喜欢的音乐',
      creator: { userId: 1825474783, nickname: '是冷汐呀233' },
      coverImgUrl: 'http://p1.music.126.net/cover.jpg',
      trackCount: 613,
      playCount: 5857,
      createTime: 1555304659510,
      updateTime: 1727861572110,
      description: '测试简介',
      tags: ['流行', '二次元'],
    };

    const playlist = normalizeNeteasePlaylist(detail, []);
    expect(playlist.platform).toBe('netease');
    expect(playlist.id).toBe('2756674066');
    expect(playlist.name).toBe('是冷汐呀233喜欢的音乐');
    expect(playlist.creator).toBe('是冷汐呀233');
    expect(playlist.coverUrl).toBe('https://p1.music.126.net/cover.jpg');
    expect(playlist.trackCount).toBe(613);
    expect(playlist.playCount).toBe(5857);
    expect(playlist.tags).toEqual(['流行', '二次元']);
    expect(playlist.description).toBe('测试简介');
    // Timestamps converted to seconds (10 digits)
    expect(playlist.createTime).toBe(1555304659);
    expect(playlist.updateTime).toBe(1727861572);
  });

  describe('NetEase Completeness Verification', () => {
    it('throws INCOMPLETE_PLAYLIST when upstream song detail API drops songs', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn()
          // 1. Playlist detail returns 2 trackIds: [101, 102]
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              code: 200,
              playlist: {
                id: 12345,
                name: '测试完整性歌单',
                trackCount: 2,
                trackIds: [{ id: 101 }, { id: 102 }],
              },
            }),
          } as Response)
          // 2. Song detail returns only 1 song: [101]
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              code: 200,
              songs: [{ id: 101, name: 'Song 101', ar: [{ name: 'Artist' }] }],
              privileges: [{ id: 101, fee: 0, st: 0, pl: 320000 }],
            }),
          } as Response)
          // 3. Retry on missing ID 102 still returns empty
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              code: 200,
              songs: [],
              privileges: [],
            }),
          } as Response);

        const { fetchNeteasePlaylist } = await import('./client');
        await expect(fetchNeteasePlaylist('12345')).rejects.toThrowError(
          /Incomplete playlist: NetEase playlist reported 2 songs, but only 1 could be retrieved/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws INCOMPLETE_PLAYLIST when trackIds length does not match trackCount (Level 1)', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 200,
            playlist: {
              id: 99999,
              name: 'ID缺失歌单',
              trackCount: 500,
              trackIds: Array.from({ length: 499 }, (_, i) => ({ id: i + 1 })),
            },
          }),
        } as Response);

        const { fetchNeteasePlaylist } = await import('./client');
        await expect(fetchNeteasePlaylist('99999')).rejects.toThrowError(
          /Incomplete playlist: NetEase metadata reported 500 tracks, but only 499 track IDs were provided/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws INCOMPLETE_PLAYLIST when only truncated inline tracks are present (Level 1 fallback)', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 200,
            playlist: {
              id: 88888,
              name: '仅截断内联歌曲歌单',
              trackCount: 500,
              tracks: Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                name: `Song ${i + 1}`,
                ar: [{ name: 'Artist' }],
              })),
            },
          }),
        } as Response);

        const { fetchNeteasePlaylist } = await import('./client');
        await expect(fetchNeteasePlaylist('88888')).rejects.toThrowError(
          /Incomplete playlist: NetEase metadata reported 500 tracks, but only 10 inline tracks were provided/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
