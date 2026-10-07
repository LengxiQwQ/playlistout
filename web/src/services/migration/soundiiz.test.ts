import { describe, expect, it } from 'vitest';
import type { Playlist } from '../../api/types';
import {
  buildSoundiizMigrationPayload,
  SOUNDIIZ_MAX_TRACKS,
} from './soundiiz';

const playlist: Playlist = {
  platform: 'qqmusic',
  id: '123',
  name: '迁移测试',
  trackCount: 3,
  tracks: [
    {
      index: 1,
      title: 'Song A',
      artist: 'Artist A',
      album: 'Album A',
      isrc: 'USQX91300105',
    },
    {
      index: 2,
      title: 'Song B',
      artist: 'Artist B, Artist C',
    },
  ],
};

describe('Soundiiz migration payload', () => {
  it('normalizes Playlist Out data for the migration worker', () => {
    const payload = buildSoundiizMigrationPayload(playlist, 'spotify');

    expect(payload.destination).toBe('spotify');
    expect(payload.sourcePlatform).toBe('qqmusic');
    expect(payload.loadedTrackCount).toBe(2);
    expect(payload.isPartial).toBe(true);
    expect(payload.tracks).toEqual([
      {
        title: 'Song A',
        artists: ['Artist A'],
        album: 'Album A',
        isrc: 'USQX91300105',
      },
      {
        title: 'Song B',
        artists: ['Artist B', 'Artist C'],
        album: undefined,
        isrc: undefined,
      },
    ]);
  });

  it('keeps the documented Soundiiz track limit explicit', () => {
    expect(SOUNDIIZ_MAX_TRACKS).toBe(200);
  });
});
