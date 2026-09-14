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

  it('validates public StatsResponse contract shape', () => {
    const stats: import('./client').StatsResponse = {
      launchedAt: '2026-09-12',
      totalVisitors: 50,
      visitorsToday: 8,
      totalPageViews: 200,
      pageViewsToday: 25,
      totalPlaylistsParsed: 100,
      playlistsParsedToday: 10,
      totalTracksProcessed: 5000,
      tracksProcessedToday: 300,
      totalExports: 40,
      exportsToday: 4,
      exportFormatsBreakdown: { xlsx: 20, csv: 12, txt: 6, json: 2 },
      byPlatform: {
        qqmusic: {
          totalSuccess: 100,
          todaySuccess: 10,
        },
      },
      recentDays: [
        {
          date: '2026-09-13',
          parses: 10,
          tracks: 300,
          exports: 4,
        },
      ],
      generatedAt: '2026-09-13T08:00:00.000Z',
    };

    expect(stats.launchedAt).toBe('2026-09-12');
    expect(stats.totalPlaylistsParsed).toBe(100);
    expect(stats.totalTracksProcessed).toBe(5000);
    expect(stats.totalExports).toBe(40);
    expect(stats.byPlatform.qqmusic.totalSuccess).toBe(100);
    expect(stats.recentDays).toHaveLength(1);
    expect(stats.recentDays[0].parses).toBe(10);
  });

  it('generates and persists an anonymous device identifier', async () => {
    const { getAnonymousDeviceId } = await import('./client');
    const deviceId1 = getAnonymousDeviceId();
    expect(deviceId1).toMatch(/^d_[a-z0-9]+$/);

    // Subsequent calls return the same cached deviceId from localStorage
    const deviceId2 = getAnonymousDeviceId();
    expect(deviceId2).toBe(deviceId1);
  });

  it('notifies window of stats refresh event', async () => {
    const { notifyStatsRefresh } = await import('./client');
    let eventDispatched = false;
    const handler = () => {
      eventDispatched = true;
    };
    window.addEventListener('playlistout:stats-refresh', handler);

    notifyStatsRefresh(10);
    await new Promise((r) => setTimeout(r, 50));

    expect(eventDispatched).toBe(true);
    window.removeEventListener('playlistout:stats-refresh', handler);
  });
});
