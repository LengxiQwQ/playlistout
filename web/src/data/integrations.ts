export type IntegrationStatus = 'available' | 'proposed' | 'planned';

export interface OpenSourceIntegration {
  id: 'musicfree' | 'lx-music' | 'bbplayer' | 'listen1' | 'moosync';
  name: string;
  status: IntegrationStatus;
  pluginUrl?: string;
  guideUrl?: string;
  issueUrl?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  logoUrl?: string;
}

export const MUSICFREE_PLUGIN_URL =
  'https://playlistout.lengxiqwq.com/plugins/musicfree.js';

export const OPEN_SOURCE_INTEGRATIONS: readonly OpenSourceIntegration[] = [
  {
    id: 'musicfree',
    name: 'MusicFree',
    status: 'available',
    pluginUrl: MUSICFREE_PLUGIN_URL,
    guideUrl: 'https://github.com/LengxiQwQ/playlistout/tree/main/plugins/musicfree',
    homepageUrl: 'https://musicfree.catcat.work/',
    repositoryUrl: 'https://github.com/maotoumao/MusicFree',
    logoUrl: 'https://raw.githubusercontent.com/maotoumao/MusicFreeDesktop/master/res/logo.png',
  },
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

export const SUPPORTED_INTEGRATION_COUNT = OPEN_SOURCE_INTEGRATIONS.filter(
  (integration) => integration.status === 'available',
).length;
