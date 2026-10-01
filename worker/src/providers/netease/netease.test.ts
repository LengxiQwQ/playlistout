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

  it('extracts playlist ID from shortlinks with and without protocol', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 302,
        headers: new Headers({
          location: 'https://music.163.com/playlist?id=18429425523',
        }),
      });

      expect(await extractNeteasePlaylistId('https://163cn.tv/bhsHbRfW')).toBe('18429425523');
      expect(await extractNeteasePlaylistId('163cn.tv/bhsHbRfW')).toBe('18429425523');
    } finally {
      globalThis.fetch = originalFetch;
    }
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
    // 1. With takedown recommendation
    const takedownSong1: RawNeteaseSong = {
      id: 1,
      name: '我们的歌',
      fee: 0,
      noCopyrightRcmd: { type: 3, typeDesc: 'MV可播' },
    };
    const takedownPriv1: RawNeteasePrivilege = { id: 1, st: -100, pl: 0, cp: 0, subp: 0 };
    const status1 = determineNeteaseTrackStatus(takedownSong1, takedownPriv1);
    expect(status1.isAvailable).toBe(false);
    expect(status1.status).toBe('unplayable');
    expect(status1.statusText).toBe('下架/无版权');

    // 2. With cp === 0 and subp === 0 (without recommendation)
    const takedownSong2: RawNeteaseSong = { id: 2, name: '长安姑娘', fee: 0 };
    const takedownPriv2: RawNeteasePrivilege = { id: 2, st: -200, pl: 0, cp: 0, subp: 0 };
    const status2 = determineNeteaseTrackStatus(takedownSong2, takedownPriv2);
    expect(status2.isAvailable).toBe(false);
    expect(status2.status).toBe('unplayable');
    expect(status2.statusText).toBe('下架/无版权');

    // 3. With explicit st === -1
    const takedownSong3: RawNeteaseSong = { id: 3, name: '删除歌曲', fee: 0 };
    const takedownPriv3: RawNeteasePrivilege = { id: 3, st: -1, pl: 0 };
    const status3 = determineNeteaseTrackStatus(takedownSong3, takedownPriv3);
    expect(status3.isAvailable).toBe(false);
    expect(status3.status).toBe('unplayable');
    expect(status3.statusText).toBe('下架/无版权');
  });

  it('correctly classifies overseas geo-restricted tracks as normal playable domestically', () => {
    // Even if overseas IP receives st: -100 / st: -200 and pl: 0, if cp: 1 or subp: 1 it is playable domestically
    const geoSong: RawNeteaseSong = { id: 10, name: '大陆限定歌曲', fee: 0 };
    const geoPriv: RawNeteasePrivilege = { id: 10, st: -100, pl: 0, cp: 1, subp: 1 };
    const status = determineNeteaseTrackStatus(geoSong, geoPriv);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(false);
    expect(status.status).toBe('playable');
    expect(status.statusText).toBe('正常');

    // Or explicit geo rcmd
    const geoSong2: RawNeteaseSong = {
      id: 11,
      name: '地区限制歌曲',
      fee: 0,
      noCopyrightRcmd: { type: 1, typeDesc: '因国家或地区限制无法播放' },
    };
    const geoPriv2: RawNeteasePrivilege = { id: 11, st: -200, pl: 0 };
    const status2 = determineNeteaseTrackStatus(geoSong2, geoPriv2);
    expect(status2.isAvailable).toBe(true);
    expect(status2.isVip).toBe(false);
    expect(status2.status).toBe('playable');
    expect(status2.statusText).toBe('正常');
  });

  it('correctly classifies VIP tracks even when queried unauthenticated (st: -100)', () => {
    const vipSong: RawNeteaseSong = { id: 2, name: 'Skyfall', fee: 1 };
    const vipPriv: RawNeteasePrivilege = { id: 2, st: -100, pl: 0, cp: 1, subp: 1 };
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
      noCopyrightRcmd: { type: 2, typeDesc: '其它版本可播' },
    };
    const priv: RawNeteasePrivilege = { id: 2123827852, st: -100, pl: 0, cp: 0, subp: 0 };

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

    it('gracefully handles NetEase cached trackCount discrepancy when all trackIds are retrieved', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn()
          // 1. Playlist detail returns 2 trackIds, but trackCount was 3 (1 purged song desync)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              code: 200,
              playlist: {
                id: 99999,
                name: '计数不一致歌单',
                trackCount: 3,
                trackIds: [{ id: 101 }, { id: 102 }],
              },
            }),
          } as Response)
          // 2. Song detail returns both songs
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              code: 200,
              songs: [
                { id: 101, name: 'Song 101', ar: [{ name: 'Artist A' }] },
                { id: 102, name: 'Song 102', ar: [{ name: 'Artist B' }] },
              ],
              privileges: [
                { id: 101, fee: 0, st: 0, pl: 320000 },
                { id: 102, fee: 0, st: 0, pl: 320000 },
              ],
            }),
          } as Response);

        const { fetchNeteasePlaylist } = await import('./client');
        const playlist = await fetchNeteasePlaylist('99999');
        expect(playlist.trackCount).toBe(2);
        expect(playlist.tracks).toHaveLength(2);
        expect(playlist.tracks[0].title).toBe('Song 101');
        expect(playlist.tracks[1].title).toBe('Song 102');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws UPSTREAM_TIMEOUT instead of false PLAYLIST_NOT_FOUND when upstream times out', async () => {
      const originalFetch = globalThis.fetch;
      try {
        const timeoutErr = new Error('Aborted');
        timeoutErr.name = 'AbortError';
        globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

        const { fetchNeteasePlaylist } = await import('./client');
        await expect(fetchNeteasePlaylist('12345')).rejects.toThrowError(
          /Request to NetEase Music timed out/,
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
