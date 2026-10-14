import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from './registry';
import { runPlaylistPipeline } from '../pipeline';
import type { MusicProvider, ProviderMeta, ProviderCapabilities } from './types';
import type { Playlist } from '../models/playlist';

describe('ProviderRegistry & Extensibility', () => {
  it('dynamically registers and resolves a new music provider without changing core dispatcher', async () => {
    const registry = new ProviderRegistry();

    const mockCapabilities: ProviderCapabilities = {
      playlist: true,
      userProfile: false,
      numericId: false,
      shortLink: false,
    };

    const mockMeta: ProviderMeta = {
      id: 'demo_music' as any,
      name: '演示音乐',
      nameEn: 'Demo Music',
      themeColor: '#00AAEE',
      capabilities: mockCapabilities,
    };

    const demoProvider: MusicProvider = {
      meta: mockMeta,
      matches(input: string): boolean {
        return input.includes('demo.music.com/playlist/');
      },
      extractPlaylistId(input: string): string | null {
        const m = input.match(/playlist\/(\w+)/);
        return m ? m[1] : null;
      },
      async fetchPlaylist(input: string): Promise<Playlist> {
        return {
          platform: 'demo_music',
          id: 'demo_123',
          name: 'Demo Playlist',
          trackCount: 2,
          tracks: [
            {
              index: 1,
              title: 'Demo Song 1',
              artist: 'Demo Singer',
              isVip: true,
            },
            {
              index: 2,
              title: 'Demo Song 2',
              artist: 'Demo Singer',
              isAvailable: false,
            },
          ],
        };
      },
    };

    // Register provider
    registry.register(demoProvider);

    // Verify lookup & metadata
    expect(registry.has('demo_music')).toBe(true);
    expect(registry.get('demo_music')).toBe(demoProvider);
    expect(registry.getAllMeta().some((m) => (m.id as string) === 'demo_music')).toBe(true);

    // Verify URL resolution
    const resolved = registry.resolveByInput('https://demo.music.com/playlist/123456');
    expect(resolved).toBe(demoProvider);

    // Verify pipeline enrichment on fetched playlist
    const rawPlaylist = await resolved!.fetchPlaylist('https://demo.music.com/playlist/123456');
    const enriched = await runPlaylistPipeline(rawPlaylist, 'demo_music');

    expect(enriched.tracks[0].status).toBe('vip');
    expect(enriched.tracks[1].status).toBe('unplayable');
  });

  it('filters providers by capabilities', () => {
    const registry = new ProviderRegistry();

    const providerA: MusicProvider = {
      meta: {
        id: 'p_a' as any,
        name: 'A',
        nameEn: 'A',
        themeColor: '#fff',
        capabilities: { playlist: true, userProfile: true, numericId: true },
      },
      matches: () => false,
      extractPlaylistId: () => null,
      fetchPlaylist: async () => ({ platform: 'p_a', id: '1', name: 'A', trackCount: 0, tracks: [] }),
    };

    const providerB: MusicProvider = {
      meta: {
        id: 'p_b' as any,
        name: 'B',
        nameEn: 'B',
        themeColor: '#fff',
        capabilities: { playlist: true, userProfile: false, numericId: false, shortLink: true },
      },
      matches: () => false,
      extractPlaylistId: () => null,
      fetchPlaylist: async () => ({ platform: 'p_b', id: '1', name: 'B', trackCount: 0, tracks: [] }),
    };

    registry.register(providerA);
    registry.register(providerB);

    const userProfileProviders = registry.getUserProfileProviders();
    expect(userProfileProviders.map((p) => p.meta.id)).toEqual(['p_a']);

    const numericIdProviders = registry.getNumericIdProviders();
    expect(numericIdProviders.map((p) => p.meta.id)).toEqual(['p_a']);
  });
});
