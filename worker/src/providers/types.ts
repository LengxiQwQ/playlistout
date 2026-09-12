import type { Playlist } from '../models/playlist';

export interface Provider {
  name: string;
  matches(input: string): boolean;
  extractId(input: string): string | null;
  parse(id: string): Promise<Playlist>;
}
