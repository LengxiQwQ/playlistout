import { describe, it, expect } from 'vitest';
import type { Playlist } from '../../../api/types';
import {
  listen1ExportPlugin,
  generateListen1JSON,
  mapPlatformToListen1Source,
  getListen1TrackPrefix,
} from './listen1';

describe('listen1 export plugin', () => {
  const mockPlaylist: Playlist = {
    id: '888999',
    name: '精选合集',
    creator: 'MusicLover',
    platform: 'netease',
    trackCount: 2,
    coverUrl: 'https://example.com/playlist.jpg',
    sourceUrl: 'https://music.163.com/#/playlist?id=888999',
    tracks: [
      {
        index: 1,
        title: '海阔天空',
        artist: 'Beyond',
        album: '乐与怒',
        id: '347230',
        coverUrl: 'https://example.com/beyond.jpg',
        sourceUrl: 'https://music.163.com/#/song?id=347230',
        isAvailable: true,
      },
      {
        index: 2,
        title: '光辉岁月',
        artist: 'Beyond',
        album: '命运派对',
        id: '347231',
        isAvailable: false,
      },
    ],
  };

  it('maps platform sources and prefixes correctly', () => {
    expect(mapPlatformToListen1Source('qqmusic')).toBe('qq');
    expect(getListen1TrackPrefix('qqmusic')).toBe('qqtrack');

    expect(mapPlatformToListen1Source('netease')).toBe('netease');
    expect(getListen1TrackPrefix('netease')).toBe('netrack');

    expect(mapPlatformToListen1Source('kugou')).toBe('kugou');
    expect(getListen1TrackPrefix('kugou')).toBe('kgtrack');

    expect(mapPlatformToListen1Source('kuwo')).toBe('kuwo');
    expect(getListen1TrackPrefix('kuwo')).toBe('kwtrack');

    expect(mapPlatformToListen1Source('migu')).toBe('migu');
    expect(getListen1TrackPrefix('migu')).toBe('mgtrack');
  });

  it('generates valid Listen 1 backup JSON', () => {
    const raw = generateListen1JSON(mockPlaylist);
    const parsed = JSON.parse(raw);

    expect(parsed['myplaylist_888999']).toBeDefined();
    const entry = parsed['myplaylist_888999'];

    expect(entry.is_mine).toBe(1);
    expect(entry.info.title).toBe('精选合集');
    expect(entry.info.id).toBe('myplaylist_888999');
    expect(entry.info.cover_img_url).toBe('https://example.com/playlist.jpg');

    expect(entry.tracks.length).toBe(2);

    const track1 = entry.tracks[0];
    expect(track1.id).toBe('netrack_347230');
    expect(track1.title).toBe('海阔天空');
    expect(track1.artist).toBe('Beyond');
    expect(track1.album).toBe('乐与怒');
    expect(track1.source).toBe('netease');
    expect(track1.source_url).toBe('https://music.163.com/#/song?id=347230');
    expect(track1.img_url).toBe('https://example.com/beyond.jpg');
    expect(track1.disabled).toBe(false);

    const track2 = entry.tracks[1];
    expect(track2.id).toBe('netrack_347231');
    expect(track2.disabled).toBe(true);
    expect(track2.img_url).toBe('https://example.com/playlist.jpg'); // Fallback to playlist cover
  });

  it('exports with appropriate filename', () => {
    const result = listen1ExportPlugin.export({
      playlist: mockPlaylist,
      tracks: mockPlaylist.tracks,
    });
    if (result instanceof Promise) throw new Error('Expected sync result');

    expect(result.filename).toBe('【Listen 1】精选合集 - MusicLover.json');
    expect(result.mimeType).toBe('application/json;charset=utf-8');
  });
});
