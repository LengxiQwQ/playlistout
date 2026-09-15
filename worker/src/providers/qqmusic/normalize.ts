import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';

export interface RawQQSinger {
  id?: number;
  mid?: string;
  name?: string;
  title?: string;
}

export interface RawQQAlbum {
  id?: number;
  mid?: string;
  name?: string;
  title?: string;
}

export interface RawQQSong {
  songid?: number | string;
  id?: number | string;
  songmid?: string;
  mid?: string;
  songname?: string;
  name?: string;
  title?: string;
  singer?: RawQQSinger[];
  albumname?: string;
  albummid?: string;
  album?: RawQQAlbum | string;
  interval?: number;
  pay?: {
    payplay?: number;
    payalbum?: number;
    payinfo?: number;
  };
  action?: {
    switch?: number;
    msgid?: number;
    alert?: number;
  };
  msgid?: number;
  alertid?: number;
  size128?: number;
  size320?: number;
  sizeflac?: number;
}

export interface RawQQCdItem {
  disstid?: string;
  dissname?: string;
  title?: string;
  nickname?: string;
  nick?: string;
  logo?: string;
  picurl?: string;
  total_song_num?: number;
  songnum?: number;
  cur_song_num?: number;
  song_begin?: number;
  ctime?: number;
  mtime?: number;
  desc?: string;
  tags?: Array<{ id?: number; name?: string; pid?: number }>;
  visitnum?: number;
  listennum?: number;
  songlist?: RawQQSong[];
}

export interface RawCYQQResponse {
  code?: number;
  subcode?: number;
  cdlist?: RawQQCdItem[];
}

export interface RawMusicUResponse {
  code?: number;
  playlist?: {
    code?: number;
    data?: {
      code?: number;
      dirinfo?: {
        id?: number | string;
        title?: string;
        creator?: {
          nick?: string;
          name?: string;
        };
        picurl?: string;
        total_song_num?: number;
        songnum?: number;
        ctime?: number;
        mtime?: number;
        desc?: string;
        tag?: Array<{ id?: number; name?: string; pid?: number }>;
        vec_tagname?: string[];
        listennum?: number;
        visitnum?: number;
      };
      songlist?: RawQQSong[];
    };
  };
}

/**
 * Normalizes raw song entry into a typed PlaylistOut Track.
 */
