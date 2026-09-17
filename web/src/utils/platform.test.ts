import { describe, it, expect } from 'vitest';
import { getPlatformConfig, getPlatformPlaylistUrl } from './platform';

describe('platform utilities and defensive URL resolution', () => {
  it('returns full URL unchanged if id or sourceUrl is already a full URL (no double concatenation)', () => {
    // Crucial bug prevention test: https://y.qq.com/n/ryqq/playlist/https://163cn.tv/bgx9GaCN
    expect(getPlatformPlaylistUrl('qqmusic', 'https://163cn.tv/bgx9GaCN')).toBe('https://163cn.tv/bgx9GaCN');
    expect(getPlatformPlaylistUrl('qqmusic', 'http://example.com/playlist')).toBe('http://example.com/playlist');
    expect(getPlatformPlaylistUrl('qqmusic', '9044196528')).toBe('https://y.qq.com/n/ryqq/playlist/9044196528');

    expect(getPlatformPlaylistUrl('netease', 'https://163cn.tv/bgx9GaCN')).toBe('https://163cn.tv/bgx9GaCN');
    expect(getPlatformPlaylistUrl('netease', '2756674066')).toBe('https://music.163.com/#/playlist?id=2756674066');

    expect(getPlatformPlaylistUrl('qishui', 'https://qishui.douyin.com/s/iXHhKHhY/')).toBe('https://qishui.douyin.com/s/iXHhKHhY/');
    expect(getPlatformPlaylistUrl('qishui', '7435123456')).toBe('https://music.douyin.com/qishui/share/playlist?playlist_id=7435123456');

    expect(getPlatformPlaylistUrl('kugou', 'https://m.kugou.com/songlist/gcid_123/')).toBe('https://m.kugou.com/songlist/gcid_123/');
  });

  it('prefers sourceUrl when valid URL is supplied', () => {
    expect(getPlatformPlaylistUrl('qqmusic', '9044196528', 'https://y.qq.com/custom/url')).toBe('https://y.qq.com/custom/url');
    expect(getPlatformPlaylistUrl('netease', '2756674066', 'https://music.163.com/#/custom')).toBe('https://music.163.com/#/custom');
  });

  it('provides correct brand colors and metadata for all supported platforms', () => {
    expect(getPlatformConfig('qqmusic').color).toBe('green');
    expect(getPlatformConfig('netease').color).toBe('red');
    expect(getPlatformConfig('qishui').color).toBe('lime');
    expect(getPlatformConfig('kugou').color).toBe('blue');
  });
});
