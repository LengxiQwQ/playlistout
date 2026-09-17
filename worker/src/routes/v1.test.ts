import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
import * as qqUser from '../providers/qqmusic/user';
import * as neteaseUser from '../providers/netease/user';
import * as kugouClient from '../providers/kugou/client';
import * as analyticsRecorder from '../analytics/recorder';
import { ProviderError } from '../models/playlist';
import { resetRateLimitStore } from '../security/rate-limit';

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
    resetRateLimitStore();
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

    it('resolves KuGou Music songlist URL with uid in query parameter as a single playlist (not user profile)', async () => {
      vi.spyOn(kugouProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('kugou', 'gcid_3zr52qfrz2z063', 'KuGou Shared Playlist'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=' +
          encodeURIComponent('https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=1000&uid=1425711902&src_type=3001'),
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('playlist');
      expect(body.data.platform).toBe('kugou');
      expect(body.data.result.name).toBe('KuGou Shared Playlist');
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

    it('accepts cURL command formatted request with uid and headers for kugou (Issue 1)', async () => {
      vi.spyOn(kugouClient, 'fetchKugouUserPlaylists').mockResolvedValueOnce(
        mockUserData('kugou', '1425711902', 'KuGouUser'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/user/playlists?uid=1425711902&platform=kugou',
        {
          headers: {
            Authorization: 'Bearer test_token_123',
            'X-Kugou-Userid': '1425711902',
          },
        },
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('1425711902');
      expect(body.data.nickname).toBe('KuGouUser');
    });

    it('rejects user/playlists request missing uid/uin/id/url with 400 INVALID_INPUT', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/user/playlists?platform=kugou',
        {
          headers: {
            Authorization: 'Bearer test_token_123',
            'X-Kugou-Userid': '1425711902',
          },
        },
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('Analytics Single Write & Probe Isolation (Issue 2)', () => {
    it('records parse analytics exactly once on successful numeric resolution across internal probes', async () => {
      const recordSpy = vi.spyOn(analyticsRecorder, 'recordParseEvent').mockResolvedValue();

      // NetEase playlist succeeds, others fail/not found
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'QQ not found', 404),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'QQ user not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('netease', '2756674066', 'NetEase Playlist'),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'NetEase user not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=2756674066',
      );
      const mockCtx = createMockCtx();

      const response = await worker.fetch(request, { DB: {} as any }, mockCtx);
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.platform).toBe('netease');

      // Despite 4 probes executing, recordParseEvent must only be called ONCE (for the final resolved playlist)
      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(recordSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          platform: 'netease',
          success: true,
          trackCount: 1,
        }),
      );
    });

    it('records zero parse analytics events when numeric resolution results in 409 AMBIGUOUS_INPUT', async () => {
      const recordSpy = vi.spyOn(analyticsRecorder, 'recordParseEvent').mockResolvedValue();

      // Both QQ Music and NetEase find matching playlists
      vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('qqmusic', '12345678', 'QQ Match'),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'QQ user not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockResolvedValueOnce(
        mockPlaylist('netease', '12345678', 'NetEase Match'),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'NetEase user not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345678',
      );
      const response = await worker.fetch(request, { DB: {} as any }, createMockCtx());
      expect(response.status).toBe(409);
      const body: any = await response.json();
      expect(body.error.code).toBe('AMBIGUOUS_INPUT');

      // No successful or failure parse analytics should be recorded for ambiguous disambiguation
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  describe('Upstream Failure Propagation (Issue 3: 502 / 504 vs 404)', () => {
    it('propagates UPSTREAM_TIMEOUT (504) when short link redirect or upstream fetch times out', async () => {
      vi.spyOn(neteaseProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('UPSTREAM_TIMEOUT', 'NetEase upstream server timed out.', 504),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://163cn.tv/abcde',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(504);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UPSTREAM_TIMEOUT');
    });

    it('propagates UPSTREAM_ERROR (502) when numeric probe encounters upstream operational failure', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('UPSTREAM_ERROR', 'QQ Music API gateway returned 502 Bad Gateway.', 502),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'QQ user not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'NetEase not found', 404),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'NetEase user not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=5555555555',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(502);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UPSTREAM_ERROR');
    });

    it('propagates UPSTREAM_TIMEOUT (504) when explicit platform numeric probe times out', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('UPSTREAM_TIMEOUT', 'QQ Music timeout', 504),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'QQ user not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=5555555555&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(504);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UPSTREAM_TIMEOUT');
    });
  });

  describe('Explicit Platform & Type Parameter Constraints (Issue 5)', () => {
    it('rejects when input URL platform conflicts with explicit platform parameter', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/playlist?id=123&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('conflicts with specified platform constraint');
    });

    it('rejects when input URL is a user profile but type constraint is playlist', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/profile/like/song?uin=10001&type=playlist',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('conflicts with specified type constraint "playlist"');
    });

    it('rejects when input URL is a single playlist but type constraint is user', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/123456&type=user',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('conflicts with specified type constraint "user"');
    });

    it('rejects in /api/v1/playlist when platform param conflicts with input URL', async () => {
      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/playlist?url=https://music.163.com/playlist?id=123&platform=qqmusic',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('conflicts with specified platform constraint');
    });

    it('accepts Kugou user profile URL with type=user and platform=kugou without false playlist conflict', async () => {
      vi.spyOn(kugouClient, 'fetchKugouUserPlaylists').mockResolvedValueOnce(
        mockUserData('kugou', '1425711902', 'KuGou User 1425711902'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://m.kugou.com/user?uid=1425711902&type=user&platform=kugou',
        {
          headers: {
            Authorization: 'Bearer kg_token_abc',
            'X-Kugou-Userid': '1425711902',
          },
        },
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('user_playlists');
      expect(body.data.platform).toBe('kugou');
      expect(body.data.result.userId).toBe('1425711902');
    });

    it('accepts Kugou shortlink with type=user and routes to user resolution', async () => {
      vi.spyOn(kugouClient, 'fetchKugouUserPlaylists').mockResolvedValueOnce(
        mockUserData('kugou', '1425711902', 'KuGou Shortlink User'),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://t.kugou.com/abcde&type=user&platform=kugou',
        {
          headers: {
            Authorization: 'Bearer kg_token_abc',
            'X-Kugou-Userid': '1425711902',
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

    it('propagates unexpected bare Error as 500 INTERNAL_ERROR with sanitized message without leaking internal details', async () => {
      vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
        new Error('SecretDatabaseConnectionFailed: password=hunter2 host=internal-db.example /internal/app.ts'),
      );
      vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'QQ user not found', 404),
      );
      vi.spyOn(neteaseProvider, 'parse').mockRejectedValueOnce(
        new ProviderError('PLAYLIST_NOT_FOUND', 'NetEase not found', 404),
      );
      vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValueOnce(
        new ProviderError('USER_NOT_FOUND', 'NetEase user not found', 404),
      );

      const request = new Request(
        'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=5555555555',
      );
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(500);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected internal error occurred while resolving the input.');

      const rawResponse = JSON.stringify(body);
      expect(rawResponse).not.toContain('SecretDatabaseConnectionFailed');
      expect(rawResponse).not.toContain('hunter2');
      expect(rawResponse).not.toContain('internal-db.example');
      expect(rawResponse).not.toContain('/internal/app.ts');
    });
  });
});
