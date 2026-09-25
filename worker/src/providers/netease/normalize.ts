import type { Playlist, Track, TrackAvailability } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';

export interface RawNeteaseArtist {
  id?: number | string;
  name?: string;
}

export interface RawNeteaseAlbum {
  id?: number | string;
  name?: string;
  picUrl?: string;
}

export interface RawNeteasePrivilege {
  id?: number | string;
  fee?: number;
  st?: number;
  pl?: number;
  dl?: number;
  sp?: number;
  cp?: number;
}

export interface RawNeteaseSong {
  id?: number | string;
  name?: string;
  ar?: RawNeteaseArtist[];
  artists?: RawNeteaseArtist[];
  al?: RawNeteaseAlbum;
  album?: RawNeteaseAlbum;
  dt?: number;
  duration?: number;
  fee?: number;
  mv?: number | string;
  noCopyrightRcmd?: unknown;
  privilege?: RawNeteasePrivilege;
}

export interface RawNeteasePlaylistDetail {
  id?: number | string;
  name?: string;
  coverImgUrl?: string;
  trackCount?: number;
  playCount?: number;
  createTime?: number;
  updateTime?: number;
  description?: string;
  tags?: string[];
  creator?: {
    userId?: number | string;
    nickname?: string;
  };
  trackIds?: Array<{ id: number | string }>;
  tracks?: RawNeteaseSong[];
}

export interface RawNeteasePlaylistDetailResponse {
  code?: number;
  playlist?: RawNeteasePlaylistDetail;
  privileges?: RawNeteasePrivilege[];
}

export interface RawNeteaseSongDetailResponse {
  code?: number;
  songs?: RawNeteaseSong[];
  privileges?: RawNeteasePrivilege[];
}

/**
 * Derives availability status from NetEase song and privilege records.
 */
export function determineNeteaseTrackStatus(
  song: RawNeteaseSong,
  privilege?: RawNeteasePrivilege,
): { isAvailable: boolean; isVip: boolean; status: TrackAvailability; statusText: string } {
  const priv = privilege || song.privilege;
  const fee = typeof song.fee === 'number' ? song.fee : priv?.fee ?? 0;
  const st = priv?.st;
  const pl = priv?.pl;
  const isVip = fee === 1;

  // 1. Identify overseas-only geo-restriction:
  // In NetEase, st = -200 or rcmd with type=1/regional message indicates region restriction for overseas IP,
  // but the track is completely playable in Mainland China. As requested, treat it as normal/domestic without alerts.
  const rcmd =
    song.noCopyrightRcmd && typeof song.noCopyrightRcmd === 'object'
      ? (song.noCopyrightRcmd as Record<string, any>)
      : undefined;
  const isGeoRcmd = Boolean(
    rcmd &&
      (rcmd.type === 1 ||
        (typeof rcmd.typeDesc === 'string' &&
          (rcmd.typeDesc.includes('地区') || rcmd.typeDesc.includes('国家')))),
  );
  const isGeoOnly = st === -200 || isGeoRcmd;

  // 2. Truly unplayable / removed / copyright expired domestically:
  // st < 0 (except st === -200 which is overseas-only)
  if (typeof st === 'number' && st < 0 && !isGeoOnly) {
    return {
      isAvailable: false,
      isVip,
      status: 'unplayable',
      statusText: '下架/无版权',
    };
  }

  // Explicit non-geo noCopyright recommendation
  if (song.noCopyrightRcmd && !isGeoOnly) {
    return {
      isAvailable: false,
      isVip,
      status: 'unplayable',
      statusText: '下架/无版权',
    };
  }

  // pl === 0 with non-VIP/non-paid fee indicates playability is blocked
  if (typeof pl === 'number' && pl === 0 && fee !== 1 && fee !== 4 && !isGeoOnly) {
    return {
      isAvailable: false,
      isVip: false,
      status: 'unplayable',
      statusText: '下架/无版权',
    };
  }

  // 3. Paid Digital Album (fee === 4)
  if (fee === 4) {
    return {
      isAvailable: true,
      isVip: false,
      status: 'paid',
      statusText: '付费专辑',
    };
  }

  // 4. VIP Only (fee === 1)
  if (isVip) {
    return {
      isAvailable: true,
      isVip: true,
      status: 'vip',
      statusText: 'VIP专享',
    };
  }

  // 5. Normal playable (including overseas-only geo-restriction which is normal domestically)
  return {
    isAvailable: true,
    isVip: false,
    status: 'playable',
    statusText: '正常',
  };
}

/**
 * Normalizes raw NetEase song entry into a typed PlaylistOut Track.
 */
