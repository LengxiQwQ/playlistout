import { describe, it, expect } from 'vitest';
import { extractCleanUrlOrInput } from './clean-url';

describe('Worker extractCleanUrlOrInput', () => {
  it('extracts URL from Qishui share text with trailing @ annotation', () => {
    const input1 =
      '歌单｜钢琴流行曲999首：轻音乐钢琴曲｜钢琴纯音乐放松大脑缓解焦虑 https://qishui.douyin.com/s/iXHhKHhY/ @汽水音乐';
    expect(extractCleanUrlOrInput(input1)).toBe('https://qishui.douyin.com/s/iXHhKHhY/');

    const input2 = '歌单｜抖音收藏的音乐 https://qishui.douyin.com/s/iXHhmCAW/ @汽水音乐';
    expect(extractCleanUrlOrInput(input2)).toBe('https://qishui.douyin.com/s/iXHhmCAW/');
  });

  it('extracts URL from Kugou share text with embedded parameters and annotations', () => {
    const input3 =
      '发现一个很不错的歌单哦《测试大量歌单》你也来听听吧!（来自 @酷狗音乐 海量曲库，极致音质）https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1';
    expect(extractCleanUrlOrInput(input3)).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1',
    );

    const input4 =
      '发现一个很不错的歌单哦《是冷汐呀喜欢的音乐》你也来听听吧!（来自 @酷狗音乐 海量曲库，极致音质）https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1';
    expect(extractCleanUrlOrInput(input4)).toBe(
      'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
    );
  });

  it('extracts URL from NetEase share text and short link text', () => {
    const input5 =
      '【推荐】来自网易云音乐的是冷汐呀233 听过2984首歌，拥有11位粉丝 https://163cn.tv/bgpHWLfw';
    expect(extractCleanUrlOrInput(input5)).toBe('https://163cn.tv/bgpHWLfw');

    const input6 =
      '分享歌单: 是冷汐呀233喜欢的音乐 是冷汐呀233 https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783';
    expect(extractCleanUrlOrInput(input6)).toBe(
      'https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783',
    );
  });

  it('extracts QQ number from prefixed text', () => {
    expect(extractCleanUrlOrInput('qq：3197635836')).toBe('3197635836');
    expect(extractCleanUrlOrInput('QQ: 3197635836')).toBe('3197635836');
    expect(extractCleanUrlOrInput('3197635836')).toBe('3197635836');
  });

  it('handles protocol-less music domains', () => {
    expect(extractCleanUrlOrInput('y.qq.com/n/ryqq/playlist/9044196528')).toBe(
      'https://y.qq.com/n/ryqq/playlist/9044196528',
    );
    expect(extractCleanUrlOrInput('y.qq.com/n/ryqq_v2/playlist/9044196528')).toBe(
      'https://y.qq.com/n/ryqq_v2/playlist/9044196528',
    );
    expect(
      extractCleanUrlOrInput('i2.y.qq.com/n3/other/pages/details/playlist.html?id=9044196528'),
    ).toBe('https://i2.y.qq.com/n3/other/pages/details/playlist.html?id=9044196528');
  });

  it('extracts URL from WeChat QQ Music share text', () => {
    const shareText =
      '分享歌单《经典流行》 https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx 来自QQ音乐';
    expect(extractCleanUrlOrInput(shareText)).toBe(
      'https://i2.y.qq.com/n3/other/pages/details/playlist.html?hosteuin=oi6q7iCi7Kci7c**&id=9044196528&appversion=200805&ADTAG=wxfshare&appshare=iphone_wx',
    );
  });
});
