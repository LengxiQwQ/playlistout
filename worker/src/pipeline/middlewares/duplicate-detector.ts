import type { PipelineMiddleware } from '../types';

export interface DuplicateTrackEntry {
  index: number;
  title: string;
  artist: string;
  firstIndex: number;
}

/**
 * Middleware: Detects duplicate songs (same normalized title and artist) in a playlist.
 * Records duplicate entries in context metadata without mutating original track items.
 */
export const duplicateDetector: PipelineMiddleware = async (ctx, next) => {
  if (ctx.options?.detectDuplicates !== false && ctx.playlist?.tracks) {
    const seen = new Map<string, number>();
    const duplicates: DuplicateTrackEntry[] = [];

    for (const track of ctx.playlist.tracks) {
      const title = (track.title || '').trim().toLowerCase();
      const artist = (track.artist || '').trim().toLowerCase();
      const key = `${title}:::${artist}`;

      if (seen.has(key)) {
        duplicates.push({
          index: track.index,
          title: track.title,
          artist: track.artist,
          firstIndex: seen.get(key)!,
        });
      } else {
        seen.set(key, track.index);
      }
    }

    if (!ctx.metadata) {
      ctx.metadata = {};
    }
    ctx.metadata.duplicateCount = duplicates.length;
    ctx.metadata.duplicates = duplicates;
  }

  await next();
};
