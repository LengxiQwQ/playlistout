import { describe, it, expect } from 'vitest';
import { PlaylistPipeline } from './pipeline';
import { unavailableAnnotator } from './middlewares/unavailable-annotator';
import { vipAnnotator } from './middlewares/vip-annotator';
import { duplicateDetector } from './middlewares/duplicate-detector';
import { createDefaultPlaylistPipeline, runPlaylistPipeline } from './index';
import type { PipelineContext } from './types';
import type { Playlist, Track } from '../models/playlist';

function createMockPlaylist(tracks: Partial<Track>[] = []): Playlist {
  return {
    platform: 'qqmusic',
    id: 'test_123',
    name: 'Test Playlist',
    trackCount: tracks.length,
    tracks: tracks.map((t, idx) => ({
      index: idx + 1,
      title: t.title ?? `Track ${idx + 1}`,
      artist: t.artist ?? 'Artist',
      ...t,
    })) as Track[],
  };
}

describe('PlaylistPipeline', () => {
  it('executes middlewares in order (onion model)', async () => {
    const pipeline = new PlaylistPipeline();
    const trace: number[] = [];

    pipeline.use(async (_ctx, next) => {
      trace.push(1);
      await next();
      trace.push(4);
    });

    pipeline.use(async (_ctx, next) => {
      trace.push(2);
      await next();
      trace.push(3);
    });

    const playlist = createMockPlaylist();
    const result = await pipeline.execute({
      playlist,
      platform: 'qqmusic',
    });

    expect(result).toBe(playlist);
    expect(trace).toEqual([1, 2, 3, 4]);
  });

  it('throws error when next() is called multiple times', async () => {
    const pipeline = new PlaylistPipeline();
    pipeline.use(async (_ctx, next) => {
      await next();
      await next();
    });

    await expect(
      pipeline.execute({
        playlist: createMockPlaylist(),
        platform: 'qqmusic',
      }),
    ).rejects.toThrow('next() called multiple times in pipeline middleware');
  });

  describe('unavailableAnnotator middleware', () => {
    it('standardizes unplayable track status', async () => {
      const playlist = createMockPlaylist([
        { title: 'Normal Track', isAvailable: undefined },
        { title: 'Unavailable Track', isAvailable: false },
        { title: 'Already Status Unplayable', status: 'unplayable' },
      ]);

      const pipeline = new PlaylistPipeline();
      pipeline.use(unavailableAnnotator);

      await pipeline.execute({ playlist, platform: 'qqmusic' });

      expect(playlist.tracks[0].isAvailable).toBe(true);
      expect(playlist.tracks[1].status).toBe('unplayable');
      expect(playlist.tracks[1].isAvailable).toBe(false);
      expect(playlist.tracks[2].isAvailable).toBe(false);
    });

    it('can be skipped when option is disabled', async () => {
      const playlist = createMockPlaylist([
        { title: 'Track 1', isAvailable: undefined },
      ]);

      const pipeline = new PlaylistPipeline();
      pipeline.use(unavailableAnnotator);

      await pipeline.execute({
        playlist,
        platform: 'qqmusic',
        options: { annotateUnavailable: false },
      });

      expect(playlist.tracks[0].isAvailable).toBeUndefined();
    });
  });

  describe('vipAnnotator middleware', () => {
    it('standardizes vip and paid track status', async () => {
      const playlist = createMockPlaylist([
        { title: 'Free Track' },
        { title: 'VIP Track', isVip: true },
        { title: 'Status VIP Track', status: 'vip' },
        { title: 'Paid Track', status: 'paid' },
      ]);

      const pipeline = new PlaylistPipeline();
      pipeline.use(vipAnnotator);

      await pipeline.execute({ playlist, platform: 'qqmusic' });

      expect(playlist.tracks[0].isVip).toBeUndefined();
      expect(playlist.tracks[1].status).toBe('vip');
      expect(playlist.tracks[2].isVip).toBe(true);
      expect(playlist.tracks[3].isVip).toBe(true);
    });
  });

  describe('duplicateDetector middleware', () => {
    it('detects duplicate songs by title and artist', async () => {
      const playlist = createMockPlaylist([
        { title: 'Song A', artist: 'Singer 1' },
        { title: 'Song B', artist: 'Singer 2' },
        { title: 'Song A', artist: 'Singer 1' }, // duplicate of index 1
        { title: 'SONG A ', artist: ' singer 1' }, // case-insensitive trimmed duplicate
      ]);

      const pipeline = new PlaylistPipeline();
      pipeline.use(duplicateDetector);

      const ctx: PipelineContext = { playlist, platform: 'qqmusic' };
      await pipeline.execute(ctx);

      expect(ctx.metadata?.duplicateCount).toBe(2);
      expect(ctx.metadata?.duplicates).toEqual([
        { index: 3, title: 'Song A', artist: 'Singer 1', firstIndex: 1 },
        { index: 4, title: 'SONG A ', artist: ' singer 1', firstIndex: 1 },
      ]);
    });
  });

  describe('defaultPlaylistPipeline & runPlaylistPipeline', () => {
    it('runs all default middlewares successfully', async () => {
      const playlist = createMockPlaylist([
        { title: 'Song 1', isVip: true },
        { title: 'Song 2', isAvailable: false },
        { title: 'Song 1', isVip: true }, // duplicate
      ]);

      const result = await runPlaylistPipeline(playlist, 'qqmusic');
      expect(result.tracks[0].status).toBe('vip');
      expect(result.tracks[1].status).toBe('unplayable');
      expect(result.tracks[2].status).toBe('vip');
    });
  });
});
