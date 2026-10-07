import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  extractQQPlaylistId,
  extractQQPlaylistIdAsync,
  isQQShortLink,
  matchesQQMusicInput,
  resolveQQShortLinkIfNeeded,
} from './input';
import {
  normalizeCYQQResponse,
  normalizeMusicUResponse,
  normalizeQQTrack,
} from './normalize';
import { ProviderError } from '../../models/playlist';

import sampleCdlist from './fixtures/sample-cdlist.json';
import sampleMusicu from './fixtures/sample-musicu.json';
import sampleMalformed from './fixtures/sample-malformed.json';

describe('QQ Music Input Validation & Parsing', () => {
  it('extracts ID from standard web URL', () => {
    expect(extractQQPlaylistId('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe('9044196528');
  });

  it('extracts ID from standard web URL with query params and hash', () => {
    expect(
      extractQQPlaylistId('https://y.qq.com/n/ryqq/playlist/9044196528?from=share&uin=123#track1'),
    ).toBe('9044196528');
  });

  it('extracts ID from direct numeric string', () => {
    expect(extractQQPlaylistId('9044196528')).toBe('9044196528');
    expect(extractQQPlaylistId('4177812546')).toBe('4177812546');
  });

  it('extracts ID from mobile share link (taoge.html?id=...)', () => {
    expect(
      extractQQPlaylistId('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528&hosteuin='),
    ).toBe('9044196528');
  });

  it('extracts ID from modern web v2 URL (ryqq_v2)', () => {
    expect(
      extractQQPlaylistId(
        'https://y.qq.com/n/ryqq_v2/playlist/9044196528?ADTAG=h5_share_playlist&redirecttag=mn.redirect.custom&mnst=0.83',
      ),
    ).toBe('9044196528');
  });

  it('extracts ID from mobile WeChat share URL (details/playlist.html)', () => {
    expect(
      extractQQPlaylistId(
        'https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx',
      ),
    ).toBe('9044196528');
  });

  it('extracts ID from legacy HTML and playsquare paths', () => {
    expect(extractQQPlaylistId('https://y.qq.com/n/yqq/playlist/9044196528.html')).toBe('9044196528');
    expect(extractQQPlaylistId('https://y.qq.com/n/ryqq/playsquare/9044196528')).toBe('9044196528');
    expect(extractQQPlaylistId('https://y.qq.com/w/taoge.html?id=9044196528')).toBe('9044196528');
    expect(extractQQPlaylistId('https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=9044196528')).toBe('9044196528');
  });

  it('handles surrounding whitespace gracefully', () => {
    expect(extractQQPlaylistId('  https://y.qq.com/n/ryqq/playlist/9044196528  \n')).toBe('9044196528');
    expect(extractQQPlaylistId('   9044196528   ')).toBe('9044196528');
  });

  it('matches valid QQ Music inputs correctly', () => {
    expect(matchesQQMusicInput('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://y.qq.com/n/ryqq_v2/playlist/9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://i2.y.qq.com/n3/other/pages/details/playlist.html?id=9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://music.qq.com/playlist/9044196528')).toBe(true);
    expect(matchesQQMusicInput('9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://music.163.com/playlist?id=123456')).toBe(false);
    expect(matchesQQMusicInput('https://example.com/playlist/9044196528')).toBe(false);
    expect(matchesQQMusicInput('not a url')).toBe(false);
  });

  it('rejects unsupported domain with UNSUPPORTED_URL error', () => {
    expect(() => extractQQPlaylistId('https://music.163.com/playlist?id=9044196528')).toThrowError(
      ProviderError,
    );
    try {
      extractQQPlaylistId('https://music.163.com/playlist?id=9044196528');
    } catch (err) {
      expect((err as ProviderError).code).toBe('UNSUPPORTED_URL');
      expect((err as ProviderError).statusCode).toBe(400);
    }
  });

  it('rejects unrelated URLs with numbers', () => {
    expect(() => extractQQPlaylistId('https://example.com/article/12345678')).toThrowError(
      ProviderError,
    );
  });

  it('rejects empty input or whitespace', () => {
    expect(() => extractQQPlaylistId('')).toThrowError(ProviderError);
    expect(() => extractQQPlaylistId('   ')).toThrowError(ProviderError);
  });

  it('rejects excessively long inputs (> 2048 chars)', () => {
    const longString = 'https://y.qq.com/n/ryqq/playlist/' + '1'.repeat(2100);
    expect(() => extractQQPlaylistId(longString)).toThrowError(ProviderError);
    try {
      extractQQPlaylistId(longString);
    } catch (err) {
      expect((err as ProviderError).code).toBe('INVALID_INPUT');
    }
  });
});

describe('QQ Music Short Link Resolution & Async Parsing', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('correctly identifies QQ Music short links', () => {
    expect(isQQShortLink('https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI')).toBe(true);
    expect(isQQShortLink('c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI')).toBe(true);
    expect(isQQShortLink('http://c.y.qq.com/base/fcgi-bin/u?__=xyz123')).toBe(true);
    expect(isQQShortLink('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe(false);
    expect(isQQShortLink('https://163cn.tv/bhsHbRfW')).toBe(false);
  });

  it('resolves short link via HTTP redirect location', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: 'https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540&hosteuin=test',
      }),
    });

    const resolved = await resolveQQShortLinkIfNeeded('https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI');
    expect(resolved).toContain('taoge.html?id=9138517540');
  });

  it('extracts playlist ID asynchronously from short link', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: 'https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540&hosteuin=test',
      }),
    });

    const id = await extractQQPlaylistIdAsync('https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI');
    expect(id).toBe('9138517540');
  });

  it('extracts playlist ID asynchronously from share text with short link', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: 'https://i.y.qq.com/n2/m/share/details/taoge.html?id=9138517540',
      }),
    });

    const text = '【歌单】这首歌真的好听 https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI 来自QQ音乐';
    const id = await extractQQPlaylistIdAsync(text);
    expect(id).toBe('9138517540');
  });

  it('blocks SSRF redirects to unauthorized hosts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: 'https://malicious.evil.com/taoge.html?id=9138517540',
      }),
    });

    await expect(
      resolveQQShortLinkIfNeeded('https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI')
    ).rejects.toThrowError(ProviderError);
  });
});

