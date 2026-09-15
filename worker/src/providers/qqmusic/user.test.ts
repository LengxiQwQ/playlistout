import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidQQNumber, extractQQNumber, fetchQQUserPlaylists } from './user';
import { ProviderError } from '../../models/playlist';

describe('QQ Music User Playlists Input Extraction', () => {
  it('identifies valid numeric QQ numbers', () => {
    expect(isValidQQNumber('10001')).toBe(true);
    expect(isValidQQNumber('123456789')).toBe(true);
    expect(isValidQQNumber(' 987654321 ')).toBe(true);
    expect(isValidQQNumber('123')).toBe(false); // too short
    expect(isValidQQNumber('abc12345')).toBe(false);
    expect(isValidQQNumber('')).toBe(false);
  });

  it('extracts QQ number from profile URLs', () => {
    expect(extractQQNumber('10001')).toBe('10001');
    expect(extractQQNumber('https://y.qq.com/portal/profile.html?uin=10001')).toBe('10001');
    expect(extractQQNumber('https://y.qq.com/n/ryqq/profile/like/song?uin=12345678&tab=create')).toBe('12345678');
    expect(extractQQNumber('https://y.qq.com/portal/profile.html?hostuin=888888')).toBe('888888');
    expect(extractQQNumber('not-a-valid-input')).toBeNull();
  });
});

describe('fetchQQUserPlaylists Upstream Handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('successfully fetches and normalizes user playlists, filtering system playlists', async () => {
    const mockResponse = {
      code: 0,
      subcode: 0,
      message: 'ok',
      data: {
        encrypt_uin: 'oKnzoe6*',
        hostname: '小明',
        totoal: 3,
        disslist: [
          {
            diss_name: 'QZone背景音乐',
            diss_cover: 'http://example.com/qzone.jpg',
            song_cnt: 1,
            listen_num: 0,
            dirid: 205,
            tid: 0,
            dir_show: 0, // Should be filtered out
          },
          {
            diss_name: '我的最爱',
            diss_cover: 'http://example.com/fav.jpg',
            song_cnt: 42,
            listen_num: 1500,
            dirid: 1,
            tid: 900123456,
            dir_show: 1,
          },
          {
            diss_name: '车载精选',
            diss_cover: 'http://example.com/car.jpg',
            song_cnt: 18,
            listen_num: 320,
            dirid: 2,
            tid: 900654321,
            dir_show: 1,
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const res = await fetchQQUserPlaylists('10001');

    expect(res.platform).toBe('qqmusic');
    expect(res.userId).toBe('10001');
    expect(res.nickname).toBe('小明');
    expect(res.total).toBe(2);
    expect(res.playlists).toHaveLength(2);

    expect(res.playlists[0]).toEqual({
      id: '900123456',
      name: '我的最爱',
      coverUrl: 'http://example.com/fav.jpg',
      trackCount: 42,
      listenNum: 1500,
      sourceUrl: 'https://y.qq.com/n/ryqq/playlist/900123456',
    });

    expect(res.playlists[1]).toEqual({
      id: '900654321',
      name: '车载精选',
      coverUrl: 'http://example.com/car.jpg',
      trackCount: 18,
      listenNum: 320,
      sourceUrl: 'https://y.qq.com/n/ryqq/playlist/900654321',
    });
  });

  it('throws USER_NOT_FOUND when upstream code !== 0', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 1000,
        subcode: 1,
        message: 'user not found',
      }),
    } as unknown as Response);

    await expect(fetchQQUserPlaylists('10001')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQUserPlaylists('10001');
    } catch (err) {
      expect((err as ProviderError).code).toBe('USER_NOT_FOUND');
      expect((err as ProviderError).statusCode).toBe(404);
    }
  });

  it('throws INVALID_INPUT on invalid QQ numbers', async () => {
    await expect(fetchQQUserPlaylists('123')).rejects.toThrowError(ProviderError);
    try {
      await fetchQQUserPlaylists('123');
    } catch (err) {
      expect((err as ProviderError).code).toBe('INVALID_INPUT');
      expect((err as ProviderError).statusCode).toBe(400);
    }
  });
});
