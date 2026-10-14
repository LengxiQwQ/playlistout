import type { Playlist } from '../models/playlist';
import type { PipelineContext, PipelineMiddleware } from './types';

export class PlaylistPipeline {
  private middlewares: PipelineMiddleware[] = [];

  use(middleware: PipelineMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(ctx: PipelineContext): Promise<Playlist> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error('next() called multiple times in pipeline middleware');
      }
      index = i;

      if (i < this.middlewares.length) {
        const fn = this.middlewares[i];
        await fn(ctx, () => dispatch(i + 1));
      }
    };

    await dispatch(0);
    return ctx.playlist;
  }
}