describe('QQ Music Normalization (Fixtures)', () => {
  it('normalizes compact QQ release dates and modern zero-based disc indexes', () => {
    const track = normalizeQQTrack(
      {
        songmid: '003TESTMID',
        songname: 'Metadata Test',
        singer: [{ name: 'Test Artist' }],
        album: { name: 'Test Album', time_public: '20210119' },
        interval: 240,
        index_album: 7,
        index_cd: 0,
        mv: { vid: 'm001testvid' },
      },
      1,
    );

    expect(track.releaseDate).toBe('2021-01-19');
    expect(track.trackNumber).toBe(7);
    expect(track.discNumber).toBe(1);
    expect(track.mvId).toBe('m001testvid');
    expect(track.mvUrl).toBe('https://y.qq.com/n/ryqq/mv/m001testvid');
  });

  it('normalizes primary c.y.qq.com response correctly', () => {
    const playlist = normalizeCYQQResponse(sampleCdlist, '9044196528');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9044196528');
    expect(playlist.name).toBe('测试歌单 (Test Playlist)');
    expect(playlist.creator).toBe('音乐达人');
    expect(playlist.coverUrl).toBe('https://qpic.y.qq.com/music_cover/test/300?n=1');
    expect(playlist.trackCount).toBe(5);
    expect(playlist.tracks).toHaveLength(5);
    expect(playlist.createTime).toBe(1696904605);
    expect(playlist.updateTime).toBe(1771679922);
    expect(playlist.description).toBe('这是一个测试歌单');
    expect(playlist.tags).toEqual(['民谣', '流行']);
    expect(playlist.playCount).toBe(10516);
    expect(playlist.sourceUrl).toBe('https://y.qq.com/n/ryqq/playlist/9044196528');

    // Track 1: Single artist
    const t1 = playlist.tracks[0];
    expect(t1.index).toBe(1);
    expect(t1.title).toBe('晴天');
    expect(t1.artist).toBe('周杰伦');
    expect(t1.album).toBe('叶惠美');
    expect(t1.durationMs).toBe(269000);
    expect(t1.sourceUrl).toBe('https://y.qq.com/n/ryqq/songDetail/001abc');
    expect(t1.coverUrl).toBe('https://y.gtimg.cn/music/photo_new/T002R300x300M000003ALB.jpg');

    // Track 2: Multi-artist (Korean Unicode)
    const t2 = playlist.tracks[1];
    expect(t2.index).toBe(2);
    expect(t2.title).toBe('Not Available');
    expect(t2.artist).toBe('YOUNGJOO, HAON (김하온)');
    expect(t2.album).toBe('하우스 오브 걸스');
    expect(t2.durationMs).toBe(185000);

    // Track 3: English and punctuation
    const t3 = playlist.tracks[2];
    expect(t3.index).toBe(3);
    expect(t3.title).toBe('Shape of You');
    expect(t3.artist).toBe('Ed Sheeran');
    expect(t3.album).toBe('÷ (Deluxe)');

    // Track 4: Japanese
    const t4 = playlist.tracks[3];
    expect(t4.index).toBe(4);
    expect(t4.title).toBe('Lemon');
    expect(t4.artist).toBe('米津玄師');

    // Track 5: Missing album & emoji
    const t5 = playlist.tracks[4];
    expect(t5.index).toBe(5);
    expect(t5.title).toBe('No Album Track 🎶');
    expect(t5.artist).toBe('Various Artists');
    expect(t5.album).toBeUndefined();
    expect(t5.coverUrl).toBeUndefined();
  });

  it('normalizes fallback musicu response correctly', () => {
    const playlist = normalizeMusicUResponse(sampleMusicu, '9044196528');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9044196528');
    expect(playlist.name).toBe('备用测试歌单');
    expect(playlist.creator).toBe('备用作者');
    expect(playlist.coverUrl).toBe('https://qpic.y.qq.com/music_cover/alt/300?n=1');
    expect(playlist.trackCount).toBe(2);
    expect(playlist.tracks[0].title).toBe('稻香');
    expect(playlist.tracks[0].artist).toBe('周杰伦');
    expect(playlist.tracks[0].album).toBe('魔杰座');
    expect(playlist.tracks[1].title).toBe('夜曲');
  });
});

