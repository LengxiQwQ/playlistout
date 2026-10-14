import type { Playlist, UserPlaylistsData, DisambiguationCandidate } from '../models/playlist';
import type { SupportedPlatform } from './platforms';

export interface ParseMetaResult {
  playlist: Playlist;
  providerPath: 'primary' | 'fallback';
}

/** General parse options */
export interface ProviderParseOptions {
  channel?: string;
}

/** Auth credentials (e.g. KuGou QR login) */
export interface AuthCredentials {
  token?: string;
  userid?: string;
}

/** Provider capability declarations */
export interface ProviderCapabilities {
  /** Whether the provider supports single playlist parsing */
  playlist: true;
  /** Whether the provider supports user public playlists */
  userProfile: boolean;
  /** Whether user profile requires authenticated credentials (e.g. KuGou) */
  userProfileRequiresAuth?: boolean;
  /** Whether the provider supports numeric IDs */
  numericId?: boolean;
  /** Whether the provider supports short link redirection */
  shortLink?: boolean;
}

/** Provider metadata for routing and client capabilities API */
export interface ProviderMeta {
  id: SupportedPlatform;
  name: string;
  nameEn: string;
  themeColor: string;
  capabilities: ProviderCapabilities;
}

/** Full self-describing MusicProvider contract */
export interface MusicProvider {
  meta: ProviderMeta;

  // Input matching
  matches(input: string): boolean;
  isShortLink?(input: string): boolean;
  isUserProfileUrl?(input: string): boolean;

  // ID extraction
  extractPlaylistId(input: string): string | null;
  extractUserId?(input: string): string | null;

  // Data retrieval
  fetchPlaylist(id: string, options?: ProviderParseOptions & AuthCredentials): Promise<Playlist>;
  fetchUserPlaylists?(userId: string, auth?: AuthCredentials): Promise<UserPlaylistsData>;

  // Disambiguation probes
  probeAsPlaylist?(id: string, options?: ProviderParseOptions & AuthCredentials): Promise<Playlist>;
  probeAsUser?(id: string, auth?: AuthCredentials): Promise<UserPlaylistsData>;
}

/** Legacy Provider interface maintained for seamless backward compatibility */
export interface Provider {
  name: string;
  matches(input: string): boolean;
  extractId(input: string): string | null;
  parse(id: string, options?: any): Promise<Playlist>;
  parseWithMeta?(id: string): Promise<ParseMetaResult>;
}

export type LegacyProvider = Provider;
