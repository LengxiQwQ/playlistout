import type { Playlist, Track, TrackAvailability } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';

export interface RawQishuiCover {
  uri?: string;
  urls?: string[];
  template_prefix?: string;
  url?: string;
}

export interface RawQishuiArtist {
  id?: string | number;
  name?: string;
  artist_name?: string;
  simple_display_name?: string;
  user?: {
    nickname?: string;
    uid?: string;
  };
}

export interface RawQishuiAlbum {
  id?: string | number;
  name?: string;
  release_date?: number;
  url_cover?: RawQishuiCover;
}

export interface RawQishuiPlayDetail {
  need_vip?: boolean;
  need_purchase?: boolean;
}

export interface RawQishuiQualityMapItem {
  play_detail?: RawQishuiPlayDetail;
}

export interface RawQishuiLabelInfo {
  only_vip_playable?: boolean;
  only_vip_download?: boolean;
  quality_only_vip_can_play?: string[];
  quality_only_vip_can_download?: string[];
  quality_map?: Record<string, RawQishuiQualityMapItem>;
  is_original?: boolean;
}

export interface RawQishuiTrack {
  id?: string | number;
  name?: string;
  title?: string;
  duration?: number;
  duration_ms?: number;
  vid?: string;
  artists?: RawQishuiArtist[];
  album?: RawQishuiAlbum;
  url_cover?: RawQishuiCover;
  label_info?: RawQishuiLabelInfo;
  bit_rates?: Array<{ br?: number; quality?: string }>;
  media_type?: string;
  state?: Record<string, unknown>;
}

export interface RawQishuiVideo {
  id?: string | number;
  video_id?: string | number;
  vid?: string;
  name?: string;
  title?: string;
  description?: string;
  duration?: number;
  artists?: Array<{
    id?: string | number;
    name?: string;
    artist_name?: string;
    simple_display_name?: string;
    user_info?: {
      id?: string | number;
      nickname?: string;
      medium_avatar_url?: RawQishuiCover;
      thumb_avatar_url?: RawQishuiCover;
      url_avatar?: RawQishuiCover;
    };
    user?: {
      nickname?: string;
      uid?: string;
    };
  }>;
  cover_url?: RawQishuiCover;
  share_cover_url?: RawQishuiCover;
  image_url?: RawQishuiCover;
  label_info?: RawQishuiLabelInfo;
}

export interface RawQishuiMediaResource {
  id?: string;
  type?: string;
  index?: string | number;
  entity?: {
    track_wrapper?: {
      track?: RawQishuiTrack;
    };
    track?: RawQishuiTrack;
    video_wrapper?: {
      video?: RawQishuiVideo;
    };
    video?: RawQishuiVideo;
  };
  video?: RawQishuiVideo;
  track?: RawQishuiTrack;
}

export interface RawQishuiOwner {
  id?: string | number;
  uid?: string | number;
  nickname?: string;
  medium_avatar_url?: RawQishuiCover;
  thumb_avatar_url?: RawQishuiCover;
  url_avatar?: RawQishuiCover;
}

export interface RawAwemeMusic {
  id?: string | number;
  id_str?: string;
  mid?: string;
  title?: string;
  author?: string;
  album?: string;
  duration?: number;
  is_original_sound?: boolean;
  status?: number;
  source_platform?: number;
  cover_hd?: { url_list?: string[] };
  cover_large?: { url_list?: string[] };
  cover_medium?: { url_list?: string[] };
  cover_thumb?: { url_list?: string[] };
  play_url?: { url_list?: string[] };
}

export interface RawQishuiPlaylist {
  id: string | number;
  title?: string;
  name?: string;
  type?: number;
  count_tracks?: number;
  resource_cnt?: {
    track_cnt?: number;
    ugc_video_cnt?: number;
  };
  owner?: RawQishuiOwner;
  url_cover?: RawQishuiCover;
  create_time?: number;
  update_time?: number;
}

/**
 * Builds an accessible ImageX CDN URL from Qishui's url_cover object.
 */
