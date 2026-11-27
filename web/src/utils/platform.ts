/**
 * PlaylistOut Multi-Platform Registry & Utilities
 * Provides unified platform metadata, display names, labels, and URL resolvers.
 * Designed for seamless extensibility across QQ Music, NetEase Cloud Music, KuGou, Kuwo, etc.
 */

export type SupportedPlatform =
  | 'qqmusic'
  | 'netease'
  | 'kugou'
  | 'qishui'
  | 'kuwo'
  | 'migu'
  | 'spotify'
  | 'applemusic'
  | 'ytmusic';

export interface PlatformConfig {
  id: string;
  name: string;
  nameEn: string;
  color: 'green' | 'red' | 'blue' | 'yellow' | 'pink' | 'purple' | 'lime';
  badgeBg: string;
  badgeBorder: string;
  userIdLabelZh: string;
  userIdLabelEn: string;
  playlistStickerZh: string;
  playlistStickerEn: string;
  viewActionZh: string;
  viewActionEn: string;
  getPlaylistUrl: (id: string, sourceUrl?: string) => string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  qqmusic: {
    id: 'qqmusic',
    name: 'QQ 音乐',
    nameEn: 'QQ Music',
    color: 'green',
    badgeBg: 'var(--tint-mint-bg-soft)',
    badgeBorder: 'var(--tint-mint-fg)',
    userIdLabelZh: 'QQ 号',
    userIdLabelEn: 'QQ UIN',
    playlistStickerZh: 'QQ 音乐歌单',
    playlistStickerEn: 'QQ Music Playlist',
    viewActionZh: '在 QQ 音乐中查看 ↗',
    viewActionEn: 'View on QQ Music ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://y.qq.com/n/ryqq/playlist/${id}`,
  },
  netease: {
    id: 'netease',
    name: '网易云音乐',
    nameEn: 'NetEase Cloud Music',
    color: 'red',
    badgeBg: 'var(--tint-strawberry-bg-soft)',
    badgeBorder: 'var(--tint-strawberry-fg)',
    userIdLabelZh: '网易云 UID',
    userIdLabelEn: 'NetEase UID',
    playlistStickerZh: '网易云歌单',
    playlistStickerEn: 'NetEase Playlist',
    viewActionZh: '在网易云音乐中查看 ↗',
    viewActionEn: 'View on NetEase ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://music.163.com/#/playlist?id=${id}`,
  },
  qishui: {
    id: 'qishui',
    name: '汽水音乐',
    nameEn: 'Soda Music',
    color: 'lime',
    badgeBg: 'var(--tint-matcha-bg-soft)',
    badgeBorder: 'var(--tint-matcha-fg)',
    userIdLabelZh: '汽水 ID',
    userIdLabelEn: 'Soda ID',
    playlistStickerZh: '汽水音乐歌单',
    playlistStickerEn: 'Soda Music Playlist',
    viewActionZh: '在汽水音乐中查看 ↗',
    viewActionEn: 'View on Soda Music ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://music.douyin.com/qishui/share/playlist?playlist_id=${id}`,
  },
  kugou: {
    id: 'kugou',
    name: '酷狗音乐',
    nameEn: 'KuGou Music',
    color: 'blue',
    badgeBg: 'var(--tint-sky-bg-soft)',
    badgeBorder: 'var(--tint-sky-fg)',
    userIdLabelZh: '酷狗 ID',
    userIdLabelEn: 'KuGou ID',
    playlistStickerZh: '酷狗音乐歌单',
    playlistStickerEn: 'KuGou Playlist',
    viewActionZh: '在酷狗音乐中查看 ↗',
    viewActionEn: 'View on KuGou ↗',
    getPlaylistUrl: (id, sourceUrl) => {
      if (
        sourceUrl &&
        /^https?:\/\//i.test(sourceUrl) &&
        !sourceUrl.endsWith('/songlist/') &&
        !sourceUrl.endsWith('/songlist')
      ) {
        return sourceUrl;
      }
      if (/^https?:\/\//i.test(id)) return id;
      if (/^\d+$/.test(id)) {
        return `https://m.kugou.com/songlist/?listid=${id}`;
      }
      return `https://m.kugou.com/songlist/${id}/`;
    },
  },
  kuwo: {
    id: 'kuwo',
    name: '酷我音乐',
    nameEn: 'Kuwo Music',
    color: 'yellow',
    badgeBg: 'var(--tint-lemon-bg-soft)',
    badgeBorder: 'var(--tint-lemon-fg)',
    userIdLabelZh: '酷我 ID',
    userIdLabelEn: 'Kuwo ID',
    playlistStickerZh: '酷我音乐歌单',
    playlistStickerEn: 'Kuwo Playlist',
    viewActionZh: '在酷我音乐中查看 ↗',
    viewActionEn: 'View on Kuwo ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://www.kuwo.cn/playlist_detail/${id}`,
  },
  migu: {
    id: 'migu',
    name: '咪咕音乐',
    nameEn: 'Migu Music',
    color: 'pink',
    badgeBg: 'var(--tint-strawberry-bg-soft)',
    badgeBorder: 'var(--tint-strawberry-fg)',
    userIdLabelZh: '咪咕 ID',
    userIdLabelEn: 'Migu ID',
    playlistStickerZh: '咪咕音乐歌单',
    playlistStickerEn: 'Migu Music Playlist',
    viewActionZh: '在咪咕音乐中查看 ↗',
    viewActionEn: 'View on Migu Music ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://music.migu.cn/v5/#/playlist/${id}`,
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    nameEn: 'Spotify',
    color: 'green',
    badgeBg: 'var(--tint-mint-bg-soft)',
    badgeBorder: 'var(--tint-mint-fg)',
    userIdLabelZh: '用户 ID',
    userIdLabelEn: 'User ID',
    playlistStickerZh: 'Spotify歌单',
    playlistStickerEn: 'Spotify Playlist',
    viewActionZh: '在Spotify中查看 ↗',
    viewActionEn: 'View on Spotify ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://open.spotify.com/playlist/${id}`,
  },
  applemusic: {
    id: 'applemusic',
    name: 'Apple Music',
    nameEn: 'Apple Music',
    color: 'red',
    badgeBg: 'var(--tint-strawberry-bg-soft)',
    badgeBorder: 'var(--tint-strawberry-fg)',
    userIdLabelZh: '用户 ID',
    userIdLabelEn: 'User ID',
    playlistStickerZh: 'Apple Music歌单',
    playlistStickerEn: 'Apple Music Playlist',
    viewActionZh: '在Apple Music中查看 ↗',
    viewActionEn: 'View on Apple Music ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://music.apple.com/us/playlist/${id}`,
  },
  ytmusic: {
    id: 'ytmusic',
    name: 'YouTube Music',
    nameEn: 'YouTube Music',
    color: 'red',
    badgeBg: 'var(--tint-strawberry-bg-soft)',
    badgeBorder: 'var(--tint-strawberry-fg)',
    userIdLabelZh: '用户 ID',
    userIdLabelEn: 'User ID',
    playlistStickerZh: 'YouTube Music歌单',
    playlistStickerEn: 'YouTube Music Playlist',
    viewActionZh: '在YouTube Music中查看 ↗',
    viewActionEn: 'View on YouTube Music ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://music.youtube.com/playlist?list=${id}`,
  },
};

export function getPlatformConfig(platform?: string): PlatformConfig {
  const key = (platform || 'qqmusic').toLowerCase().trim();
  return (
    PLATFORMS[key] || {
      id: key,
      name: '音乐平台',
      nameEn: 'Music Platform',
      color: 'pink',
    badgeBg: 'var(--tint-strawberry-bg-soft)',
    badgeBorder: 'var(--tint-strawberry-fg)',
      userIdLabelZh: '用户 ID',
      userIdLabelEn: 'User ID',
      playlistStickerZh: '公开歌单',
      playlistStickerEn: 'Public Playlist',
      viewActionZh: '在原平台中查看 ↗',
      viewActionEn: 'View on Original Platform ↗',
      getPlaylistUrl: (id, sourceUrl) =>
        sourceUrl && /^https?:\/\//i.test(sourceUrl)
          ? sourceUrl
          : /^https?:\/\//i.test(id)
          ? id
          : '#',
    }
  );
}

export function getPlatformName(platform?: string, lang: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const config = getPlatformConfig(platform);
  return lang === 'en-US' ? config.nameEn : config.name;
}

export function getPlatformPlaylistSticker(platform?: string, lang: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const config = getPlatformConfig(platform);
  return lang === 'en-US' ? config.playlistStickerEn : config.playlistStickerZh;
}

export function getPlatformUserIdLabel(platform?: string, lang: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const config = getPlatformConfig(platform);
  return lang === 'en-US' ? config.userIdLabelEn : config.userIdLabelZh;
}

export function getPlatformViewAction(platform?: string, lang: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const config = getPlatformConfig(platform);
  return lang === 'en-US' ? config.viewActionEn : config.viewActionZh;
}

export function getPlatformPlaylistUrl(platform?: string, id?: string, sourceUrl?: string): string {
  const isBareSonglistUrl =
    sourceUrl &&
    (sourceUrl.endsWith('/songlist/') || sourceUrl.endsWith('/songlist'));
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !isBareSonglistUrl) return sourceUrl;
  if (id && /^https?:\/\//i.test(id) && !id.endsWith('/songlist/') && !id.endsWith('/songlist')) return id;
  const config = getPlatformConfig(platform);
  return config.getPlaylistUrl(id || '', sourceUrl);
}
