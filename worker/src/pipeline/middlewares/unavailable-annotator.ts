import type { PipelineMiddleware } from '../types';

/**
 * Middleware: Annotates track availability status across platforms.
 * Preserves existing isAvailable/status flags or fills sensible defaults.
 */
export const unavailableAnnotator: PipelineMiddleware = async (ctx, next) => {
  if (ctx.options?.annotateUnavailable !== false && ctx.playlist?.tracks) {
    for (const track of ctx.playlist.tracks) {
      if (track.isAvailable === false && !track.status) {
        track.status = 'unplayable';
      }
      if (track.status === 'unplayable' && track.isAvailable === undefined) {
        track.isAvailable = false;
      }
      if (track.isAvailable === undefined) {
        track.isAvailable = true;
      }
    }
  }

  await next();
};
