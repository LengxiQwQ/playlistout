import type { Playlist } from '../models/playlist';

export interface PipelineOptions {
  annotateUnavailable?: boolean;
  annotateVip?: boolean;
  detectDuplicates?: boolean;
}

export interface PipelineContext {
  playlist: Playlist;
  platform: string;
  options?: PipelineOptions;
  metadata?: Record<string, unknown>;
}

export type PipelineMiddleware = (
  ctx: PipelineContext,
  next: () => Promise<void>,
) => Promise<void>;
