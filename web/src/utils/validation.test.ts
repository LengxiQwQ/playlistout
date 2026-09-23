import { describe, it, expect } from 'vitest';
import { validatePlaylistInput, extractCleanUrlOrInput } from './validation';
import { getFriendlyErrorMessage } from './errors';
import { formatDuration } from './format';

describe('Client-Side Input Validation', () => {
  it('validates QQ Music web playlist URLs', () => {
    expect(validatePlaylistInput('https://y.qq.com/n/ryqq/playlist/9044196528').valid).toBe(true);
    expect(validatePlaylistInput('http://y.qq.com/n/ryqq/playlist/12345').valid).toBe(true);
    const resV2 = validatePlaylistInput('https://y.qq.com/n/ryqq_v2/playlist/9044196528?ADTAG=h5_share_playlist');
    expect(resV2.valid).toBe(true);
    expect(resV2.kind).toBe('single_playlist_url');
    expect(resV2.platform).toBe('qqmusic');
  });

  it('validates mobile share taoge and details/playlist URLs', () => {
    expect(
      validatePlaylistInput('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528').valid,
    ).toBe(true);

    const resWx = validatePlaylistInput(
      'https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx',
    );
    expect(resWx.valid).toBe(true);
    expect(resWx.kind).toBe('single_playlist_url');
    expect(resWx.platform).toBe('qqmusic');
  });

  it('does not falsely classify playlist URL with sharer uin as user profile', () => {
    const res = validatePlaylistInput('https://y.qq.com/n/ryqq/playlist/9044196528?uin=12345678');
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('single_playlist_url');
    expect(res.platform).toBe('qqmusic');
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

  it('accepts NetEase playlist and profile URLs as valid', () => {
    const res1 = validatePlaylistInput('https://music.163.com/playlist?id=2756674066');
    expect(res1.valid).toBe(true);
    expect(res1.kind).toBe('single_playlist_url');
    expect(res1.platform).toBe('netease');

    const res2 = validatePlaylistInput('https://163cn.tv/bgpHWLfw');
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('short_link');

    const res3 = validatePlaylistInput('https://music.163.com/user/home?id=1825474783');
    expect(res3.valid).toBe(true);
    expect(res3.kind).toBe('user_profile_url');
    expect(res3.extractedUin).toBe('1825474783');
  });

  it('accepts Kugou playlist URLs and short links as valid', () => {
    const res1 = validatePlaylistInput('https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/?src_cid=3zr52qfrzaz06a&uid=1425711902');
    expect(res1.valid).toBe(true);
    expect(res1.kind).toBe('single_playlist_url');
    expect(res1.platform).toBe('kugou');

    const res2 = validatePlaylistInput('https://t1.kugou.com/abcdef');
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('short_link');
    expect(res2.platform).toBe('kugou');

    const res3 = validatePlaylistInput('gcid_3zr52qfrzaz06a');
    expect(res3.valid).toBe(true);
    expect(res3.kind).toBe('single_playlist_url');
    expect(res3.platform).toBe('kugou');
  });

  it('accepts Qishui playlist URLs and short links as valid', () => {
    const res1 = validatePlaylistInput('https://qishui.douyin.com/s/iXHhmCAW/');
    expect(res1.valid).toBe(true);
    expect(res1.kind).toBe('short_link');
    expect(res1.platform).toBe('qishui');

    const res2 = validatePlaylistInput(
      'https://music.douyin.com/qishui/share/playlist?playlist_id=7087507348697186339',
    );
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('single_playlist_url');
    expect(res2.platform).toBe('qishui');

    const res3 = validatePlaylistInput('7087507348697186339');
    expect(res3.valid).toBe(true);
    expect(res3.kind).toBe('numeric');
  });

  it('rejects other platforms with friendly notification', () => {
    const res1 = validatePlaylistInput('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('支持 QQ 音乐、网易云音乐、酷狗音乐与汽水音乐');

    const res2 = validatePlaylistInput('https://www.kuwo.cn/playlist_detail/123');
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('支持 QQ 音乐、网易云音乐、酷狗音乐与汽水音乐');
  });

  it('rejects completely invalid arbitrary text or URLs', () => {
    const res = validatePlaylistInput('https://example.com/not-music');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('有效的 QQ 音乐、网易云音乐、酷狗音乐或汽水音乐歌单链接');
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

describe('Share Text URL Auto-Cleaning (extractCleanUrlOrInput)', () => {
  const example1 = '歌单｜钢琴流行曲999首：轻音乐钢琴曲｜钢琴纯音乐放松大脑缓解焦虑 https://qishui.douyin.com/s/iXHhKHhY/ @汽水音乐';
  const example2 = '歌单｜抖音收藏的音乐 https://qishui.douyin.com/s/iXHhmCAW/ @汽水音乐';
  const example3 = '发现一个很不错的歌单哦《测试大量歌单》你也来听听吧!（来自 @酷狗音乐 海量曲库，极致音质）https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1';
  const example4 = '发现一个很不错的歌单哦《是冷汐呀喜欢的音乐》你也来听听吧!（来自 @酷狗音乐 海量曲库，极致音质）https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1';
  const example5 = '【推荐】来自网易云音乐的是冷汐呀233 听过2984首歌，拥有11位粉丝 https://163cn.tv/bgpHWLfw';
  const example6 = '分享歌单: 是冷汐呀233喜欢的音乐 是冷汐呀233 https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783';

  it('extracts exact URLs from all 6 real-world platform share text samples', () => {
    expect(extractCleanUrlOrInput(example1)).toBe('https://qishui.douyin.com/s/iXHhKHhY/');
    expect(extractCleanUrlOrInput(example2)).toBe('https://qishui.douyin.com/s/iXHhmCAW/');
    expect(extractCleanUrlOrInput(example3)).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1',
    );
    expect(extractCleanUrlOrInput(example4)).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
    );
    expect(extractCleanUrlOrInput(example5)).toBe('https://163cn.tv/bgpHWLfw');
    expect(extractCleanUrlOrInput(example6)).toBe(
      'https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783',
    );
  });

  it('extracts QQ numbers from labeled text', () => {
    expect(extractCleanUrlOrInput('qq：3197635836')).toBe('3197635836');
    expect(extractCleanUrlOrInput('QQ: 3197635836')).toBe('3197635836');
    expect(extractCleanUrlOrInput('QQ号：3197635836')).toBe('3197635836');
    expect(extractCleanUrlOrInput(' 3197635836 ')).toBe('3197635836');
  });

  it('handles protocol-less music domains surrounded by text', () => {
    expect(extractCleanUrlOrInput('分享 y.qq.com/n/ryqq/playlist/9044196528 给你听')).toBe(
      'https://y.qq.com/n/ryqq/playlist/9044196528',
    );
  });

  it('validates mixed share text directly via validatePlaylistInput', () => {
    const res1 = validatePlaylistInput(example1);
    expect(res1.valid).toBe(true);
    expect(res1.kind).toBe('short_link');
    expect(res1.platform).toBe('qishui');
    expect(res1.cleanedInput).toBe('https://qishui.douyin.com/s/iXHhKHhY/');

    const res2 = validatePlaylistInput(example2);
    expect(res2.valid).toBe(true);
    expect(res2.kind).toBe('short_link');
    expect(res2.platform).toBe('qishui');
    expect(res2.cleanedInput).toBe('https://qishui.douyin.com/s/iXHhmCAW/');

    const res3 = validatePlaylistInput(example3);
    expect(res3.valid).toBe(true);
    expect(res3.kind).toBe('single_playlist_url');
    expect(res3.platform).toBe('kugou');
    expect(res3.cleanedInput).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1',
    );

    const res4 = validatePlaylistInput(example4);
    expect(res4.valid).toBe(true);
    expect(res4.kind).toBe('single_playlist_url');
    expect(res4.platform).toBe('kugou');
    expect(res4.cleanedInput).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
    );

    const res5 = validatePlaylistInput(example5);
    expect(res5.valid).toBe(true);
    expect(res5.kind).toBe('short_link');
    expect(res5.platform).toBe('netease');
    expect(res5.cleanedInput).toBe('https://163cn.tv/bgpHWLfw');

    const res6 = validatePlaylistInput(example6);
    expect(res6.valid).toBe(true);
    expect(res6.kind).toBe('single_playlist_url');
    expect(res6.platform).toBe('netease');
    expect(res6.cleanedInput).toBe(
      'https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783',
    );
  });
});