export function normalizeQQTrack(rawSong: RawQQSong, index: number): Track {
  if (!rawSong || typeof rawSong !== 'object') {
    throw new ProviderError('PARSE_ERROR', `Malformed song item at index ${index}.`, 502);
  }

  const rawTitle = rawSong.songname || rawSong.name || rawSong.title;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) {
    throw new ProviderError('PARSE_ERROR', `Missing mandatory track title for song at index ${index}.`, 502);
  }

  // Extract artists array
  let artists: string[] = [];
  if (Array.isArray(rawSong.singer)) {
    artists = rawSong.singer
      .map((s) => (s && typeof s === 'object' ? (s.name || s.title || '').trim() : ''))
      .filter((name) => name.length > 0);
  }

  // Extract album name
  let album: string | undefined;
  if (typeof rawSong.albumname === 'string' && rawSong.albumname.trim().length > 0) {
    album = rawSong.albumname.trim();
  } else if (rawSong.album && typeof rawSong.album === 'object') {
    const albumObjName = (rawSong.album.name || rawSong.album.title || '').trim();
    if (albumObjName.length > 0) {
      album = albumObjName;
    }
  }

  // Extract ID (prefer mid if available, fallback to id)
  const trackMid = (rawSong.songmid || rawSong.mid || '').trim();
  const trackId = rawSong.songid ?? rawSong.id;
  const id = trackMid || (trackId !== undefined && trackId !== null ? String(trackId).trim() : undefined);

  // Duration in milliseconds
  const intervalSeconds = typeof rawSong.interval === 'number' && rawSong.interval >= 0 ? rawSong.interval : undefined;
  const durationMs = intervalSeconds !== undefined ? intervalSeconds * 1000 : undefined;

  // Source URL
  const sourceUrl = trackMid ? `https://y.qq.com/n/ryqq/songDetail/${trackMid}` : undefined;

  // Track / Album Cover URL (zero additional requests: derived directly from raw upstream album mid)
  let albumMid: string | undefined;
  if (typeof rawSong.albummid === 'string' && rawSong.albummid.trim().length > 0) {
    albumMid = rawSong.albummid.trim();
  } else if (rawSong.album && typeof rawSong.album === 'object' && typeof rawSong.album.mid === 'string' && rawSong.album.mid.trim().length > 0) {
    albumMid = rawSong.album.mid.trim();
  }
  const coverUrl = albumMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg` : undefined;

  // Derive track availability & VIP status
  const isVip = rawSong.pay?.payplay === 1;
  let isAvailable = true;
  let status: import('../../models/playlist').TrackAvailability = isVip ? 'vip' : 'playable';
  let statusText = isVip ? 'VIP专享' : '正常';

  const isGeoBlockedOnly =
    rawSong.alertid === 2 ||
    rawSong.alertid === 21 ||
    rawSong.action?.msgid === 14 ||
    rawSong.msgid === 14;

  if (isGeoBlockedOnly) {
    // Overseas-only restriction: completely playable in Mainland China. Treat as normal without alerts.
    isAvailable = true;
    if (rawSong.pay?.payalbum === 1) {
      status = 'paid';
      statusText = '付费专辑';
    } else if (isVip) {
      status = 'vip';
      statusText = 'VIP专享';
    } else {
      status = 'playable';
      statusText = '正常';
    }
  } else if (rawSong.alertid !== undefined && rawSong.alertid !== 0) {
    isAvailable = false;
    status = 'unplayable';
    statusText = '下架/无版权';
  } else if (
    rawSong.size128 === 0 &&
    rawSong.size320 === 0 &&
    (rawSong.sizeflac === undefined || rawSong.sizeflac === 0)
  ) {
    isAvailable = false;
    status = 'unplayable';
    statusText = '下架/无版权';
  } else if (rawSong.pay?.payalbum === 1) {
    isAvailable = true;
    status = 'paid';
    statusText = '付费专辑';
  } else if (isVip) {
    isAvailable = true;
    status = 'vip';
    statusText = 'VIP专享';
  }

  return {
    index,
    id,
    title,
    artists,
    album,
    durationMs,
    sourceUrl,
    coverUrl,
    isAvailable,
    isVip,
    status,
    statusText,
  };
}

/**
 * Helper to extract expected total song count from upstream metadata container.
 */
export function extractTotalExpected(container: { total_song_num?: number; songnum?: number }): number | undefined {
  if (typeof container.total_song_num === 'number' && container.total_song_num >= 0) {
    return container.total_song_num;
  }
  if (typeof container.songnum === 'number' && container.songnum >= 0) {
    return container.songnum;
  }
  return undefined;
}

/**
 * Normalizes c.y.qq.com response into a PlaylistOut Playlist.
 */
export function normalizeCYQQResponse(payload: RawCYQQResponse, expectedId: string): Playlist {
  if (!payload || typeof payload !== 'object') {
    throw new ProviderError('PARSE_ERROR', 'Upstream returned invalid or empty response object.', 502);
  }

  if (payload.code !== 0) {
    if (payload.code === 10 || payload.code === -1) {
      throw new ProviderError('PLAYLIST_NOT_FOUND', `QQ Music playlist ${expectedId} does not exist or is private.`, 404);
    }
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music returned error code: ${payload.code}.`, 502);
  }

  if (!Array.isArray(payload.cdlist) || payload.cdlist.length === 0) {
    throw new ProviderError('PLAYLIST_NOT_FOUND', `QQ Music playlist ${expectedId} was not found or has no content.`, 404);
  }

  const cd = payload.cdlist[0];
  const name = (cd.dissname || cd.title || '').trim();
  if (!name) {
    throw new ProviderError('PARSE_ERROR', 'QQ Music response is missing playlist name.', 502);
  }

  const creatorRaw = (cd.nickname || cd.nick || '').trim();
  const creator = creatorRaw.length > 0 ? creatorRaw : undefined;

  let coverUrl = (cd.logo || cd.picurl || '').trim();
  if (coverUrl.startsWith('http://')) {
    coverUrl = `https://${coverUrl.slice(7)}`;
  }
  const normalizedCoverUrl = coverUrl.length > 0 ? coverUrl : undefined;

  const rawSonglist = Array.isArray(cd.songlist) ? cd.songlist : [];
  const tracks: Track[] = rawSonglist.map((song, idx) => normalizeQQTrack(song, idx + 1));

  const totalExpected = extractTotalExpected(cd);
  if (totalExpected !== undefined && tracks.length !== totalExpected) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: QQ Music reported ${totalExpected} songs, but only ${tracks.length} are present.`,
      502,
      { expectedCount: totalExpected, actualCount: tracks.length },
    );
  }

  const createTime = typeof cd.ctime === 'number' && cd.ctime > 0 ? cd.ctime : undefined;
  const updateTime = typeof cd.mtime === 'number' && cd.mtime > 0 ? cd.mtime : undefined;
  const descRaw = (cd.desc || '').trim();
  const description = descRaw.length > 0 ? descRaw : undefined;
  const tags: string[] = Array.isArray(cd.tags)
    ? cd.tags.map((t) => (t?.name || '').trim()).filter((n) => n.length > 0)
    : [];
  const playCount = typeof cd.visitnum === 'number' && cd.visitnum > 0
    ? cd.visitnum
    : typeof cd.listennum === 'number' && cd.listennum > 0
      ? cd.listennum
      : undefined;
  const sourceUrl = `https://y.qq.com/n/ryqq/playlist/${expectedId}`;

  return {
    platform: 'qqmusic',
    id: expectedId,
    name,
    creator,
    coverUrl: normalizedCoverUrl,
    trackCount: tracks.length,
    tracks,
    createTime,
    updateTime,
    description,
    tags: tags.length > 0 ? tags : undefined,
    playCount,
    sourceUrl,
  };
}

