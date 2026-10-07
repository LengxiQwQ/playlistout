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
  subp?: number;
  toast?: boolean;
  flag?: number;
  maxbr?: number;
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
  publishTime?: number;
  no?: number;
  cd?: string | number;
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
 * Accurately differentiates overseas geo-restrictions from genuine copyright takedowns.
 */
export function determineNeteaseTrackStatus(
  song: RawNeteaseSong,
  privilege?: RawNeteasePrivilege,
): { isAvailable: boolean; isVip: boolean; status: TrackAvailability; statusText: string } {
  const priv = privilege || song.privilege;
  const fee = typeof song.fee === 'number' ? song.fee : priv?.fee ?? 0;
  const st = priv?.st;
  const cp = priv?.cp;
  const subp = priv?.subp;
  const isVip = fee === 1;

  // 1. Identify explicit overseas-only geo restriction:
  // If noCopyrightRcmd specifically notes region/country/overseas restriction,
  // it is only restricted for overseas IPs, but is completely playable domestically in Mainland China.
  const rcmd =
    song.noCopyrightRcmd && typeof song.noCopyrightRcmd === 'object'
      ? (song.noCopyrightRcmd as Record<string, any>)
      : undefined;

  const isExplicitGeoRcmd = Boolean(
    rcmd &&
      typeof rcmd.typeDesc === 'string' &&
      (rcmd.typeDesc.includes('地区') || rcmd.typeDesc.includes('国家') || rcmd.typeDesc.includes('海外'))
  );

  // 2. Identify true takedowns / copyright expired:
  // - Explicit copyright takedown recommendation (e.g. "MV可播", "其它版本可播" when not geo-restricted)
  // - Both cp === 0 and subp === 0 (no copyright & cannot subscribe/play), unless it is a paid digital album (fee === 4)
  // - Explicit takedown status code st === -1
  const isTakedownRcmd = Boolean(rcmd && !isExplicitGeoRcmd);
  const isCopyrightExpired = typeof cp === 'number' && typeof subp === 'number' && cp === 0 && subp === 0 && fee !== 4;
  const isExplicitTakedownSt = st === -1;

  if (isTakedownRcmd || isCopyrightExpired || isExplicitTakedownSt) {
    return {
      isAvailable: false,
      isVip,
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

  // 5. Normal playable (including fee === 8, fee === 0, and overseas geo-restricted tracks)
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
  const artists: string[] = [];
  for (const a of rawArtists) {
    if (a && typeof a === 'object') {
      const name = (a.name || '').trim();
      if (name) {
        artists.push(name);
      }
    }
  }
  const artist = artists.join(', ');

  // Album
  const rawAlbum = rawSong.al || rawSong.album;
  let album: string | undefined;
  if (rawAlbum && typeof rawAlbum === 'object' && typeof rawAlbum.name === 'string' && rawAlbum.name.trim().length > 0) {
    album = rawAlbum.name.trim();
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

  // Release Date (YYYY-MM-DD from publishTime ms timestamp if available)
  let releaseDate: string | undefined;
  if (typeof rawSong.publishTime === 'number' && rawSong.publishTime > 0) {
    const d = new Date(rawSong.publishTime);
    if (!isNaN(d.getTime())) {
      releaseDate = d.toISOString().slice(0, 10);
    }
  }

  // Track & Disc numbers
  const trackNumber =
    typeof rawSong.no === 'number' && rawSong.no > 0 ? rawSong.no : undefined;
  let discNumber: number | undefined;
  if (rawSong.cd !== undefined && rawSong.cd !== null) {
    const parsedCd = parseInt(String(rawSong.cd), 10);
    if (Number.isInteger(parsedCd) && parsedCd > 0) {
      discNumber = parsedCd;
    }
  }

  // MV
  const mvId = rawSong.mv !== undefined && rawSong.mv !== 0 && rawSong.mv !== null ? String(rawSong.mv).trim() : undefined;
  const mvUrl = mvId ? `https://music.163.com/#/mv?id=${mvId}` : undefined;

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
    title,
    artist,
    album,
    id: trackId,
    durationMs,
    releaseDate,
    trackNumber,
    discNumber,
    sourceUrl,
    coverUrl,
    isAvailable: statusInfo.isAvailable,
    isVip: statusInfo.isVip,
    status: statusInfo.status,
    statusText: statusInfo.statusText,
    maxQuality,
    mvId,
    mvUrl,
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
