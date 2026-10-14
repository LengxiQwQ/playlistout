import type { PipelineMiddleware } from '../types';

/**
 * Middleware: Standardizes track VIP and paid status annotations across music platforms.
 */
export const vipAnnotator: PipelineMiddleware = async (ctx, next) => {
  if (ctx.options?.annotateVip !== false && ctx.playlist?.tracks) {
    for (const track of ctx.playlist.tracks) {
      if (track.isVip && !track.status) {
        track.status = 'vip';
      }
      if (track.status === 'vip' && track.isVip === undefined) {
        track.isVip = true;
      }
      if (track.status === 'paid' && track.isVip === undefined) {
        track.isVip = true;
      }
    }
  }

  await next();
};
