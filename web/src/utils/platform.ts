/**
 * PlaylistOut Multi-Platform Registry & Utilities
 * Provides unified platform metadata, display names, labels, and URL resolvers.
 * Designed for seamless extensibility across QQ Music, NetEase Cloud Music, KuGou, Kuwo, etc.
 */

export type SupportedPlatform = 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | string;

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
    badgeBg: '#f0fdf4',
    badgeBorder: '#059669',
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
    badgeBg: '#fff1f2',
    badgeBorder: '#e11d48',
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
    badgeBg: '#f7fee7',
    badgeBorder: '#65a30d',
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
    badgeBg: '#eff6ff',
    badgeBorder: '#2563eb',
    userIdLabelZh: '酷狗 ID',
    userIdLabelEn: 'KuGou ID',
    playlistStickerZh: '酷狗音乐歌单',
    playlistStickerEn: 'KuGou Playlist',
    viewActionZh: '在酷狗音乐中查看 ↗',
    viewActionEn: 'View on KuGou ↗',
    getPlaylistUrl: (id, sourceUrl) =>
      sourceUrl && /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : /^https?:\/\//i.test(id)
        ? id
        : `https://www.kugou.com/songlist/${id}/`,
  },
  kuwo: {
    id: 'kuwo',
    name: '酷我音乐',
    nameEn: 'Kuwo Music',
    color: 'yellow',
    badgeBg: '#fefce8',
    badgeBorder: '#ca8a04',
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
};

export function getPlatformConfig(platform?: string): PlatformConfig {
  const key = (platform || 'qqmusic').toLowerCase().trim();
  return (
    PLATFORMS[key] || {
      id: key,
      name: '音乐平台',
      nameEn: 'Music Platform',
      color: 'pink',
      badgeBg: '#fdf4ff',
      badgeBorder: '#c026d3',
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
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) return sourceUrl;
  if (id && /^https?:\/\//i.test(id)) return id;
  const config = getPlatformConfig(platform);
  return config.getPlaylistUrl(id || '', sourceUrl);
}
