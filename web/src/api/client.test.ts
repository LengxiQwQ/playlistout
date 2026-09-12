import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from './client';
import type { Playlist, Track } from './types';

describe('Web API Client & Types', () => {
  it('has default API_BASE_URL configured', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('validates normalized Playlist contract shape', () => {
    const track: Track = {
      index: 1,
      id: '101',
      title: 'Sample Track',
      artists: ['Artist A', 'Artist B'],
      album: 'Sample Album',
      durationMs: 210000,
      sourceUrl: 'https://example.com/track/101',
    };

    const playlist: Playlist = {
      platform: 'qqmusic',
      id: '123456',
      name: 'My Playlist',
      creator: 'User1',
      trackCount: 1,
      tracks: [track],
    };

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.tracks).toHaveLength(1);
    expect(playlist.tracks[0].artists).toEqual(['Artist A', 'Artist B']);
    expect(playlist.tracks[0].index).toBe(1);
  });
});
