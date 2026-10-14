import type { MusicProvider, ProviderMeta } from './types';
import type { SupportedPlatform } from './platforms';

export class ProviderRegistry {
  private providers = new Map<SupportedPlatform, MusicProvider>();

  register(provider: MusicProvider): void {
    if (this.providers.has(provider.meta.id)) {
      throw new Error(`Provider '${provider.meta.id}' is already registered.`);
    }
    this.providers.set(provider.meta.id, provider);
  }

  get(id: SupportedPlatform | string): MusicProvider | undefined {
    return this.providers.get(id as SupportedPlatform);
  }

  getAll(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Matches provider by input URL or share text
   */
  resolveByInput(input: string): MusicProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.matches(input)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Matches provider by short link
   */
  resolveShortLink(input: string): MusicProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.isShortLink?.(input)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Matches provider by explicit user profile URL
   */
  resolveUserProfile(input: string): MusicProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.isUserProfileUrl?.(input)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Returns all providers supporting numeric ID disambiguation
   */
  getNumericIdProviders(): MusicProvider[] {
    return this.getAll().filter((p) => p.meta.capabilities.numericId);
  }

  /**
   * Returns all providers supporting user public playlists
   */
  getUserProfileProviders(): MusicProvider[] {
    return this.getAll().filter((p) => p.meta.capabilities.userProfile);
  }

  /**
   * Returns metadata for all providers (used by /api/providers and client config)
   */
  getAllMeta(): ProviderMeta[] {
    return this.getAll().map((p) => p.meta);
  }
}

export const providerRegistry = new ProviderRegistry();
