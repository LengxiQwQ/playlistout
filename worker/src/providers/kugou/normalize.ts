/**
 * Kugou Track and Playlist Normalizer
 * Conforms to PlaylistOut Normalized Data Contract (docs/PROJECT-CONSTITUTION.md Section 6)
 */

import type { Playlist, Track, PlaylistRetrievalInfo } from '../../models/playlist';

export interface KugouRawSong {
  hash?: string;
  FileHash?: string;
  name?: string;
  songname?: string;
  filename?: string;
  singername?: string;
  singerinfo?: Array<{ name?: string }>;
  albuminfo?: { name?: string; id?: number | string };
  album_name?: string;
  AlbumName?: string;
  timelen?: number;
  duration?: number;
  cover?: string;
  pic?: string;
  trans_param?: { union_cover?: string };
  privilege?: number;
  Privilege?: number;
}

export interface KugouRawListInfo {
  name?: string;
  specialname?: string;
  pic?: string;
  imgurl?: string;
  intro?: string;
  list_create_username?: string;
  nickname?: string;
  username?: string;
  singername?: string;
  count?: number;
  songcount?: number;
  heat?: number;
  playcount?: number;
  play_count?: number;
  publishtime?: string;
  publish_time?: string;
  create_time?: string;
  ctime?: number | string;
  /** Tags from special playlists: [{ tagid, tagname }] */
  tags?: Array<{ tagid?: number; tagname?: string; name?: string }>;
  /** Tags from user-curated playlists (usually empty array) */
  musiclib_tags?: Array<{ tagid?: number; tagname?: string; name?: string }>;
}

/**
 * Extracts a Unix timestamp (seconds) for playlist creation from raw listInfo.
 * Tries explicit time fields first, then falls back to parsing the cover image URL.
 */
function extractKugouCreateTime(listInfo: KugouRawListInfo): number | undefined {
  // 1. Explicit publishtime / publish_time / create_time (e.g. "2019-09-18 00:00:00")
  const timeStr = listInfo.publishtime || listInfo.publish_time || listInfo.create_time;
  if (timeStr) {
    const normalized = timeStr.trim().replace(' ', 'T');
    const ts = Date.parse(normalized);
    if (!isNaN(ts) && ts > 0) return Math.floor(ts / 1000);
  }

  // 2. Numeric ctime field
  if (listInfo.ctime !== undefined && listInfo.ctime !== null) {
    const ct = Number(listInfo.ctime);
    if (!isNaN(ct) && ct > 0) {
      return ct > 1e11 ? Math.floor(ct / 1000) : ct;
    }
  }

  // 3. Fallback: parse creation date from cover image URL
  // URLs look like: http://c1.kgimg.com/stdmusic/{size}/20210314/20210314100214878628.jpg
  // The directory component "YYYYMMDD" encodes the upload date ≈ creation date.
  const coverUrl = listInfo.pic || listInfo.imgurl;
  if (coverUrl) {
    const match = coverUrl.match(/\/(\d{4})(\d{2})(\d{2})\//);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const dt = Date.UTC(year, month, day, 0, 0, 0);
        if (!isNaN(dt) && dt > 0) return Math.floor(dt / 1000);
      }
    }
  }

  return undefined;
}

/**
 * Extracts normalized tag strings from raw listInfo.
 */
function extractKugouTags(listInfo: KugouRawListInfo): string[] | undefined {
  const rawTags = listInfo.tags || listInfo.musiclib_tags;
  if (!Array.isArray(rawTags) || rawTags.length === 0) return undefined;
  const tags = rawTags
    .map((t) => (t.tagname || t.name || '').trim())
    .filter((n) => n.length > 0);
  return tags.length > 0 ? tags : undefined;
}

/**
 * Normalizes artist name(s) and track title from raw Kugou song data.
 */