describe('QQ Music Upstream Error & Malformed Response Handling', () => {
  it('throws PLAYLIST_NOT_FOUND when upstream returns non-zero not found code', () => {
    expect(() => normalizeCYQQResponse(sampleMalformed, '9999999999')).toThrowError(ProviderError);
    try {
      normalizeCYQQResponse(sampleMalformed, '9999999999');
    } catch (err) {
      expect((err as ProviderError).code).toBe('PLAYLIST_NOT_FOUND');
      expect((err as ProviderError).statusCode).toBe(404);
    }
  });

  it('throws PARSE_ERROR when upstream returns empty or invalid object', () => {
    expect(() => normalizeCYQQResponse({} as any, '123')).toThrowError(ProviderError);
    expect(() => normalizeCYQQResponse(null as any, '123')).toThrowError(ProviderError);
  });

  it('throws PARSE_ERROR when song is missing a title', () => {
    expect(() =>
      normalizeQQTrack(
        {
          songid: 999,
          songname: '',
          singer: [{ name: 'Artist' }],
        },
        1,
      ),
    ).toThrowError(ProviderError);

    try {
      normalizeQQTrack({ songid: 999, songname: '' }, 1);
    } catch (err) {
      expect((err as ProviderError).code).toBe('PARSE_ERROR');
    }
  });

  it('correctly classifies overseas geo-restricted tracks as normal playable domestically and detects VIP', () => {
    const geoTrack = normalizeQQTrack(
      {
        songid: 100,
        songname: '大陆专属歌曲',
        singer: [{ name: '歌手' }],
        alertid: 2,
      },
      1,
    );
    expect(geoTrack.status).toBe('playable');
    expect(geoTrack.statusText).toBe('正常');
    expect(geoTrack.isAvailable).toBe(true);
    expect(geoTrack.isVip).toBe(false);

    const vipTrack = normalizeQQTrack(
      {
        songid: 102,
        songname: 'VIP 歌曲',
        singer: [{ name: '歌手' }],
        pay: { payplay: 1 },
      },
      2,
    );
    expect(vipTrack.status).toBe('vip');
    expect(vipTrack.isVip).toBe(true);
    expect(vipTrack.isAvailable).toBe(true);

    // alertid 41: VIP prompt ("开通绿钻会员即可收听完整版") must NOT be treated as unplayable
    const vipAlert41Track = normalizeQQTrack(
      {
        songid: 103,
        songname: '白鸽',
        singer: [{ name: '羊羊' }],
        pay: { payplay: 1, paydownload: 1, paytrackmouth: 1 },
        alertid: 41,
        msgid: 13,
      },
      3,
    );
    expect(vipAlert41Track.status).toBe('vip');
    expect(vipAlert41Track.statusText).toBe('VIP专享');
    expect(vipAlert41Track.isVip).toBe(true);
    expect(vipAlert41Track.isAvailable).toBe(true);

    // Paid digital album tracks require purchase, not VIP alone
    const paidAlbumTrack = normalizeQQTrack(
      {
        songid: 104,
        songname: '付费专辑单曲',
        singer: [{ name: '歌手' }],
        pay: { payalbum: 1, payplay: 1 },
      },
      4,
    );
    expect(paidAlbumTrack.status).toBe('paid');
    expect(paidAlbumTrack.statusText).toBe('付费专辑');
    expect(paidAlbumTrack.isVip).toBe(false);
    expect(paidAlbumTrack.isAvailable).toBe(true);

    // Free standard stream with VIP download (payplay: 0, paydownload: 1)
    const freeStreamVipDownloadTrack = normalizeQQTrack(
      {
        songid: 105,
        songname: '呼吸决定',
        singer: [{ name: 'Fine乐团' }],
        pay: { payplay: 0, paydownload: 1, paytrackmouth: 1 },
        alertid: 2,
        msgid: 14,
      },
      5,
    );
    expect(freeStreamVipDownloadTrack.status).toBe('playable');
    expect(freeStreamVipDownloadTrack.statusText).toBe('正常');
    expect(freeStreamVipDownloadTrack.isVip).toBe(false);
    expect(freeStreamVipDownloadTrack.isAvailable).toBe(true);

    // Truly unplayable: takedown alert 11 & msgid 0
    const unplayableTrack = normalizeQQTrack(
      {
        songid: 101,
        songname: '下架歌曲',
        singer: [{ name: '歌手' }],
        alertid: 11,
        msgid: 0,
      },
      6,
    );
    expect(unplayableTrack.status).toBe('unplayable');
    expect(unplayableTrack.statusText).toBe('下架/无版权');
    expect(unplayableTrack.isVip).toBe(false);
    expect(unplayableTrack.isAvailable).toBe(false);

    // Truly unplayable: zero audio sizes
    const zeroSizeTrack = normalizeQQTrack(
      {
        songid: 106,
        songname: '无音频文件歌曲',
        singer: [{ name: '歌手' }],
        size128: 0,
        size320: 0,
        sizeflac: 0,
      },
      7,
    );
    expect(zeroSizeTrack.status).toBe('unplayable');
    expect(zeroSizeTrack.statusText).toBe('下架/无版权');
    expect(zeroSizeTrack.isVip).toBe(false);
    expect(zeroSizeTrack.isAvailable).toBe(false);

    // Modern VIP track: bit 1 in action.icons is 1 (icons: 9060350)
    const vipBit1Track = normalizeQQTrack(
      {
        songid: 107,
        songmid: '0049i6VB00nf0f',
        songname: '내가 사랑해도 괜찮을까요',
        singer: [{ name: '재연' }],
        pay: { pay_play: 0, pay_down: 0 },
        action: { icons: 9060350 }, // (9060350 >> 1) & 1 === 1
        file: {
          size_128mp3: 3717737,
          size_320mp3: 9293730,
          size_flac: 25379623,
        },
      },
      8,
    );
    expect(vipBit1Track.status).toBe('vip');
    expect(vipBit1Track.statusText).toBe('VIP专享');
    expect(vipBit1Track.isVip).toBe(true);
    expect(vipBit1Track.isAvailable).toBe(true);
    expect(vipBit1Track.maxQuality).toBe('FLAC');

    // Modern VIP track: bit 18 in action.icons is 1 (icons: 12992510)
    const vipBit18Track = normalizeQQTrack(
      {
        songid: 108,
        songmid: '003her012345',
        songname: 'Cry For Me',
        singer: [{ name: 'Ami' }],
        pay: { pay_play: 1, pay_down: 1 },
        action: { icons: 12992510 }, // (12992510 >> 18) & 1 === 1
        file: {
          size_128mp3: 3000000,
          size_320mp3: 8000000,
        },
      },
      9,
    );
    expect(vipBit18Track.status).toBe('vip');
    expect(vipBit18Track.statusText).toBe('VIP专享');
    expect(vipBit18Track.isVip).toBe(true);
    expect(vipBit18Track.isAvailable).toBe(true);
    expect(vipBit18Track.maxQuality).toBe('320kbps');

    // Non-VIP tracks with non-VIP icons (e.g. 9060220, 528968, 8535932)
    const freeTrack9060220 = normalizeQQTrack(
      {
        songid: 109,
        songname: '우리 얘기 좀 해',
        singer: [{ name: '타코앤제이형' }],
        action: { icons: 9060220 }, // bit 1 and bit 18 are 0
      },
      10,
    );
    expect(freeTrack9060220.status).toBe('playable');
    expect(freeTrack9060220.statusText).toBe('正常');
    expect(freeTrack9060220.isVip).toBe(false);
    expect(freeTrack9060220.isAvailable).toBe(true);

    const freeTrack528968 = normalizeQQTrack(
      {
        songid: 110,
        songname: '한글송',
        singer: [{ name: '群星' }],
        action: { icons: 528968 }, // bit 1 and bit 18 are 0
      },
      11,
    );
    expect(freeTrack528968.status).toBe('playable');
    expect(freeTrack528968.statusText).toBe('正常');
    expect(freeTrack528968.isVip).toBe(false);
    expect(freeTrack528968.isAvailable).toBe(true);

    const freeTrack8535932 = normalizeQQTrack(
      {
        songid: 111,
        songname: '耳わほう',
        singer: [{ name: '群星' }],
        action: { icons: 8535932, alert: 2 }, // bit 1 and bit 18 are 0
        pay: { pay_play: 0, pay_down: 1 },
      },
      12,
    );
    expect(freeTrack8535932.status).toBe('playable');
    expect(freeTrack8535932.statusText).toBe('正常');
    expect(freeTrack8535932.isVip).toBe(false);
    expect(freeTrack8535932.isAvailable).toBe(true);
  });
});