export function buildQishuiImageUrl(
  cover?: RawQishuiCover | string,
  spec: string = 'crop-center:720:720.jpg',
): string | undefined {
  if (!cover) return undefined;
  if (typeof cover === 'string') return cover.trim() || undefined;

  if (cover.url && typeof cover.url === 'string') {
    return cover.url.trim() || undefined;
  }

  const prefix = Array.isArray(cover.urls) && cover.urls.length > 0 ? cover.urls[0] : '';
  const uri = cover.uri || '';
  if (!prefix && !uri) return undefined;

  const base = `${prefix}${uri}`;
  if (!base) return undefined;

  if (cover.template_prefix) {
    return `${base}~${cover.template_prefix}-${spec}`;
  }

  return base;
}

/**
 * Determines track availability and VIP status based on label_info.
 */
export function determineQishuiTrackStatus(track: Partial<RawQishuiTrack>): {
  isAvailable: boolean;
  isVip: boolean;
  status: TrackAvailability;
  statusText: string;
} {
  const labelInfo = track.label_info;

  // 1. VIP playable track
  if (labelInfo?.only_vip_playable) {
    return {
      isAvailable: true,
      isVip: true,
      status: 'vip',
      statusText: 'VIP专享',
    };
  }

  // 2. Paid digital purchase
  const mediumPlay = labelInfo?.quality_map?.medium?.play_detail;
  if (mediumPlay?.need_purchase) {
    return {
      isAvailable: true,
      isVip: false,
      status: 'paid',
      statusText: '付费专辑',
    };
  }

  // 3. Lossless VIP only (but standard is free)
  const losslessOnlyVip = labelInfo?.quality_only_vip_can_play?.includes('lossless');
  if (losslessOnlyVip && !labelInfo?.only_vip_playable) {
    return {
      isAvailable: true,
      isVip: false,
      status: 'playable',
      statusText: '正常',
    };
  }

  // 4. Fallback check for missing audio resources
  const hasAudio =
    (Array.isArray(track.bit_rates) && track.bit_rates.length > 0) ||
    Boolean(track.vid) ||
    (typeof track.duration === 'number' && track.duration > 0);

  if (!hasAudio && !track.name) {
    return {
      isAvailable: false,
      isVip: false,
      status: 'unplayable',
      statusText: '下架/无版权',
    };
  }

  return {
    isAvailable: true,
    isVip: false,
    status: 'playable',
    statusText: '正常',
  };
}

/**
 * Normalizes a single raw media item into a PlaylistOut Track.
 */
