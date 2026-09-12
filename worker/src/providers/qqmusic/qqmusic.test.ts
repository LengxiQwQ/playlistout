import { describe, it, expect } from 'vitest';
import { extractQQPlaylistId, matchesQQMusicInput } from './input';
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

  it('handles surrounding whitespace gracefully', () => {
    expect(extractQQPlaylistId('  https://y.qq.com/n/ryqq/playlist/9044196528  \n')).toBe('9044196528');
    expect(extractQQPlaylistId('   9044196528   ')).toBe('9044196528');
  });

  it('matches valid QQ Music inputs correctly', () => {
    expect(matchesQQMusicInput('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe(true);
    expect(matchesQQMusicInput('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528')).toBe(true);
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

describe('QQ Music Normalization (Fixtures)', () => {
  it('normalizes primary c.y.qq.com response correctly', () => {
    const playlist = normalizeCYQQResponse(sampleCdlist, '9044196528');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9044196528');
    expect(playlist.name).toBe('测试歌单 (Test Playlist)');
    expect(playlist.creator).toBe('音乐达人');
    expect(playlist.coverUrl).toBe('https://qpic.y.qq.com/music_cover/test/300?n=1');
    expect(playlist.trackCount).toBe(5);
    expect(playlist.tracks).toHaveLength(5);

    // Track 1: Single artist
    const t1 = playlist.tracks[0];
    expect(t1.index).toBe(1);
    expect(t1.title).toBe('晴天');
    expect(t1.artists).toEqual(['周杰伦']);
    expect(t1.album).toBe('叶惠美');
    expect(t1.durationMs).toBe(269000);
    expect(t1.sourceUrl).toBe('https://y.qq.com/n/ryqq/songDetail/001abc');

    // Track 2: Multi-artist (Korean Unicode)
    const t2 = playlist.tracks[1];
    expect(t2.index).toBe(2);
    expect(t2.title).toBe('Not Available');
    expect(t2.artists).toEqual(['YOUNGJOO', 'HAON (김하온)']);
    expect(t2.album).toBe('하우스 오브 걸스');
    expect(t2.durationMs).toBe(185000);

    // Track 3: English and punctuation
    const t3 = playlist.tracks[2];
    expect(t3.index).toBe(3);
    expect(t3.title).toBe('Shape of You');
    expect(t3.artists).toEqual(['Ed Sheeran']);
    expect(t3.album).toBe('÷ (Deluxe)');

    // Track 4: Japanese
    const t4 = playlist.tracks[3];
    expect(t4.index).toBe(4);
    expect(t4.title).toBe('Lemon');
    expect(t4.artists).toEqual(['米津玄師']);

    // Track 5: Missing album & emoji
    const t5 = playlist.tracks[4];
    expect(t5.index).toBe(5);
    expect(t5.title).toBe('No Album Track 🎶');
    expect(t5.artists).toEqual(['Various Artists']);
    expect(t5.album).toBeUndefined();
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
    expect(playlist.tracks[0].artists).toEqual(['周杰伦']);
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
});
