import type { Language } from '../i18n';

export type IntegrationStatus = 'proposed' | 'planned';

export interface UpcomingIntegration {
  id: string;
  name: string;
  status: IntegrationStatus;
  issueUrl?: string;
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

export const UPCOMING_INTEGRATIONS: readonly UpcomingIntegration[] = [
  {
    id: 'lx-music',
    name: 'LX Music',
    status: 'proposed',
    issueUrl: 'https://github.com/lyswhut/lx-music-desktop/issues/3001',
  },
  {
    id: 'bbplayer',
    name: 'BBPlayer',
    status: 'proposed',
    issueUrl: 'https://github.com/bbplayer-app/BBPlayer/issues/340',
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
