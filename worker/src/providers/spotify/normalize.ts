import type { Track } from '../../models/playlist';

export function normalizeSpotifyTrack(item: any, index: number): Track | null {
  const t = item?.itemV2?.data;
  if (!t || !t.name) return null;

  const typename = t.__typename;
  const uri = typeof t.uri === 'string' ? t.uri : '';
  const uriParts = uri.split(':');
  const rawId = uriParts[uriParts.length - 1] || uri;

  let title = t.name;
  let artist = '';
  let album: string | undefined;
  let coverUrl: string | undefined;
  const durationMs = t.trackDuration?.totalMilliseconds ?? t.localTrackDuration?.totalMilliseconds ?? t.duration?.totalMilliseconds;
  let sourceUrl: string | undefined = uri || undefined;
  let id = rawId;

  if (typename === 'Track') {
    artist = t.artists?.items?.map((a: any) => a.profile?.name).filter(Boolean).join(', ');
    album = t.albumOfTrack?.name;
    coverUrl = t.albumOfTrack?.coverArt?.sources?.[0]?.url;
    if (rawId) {
      sourceUrl = `https://open.spotify.com/track/${rawId}`;
    }
  } else if (typename === 'LocalTrack') {
    artist = t.artistName || '';
    album = t.albumName;
    id = uri ? uri.replace(/^spotify:/, '') : rawId;
    sourceUrl = uri || undefined;
  } else if (typename === 'Episode') {
    const podcast = t.podcastV2?.data?.name ?? t.show?.name;
    artist = podcast || '播客节目';
    album = podcast;
    coverUrl = t.coverArt?.sources?.[0]?.url;
    if (rawId) {
      sourceUrl = `https://open.spotify.com/episode/${rawId}`;
    }
  } else {
    artist = t.artistName || t.artists?.items?.map((a: any) => a.profile?.name).filter(Boolean).join(', ') || '';
    album = t.albumName || t.albumOfTrack?.name;
    coverUrl = t.coverArt?.sources?.[0]?.url || t.albumOfTrack?.coverArt?.sources?.[0]?.url;
  }

  if (!artist) {
    artist = typename === 'LocalTrack' ? '未知歌手' : '未知艺术家';
  }

  return {
    index,
    title,
    artist,
    id: id || undefined,
    album: album || undefined,
    durationMs: typeof durationMs === 'number' && Number.isFinite(durationMs) ? durationMs : undefined,
    trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : undefined,
    coverUrl: coverUrl || undefined,
    sourceUrl,
    status: 'unknown',
    statusText: typename === 'LocalTrack' ? '本地文件' : '未知',
  };
}