function extractTitleAndArtists(item: KugouRawSong): { title: string; artists: string[] } {
  const rawName = (item.name || item.songname || item.filename || '').trim();

  // 1. Try explicit singerinfo array
  if (item.singerinfo && Array.isArray(item.singerinfo) && item.singerinfo.length > 0) {
    const artists = item.singerinfo
      .map((s) => (s.name || '').trim())
      .filter((n) => n.length > 0);

    if (artists.length > 0) {
      // If rawName starts with "Artist - ", strip it to get the clean title
      let title = rawName;
      const splitIdx = rawName.indexOf(' - ');
      if (splitIdx !== -1) {
        title = rawName.substring(splitIdx + 3).trim();
      }
      return {
        title: title || rawName || '未知歌曲',
        artists,
      };
    }
  }

  // 2. Try explicit singername
  if (item.singername && item.singername.trim()) {
    const artist = item.singername.trim();
    let title = rawName;
    const splitIdx = rawName.indexOf(' - ');
    if (splitIdx !== -1) {
      title = rawName.substring(splitIdx + 3).trim();
    }
    return {
      title: title || rawName || '未知歌曲',
      artists: [artist],
    };
  }

  // 3. Fallback: parse "Artist - Title" format
  const parts = rawName.split(' - ');
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return {
      title: title || rawName,
      artists: artist ? [artist] : ['未知歌手'],
    };
  }

  return {
    title: rawName || '未知歌曲',
    artists: ['未知歌手'],
  };
}

/**
 * Normalizes cover URL by replacing template placeholders.
 */
function normalizeCoverUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace('{size}', '400').replace(/\\\//g, '/');
}

/**
 * Normalizes a single raw Kugou song into a PlaylistOut Track.
 */
export function normalizeKugouTrack(rawSong: KugouRawSong, index: number): Track {
  const { title, artists } = extractTitleAndArtists(rawSong);

  const hash = rawSong.hash || rawSong.FileHash || '';
  const album =
    rawSong.albuminfo?.name ||
    rawSong.album_name ||
    rawSong.AlbumName ||
    undefined;

  // Duration in milliseconds (timelen is ms, duration is seconds)
  let durationMs: number | undefined;
  if (rawSong.timelen && rawSong.timelen > 0) {
    durationMs = rawSong.timelen;
  } else if (rawSong.duration && rawSong.duration > 0) {
    durationMs = rawSong.duration > 1000 ? rawSong.duration : rawSong.duration * 1000;
  }

  const coverUrl =
    normalizeCoverUrl(rawSong.cover) ||
    normalizeCoverUrl(rawSong.trans_param?.union_cover) ||
    normalizeCoverUrl(rawSong.pic);

  const privilege = rawSong.privilege ?? rawSong.Privilege ?? 0;
  const isVip = privilege === 10;

  return {
    index,
    id: hash || undefined,
    title,
    artists,
    album: album || undefined,
    durationMs,
    sourceUrl: hash ? `https://www.kugou.com/song/#hash=${hash}` : undefined,
    coverUrl,
    isAvailable: true,
    isVip,
    status: isVip ? 'vip' : 'playable',
  };
}

/**
 * Normalizes playlist metadata and tracks into a PlaylistOut Playlist.
 */
export function normalizeKugouPlaylist(options: {
  id: string;
  listInfo: KugouRawListInfo;
  tracks: Track[];
  sourceUrl?: string;
  isPartialPreview?: boolean;
  retrieval?: PlaylistRetrievalInfo;
}): Playlist {
  const { id, listInfo, tracks, sourceUrl, isPartialPreview, retrieval: explicitRetrieval } = options;

  const name = (listInfo.name || listInfo.specialname || '酷狗歌单').trim();
  const creator =
    (listInfo.list_create_username ||
      listInfo.nickname ||
      listInfo.username ||
      listInfo.singername ||
      '').trim() || undefined;

  const coverUrl = normalizeCoverUrl(listInfo.pic || listInfo.imgurl);
  const totalCount = Number(listInfo.count || listInfo.songcount || tracks.length);
  const playCount =
    Number(listInfo.playcount || listInfo.play_count || listInfo.heat || 0) || undefined;

  const createTime = extractKugouCreateTime(listInfo);
  const tags = extractKugouTags(listInfo);

  let description = (listInfo.intro || '').trim() || undefined;

  // If this is a partial preview due to platform restrictions, append note to description
  if (isPartialPreview && tracks.length < totalCount) {
    const previewNotice = `[平台限制提示] 受酷狗音乐官方限制，公开分享链接仅提供前 ${tracks.length} 首预览（歌单实际共 ${totalCount} 首）。`;
    description = description ? `${description}\n\n${previewNotice}` : previewNotice;
  }

  const retrieval: PlaylistRetrievalInfo =
    explicitRetrieval ||
    (isPartialPreview
      ? { mode: 'preview', reason: 'platform_preview' }
      : { mode: 'full' });

  return {
    platform: 'kugou',
    id,
    name,
    creator,
    coverUrl,
    trackCount: totalCount,
    tracks,
    createTime,
    description,
    playCount,
    tags,
    sourceUrl,
    retrieval,
  };
}
