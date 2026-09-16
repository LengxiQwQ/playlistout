import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kugouProvider } from './index';
import { matchesKugouInput, extractKugouTarget } from './input';
import { md5, signKugouLoginParams, signKugouGatewayParams } from './crypto';
import { normalizeKugouTrack, normalizeKugouPlaylist } from './normalize';
import { createKugouQrCode, checkKugouQrCode } from './auth';

describe('Kugou Provider Unit Tests', () => {
  describe('Crypto & Signatures', () => {
    it('computes correct MD5 hashes for ASCII and UTF-8 strings', () => {
      expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
      expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
      expect(md5('周杰伦')).toBe('7a8941058aaf4df5147042ce104568da');
    });

    it('generates deterministic login params signature', () => {
      const params = {
        appid: '3116',
        clienttime: '1700000000',
        clientver: '11440',
        mid: 'test_mid',
      };
      const sig1 = signKugouLoginParams(params);
      const sig2 = signKugouLoginParams(params);
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('generates deterministic gateway params signature', () => {
      const params = {
        appid: '3116',
        clienttime: '1700000000',
        userid: '1425711902',
      };
      const sig = signKugouGatewayParams(params, '{"listid":"123"}');
      expect(sig).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('Input Matching & Target Extraction', () => {
    it('matches valid Kugou links and identifiers', () => {
      expect(
        matchesKugouInput('https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/?src_cid=3zr52qfrzaz06a'),
      ).toBe(true);
      expect(matchesKugouInput('https://www.kugou.com/yy/special/single/546903.html')).toBe(true);
      expect(matchesKugouInput('https://t1.kugou.com/abcdef')).toBe(true);
      expect(matchesKugouInput('gcid_3zr52qfrzaz06a')).toBe(true);
      expect(matchesKugouInput('src_cid=3zr52qfrzaz06a')).toBe(true);
    });

    it('rejects non-Kugou inputs', () => {
      expect(matchesKugouInput('https://y.qq.com/n/ryqq/playlist/12345')).toBe(false);
      expect(matchesKugouInput('https://music.163.com/playlist?id=12345')).toBe(false);
      expect(matchesKugouInput('')).toBe(false);
    });

    it('extracts target for gcid songlist', async () => {
      const target = await extractKugouTarget(
        'https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/?src_cid=3zr52qfrzaz06a&uid=1425711902',
      );
      expect(target).not.toBeNull();
      expect(target?.type).toBe('songlist');
      expect(target?.id).toBe('gcid_3zr52qfrzaz06a');
    });

    it('extracts target for special curated playlist', async () => {
      const target = await extractKugouTarget('https://www.kugou.com/yy/special/single/546903.html');
      expect(target).not.toBeNull();
      expect(target?.type).toBe('special');
      expect(target?.id).toBe('546903');
    });

    it('extracts ID via kugouProvider.extractId', () => {
      expect(kugouProvider.extractId('https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/')).toBe(
        'gcid_3zr52qfrzaz06a',
      );
      expect(kugouProvider.extractId('gcid_3zr52qfrzaz06a')).toBe('gcid_3zr52qfrzaz06a');
      expect(kugouProvider.extractId('https://www.kugou.com/yy/special/single/546903.html')).toBe(
        '546903',
      );
    });
  });

  describe('Track & Playlist Normalization', () => {
    it('normalizes Kugou track with singerinfo array and title splitting', () => {
      const raw = {
        hash: 'B55FCC75168E0C8F3EB8AAD347911328',
        name: '周杰伦 - 借口',
        singerinfo: [{ name: '周杰伦' }],
        albuminfo: { name: '七里香', id: 965291 },
        timelen: 265613,
        privilege: 10,
        cover: 'http://imge.kugou.com/stdmusic/{size}/20170728/cover.jpg',
      };

      const track = normalizeKugouTrack(raw, 1);
      expect(track.index).toBe(1);
      expect(track.id).toBe('B55FCC75168E0C8F3EB8AAD347911328');
      expect(track.title).toBe('借口');
      expect(track.artists).toEqual(['周杰伦']);
      expect(track.album).toBe('七里香');
      expect(track.durationMs).toBe(265613);
      expect(track.isVip).toBe(true);
      expect(track.status).toBe('vip');
      expect(track.coverUrl).toBe('http://imge.kugou.com/stdmusic/400/20170728/cover.jpg');
      expect(track.sourceUrl).toBe('https://www.kugou.com/song/#hash=B55FCC75168E0C8F3EB8AAD347911328');
    });

    it('normalizes playlist and appends preview restriction note when partial', () => {
      const playlist = normalizeKugouPlaylist({
        id: 'gcid_3zr52qfrzaz06a',
        listInfo: {
          name: '冷汐的私密歌单',
          list_create_username: '是冷汐呀',
          count: 124,
          heat: 83,
          intro: '我的私藏歌单',
        },
        tracks: [
          { index: 1, title: '借口', artists: ['周杰伦'] },
          { index: 2, title: '晴天', artists: ['周杰伦'] },
        ],
        isPartialPreview: true,
      });

      expect(playlist.platform).toBe('kugou');
      expect(playlist.name).toBe('冷汐的私密歌单');
      expect(playlist.creator).toBe('是冷汐呀');
      expect(playlist.trackCount).toBe(124);
      expect(playlist.tracks.length).toBe(2);
      expect(playlist.description).toContain('[平台限制提示]');
      expect(playlist.description).toContain('前 2 首预览');
      expect(playlist.description).toContain('共 124 首');
    });
  });

  describe('QR Code Authentication Flow', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('creates QR code session successfully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          error_code: 0,
          data: {
            qrcode: 'mock_qr_key_123',
            qrcode_img: 'data:image/png;base64,mockbase64',
          },
        }),
      } as Response);

      const session = await createKugouQrCode();
      expect(session.qrcode).toBe('mock_qr_key_123');
      expect(session.qrcodeImg).toBe('data:image/png;base64,mockbase64');
      expect(session.loginUrl).toContain('qrcode=mock_qr_key_123');
    });

    it('checks QR code status and maps states correctly', async () => {
      // Waiting
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 1,
          data: { status: 1 },
        }),
      } as Response);

      const res1 = await checkKugouQrCode('mock_qr_key');
      expect(res1.status).toBe('waiting');

      // Scanned
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 1,
          data: { status: 2 },
        }),
      } as Response);

      const res2 = await checkKugouQrCode('mock_qr_key');
      expect(res2.status).toBe('scanned');

      // Success
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 1,
          data: {
            status: 4,
            token: 'mock_token_abc',
            userid: 1425711902,
          },
        }),
      } as Response);

      const res3 = await checkKugouQrCode('mock_qr_key');
      expect(res3.status).toBe('success');
      expect(res3.token).toBe('mock_token_abc');
      expect(res3.userid).toBe('1425711902');
    });
  });

  describe('Cloudlist Identity Matching & Safety', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('does NOT match wrong playlist by count alone (prevents wrong playlist export)', async () => {
      // User owns Playlist A (100 tracks) and Playlist B (50 tracks)
      // User shares a link for Playlist C (100 tracks)
      // Because names do not match, it must NOT latch onto Playlist A just because count === 100
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_target_c","info":{"listinfo":{"name":"歌单 C","count":100},"songs":[{"name":"预览歌曲 1"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [
                { listid: 111, name: '歌单 A', count: 100 },
                { listid: 222, name: '歌单 B', count: 50 },
              ],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        { type: 'songlist', id: 'gcid_target_c', originalUrl: 'https://m.kugou.com/songlist/gcid_target_c/' },
        { token: 'mock_tok', userid: '12345' },
      );

      // Should fall back safely to preview mode (1 song), rather than mistakenly returning Playlist A!
      expect(playlist.name).toBe('歌单 C');
      expect(playlist.tracks).toHaveLength(1);
      expect(playlist.tracks[0].title).toBe('预览歌曲 1');
    });

    it('fails closed with INCOMPLETE_PLAYLIST when expected count (100) does not match retrieved count (2)', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_target_b","info":{"listinfo":{"name":"歌单 B","count":100,"list_create_userid":"12345"},"songs":[{"name":"预览"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists (Playlist B is 100 songs)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [
                { listid: 111, name: '歌单 A', count: 50 },
                { listid: 222, name: '歌单 B', count: 100 },
              ],
            },
          }),
        } as Response)
        // 3. fetchCloudlistAllTracks for listid 222 returns only 2 songs despite expecting 100
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              count: 2,
              info: [
                { name: '歌单B歌曲1', FileHash: 'hash1' },
                { name: '歌单B歌曲2', FileHash: 'hash2' },
              ],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      await expect(
        fetchKugouPlaylist(
          { type: 'songlist', id: 'gcid_target_b', originalUrl: 'https://m.kugou.com/songlist/gcid_target_b/' },
          { token: 'mock_tok', userid: '12345' },
        ),
      ).rejects.toThrowError(/Incomplete cloudlist/i);
    });

    it('matches exact playlist and returns full tracks when count matches expected and owner is confirmed', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_target_b","info":{"listinfo":{"name":"歌单 B","count":2,"list_create_userid":"12345"},"songs":[{"name":"预览"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists (Playlist B is 2 songs)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [
                { listid: 111, name: '歌单 A', count: 10 },
                { listid: 222, name: '歌单 B', count: 2 },
              ],
            },
          }),
        } as Response)
        // 3. fetchCloudlistAllTracks for listid 222 returns expected 2 songs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              count: 2,
              info: [
                { name: '歌单B歌曲1', FileHash: 'hash1' },
                { name: '歌单B歌曲2', FileHash: 'hash2' },
              ],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        { type: 'songlist', id: 'gcid_target_b', originalUrl: 'https://m.kugou.com/songlist/gcid_target_b/?uid=12345' },
        { token: 'mock_tok', userid: '12345' },
      );

      expect(playlist.name).toBe('歌单 B');
      expect(playlist.tracks).toHaveLength(2);
      expect(playlist.tracks[0].title).toBe('歌单B歌曲1');
      expect(playlist.tracks[1].title).toBe('歌单B歌曲2');
    });

    it('does NOT match user cloudlist by name when owner is unknown (owner unconfirmed -> Preview)', async () => {
      // H5 songlist has no creator userid in listinfo or URL.
      // Even though user has a playlist named "同名歌单" with 10 songs, it must NOT match!
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_unknown_owner","info":{"listinfo":{"name":"同名歌单","count":10},"songs":[{"name":"预览歌曲1"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [{ listid: 888, name: '同名歌单', count: 10 }],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        { type: 'songlist', id: 'gcid_unknown_owner', originalUrl: 'https://m.kugou.com/songlist/gcid_unknown_owner/' },
        { token: 'mock_tok', userid: '12345' },
      );

      // Must safely stay in preview mode (1 song), rather than guessing the user's cloudlist!
      expect(playlist.name).toBe('同名歌单');
      expect(playlist.tracks).toHaveLength(1);
      expect(playlist.tracks[0].title).toBe('预览歌曲1');
    });

    it('fails closed with INCOMPLETE_PLAYLIST when special/info fails and song API total is truncated', async () => {
      globalThis.fetch = vi.fn()
        // 1. special/info fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)
        // 2. special/song page 1: returns total: 900 and 300 songs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              total: 900,
              info: Array.from({ length: 300 }, (_, i) => ({
                name: `Song ${i + 1}`,
                FileHash: `hash_${i + 1}`,
              })),
            },
          }),
        } as Response)
        // 3. special/song page 2: returns 300 songs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              total: 900,
              info: Array.from({ length: 300 }, (_, i) => ({
                name: `Song ${i + 301}`,
                FileHash: `hash_${i + 301}`,
              })),
            },
          }),
        } as Response)
        // 4. special/song page 3: upstream network error (fails before reaching 900)
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      await expect(
        fetchKugouPlaylist({
          type: 'special',
          id: '546903',
          originalUrl: 'https://www.kugou.com/yy/special/single/546903.html',
        }),
      ).rejects.toThrowError(/Incomplete playlist: Kugou special playlist reported 900 songs, but only 600 could be retrieved/i);
    });

    it('does NOT match user cloudlist when H5 creator userid belongs to someone else (owner mismatch)', async () => {
      // H5 songlist was created by user 99999, but current logged-in user is 12345.
      // Even though user 12345 has a playlist named "我喜欢的音乐", it must NOT export user 12345's playlist!
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_target_other","info":{"listinfo":{"name":"我喜欢的音乐","count":50,"list_create_userid":"99999"},"songs":[{"name":"他人分享预览1"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        { type: 'songlist', id: 'gcid_target_other', originalUrl: 'https://m.kugou.com/songlist/gcid_target_other/?uid=99999' },
        { token: 'mock_tok', userid: '12345' },
      );

      // Must safely stay in preview mode!
      expect(playlist.name).toBe('我喜欢的音乐');
      expect(playlist.tracks).toHaveLength(1);
      expect(playlist.tracks[0].title).toBe('他人分享预览1');
    });

    it('falls back to preview mode instead of guessing when multiple same-name playlists do not match count', async () => {
      // Target playlist is "我的歌单" with 30 songs.
      // Logged in user has two "我的歌单", with 50 and 80 songs.
      // Neither matches 30, so code MUST NOT guess nameMatches[0]!
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_target_ambig","info":{"listinfo":{"name":"我的歌单","count":30},"songs":[{"name":"预览歌曲A"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [
                { listid: 101, name: '我的歌单', count: 50 },
                { listid: 102, name: '我的歌单', count: 80 },
              ],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        { type: 'songlist', id: 'gcid_target_ambig', originalUrl: 'https://m.kugou.com/songlist/gcid_target_ambig/' },
        { token: 'mock_tok', userid: '12345' },
      );

      // Must safely fall back to preview mode (1 song), rather than guessing listid 101 or 102!
      expect(playlist.name).toBe('我的歌单');
      expect(playlist.tracks).toHaveLength(1);
      expect(playlist.tracks[0].title).toBe('预览歌曲A');
    });

    it('adversarial: user-controlled URL uid must NOT prove ownership when H5 creator is missing', async () => {
      // Attacker constructs link with ?uid=12345 hoping server trusts ?uid=
      // H5 payload has no creator userid. Logged-in user is 12345 with matching name & count.
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_spoofed_uid","info":{"listinfo":{"name":"秘密歌单","count":50},"songs":[{"name":"预览1"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [{ listid: 777, name: '秘密歌单', count: 50 }],
            },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        {
          type: 'songlist',
          id: 'gcid_spoofed_uid',
          originalUrl: 'https://m.kugou.com/songlist/gcid_spoofed_uid/?uid=12345',
        },
        { token: 'valid_tok', userid: '12345' },
      );

      // Must NOT export user's 50 tracks! Must stay in preview mode with owner_unconfirmed.
      expect(playlist.retrieval?.mode).toBe('preview');
      expect(playlist.retrieval?.reason).toBe('owner_unconfirmed');
      expect(playlist.tracks).toHaveLength(1);
    });

    it('adversarial: pagination repeated-page replay must fail closed with INCOMPLETE_PLAYLIST', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_replay","info":{"listinfo":{"name":"重放测试歌单","count":600,"list_create_userid":"12345"},"songs":[{"name":"预览1"}]}};</script></html>`;

      const page1Songs = Array.from({ length: 300 }, (_, i) => ({
        name: `歌曲 ${i + 1}`,
        FileHash: `hash_${i + 1}`,
      }));

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [{ listid: 999, name: '重放测试歌单', count: 600 }],
            },
          }),
        } as Response)
        // 3. fetchCloudlistAllTracks page 1: returns 300 songs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 600, info: page1Songs },
          }),
        } as Response)
        // 4. fetchCloudlistAllTracks page 2: BUG/REPLAY - returns the exact same 300 songs as page 1
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 600, info: page1Songs },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      await expect(
        fetchKugouPlaylist(
          {
            type: 'songlist',
            id: 'gcid_replay',
            originalUrl: 'https://m.kugou.com/songlist/gcid_replay/',
          },
          { token: 'valid_tok', userid: '12345' },
        ),
      ).rejects.toThrowError(/duplicate page sequence/i);
    });

    it('preserves legitimate duplicate individual songs in cloudlist without dropping them', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_dups","info":{"listinfo":{"name":"重复单曲歌单","count":4,"list_create_userid":"12345"},"songs":[{"name":"预览1"}]}};</script></html>`;

      // Legitimate duplicate songs: same song added twice to playlist
      const cloudSongs = [
        { name: '晴天', FileHash: 'hash_qingtian' },
        { name: '晴天', FileHash: 'hash_qingtian' },
        { name: '七里香', FileHash: 'hash_qilixiang' },
        { name: '夜曲', FileHash: 'hash_yequ' },
      ];

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [{ listid: 888, name: '重复单曲歌单', count: 4 }],
            },
          }),
        } as Response)
        // 3. fetchCloudlistAllTracks
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 4, info: cloudSongs },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        {
          type: 'songlist',
          id: 'gcid_dups',
          originalUrl: 'https://m.kugou.com/songlist/gcid_dups/',
        },
        { token: 'valid_tok', userid: '12345' },
      );

      expect(playlist.retrieval?.mode).toBe('full');
      expect(playlist.tracks).toHaveLength(4);
      expect(playlist.tracks[0].title).toBe('晴天');
      expect(playlist.tracks[0].index).toBe(1);
      expect(playlist.tracks[1].title).toBe('晴天');
      expect(playlist.tracks[1].index).toBe(2);
      expect(playlist.tracks[2].title).toBe('七里香');
      expect(playlist.tracks[2].index).toBe(3);
      expect(playlist.tracks[3].title).toBe('夜曲');
      expect(playlist.tracks[3].index).toBe(4);
    });

    it('correctly handles >300 multi-page pagination (770 songs = 300 + 300 + 170) sequentially', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_770","info":{"listinfo":{"name":"超大歌单","count":770,"list_create_userid":"12345"},"songs":[{"name":"预览1"}]}};</script></html>`;

      const page1 = Array.from({ length: 300 }, (_, i) => ({
        name: `歌曲 ${i + 1}`,
        FileHash: `hash_${i + 1}`,
      }));
      const page2 = Array.from({ length: 300 }, (_, i) => ({
        name: `歌曲 ${i + 301}`,
        FileHash: `hash_${i + 301}`,
      }));
      const page3 = Array.from({ length: 170 }, (_, i) => ({
        name: `歌曲 ${i + 601}`,
        FileHash: `hash_${i + 601}`,
      }));

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: {
              info: [{ listid: 770, name: '超大歌单', count: 770 }],
            },
          }),
        } as Response)
        // 3. fetchCloudlistAllTracks page 1
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 770, info: page1 },
          }),
        } as Response)
        // 4. fetchCloudlistAllTracks page 2
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 770, info: page2 },
          }),
        } as Response)
        // 5. fetchCloudlistAllTracks page 3
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            data: { count: 770, info: page3 },
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        {
          type: 'songlist',
          id: 'gcid_770',
          originalUrl: 'https://m.kugou.com/songlist/gcid_770/',
        },
        { token: 'valid_tok', userid: '12345' },
      );

      expect(playlist.retrieval?.mode).toBe('full');
      expect(playlist.tracks).toHaveLength(770);
      expect(playlist.tracks[0].index).toBe(1);
      expect(playlist.tracks[0].title).toBe('歌曲 1');
      expect(playlist.tracks[299].index).toBe(300);
      expect(playlist.tracks[299].title).toBe('歌曲 300');
      expect(playlist.tracks[300].index).toBe(301);
      expect(playlist.tracks[300].title).toBe('歌曲 301');
      expect(playlist.tracks[599].index).toBe(600);
      expect(playlist.tracks[599].title).toBe('歌曲 600');
      expect(playlist.tracks[600].index).toBe(601);
      expect(playlist.tracks[600].title).toBe('歌曲 601');
      expect(playlist.tracks[769].index).toBe(770);
      expect(playlist.tracks[769].title).toBe('歌曲 770');

      // Verify no gaps or duplicates in indices
      playlist.tracks.forEach((track, i) => {
        expect(track.index).toBe(i + 1);
      });
    });

    it('returns preview with auth_required when credentials are not supplied', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_no_auth","info":{"listinfo":{"name":"公开歌单","count":100},"songs":[{"name":"预览歌曲1"}]}};</script></html>`;

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist({
        type: 'songlist',
        id: 'gcid_no_auth',
        originalUrl: 'https://m.kugou.com/songlist/gcid_no_auth/',
      });

      expect(playlist.retrieval?.mode).toBe('preview');
      expect(playlist.retrieval?.reason).toBe('auth_required');
      expect(playlist.tracks).toHaveLength(1);
    });

    it('returns preview with auth_invalid when Kugou API returns authentication error', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_exp_token","info":{"listinfo":{"name":"我的歌单","count":100,"list_create_userid":"12345"},"songs":[{"name":"预览歌曲1"}]}};</script></html>`;

      globalThis.fetch = vi.fn()
        // 1. fetchSonglistH5Output
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        // 2. fetchKugouUserPlaylists returns error code 20001 (Token expired/invalid)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 0,
            error_code: 20001,
            error: 'User token invalid',
          }),
        } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        {
          type: 'songlist',
          id: 'gcid_exp_token',
          originalUrl: 'https://m.kugou.com/songlist/gcid_exp_token/',
        },
        { token: 'expired_token', userid: '12345' },
      );

      expect(playlist.retrieval?.mode).toBe('preview');
      expect(playlist.retrieval?.reason).toBe('auth_invalid');
      expect(playlist.tracks).toHaveLength(1);
    });

    it('returns preview with owner_mismatch when logged-in user does not match H5 creator', async () => {
      const mockHtml = `<html><script>window.$output = {"encode_gic":"gcid_mismatch","info":{"listinfo":{"name":"他人歌单","count":50,"list_create_userid":"99999"},"songs":[{"name":"预览歌曲1"}]}};</script></html>`;

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const { fetchKugouPlaylist } = await import('./client');
      const playlist = await fetchKugouPlaylist(
        {
          type: 'songlist',
          id: 'gcid_mismatch',
          originalUrl: 'https://m.kugou.com/songlist/gcid_mismatch/',
        },
        { token: 'valid_token', userid: '12345' },
      );

      expect(playlist.retrieval?.mode).toBe('preview');
      expect(playlist.retrieval?.reason).toBe('owner_mismatch');
      expect(playlist.tracks).toHaveLength(1);
    });
  });
});