export function normalizeNeteaseTrack(
  rawSong: RawNeteaseSong,
  index: number,
  privilege?: RawNeteasePrivilege,
): Track {
  if (!rawSong || typeof rawSong !== 'object') {
    throw new ProviderError('PARSE_ERROR', `Malformed NetEase song item at index ${index}.`, 502);
  }

  const rawTitle = (rawSong.name || '').trim();
  const title = rawTitle || '未知歌曲';

  // Artists
  const rawArtists = Array.isArray(rawSong.ar) ? rawSong.ar : Array.isArray(rawSong.artists) ? rawSong.artists : [];
  let artists: string[] = [];
  let artistList: import('../../models/playlist').TrackArtist[] = [];
  
  for (const a of rawArtists) {
    if (a && typeof a === 'object') {
      const name = (a.name || '').trim();
      if (name) {
        artists.push(name);
        const aId = a.id !== undefined && a.id !== null ? String(a.id) : undefined;
        artistList.push({ id: aId, name });
      }
    }
  }

  // Album
  const rawAlbum = rawSong.al || rawSong.album;
  let album: string | undefined;
  let albumObj: import('../../models/playlist').TrackAlbum | undefined;
  if (rawAlbum && typeof rawAlbum === 'object' && typeof rawAlbum.name === 'string' && rawAlbum.name.trim().length > 0) {
    album = rawAlbum.name.trim();
    const aId = rawAlbum.id !== undefined && rawAlbum.id !== null ? String(rawAlbum.id) : undefined;
    albumObj = { id: aId, name: album };
  }

  // Duration
  const durationMs =
    typeof rawSong.dt === 'number' && rawSong.dt >= 0
      ? rawSong.dt
      : typeof rawSong.duration === 'number' && rawSong.duration >= 0
        ? rawSong.duration
        : undefined;

  // Track ID and URLs
  const trackId = rawSong.id !== undefined && rawSong.id !== null ? String(rawSong.id).trim() : undefined;
  const sourceUrl = trackId ? `https://music.163.com/#/song?id=${trackId}` : undefined;
  
  // MV
  const mvId = rawSong.mv !== undefined && rawSong.mv !== 0 && rawSong.mv !== null ? String(rawSong.mv).trim() : undefined;

  // Cover URL
  let coverUrl: string | undefined;
  if (rawAlbum && typeof rawAlbum === 'object' && typeof rawAlbum.picUrl === 'string' && rawAlbum.picUrl.trim().length > 0) {
    coverUrl = rawAlbum.picUrl.trim().replace(/^http:\/\//i, 'https://');
  }

  const statusInfo = determineNeteaseTrackStatus(rawSong, privilege);
  
  // Max Audio Quality
  const priv = privilege || rawSong.privilege;
  let maxQuality: string | undefined;
  if (priv && typeof priv.dl === 'number') {
    // NetEase maxbr / dl flags: 999000 is SQ/FLAC, 320000 is 320kbps
    if (priv.dl >= 999000) {
      maxQuality = 'FLAC';
    } else if (priv.dl >= 320000) {
      maxQuality = '320kbps';
    } else if (priv.dl >= 128000) {
      maxQuality = '128kbps';
    }
  }

  return {
    index,
    id: trackId,
    title,
    artists,
    artistList: artistList.length > 0 ? artistList : undefined,
    album,
    albumObj,
    durationMs,
    sourceUrl,
    coverUrl,
    isAvailable: statusInfo.isAvailable,
    isVip: statusInfo.isVip,
    status: statusInfo.status,
    statusText: statusInfo.statusText,
    mvId,
    maxQuality,
    rawIds: trackId ? { netease_id: trackId } : undefined,
  };
}

/**
 * Normalizes raw NetEase playlist detail response into PlaylistOut contract.
 */
export function normalizeNeteasePlaylist(
  detail: RawNeteasePlaylistDetail,
  tracks: Track[],
): Playlist {
  if (!detail || typeof detail !== 'object') {
    throw new ProviderError('PARSE_ERROR', 'Empty or invalid NetEase playlist data.', 502);
  }

  const id = String(detail.id || '').trim();
  const name = (detail.name || '').trim();
  if (!name) {
    throw new ProviderError('PARSE_ERROR', 'NetEase playlist missing mandatory name.', 502);
  }

  const creator = detail.creator?.nickname?.trim() || undefined;
  const coverUrl = detail.coverImgUrl ? detail.coverImgUrl.replace(/^http:\/\//i, 'https://') : undefined;
  const trackCount = typeof detail.trackCount === 'number' ? detail.trackCount : tracks.length;

  return {
    platform: 'netease',
    id,
    name,
    creator,
    coverUrl,
    trackCount,
    tracks,
    createTime:
      typeof detail.createTime === 'number' && detail.createTime > 0
        ? (detail.createTime > 1e11 ? Math.floor(detail.createTime / 1000) : detail.createTime)
        : undefined,
    updateTime:
      typeof detail.updateTime === 'number' && detail.updateTime > 0
        ? (detail.updateTime > 1e11 ? Math.floor(detail.updateTime / 1000) : detail.updateTime)
        : undefined,
    description: typeof detail.description === 'string' ? detail.description.trim() : undefined,
    tags: Array.isArray(detail.tags) ? detail.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0) : undefined,
    playCount: typeof detail.playCount === 'number' ? detail.playCount : undefined,
    sourceUrl: `https://music.163.com/#/playlist?id=${id}`,
  };
}
