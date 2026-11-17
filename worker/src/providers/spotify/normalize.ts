import { ProviderError, type Track } from '../../models/playlist';

export function normalizeSpotifyTrack(item: any, index: number): Track {
  const t = item?.itemV2?.data;
  if (t?.__typename !== 'Track' || !t.name || !t.uri) throw new ProviderError('INCOMPLETE_PLAYLIST', '歌单包含当前无法解析的条目，未导出部分结果。', 422);
  const album = t.albumOfTrack;
  const artists = t.artists?.items?.map((a: any) => a.profile?.name).filter(Boolean).join(', ');
  if (!artists) throw new ProviderError('PARSE_ERROR', '歌曲缺少歌手信息。', 502);
  const id = t.uri.split(':').pop();
  return {
    index, title: t.name, artist: artists, id, album: album?.name,
    durationMs: t.trackDuration?.totalMilliseconds ?? t.duration?.totalMilliseconds,
    trackNumber: t.trackNumber, coverUrl: album?.coverArt?.sources?.[0]?.url,
    sourceUrl: `https://open.spotify.com/track/${id}`, status: 'unknown', statusText: '未知',
  };
}
