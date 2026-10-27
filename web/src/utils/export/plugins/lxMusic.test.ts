import { describe, it, expect } from 'vitest';
import type { Playlist } from '../../../api/types';
import {
  lxMusicExportPlugin,
  generateLxMusicJSON,
  mapPlatformToLxSource,
  formatLxInterval,
} from './lxMusic';

describe('lxMusic export plugin', () => {
  const mockPlaylist: Playlist = {
    id: '123456',
    name: '周杰伦经典',
    creator: 'JayFan',
    platform: 'qqmusic',
    trackCount: 2,
    coverUrl: 'https://example.com/cover.jpg',
    tracks: [
      {
        index: 1,
        title: '晴天',
        artist: '周杰伦',
        album: '叶惠美',
        id: '0039MnYb0qxYAc',
        durationMs: 269000,
        coverUrl: 'https://example.com/qingtian.jpg',
      },
      {
        index: 2,
        title: '七里香',
        artist: '周杰伦, 方文山',
        album: '七里香',
        id: '002J4UUk29y8Wn',
        durationMs: 299000,
      },
    ],
  };

  it('maps platforms correctly', () => {
    expect(mapPlatformToLxSource('qqmusic')).toBe('tx');
    expect(mapPlatformToLxSource('netease')).toBe('wy');
    expect(mapPlatformToLxSource('kugou')).toBe('kg');
    expect(mapPlatformToLxSource('kuwo')).toBe('kw');
    expect(mapPlatformToLxSource('migu')).toBe('mg');
    expect(mapPlatformToLxSource('unknown')).toBe('tx');
  });

  it('formats duration interval correctly', () => {
    expect(formatLxInterval(269000)).toBe('04:29');
    expect(formatLxInterval(60000)).toBe('01:00');
    expect(formatLxInterval(5000)).toBe('00:05');
    expect(formatLxInterval(0)).toBe('');
  });

  it('generates valid LX Music JSON with correct schema', () => {
    const raw = generateLxMusicJSON(mockPlaylist);
    const parsed = JSON.parse(raw);

    expect(parsed.type).toBe('playList');
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.data)).toBe(true);
    expect(parsed.data.length).toBe(1);

    const playlistObj = parsed.data[0];
    expect(playlistObj.id).toBe('playlist_123456');
    expect(playlistObj.name).toBe('周杰伦经典');
    expect(playlistObj.list.length).toBe(2);

    const song1 = playlistObj.list[0];
    expect(song1.name).toBe('晴天');
    expect(song1.singer).toBe('周杰伦');
    expect(song1.source).toBe('tx');
    expect(song1.songmid).toBe('0039MnYb0qxYAc');
    expect(song1.interval).toBe('04:29');
    expect(song1.albumName).toBe('叶惠美');
    expect(song1.img).toBe('https://example.com/qingtian.jpg');

    const song2 = playlistObj.list[1];
    expect(song2.singer).toBe('周杰伦, 方文山');
    expect(song2.img).toBe('https://example.com/cover.jpg'); // Fallback to playlist cover
  });

  it('exports with appropriate filename', () => {
    const result = lxMusicExportPlugin.export({
      playlist: mockPlaylist,
      tracks: mockPlaylist.tracks,
    });
    if (result instanceof Promise) throw new Error('Expected sync result');

    expect(result.filename).toBe('【洛雪音乐】周杰伦经典 - JayFan.json');
    expect(result.mimeType).toBe('application/json;charset=utf-8');
  });
});
