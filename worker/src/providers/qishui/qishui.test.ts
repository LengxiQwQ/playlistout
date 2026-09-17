import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchesQishuiInput, extractUrlFromText, extractQishuiPlaylistId } from './input';
import {
  buildQishuiImageUrl,
  determineQishuiTrackStatus,
  normalizeQishuiTrack,
  normalizeQishuiPlaylist,
  normalizeAwemeMusicTrack,
  type RawAwemeMusic,
  type RawQishuiMediaResource,
  type RawQishuiTrack,
  type RawQishuiPlaylist,
} from './normalize';
import { qishuiProvider } from './index';
import { ProviderError } from '../../models/playlist';

describe('Qishui Provider Input & Matching', () => {
  it('identifies valid Qishui inputs', () => {
    expect(matchesQishuiInput('https://qishui.douyin.com/s/iXHhmCAW/')).toBe(true);
    expect(
      matchesQishuiInput(
        'https://music.douyin.com/qishui/share/playlist?playlist_id=7087507348697186339&sec_sharer_id=xxx',
      ),
    ).toBe(true);
    expect(
      matchesQishuiInput(
        '「冷汐OωO在抖音收藏的音乐」https://qishui.douyin.com/s/iXHhmCAW/ 复制链接，打开【汽水音乐】直接收听！',
      ),
    ).toBe(true);
  });

  it('rejects non-Qishui inputs', () => {
    expect(matchesQishuiInput('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe(false);
    expect(matchesQishuiInput('https://music.163.com/playlist?id=2756674066')).toBe(false);
    expect(matchesQishuiInput('https://www.kugou.com/songlist/123/')).toBe(false);
    expect(matchesQishuiInput('')).toBe(false);
  });

  it('extracts URL from share text', () => {
    const text = '「冷汐OωO在抖音收藏的音乐」https://qishui.douyin.com/s/iXHhmCAW/ 复制链接，打开【汽水音乐】直接收听！';
    expect(extractUrlFromText(text)).toBe('https://qishui.douyin.com/s/iXHhmCAW/');
  });

  it('extracts playlist ID from direct URLs and numeric IDs', async () => {
    expect(await extractQishuiPlaylistId('7087507348697186339')).toBe('7087507348697186339');
    expect(
      await extractQishuiPlaylistId(
        'https://music.douyin.com/qishui/share/playlist?playlist_id=7087507348697186339',
      ),
    ).toBe('7087507348697186339');
  });

  it('throws on invalid playlist inputs', async () => {
    await expect(extractQishuiPlaylistId('invalid-url-or-id')).rejects.toThrow();
  });
});

describe('Qishui ImageX URL Builder', () => {
  it('correctly constructs ImageX CDN URLs with template_prefix', () => {
    const cover = {
      uri: 'tos-cn-v-2774c002/abc12345',
      urls: ['https://p3-luna.douyinpic.com/img/', 'https://p6-luna.douyinpic.com/img/'],
      template_prefix: 'tplv-b829550vbb',
    };
    const url = buildQishuiImageUrl(cover);
    expect(url).toBe(
      'https://p3-luna.douyinpic.com/img/tos-cn-v-2774c002/abc12345~tplv-b829550vbb-crop-center:720:720.jpg',
    );
  });

  it('handles covers without template_prefix', () => {
    const cover = {
      uri: 'tos-cn-v-2774c002/abc12345',
      urls: ['https://p3-luna.douyinpic.com/img/'],
    };
    const url = buildQishuiImageUrl(cover);
    expect(url).toBe('https://p3-luna.douyinpic.com/img/tos-cn-v-2774c002/abc12345');
  });

  it('handles direct string URL covers', () => {
    expect(buildQishuiImageUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
    expect(buildQishuiImageUrl(undefined)).toBeUndefined();
  });
});

describe('Qishui Song Status & Normalization', () => {
  it('correctly identifies VIP tracks', () => {
    const vipTrack: RawQishuiTrack = {
      id: '123',
      name: 'VIP Song',
      label_info: {
        only_vip_playable: true,
      },
    };
    const status = determineQishuiTrackStatus(vipTrack);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(true);
    expect(status.status).toBe('vip');
    expect(status.statusText).toBe('VIP专享');
  });

  it('correctly identifies paid album tracks', () => {
    const paidTrack: RawQishuiTrack = {
      id: '124',
      name: 'Paid Album Song',
      label_info: {
        quality_map: {
          medium: {
            play_detail: {
              need_purchase: true,
            },
          },
        },
      },
    };
    const status = determineQishuiTrackStatus(paidTrack);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(false);
    expect(status.status).toBe('paid');
    expect(status.statusText).toBe('付费专辑');
  });

  it('correctly identifies regular playable tracks', () => {
    const normalTrack: RawQishuiTrack = {
      id: '125',
      name: 'Normal Playable Song',
      duration: 180000,
    };
    const status = determineQishuiTrackStatus(normalTrack);
    expect(status.isAvailable).toBe(true);
    expect(status.isVip).toBe(false);
    expect(status.status).toBe('playable');
    expect(status.statusText).toBe('正常');
  });

  it('normalizes a full Qishui track with artist, album, and duration', () => {
    const mediaResource: RawQishuiMediaResource = {
      id: '7646305796047603758',
      type: 'track',
      index: 0,
      entity: {
        track_wrapper: {
          track: {
            id: '7646305796047603758',
            name: "If I Ain't Got You",
            duration: 219325,
            artists: [
              {
                id: '7588811838609524736',
                name: '多喝热水',
              },
            ],
            album: {
              id: '7646305796047570990',
              name: "If I Ain't Got You",
              url_cover: {
                uri: 'tos-cn-v-2774c002/sample-cover',
                urls: ['https://p3-luna.douyinpic.com/img/'],
                template_prefix: 'tplv-b829550vbb',
              },
            },
          },
        },
      },
    };

    const track = normalizeQishuiTrack(mediaResource, 0);
    expect(track.index).toBe(0);
    expect(track.id).toBe('7646305796047603758');
    expect(track.title).toBe("If I Ain't Got You");
    expect(track.artists).toEqual(['多喝热水']);
    expect(track.album).toBe("If I Ain't Got You");
    expect(track.durationMs).toBe(219325);
    expect(track.coverUrl).toBe(
      'https://p3-luna.douyinpic.com/img/tos-cn-v-2774c002/sample-cover~tplv-b829550vbb-crop-center:720:720.jpg',
    );
    expect(track.isAvailable).toBe(true);
    expect(track.isVip).toBe(false);
    expect(track.status).toBe('playable');
  });

  it('normalizes a playlist object with metadata and timestamps', () => {
    const rawPlaylist: RawQishuiPlaylist = {
      id: '7087507348697186339',
      title: '冷汐OωO在抖音收藏的音乐',
      count_tracks: 136,
      owner: {
        id: '3205799962753340',
        nickname: '冷汐OωO',
      },
      url_cover: {
        uri: 'tos-cn-i-b829550vbb/playlist-cover',
        urls: ['https://p3-luna.douyinpic.com/img/'],
        template_prefix: 'tplv-b829550vbb',
      },
      create_time: 1650192638,
      update_time: 1789628813,
    };

    const playlist = normalizeQishuiPlaylist(rawPlaylist, []);
    expect(playlist.platform).toBe('qishui');
    expect(playlist.id).toBe('7087507348697186339');
    expect(playlist.name).toBe('冷汐OωO在抖音收藏的音乐');
    expect(playlist.creator).toBe('冷汐OωO');
    expect(playlist.trackCount).toBe(136);
    expect(playlist.createTime).toBe(1650192638);
    expect(playlist.updateTime).toBe(1789628813);
    expect(playlist.sourceUrl).toBe(
      'https://music.douyin.com/qishui/share/playlist?playlist_id=7087507348697186339',
    );
  });
});

describe('Qishui Provider Parse with Mocked Upstream', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('handles multi-page pagination seamlessly', async () => {
    const page1Response = {
      has_more: true,
      next_cursor: '1',
      playlist: {
        id: '7087507348697186339',
        title: '测试歌单',
        count_tracks: 2,
        owner: { nickname: '冷汐' },
      },
      media_resources: [
        {
          id: '1',
          type: 'track',
          entity: {
            track_wrapper: {
              track: { id: '1', name: '歌曲 1', artists: [{ name: '歌手 1' }] },
            },
          },
        },
      ],
    };

    const page2Response = {
      has_more: false,
      next_cursor: '2',
      media_resources: [
        {
          id: '2',
          type: 'track',
          entity: {
            track_wrapper: {
              track: { id: '2', name: '歌曲 2', artists: [{ name: '歌手 2' }] },
            },
          },
        },
      ],
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      const resData = callCount === 1 ? page1Response : page2Response;
      return new Response(JSON.stringify(resData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const playlist = await qishuiProvider.parse('7087507348697186339');
    expect(playlist.tracks.length).toBe(2);
    expect(playlist.tracks[0].title).toBe('歌曲 1');
    expect(playlist.tracks[1].title).toBe('歌曲 2');
    expect(callCount).toBe(2);
  });

  it('normalizes UGC video items seamlessly within a playlist', async () => {
    const videoResource: RawQishuiMediaResource = {
      id: '7324660489924005174',
      type: 'video',
      entity: {
        video: {
          video_id: '7324660489924005174',
          title: '聆听一曲《瞬间的永恒》，平静舒缓，空灵唯美',
          duration: 162367,
          artists: [
            {
              user_info: {
                nickname: '天籁音曲',
              },
            },
          ],
          cover_url: {
            urls: ['https://p26-sign.douyinpic.com/tos-cn-i-0026/sample.jpeg'],
          },
        },
      },
    };

    const track = normalizeQishuiTrack(videoResource, 12);
    expect(track.index).toBe(12);
    expect(track.id).toBe('7324660489924005174');
    expect(track.title).toBe('聆听一曲《瞬间的永恒》，平静舒缓，空灵唯美');
    expect(track.artists).toEqual(['天籁音曲']);
    expect(track.durationMs).toBe(162367);
    expect(track.coverUrl).toBe('https://p26-sign.douyinpic.com/tos-cn-i-0026/sample.jpeg');
    expect(track.isAvailable).toBe(true);
    expect(track.statusText).toBe('视频');
  });

  it('gracefully handles unknown media entities as unavailable tracks', () => {
    const unknownResource: RawQishuiMediaResource = {
      id: '999999999',
      type: 'unknown_ad_or_deleted',
      entity: {},
    };

    const track = normalizeQishuiTrack(unknownResource, 5);
    expect(track.index).toBe(5);
    expect(track.id).toBe('999999999');
    expect(track.title).toBe('未知或已下架音频');
    expect(track.isAvailable).toBe(false);
    expect(track.status).toBe('unavailable');
  });

  it('throws PARSE_ERROR when media resource is null or non-object', () => {
    expect(() => normalizeQishuiTrack(null as any, 0)).toThrowError(ProviderError);
    expect(() => normalizeQishuiTrack(undefined as any, 0)).toThrowError(ProviderError);
  });

  it('normalizes Douyin original soundtrack item with isOriginalSound=true', () => {
    const raw: RawAwemeMusic = {
      id_str: '7657409429382204211',
      title: '@雷姆必拓牢实人创作的原声',
      author: '雷姆必拓牢实人',
      duration: 21,
      is_original_sound: true,
      status: 1,
      cover_large: {
        url_list: ['https://p3.douyinpic.com/aweme/1080x1080/sample.jpeg'],
      },
    };

    const track = normalizeAwemeMusicTrack(raw, 0);
    expect(track.index).toBe(0);
    expect(track.id).toBe('7657409429382204211');
    expect(track.title).toBe('@雷姆必拓牢实人创作的原声');
    expect(track.artists).toEqual(['雷姆必拓牢实人']);
    expect(track.durationMs).toBe(21000);
    expect(track.isOriginalSound).toBe(true);
    expect(track.statusText).toBe('原声');
    expect(track.sourceUrl).toBe('https://www.douyin.com/music/7657409429382204211');
    expect(track.isAvailable).toBe(true);
  });

  it('normalizes Douyin regular song item with isOriginalSound=false', () => {
    const raw: RawAwemeMusic = {
      id_str: '7646305796047636526',
      title: "If I Ain't Got You（剪辑版）",
      author: '多喝热水',
      duration: 27,
      is_original_sound: false,
      status: 1,
    };

    const track = normalizeAwemeMusicTrack(raw, 1);
    expect(track.index).toBe(1);
    expect(track.title).toBe("If I Ain't Got You（剪辑版）");
    expect(track.artists).toEqual(['多喝热水']);
    expect(track.isOriginalSound).toBe(false);
    expect(track.statusText).toBe('歌曲');
  });

  it('throws PARSE_ERROR when Aweme music item is null or non-object', () => {
    expect(() => normalizeAwemeMusicTrack(null as any, 0)).toThrowError(ProviderError);
  });

  it('successfully fetches and normalizes the full 792-song live playlist with UGC videos', async () => {
    const playlist = await qishuiProvider.parse('https://qishui.douyin.com/s/iXHhKHhY/');
    expect(playlist.name).toContain('钢琴流行曲');
    expect(playlist.creator).toBe('戒烟求生');
    expect(playlist.tracks.length).toBe(792);

    // Verify track 0 (regular audio)
    expect(playlist.tracks[0].title).toBeDefined();
    expect(playlist.tracks[0].artists.length).toBeGreaterThan(0);

    // Verify track 12 (UGC video item)
    const videoTrack = playlist.tracks[12];
    expect(videoTrack.id).toBe('7324660489924005174');
    expect(videoTrack.artists).toEqual(['天籁音曲']);
    expect(videoTrack.statusText).toBe('视频');
    expect(videoTrack.isAvailable).toBe(true);
    expect(videoTrack.durationMs).toBe(162367);
  }, 30000);

  it('successfully extracts full Douyin sync favorites playlist with 800+ tracks and original sounds', async () => {
    const playlist = await qishuiProvider.parse('https://qishui.douyin.com/s/iXHhmCAW/');
    expect(playlist.name).toBe('冷汐OωO在抖音收藏的音乐');
    expect(playlist.creator).toBe('冷汐OωO');
    expect(playlist.tracks.length).toBeGreaterThanOrEqual(800);

    const originalSoundTracks = playlist.tracks.filter((t) => t.isOriginalSound);
    expect(originalSoundTracks.length).toBeGreaterThan(700);
    expect(originalSoundTracks[0].statusText).toBe('原声');
  }, 40000);
});



