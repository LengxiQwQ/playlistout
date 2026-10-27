import type { Language } from '../i18n';

export type IntegrationStatus = 'available' | 'proposed' | 'planned' | 'upcoming';
export type IntegrationKind = 'plugin' | 'builtin' | 'import';

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
    id: 'lx-music',
    name: '洛雪音乐',
    status: 'available',
    kind: 'import',
    issueUrl: 'https://github.com/lyswhut/lx-music-desktop/issues/3001',
    homepageUrl: 'https://lxmusic.toside.cn/',
    repositoryUrl: 'https://github.com/lyswhut/lx-music-desktop',
    logoUrl: 'https://raw.githubusercontent.com/lyswhut/lx-music-desktop/master/resources/icons/512x512.png',
    summary: {
      'zh-CN': '超人气开源桌面音乐播放器。前往官网下载桌面端或移动端，在「我的列表」右键点击列表名或空白处选择「导入列表」，即可直接选择 PlaylistOut 导出的【洛雪音乐】JSON 文件秒级还原歌单并自由换源播放！',
      'en-US': 'Popular open-source desktop music player. Download from the official website, right-click "My Lists" and select "Import List" to restore playlists exported from PlaylistOut in one click!',
      default: '超人气开源桌面音乐播放器。前往官网下载桌面端或移动端，在「我的列表」右键点击列表名或空白处选择「导入列表」，即可直接选择 PlaylistOut 导出的【洛雪音乐】JSON 文件秒级还原歌单并自由换源播放！',
    },
  },
  {
    id: 'listen1',
    name: 'Listen 1',
    status: 'available',
    kind: 'import',
    issueUrl: 'https://github.com/listen1/listen1_desktop/issues/1413',
    homepageUrl: 'https://listen1.github.io/listen1/',
    repositoryUrl: 'https://github.com/listen1/listen1_desktop',
    logoUrl: 'https://raw.githubusercontent.com/listen1/listen1_desktop/master/app/images/logo.png',
    summary: {
      'zh-CN': '经典多合一开源音乐播放器（支持桌面端与 Chrome 扩展）。前往官网下载安装后，在「设置」➜「备份与恢复」点击「从本地文件恢复」，选择 PlaylistOut 导出的【Listen 1】JSON 文件即可直接导入自建歌单！',
      'en-US': 'Classic multi-platform open-source player (Desktop & Chrome Extension). Download from the official website, go to "Settings" ➜ "Backup & Restore" and click "Restore from local file" to import playlists exported from PlaylistOut!',
      default: '经典多合一开源音乐播放器（支持桌面端与 Chrome 扩展）。前往官网下载安装后，在「设置」➜「备份与恢复」点击「从本地文件恢复」，选择 PlaylistOut 导出的【Listen 1】JSON 文件即可直接导入自建歌单！',
    },
  },
];

export const UPCOMING_INTEGRATIONS: readonly UpcomingIntegration[] = [
  {
    id: 'bbplayer',
    name: 'BBPlayer',
    status: 'upcoming',
    kind: 'builtin',
    prUrl: 'https://github.com/bbplayer-app/BBPlayer/issues/340',
    issueUrl: 'https://github.com/bbplayer-app/BBPlayer/issues/340',
    homepageUrl: 'https://bbplayer.roitium.com',
    repositoryUrl: 'https://github.com/bbplayer-app/BBPlayer',
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
