import { describe, it, expect } from 'vitest';
import { validatePlaylistInput } from './validation';
import { getFriendlyErrorMessage } from './errors';
import { formatDuration } from './format';

describe('Client-Side Input Validation', () => {
  it('validates QQ Music web playlist URLs', () => {
    expect(validatePlaylistInput('https://y.qq.com/n/ryqq/playlist/9044196528').valid).toBe(true);
    expect(validatePlaylistInput('http://y.qq.com/n/ryqq/playlist/12345').valid).toBe(true);
  });

  it('validates mobile share taoge URLs', () => {
    expect(
      validatePlaylistInput('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528').valid,
    ).toBe(true);
  });

  it('validates raw numeric playlist IDs and QQ numbers', () => {
    const res1 = validatePlaylistInput('9044196528');
    expect(res1.valid).toBe(true);
    expect(res1.kind).toBe('numeric');
    expect(res1.extractedUin).toBe('9044196528');

    const res2 = validatePlaylistInput('10001');
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('numeric');
    expect(res2.extractedUin).toBe('10001');
  });

  it('validates QQ Music user profile URLs and extracts uin', () => {
    const res = validatePlaylistInput('https://y.qq.com/portal/profile.html?uin=10001');
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('user_profile_url');
    expect(res.extractedUin).toBe('10001');

    const res2 = validatePlaylistInput('https://y.qq.com/n/ryqq/profile/like/song?uin=12345678');
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('user_profile_url');
    expect(res2.extractedUin).toBe('12345678');
  });

  it('rejects empty or whitespace input', () => {
    const res1 = validatePlaylistInput('');
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('请输入歌单链接');

    const res2 = validatePlaylistInput('   ');
    expect(res2.valid).toBe(false);
  });

  it('rejects input exceeding 2048 characters', () => {
    const longInput = 'https://y.qq.com/n/ryqq/playlist/' + '1'.repeat(2100);
    const res = validatePlaylistInput(longInput);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('输入内容过长');
  });

  it('rejects other platforms with friendly notification', () => {
    const res1 = validatePlaylistInput('https://music.163.com/playlist?id=12345');
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('仅支持 QQ 音乐');

    const res2 = validatePlaylistInput('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('仅支持 QQ 音乐');
  });

  it('rejects completely invalid arbitrary text or URLs', () => {
    const res = validatePlaylistInput('https://example.com/not-music');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('有效的 QQ 音乐歌单链接');
  });
});

describe('Error Code Mapping', () => {
  it('maps known error codes to friendly messages', () => {
    expect(getFriendlyErrorMessage('INVALID_INPUT')).toContain('输入链接格式不正确');
    expect(getFriendlyErrorMessage('UNSUPPORTED_URL')).toContain('仅支持 QQ 音乐');
    expect(getFriendlyErrorMessage('PLAYLIST_NOT_FOUND')).toContain('未找到该歌单');
    expect(getFriendlyErrorMessage('INCOMPLETE_PLAYLIST')).toContain('严格完整性保障');
    expect(getFriendlyErrorMessage('UPSTREAM_TIMEOUT')).toContain('超时');
    expect(getFriendlyErrorMessage('UPSTREAM_ERROR')).toContain('响应异常');
  });

  it('uses fallback message when code is unknown', () => {
    expect(getFriendlyErrorMessage('UNKNOWN_CODE', '自定义错误')).toBe('自定义错误');
    expect(getFriendlyErrorMessage(undefined)).toContain('解析歌单失败');
  });
});

describe('Duration Formatting', () => {
  it('formats milliseconds to mm:ss', () => {
    expect(formatDuration(180000)).toBe('3:00');
    expect(formatDuration(215000)).toBe('3:35');
    expect(formatDuration(65000)).toBe('1:05');
  });

  it('handles missing or zero durations with dash', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(0)).toBe('—');
  });
});