export function normalizeQishuiTrack(
  mediaResource: RawQishuiMediaResource,
  index: number,
): Track {
  if (!mediaResource || typeof mediaResource !== 'object') {
    throw new ProviderError('PARSE_ERROR', `Malformed Qishui track at index ${index}.`, 502);
  }

  const rawTrack =
    mediaResource.entity?.track_wrapper?.track ||
    mediaResource.entity?.track ||
    mediaResource.track;

  if (rawTrack) {
    const id = rawTrack.id !== undefined && rawTrack.id !== null ? String(rawTrack.id).trim() : undefined;
    const title = (rawTrack.name || rawTrack.title || '').trim() || '未知歌曲';

    // Artists
    const artists: string[] = [];
    const artistList: import('../../models/playlist').TrackArtist[] = [];
    if (Array.isArray(rawTrack.artists)) {
      for (const a of rawTrack.artists) {
        const name = (a.name || a.artist_name || a.simple_display_name || a.user?.nickname || '').trim();
        if (name) {
          artists.push(name);
          const aId = a.id !== undefined && a.id !== null ? String(a.id) : a.user?.uid !== undefined && a.user?.uid !== null ? String(a.user?.uid) : undefined;
          artistList.push({ id: aId, name });
        }
      }
    }
    if (artists.length === 0) {
      artists.push('未知艺人');
    }

    // Album
    let album: string | undefined;
    let albumObj: import('../../models/playlist').TrackAlbum | undefined;
    let publishTime: number | undefined;
    if (rawTrack.album?.name && rawTrack.album.name.trim().length > 0) {
      album = rawTrack.album.name.trim();
      const aId = rawTrack.album.id !== undefined && rawTrack.album.id !== null ? String(rawTrack.album.id) : undefined;
      albumObj = { id: aId, name: album };
      
      if (typeof rawTrack.album.release_date === 'number' && rawTrack.album.release_date > 0) {
        publishTime = rawTrack.album.release_date > 1e11 ? Math.floor(rawTrack.album.release_date / 1000) : rawTrack.album.release_date;
      }
    }

    // Duration
    const durationMs =
      typeof rawTrack.duration === 'number' && rawTrack.duration > 0
        ? rawTrack.duration
        : typeof rawTrack.duration_ms === 'number' && rawTrack.duration_ms > 0
          ? rawTrack.duration_ms
          : undefined;

    // Cover
    const coverUrl =
      buildQishuiImageUrl(rawTrack.album?.url_cover) ||
      buildQishuiImageUrl(rawTrack.url_cover);

    // Status
    const statusInfo = determineQishuiTrackStatus(rawTrack);

    // Max Quality
    let maxQuality: string | undefined;
    if (rawTrack.label_info?.quality_only_vip_can_play?.includes('lossless') || rawTrack.label_info?.quality_map?.lossless) {
      maxQuality = 'lossless';
    } else if (rawTrack.label_info?.quality_map?.high) {
      maxQuality = '320kbps';
    } else if (Array.isArray(rawTrack.bit_rates)) {
      if (rawTrack.bit_rates.some((b) => b.quality === 'lossless')) maxQuality = 'lossless';
      else if (rawTrack.bit_rates.some((b) => b.quality === 'high')) maxQuality = '320kbps';
    }

    return {
      index,
      id,
      title,
      artists,
      artistList: artistList.length > 0 ? artistList : undefined,
      album,
      albumObj,
      durationMs,
      coverUrl,
      sourceUrl: id ? `https://music.douyin.com/qishui/share/track?track_id=${id}` : undefined,
      isAvailable: statusInfo.isAvailable,
      isVip: statusInfo.isVip,
      isOriginalSound: Boolean(rawTrack.label_info?.is_original),
      status: statusInfo.status,
      statusText: statusInfo.statusText,
      publishTime,
      maxQuality,
      mvId: rawTrack.vid ? String(rawTrack.vid) : undefined,
      rawIds: id ? { qishui_track_id: id } : undefined,
    };
  }

  // Check if it's a video item (ugc_video, music_video, etc.)
  const rawVideo =
    mediaResource.entity?.video_wrapper?.video ||
    mediaResource.entity?.video ||
    mediaResource.video;

  if (rawVideo) {
    const vid =
      rawVideo.video_id !== undefined && rawVideo.video_id !== null
        ? String(rawVideo.video_id).trim()
        : rawVideo.id !== undefined && rawVideo.id !== null
          ? String(rawVideo.id).trim()
          : rawVideo.vid
            ? String(rawVideo.vid).trim()
            : mediaResource.id
              ? String(mediaResource.id).trim()
              : undefined;

    const title =
      (rawVideo.title || rawVideo.name || rawVideo.description || '').trim() || '视频片段';

    // Artists / Creators
    const artists: string[] = [];
    const artistList: import('../../models/playlist').TrackArtist[] = [];
    if (Array.isArray(rawVideo.artists)) {
      for (const a of rawVideo.artists) {
        const name = (
          a.name ||
          a.artist_name ||
          a.simple_display_name ||
          a.user_info?.nickname ||
          a.user?.nickname ||
          ''
        ).trim();
        if (name) {
          artists.push(name);
          const aId = a.id !== undefined && a.id !== null ? String(a.id) : a.user?.uid !== undefined && a.user?.uid !== null ? String(a.user?.uid) : undefined;
          artistList.push({ id: aId, name });
        }
      }
    }
    if (artists.length === 0) {
      artists.push('未知艺人');
    }

    // Duration: Qishui returns ms if > 10000, seconds otherwise
    let durationMs: number | undefined;
    if (typeof rawVideo.duration === 'number' && rawVideo.duration > 0) {
      durationMs = rawVideo.duration > 10000 ? rawVideo.duration : rawVideo.duration * 1000;
    }

    // Cover
    const coverUrl =
      buildQishuiImageUrl(rawVideo.cover_url) ||
      buildQishuiImageUrl(rawVideo.share_cover_url) ||
      buildQishuiImageUrl(rawVideo.image_url);

    const isVip = Boolean(rawVideo.label_info?.only_vip_playable);

    return {
      index,
      id: vid,
      title,
      artists,
      artistList: artistList.length > 0 ? artistList : undefined,
      durationMs,
      coverUrl,
      sourceUrl: vid ? `https://music.douyin.com/qishui/share/track?track_id=${vid}` : undefined,
      isAvailable: true,
      isVip,
      status: isVip ? 'vip' : 'playable',
      statusText: isVip ? 'VIP专享' : '视频',
      mvId: vid,
      rawIds: vid ? { qishui_vid: vid } : undefined,
    };
  }

  // Graceful fallback for unexpected/deleted non-empty items
  const fallbackId = mediaResource.id ? String(mediaResource.id).trim() : undefined;
  return {
    index,
    id: fallbackId,
    title: '未知或已下架音频',
    artists: ['未知艺人'],
    isAvailable: false,
    isVip: false,
    status: 'unplayable',
    statusText: '下架或不支持的内容',
  };
}

