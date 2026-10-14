import { PlaylistPipeline } from './pipeline';
import { unavailableAnnotator } from './middlewares/unavailable-annotator';
import { vipAnnotator } from './middlewares/vip-annotator';
import { duplicateDetector } from './middlewares/duplicate-detector';
import type { PipelineContext, PipelineOptions, PipelineMiddleware } from './types';
import type { Playlist } from '../models/playlist';

export * from './types';
export * from './pipeline';
export * from './middlewares/unavailable-annotator';
export * from './middlewares/vip-annotator';
export * from './middlewares/duplicate-detector';

/**
 * Creates a pre-configured standard metadata enhancement pipeline.
 */
export function createDefaultPlaylistPipeline(): PlaylistPipeline {
  const pipeline = new PlaylistPipeline();
  pipeline.use(unavailableAnnotator);
  pipeline.use(vipAnnotator);
  pipeline.use(duplicateDetector);
  return pipeline;
}

/**
 * Singleton instance of default playlist metadata pipeline.
 */
export const defaultPlaylistPipeline = createDefaultPlaylistPipeline();

/**
 * Helper to run the default pipeline over a playlist.
 */
export async function runPlaylistPipeline(
  playlist: Playlist,
  platform: string,
  options?: PipelineOptions,
): Promise<Playlist> {
  const ctx: PipelineContext = {
    playlist,
    platform,
    options,
  };
  return defaultPlaylistPipeline.execute(ctx);
}