/**
 * Normalizes u.y.qq.com musicu response into a PlaylistOut Playlist.
 */
export function normalizeMusicUResponse(payload: RawMusicUResponse, expectedId: string): Playlist {
  if (!payload || typeof payload !== 'object') {
    throw new ProviderError('PARSE_ERROR', 'Upstream returned invalid or empty response object.', 502);
  }

  const pl = payload.playlist;
  if (!pl || pl.code !== 0 || !pl.data) {
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music musicu returned non-zero code or missing data.`, 502);
  }

  const data = pl.data;
  const dirinfo = data.dirinfo || {};
  const name = (dirinfo.title || '').trim();
  if (!name) {
    throw new ProviderError('PARSE_ERROR', 'QQ Music musicu response is missing playlist title.', 502);
  }

  const creatorRaw = (dirinfo.creator?.nick || dirinfo.creator?.name || '').trim();
  const creator = creatorRaw.length > 0 ? creatorRaw : undefined;

  let coverUrl = (dirinfo.picurl || '').trim();
  if (coverUrl.startsWith('http://')) {
    coverUrl = `https://${coverUrl.slice(7)}`;
  }
  const normalizedCoverUrl = coverUrl.length > 0 ? coverUrl : undefined;

  const rawSonglist = Array.isArray(data.songlist) ? data.songlist : [];
  const tracks: Track[] = rawSonglist.map((song, idx) => normalizeQQTrack(song, idx + 1));

  const totalExpected = extractTotalExpected(dirinfo);
  if (totalExpected !== undefined && tracks.length !== totalExpected) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: QQ Music reported ${totalExpected} songs, but only ${tracks.length} are present.`,
      502,
      { expectedCount: totalExpected, actualCount: tracks.length },
    );
  }

  const createTime = typeof dirinfo.ctime === 'number' && dirinfo.ctime > 0 ? dirinfo.ctime : undefined;
  const updateTime = typeof dirinfo.mtime === 'number' && dirinfo.mtime > 0 ? dirinfo.mtime : undefined;
  const descRaw = (dirinfo.desc || '').trim();
  const description = descRaw.length > 0 ? descRaw : undefined;
  const tags: string[] = Array.isArray(dirinfo.vec_tagname) && dirinfo.vec_tagname.length > 0
    ? dirinfo.vec_tagname.map((t) => String(t).trim()).filter((n) => n.length > 0)
    : Array.isArray(dirinfo.tag)
      ? dirinfo.tag.map((t) => (t?.name || '').trim()).filter((n) => n.length > 0)
      : [];
  const playCount = typeof dirinfo.listennum === 'number' && dirinfo.listennum > 0
    ? dirinfo.listennum
    : typeof dirinfo.visitnum === 'number' && dirinfo.visitnum > 0
      ? dirinfo.visitnum
      : undefined;
  const sourceUrl = `https://y.qq.com/n/ryqq/playlist/${expectedId}`;

  return {
    platform: 'qqmusic',
    id: expectedId,
    name,
    creator,
    coverUrl: normalizedCoverUrl,
    trackCount: tracks.length,
    tracks,
    createTime,
    updateTime,
    description,
    tags: tags.length > 0 ? tags : undefined,
    playCount,
    sourceUrl,
  };
}