/**
 * Normalizes a raw Qishui playlist detail into a PlaylistOut Playlist.
 */
export function normalizeQishuiPlaylist(
  rawPlaylist: RawQishuiPlaylist,
  tracks: Track[],
): Playlist {
  if (!rawPlaylist || typeof rawPlaylist !== 'object') {
    throw new ProviderError('PARSE_ERROR', 'Empty or invalid Qishui playlist data.', 502);
  }

  const id = String(rawPlaylist.id || '').trim();
  const name = (rawPlaylist.title || rawPlaylist.name || '').trim();
  if (!name) {
    throw new ProviderError('PARSE_ERROR', 'Qishui playlist missing mandatory title.', 502);
  }

  const creator = rawPlaylist.owner?.nickname?.trim() || undefined;
  const coverUrl = buildQishuiImageUrl(rawPlaylist.url_cover);

  const trackCount =
    typeof rawPlaylist.count_tracks === 'number' && rawPlaylist.count_tracks > 0
      ? rawPlaylist.count_tracks
      : tracks.length;

  const createTime =
    typeof rawPlaylist.create_time === 'number' && rawPlaylist.create_time > 0
      ? (rawPlaylist.create_time > 1e11 ? Math.floor(rawPlaylist.create_time / 1000) : rawPlaylist.create_time)
      : undefined;

  const updateTime =
    typeof rawPlaylist.update_time === 'number' && rawPlaylist.update_time > 0
      ? (rawPlaylist.update_time > 1e11 ? Math.floor(rawPlaylist.update_time / 1000) : rawPlaylist.update_time)
      : undefined;

  return {
    platform: 'qishui',
    id,
    name,
    creator,
    coverUrl,
    trackCount,
    tracks,
    createTime,
    updateTime,
    sourceUrl: `https://music.douyin.com/qishui/share/playlist?playlist_id=${id}`,
  };
}

/**
 * Normalizes a raw Douyin/Aweme music collection item into a PlaylistOut Track.
 */
export function normalizeAwemeMusicTrack(raw: RawAwemeMusic, index: number): Track {
  if (!raw || typeof raw !== 'object') {
    throw new ProviderError('PARSE_ERROR', `Malformed Aweme music item at index ${index}.`, 502);
  }

  const id = raw.id_str || raw.mid || (raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined);
  const title = (raw.title || '').trim() || '未知歌曲';
  const author = (raw.author || '').trim();
  const artists = author ? [author] : ['未知艺人'];
  const album = raw.album?.trim() ? raw.album.trim() : undefined;
  const durationMs = typeof raw.duration === 'number' && raw.duration > 0 ? raw.duration * 1000 : undefined;
  const coverUrl =
    raw.cover_large?.url_list?.[0] ||
    raw.cover_hd?.url_list?.[0] ||
    raw.cover_medium?.url_list?.[0] ||
    raw.cover_thumb?.url_list?.[0];
  const sourceUrl = id ? `https://www.douyin.com/music/${id}` : undefined;
  const isOriginalSound = Boolean(raw.is_original_sound);
  const isAvailable = raw.status === 1 || raw.status === undefined;
  const status: TrackAvailability = isAvailable ? 'playable' : 'unplayable';
  const statusText = !isAvailable ? '下架/无版权' : (isOriginalSound ? '原声' : '歌曲');

  return {
    index,
    id,
    title,
    artists,
    album,
    durationMs,
    coverUrl,
    sourceUrl,
    isAvailable,
    isVip: false,
    isOriginalSound,
    status,
    statusText,
    rawIds: id ? { douyin_id: id } : undefined,
  };
}

