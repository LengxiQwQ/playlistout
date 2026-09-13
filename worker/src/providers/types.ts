import type { Playlist } from '../models/playlist';

export interface ParseMetaResult {
  playlist: Playlist;
  providerPath: 'primary' | 'fallback';
}

export interface Provider {
  name: string;
  matches(input: string): boolean;
  extractId(input: string): string | null;
  parse(id: string): Promise<Playlist>;
  parseWithMeta?(id: string): Promise<ParseMetaResult>;
}
