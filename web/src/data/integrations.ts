import type { Language } from '../i18n';

export type IntegrationStatus = 'proposed' | 'planned' | 'upcoming';
export type IntegrationKind = 'plugin' | 'builtin';

export interface UpcomingIntegration {
  id: string;
  name: string;
  status: IntegrationStatus;
  kind?: IntegrationKind;
  issueUrl?: string;
  prUrl?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  logoUrl?: string;
  summary?: Partial<Record<Language, string>> & { default?: string };
}

export interface PublishedPluginArtifact {
  role: 'entrypoint' | 'subscription' | 'asset';
  publicPath: string;
  url: string;
}

export interface PublishedPlugin {
  id: string;
  name: string;
  status: 'available';
  version: string;
  description: string;
  summary?: Partial<Record<Language, string>> & { default?: string };
  entrypoint?: string;
  subscriptionUrl?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  guideUrl?: string;
  logoUrl?: string;
  artifacts: PublishedPluginArtifact[];
}

export interface PluginEcosystemManifest {
  schemaVersion: 1;
  name: string;
  homepage: string;
  updatedAt: string;
  platforms: PublishedPlugin[];
}

export const PLUGIN_MANIFEST_URL = '/plugins/index.json';

export const FEATURED_UPCOMING_INTEGRATIONS: readonly UpcomingIntegration[] = [
  {
    id: 'bbplayer',
    name: 'BBPlayer',
    status: 'upcoming',
    kind: 'builtin',
    issueUrl: 'https://github.com/bbplayer-app/BBPlayer/issues/340',
    homepageUrl: 'https://bbplayer.roitium.com',
    repositoryUrl: 'https://github.com/bbplayer-app/BBPlayer',
    logoUrl: 'https://raw.githubusercontent.com/bbplayer-app/BBPlayer/HEAD/apps/mobile/assets/images/icon_large.png',
    summary: {
      'zh-CN': '软件原生内置 Playlist Out 导入歌单能力，支持歌单链接和本地 JSON 导入',
      'en-US': 'Native built-in Playlist Out playlist import, supporting playlist links and local JSON import',
      default: '软件原生内置 Playlist Out 导入歌单能力，支持歌单链接和本地 JSON 导入',
    },
  },
];

export const UPCOMING_INTEGRATIONS: readonly UpcomingIntegration[] = [
  {
    id: 'lx-music',
    name: 'LX Music',
    status: 'proposed',
    issueUrl: 'https://github.com/lyswhut/lx-music-desktop/issues/3001',
  },
  {
    id: 'listen1',
    name: 'Listen 1',
    status: 'proposed',
    issueUrl: 'https://github.com/listen1/listen1_desktop/issues/1413',
  },
  {
    id: 'moosync',
    name: 'Moosync',
    status: 'planned',
  },
];

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isPublishedPlugin(value: unknown): value is PublishedPlugin {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const plugin = value as Record<string, unknown>;

  return (
    typeof plugin.id === 'string' &&
    typeof plugin.name === 'string' &&
    plugin.status === 'available' &&
    typeof plugin.version === 'string' &&
    typeof plugin.description === 'string' &&
    optionalString(plugin.entrypoint) &&
    optionalString(plugin.subscriptionUrl) &&
    optionalString(plugin.homepageUrl) &&
    optionalString(plugin.repositoryUrl) &&
    optionalString(plugin.guideUrl) &&
    optionalString(plugin.logoUrl) &&
    Array.isArray(plugin.artifacts)
  );
}

export function isPluginEcosystemManifest(value: unknown): value is PluginEcosystemManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;

  return (
    manifest.schemaVersion === 1 &&
    typeof manifest.name === 'string' &&
    typeof manifest.homepage === 'string' &&
    typeof manifest.updatedAt === 'string' &&
    Array.isArray(manifest.platforms) &&
    manifest.platforms.every(isPublishedPlugin)
  );
}

export function getPluginSummary(plugin: PublishedPlugin, language: Language): string {
  return (
    plugin.summary?.[language] ||
    plugin.summary?.default ||
    plugin.description
  );
}

export function getIntegrationSummary(
  integration: UpcomingIntegration,
  language: Language,
): string {
  return (
    integration.summary?.[language] ||
    integration.summary?.default ||
    ''
  );
}
