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
});
