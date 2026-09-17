import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
import * as qqUser from '../providers/qqmusic/user';
import * as neteaseUser from '../providers/netease/user';
import * as kugouClient from '../providers/kugou/client';
import { ProviderError } from '../models/playlist';

function createMockCtx(): ExecutionContext {
  return {
    waitUntil(_p: Promise<any>) {},
    passThroughOnException() {},
  } as ExecutionContext;
}

const mockPlaylist = (platform: string, id: string, name: string) => ({
  platform,
  id,
  name,
  creator: 'Test Creator',
  coverUrl: 'https://img.test/cover.jpg',
  trackCount: 1,
  tracks: [
    {
      index: 1,
      id: 't1',
      title: 'Test Song',
      artists: ['Test Artist'],
      album: 'Test Album',
      durationMs: 180000,
    },
  ],
});

const mockUserData = (platform: string, userId: string, nickname: string) => ({
  platform,
  userId,
  nickname,
  total: 1,
  playlists: [
    {
      id: 'p1',
      name: `${nickname} 的歌单`,
      coverUrl: 'https://img.test/user-cover.jpg',
      trackCount: 10,
      sourceUrl: 'https://test.com/p1',
    },
  ],
});

describe('PlaylistOut Public API v1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/health', () => {
    it('responds with 200 ok and public CORS header', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/health', {
        headers: { Origin: 'https://random-third-party.io' },
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const body: any = await response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('playlistout-api');
      expect(body.version).toBe('2.0.0');
    });

    it('rejects POST with 405 Method Not Allowed', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/health', {
        method: 'POST',
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(405);
      const body: any = await response.json();
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('GET /api/v1/stats', () => {
    it('serves stats with public CORS header', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/stats', {
        headers: { Origin: 'https://client-app.com' },
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/resolve — Parameter Validation & Security', () => {
    it('rejects missing q parameter with 400 INVALID_INPUT', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve');
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects empty q parameter with 400 INVALID_INPUT', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=%20%20');
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects oversized q parameter (> 2048 chars) with 400 INVALID_INPUT', async () => {
      const longInput = 'https://y.qq.com/n/ryqq/playlist/' + 'a'.repeat(2100);
      const request = new Request(
        `https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=${encodeURIComponent(longInput)}`,
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('2048 characters');
    });

    it('rejects invalid type parameter with 400 INVALID_INPUT', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345&type=invalid_type',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('auto, playlist, user');
    });

    it('rejects unsupported platform parameter with 400 UNSUPPORTED_PLATFORM', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345&platform=spotify',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.error.code).toBe('UNSUPPORTED_PLATFORM');
      expect(body.error.message).toContain('qqmusic, netease, kugou, qishui');
    });

    it('strictly forbids passing credentials in query parameters with 400 INVALID_INPUT', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345&token=secret_token',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('credentials in query parameters');
    });

    it('rejects non-GET methods with 405 Method Not Allowed', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345', {
        method: 'POST',
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(405);
      const body: any = await response.json();
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('GET /api/v1/resolve — 4 Platforms Single Playlist Resolution', () => {
    it('resolves QQ Music playlist URL', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qqmusic', '9044196528', 'QQ Folk Collection'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/9044196528',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('qqmusic');
      expect(body.data.result.name).toBe('QQ Folk Collection');
      expect(body.data.result.tracks.length).toBe(1);
    });

    it('resolves NetEase Cloud Music playlist URL', async () => {
      vi.spyOn(neteaseProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('netease', '2756674066', 'NetEase Top Songs'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/playlist?id=2756674066',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('netease');
      expect(body.data.result.name).toBe('NetEase Top Songs');
    });

    it('resolves KuGou Music playlist URL with optional auth headers', async () => {
      vi.spyOn(kugouProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('kugou', 'gcid_3zr52qfrzaz06a', 'KuGou Favorite Hits'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://www.kugou.com/songlist/gcid_3zr52qfrzaz06a/',
        {
          headers: {
            Authorization: 'Bearer test_kg_token',
            'X-Kugou-Userid': 'kg_user_999',
          },
        },
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('kugou');
      expect(body.data.result.name).toBe('KuGou Favorite Hits');
      expect(kugouProvider.parse).toHaveBeenCalledWith(
        'https://www.kugou.com/songlist/gcid_3zr52qfrzaz06a/',
        { token: 'test_kg_token', userid: 'kg_user_999' },
      );
    });

    it('resolves Qishui Music playlist URL', async () => {
      vi.spyOn(qishuiProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qishui', '7456789012345678901', 'Qishui Soda Chill'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://qishui.douyin.com/s/iXHhKHhY/',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('qishui');
      expect(body.data.result.name).toBe('Qishui Soda Chill');
    });

    it('extracts URL cleanly from mixed share text with emojis', async () => {
      vi.spyOn(qishuiProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qishui', '7456789012345678901', 'Piano 999'),
      );

      const shareText = '歌单｜钢琴流行曲999首：轻音乐钢琴曲 https://qishui.douyin.com/s/iXHhKHhY/ @汽水音乐';
      const request = new Request(
        `https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=${encodeURIComponent(shareText)}`,
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('qishui');
    });
  });

  describe('GET /api/v1/resolve — User Profiles & Batch Playlists', () => {
    it('resolves QQ Music user profile URL', async () => {
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockResolvedValueOnce(
        mockUserData('qqmusic', '3197635836', 'QQ Musician'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/portal/profile.html?uin=3197635836',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('user_playlists');
      expect(body.data.platform).toBe('qqmusic');
      expect(body.data.result.nickname).toBe('QQ Musician');
      expect(body.data.result.playlists.length).toBe(1);
    });

    it('resolves NetEase user profile URL', async () => {
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockResolvedValueOnce(
        mockUserData('netease', '1825474783', 'NetEase Creator'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/user/home?id=1825474783',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('user_playlists');
      expect(body.data.platform).toBe('netease');
      expect(body.data.result.nickname).toBe('NetEase Creator');
    });

    it('rejects KuGou user profile without auth credentials', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://m.kugou.com/user?uid=123456',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('Authorization');
    });

    it('resolves KuGou user profile when credentials are provided in headers', async () => {
      vi.spyOn(kugouClient, 'fetchKugouUserPlaylists').mockResolvedValueOnce(
        mockUserData('kugou', '123456', 'KuGou User'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://m.kugou.com/user?uid=123456',
        {
          headers: {
            Authorization: 'Bearer kg_token_abc',
            'X-Kugou-Userid': '123456',
          },
        },
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('user_playlists');
      expect(body.data.platform).toBe('kugou');
    });
  });

  describe('GET /api/v1/resolve — Numeric ID & Disambiguation', () => {
    it('resolves directly when type=playlist and platform=qqmusic are specified', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qqmusic', '9044196528', 'Folk Selection'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=9044196528&type=playlist&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('qqmusic');
    });

    it('resolves directly when type=user and platform=netease are specified', async () => {
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockResolvedValueOnce(
        mockUserData('netease', '1825474783', 'Lengxi'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=1825474783&type=user&platform=netease',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.data.kind).toBe('user_playlists');
      expect(body.data.platform).toBe('netease');
    });

    it('auto mode: returns unambiguous result when only 1 platform/type matches', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('netease', '2756674066', 'Solo Hit Playlist'),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'Not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=2756674066',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('netease');
      expect(body.data.result.name).toBe('Solo Hit Playlist');
    });

    it('auto mode: returns 409 AMBIGUOUS_INPUT with candidates when multiple targets match', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qqmusic', '12345678', 'QQ Classical Playlist'),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockResolvedValueOnce(
        mockUserData('netease', '12345678', 'NetEase User 12345678'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345678',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(409);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AMBIGUOUS_INPUT');
      expect(body.error.details.candidates.length).toBe(2);
      expect(body.error.details.candidates[0].platform).toBe('qqmusic');
      expect(body.error.details.candidates[0].kind).toBe('playlist');
      expect(body.error.details.candidates[1].platform).toBe('netease');
      expect(body.error.details.candidates[1].kind).toBe('user_playlists');
    });

    it('auto mode: returns 404 PLAYLIST_NOT_FOUND when zero targets match', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'Not found', 404),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'Not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=9999999999',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(404);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PLAYLIST_NOT_FOUND');
    });
  });

  describe('GET /api/v1/playlist', () => {
    it('accepts id query parameter as alias for url', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qqmusic', '9044196528', 'Folk'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/playlist?id=9044196528&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Folk');
    });
  });

  describe('GET /api/v1/user/playlists', () => {
    it('accepts id query parameter', async () => {
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockResolvedValueOnce(
        mockUserData('qqmusic', '3197635836', 'User319'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/user/playlists?id=3197635836&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.nickname).toBe('User319');
    });
  });
});
