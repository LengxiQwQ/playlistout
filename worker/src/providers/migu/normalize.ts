import type { Playlist, Track, TrackAvailability } from '../../models/playlist';
import type { RawMiguSongItem, RawMiguPlaylistMeta } from './types';

const OSS_IMAGE_HOST = 'https://d.musicapp.migu.cn';

/**
 * Normalizes an image path to a full HTTPS URL if needed.
 */
function resolveMiguImageUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return undefined;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${OSS_IMAGE_HOST}${trimmed}`;
  return `${OSS_IMAGE_HOST}/${trimmed}`;
}

/**
 * Determines the maximum audio quality descriptor from audioFormats.
 */
function resolveMaxQuality(formats?: RawMiguSongItem['audioFormats']): string | undefined {
  if (!formats || !Array.isArray(formats) || formats.length === 0) return undefined;
  const types = formats.map((f) => String(f.formatType || '').toUpperCase());
  if (types.some((t) => t.includes('ZQ24') || t.includes('24BIT') || t.includes('HI-RES'))) {
    return 'Hi-Res';
  }
  if (types.some((t) => t === 'SQ' || t.includes('FLAC') || t.includes('LOSSLESS'))) {
    return 'FLAC';
  }
  if (types.some((t) => t === 'HQ' || t.includes('320'))) {
    return '320kbps';
  }
  if (types.some((t) => t === 'PQ' || t.includes('128'))) {
    return '128kbps';
  }
  return undefined;
}

/**
 * Determines the playback availability, VIP requirement, and status text.
 */
function resolveAvailability(raw: RawMiguSongItem): {
  isAvailable: boolean;
  isVip: boolean;
  status: TrackAvailability;
  statusText: string;
} {
  // 1. Off-shelf / No copyright
  if (raw.restrictType === -1 || raw.copyrightType === 0) {
    return {
      isAvailable: false,
      isVip: false,
      status: 'unplayable',
      statusText: '下架/无版权',
    };
  }

  // 2. VIP requirement
  const hasVipTag = Array.isArray(raw.showTags) && raw.showTags.some((t) => String(t).toLowerCase() === 'vip');
  const formats = raw.audioFormats || [];
  const allFormatsRequireVip =
    formats.length > 0 &&
    formats.every((f) =>
      Array.isArray(f.showTagsNew) && f.showTagsNew.some((tag) => String(tag).toLowerCase().includes('vip')),
    );

  if (raw.restrictType === 1 || hasVipTag || allFormatsRequireVip) {
    return {
      isAvailable: true,
      isVip: true,
      status: 'vip',
      statusText: 'VIP专享',
    };
  }

  // 3. Normal playable
  return {
    isAvailable: true,
    isVip: false,
    status: 'playable',
    statusText: '正常',
  };
}

/**
 * Normalizes a raw Migu song into the unified Track contract.
 */
export function normalizeMiguTrack(raw: RawMiguSongItem, index: number): Track {
  const { isAvailable, isVip, status, statusText } = resolveAvailability(raw);
  const artist =
    Array.isArray(raw.singerList) && raw.singerList.length > 0
      ? raw.singerList
          .map((s) => (s.name || '').trim())
          .filter(Boolean)
          .join(' / ') || '未知歌手'
      : '未知歌手';

  const songId = String(raw.songId || raw.contentId || '').trim();
  const rawCover = raw.img1 || raw.img2 || raw.img3;
  const coverUrl = resolveMiguImageUrl(rawCover);
  const durationMs =
    typeof raw.duration === 'number' && raw.duration > 0
      ? Math.round(raw.duration * 1000)
      : undefined;

  return {
    index,
    title: (raw.songName || '未知歌曲').trim(),
    artist,
    album: raw.album ? raw.album.trim() : undefined,
    id: songId || undefined,
    durationMs,
    coverUrl,
    sourceUrl: songId ? `https://music.migu.cn/v5/#/song/${songId}` : undefined,
    mvId: raw.mvId ? String(raw.mvId).trim() : undefined,
    isAvailable,
    isVip,
    status,
    statusText,
    maxQuality: resolveMaxQuality(raw.audioFormats),
  };
}

/**
 * Normalizes raw Migu playlist meta and tracks into the unified Playlist contract.
 */
export function normalizeMiguPlaylist(
  meta: RawMiguPlaylistMeta | undefined,
  tracks: Track[],
  playlistId: string,
): Playlist {
  const name = meta?.title?.trim() || `咪咕歌单_${playlistId}`;
  const creator = meta?.ownerName?.trim() || '咪咕音乐用户';
  const rawCover = meta?.originalImgUrl || meta?.imgItem?.img;
  const coverUrl = resolveMiguImageUrl(rawCover);
  const trackCount = typeof meta?.musicNum === 'number' ? meta.musicNum : tracks.length;

  return {
    platform: 'migu',
    id: playlistId,
    name,
    creator,
    coverUrl,
    trackCount,
    tracks,
  };
}
