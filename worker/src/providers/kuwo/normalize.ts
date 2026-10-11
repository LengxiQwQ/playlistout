import type { Playlist, Track, TrackAvailability } from '../../models/playlist';
import type { RawKuwoPlaylistData, RawKuwoSong } from './types';

/**
 * Basic HTML entity unescaper for track and artist titles.
 */
function unescapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Normalizes a raw Kuwo song into PlaylistOut canonical Track contract.
 */
export function normalizeKuwoTrack(raw: RawKuwoSong, index: number): Track {
  const title = unescapeHtml(String(raw.name || '').trim()) || '未知歌曲';
  const artist = unescapeHtml(String(raw.artist || '').trim()) || '未知歌手';
  const album = raw.album ? unescapeHtml(String(raw.album).trim()) : undefined;

  const rid = raw.rid != null ? String(raw.rid).trim() : undefined;
  const durationSec = typeof raw.duration === 'number'
    ? raw.duration
    : Number(raw.duration || 0);
  const durationMs = durationSec > 0 ? Math.round(durationSec * 1000) : undefined;

  const coverUrl = String(raw.pic || raw.albumpic || raw.pic120 || '').trim() || undefined;
  const releaseDate = raw.releaseDate ? String(raw.releaseDate).trim() : undefined;

  const isListenFee = Boolean(raw.isListenFee);
  const isVipFee = raw.payInfo?.feeType?.vip === '1' || raw.payInfo?.feeType?.song === '1';
  const isVip = isListenFee || isVipFee;

  // online === 0 indicates the song is taken down / unplayable
  const isAvailable = raw.online !== 0;

  let status: TrackAvailability = 'playable';
  if (!isAvailable) {
    status = 'unplayable';
  } else if (isVip) {
    status = 'vip';
  }

  const sourceUrl = rid ? `https://www.kuwo.cn/play_detail/${rid}` : undefined;

  return {
    index,
    title,
    artist,
    album: album || undefined,
    id: rid,
    durationMs,
    releaseDate,
    coverUrl,
    isVip,
    isAvailable,
    status,
    sourceUrl,
  };
}

/**
 * Normalizes raw Kuwo playlist metadata and tracks into PlaylistOut canonical Playlist contract.
 */
export function normalizeKuwoPlaylist(
  playlistId: string,
  raw: RawKuwoPlaylistData,
  tracks: Track[],
): Playlist {
  const name = unescapeHtml(String(raw.name || '').trim()) || '酷我歌单';
  const creator = unescapeHtml(String(raw.uname || '').trim()) || '酷我用户';
  const coverUrl = String(raw.img700 || raw.img || raw.img300 || raw.uPic || '').trim() || undefined;
  const description = raw.info ? unescapeHtml(String(raw.info).trim()) : undefined;
  const playCount = typeof raw.listencnt === 'number' ? raw.listencnt : Number(raw.listencnt || 0) || undefined;

  const rawTotal = typeof raw.total === 'number' ? raw.total : Number(raw.total || 0);
  const trackCount = rawTotal > 0 ? rawTotal : tracks.length;

  return {
    platform: 'kuwo',
    id: String(playlistId),
    name,
    creator,
    coverUrl,
    trackCount,
    tracks,
    description: description || undefined,
    playCount,
    sourceUrl: `https://www.kuwo.cn/playlist_detail/${playlistId}`,
  };
}
