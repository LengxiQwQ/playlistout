import { ProviderError, type Track } from '../../models/playlist';

export function normalizeAppleTrack(t: any, index: number): Track {
  const a = t?.attributes;
  if (t?.type !== 'songs' || !a?.name || !a.artistName || !t.id) throw new ProviderError('INCOMPLETE_PLAYLIST', '歌单包含无法解析的条目，未导出部分结果。', 422);
  return {
    index, id: t.id, title: a.name, artist: a.artistName, album: a.albumName,
    isrc: a.isrc, durationMs: a.durationInMillis, releaseDate: a.releaseDate,
    trackNumber: a.trackNumber, discNumber: a.discNumber, sourceUrl: a.url,
    coverUrl: a.artwork?.url?.replace('{w}', '600').replace('{h}', '600').replace('{c}', 'bb').replace('{f}', 'jpg'),
    status: 'unknown', statusText: '未知',
  };
}
