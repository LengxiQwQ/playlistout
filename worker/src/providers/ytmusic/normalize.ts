import type { Playlist, Track, YoutubePlaylistMeta, YoutubeTrackMeta } from '../../models/playlist';
import { reversePlaylistTracks } from '../international/order';

export function normalizeYoutubeMusicPlaylist(
  playlistId: string,
  initialData: any,
  allTrackItems: any[]
): Playlist {
  const header =
    initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer ||
    initialData?.header?.musicDetailHeaderRenderer ||
    initialData?.header?.musicResponsiveHeaderRenderer ||
    initialData?.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer ||
    {};

  const title =
    extractRunsText(header.title) ||
    header.title?.simpleText ||
    initialData?.microformat?.microformatDataRenderer?.title ||
    'YouTube Music 歌单';

  const description =
    extractRunsText(header.description) ||
    extractRunsText(header.description?.musicDescriptionShelfRenderer?.description) ||
    header.description?.simpleText ||
    initialData?.microformat?.microformatDataRenderer?.description ||
    '';

  const thumbnails =
    header.thumbnail?.croppedSquareThumbnailRenderer?.thumbnails ||
    header.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
    initialData?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails ||
    [];
  const coverUrl = pickBestThumbnail(thumbnails);

  let creator = '';
  let channelId: string | undefined;

  const subtitleRuns = header.subtitle?.runs || header.straplineTextOne?.runs || [];
  for (const run of subtitleRuns) {
    const browseId = run?.navigationEndpoint?.browseEndpoint?.browseId;
    if (browseId && typeof browseId === 'string' && browseId.startsWith('UC')) {
      creator = run.text;
      channelId = browseId;
      break;
    }
  }
  if (!creator && subtitleRuns.length > 0) {
    const candidate = subtitleRuns[0]?.text || '';
    if (candidate !== 'Playlist' && candidate !== '歌单') {
      creator = candidate;
    }
  }
  if (!creator) {
    const mfDesc = initialData?.microformat?.microformatDataRenderer?.description || '';
    const parts = mfDesc.split('•').map((s: string) => s.trim());
    if (parts.length > 1 && parts[1]) {
      creator = parts[1];
    }
  }

  // 尝试从 secondSubtitle 提取总曲目数
  let totalCount = allTrackItems.length;
  const secondSubtitleRuns = header.secondSubtitle?.runs || [];
  for (const run of secondSubtitleRuns) {
    const countMatch = (run.text || '').match(/(\d+[\d,]*)\s*(?:首|songs?|tracks?)/i);
    if (countMatch) {
      const parsed = parseInt(countMatch[1].replace(/,/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        totalCount = Math.max(totalCount, parsed);
      }
    }
  }

  const tracks: Track[] = [];
  for (const item of allTrackItems) {
    const track = normalizeYoutubeMusicTrack(item, tracks.length + 1);
    if (track) {
      tracks.push(track);
    }
  }

  reversePlaylistTracks(tracks);

  const youtubeMeta: YoutubePlaylistMeta = {
    playlistId,
    channelId,
    channelUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : undefined,
    privacy: 'PUBLIC',
  };

  return {
    platform: 'ytmusic',
    id: playlistId,
    name: title,
    creator: creator || undefined,
    coverUrl: coverUrl || undefined,
    description: description || undefined,
    sourceUrl: `https://music.youtube.com/playlist?list=${playlistId}`,
    trackCount: totalCount,
    tracks,
    youtube: youtubeMeta,
  };
}

export function normalizeYoutubeMusicTrack(item: any, index: number): Track | null {
  const renderer = item?.musicResponsiveListItemRenderer;
  if (!renderer) return null;

  const flexCols = renderer.flexColumns || [];
  if (flexCols.length === 0) return null;

  // flexColumn[0]: 标题与 VideoId
  const col0Runs = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const title = col0Runs[0]?.text || '';
  if (!title) return null;

  let videoId =
    col0Runs[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
    renderer.playlistItemData?.videoId ||
    renderer.navigationEndpoint?.watchEndpoint?.videoId ||
    '';

  // flexColumn[1]: 歌手、专辑、时长等信息
  const col1Runs = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const artists: string[] = [];
  let primaryArtistChannelId: string | undefined;
  let album: string | undefined;
  let durationMs: number | undefined;

  for (let i = 0; i < col1Runs.length; i++) {
    const run = col1Runs[i];
    const text = (run?.text || '').trim();
    if (!text || text === '•' || text === ',') continue;

    const browseId = run?.navigationEndpoint?.browseEndpoint?.browseId;
    if (browseId && typeof browseId === 'string') {
      if (browseId.startsWith('UC')) {
        artists.push(text);
        if (!primaryArtistChannelId) primaryArtistChannelId = browseId;
      } else if (browseId.startsWith('MPRE') || browseId.startsWith('OLAK')) {
        album = text;
      }
    } else if (/^\d+:\d+(?::\d+)?$/.test(text)) {
      durationMs = parseDurationMs(text);
    } else if (artists.length === 0) {
      artists.push(text);
    } else if (!album && durationMs === undefined) {
      album = text;
    }
  }

  // 若 flexCols[2] 或后续列中存在时长
  if (durationMs === undefined && flexCols.length > 2) {
    const col2Runs = flexCols[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    for (const run of col2Runs) {
      const text = (run?.text || '').trim();
      if (/^\d+:\d+(?::\d+)?$/.test(text)) {
        durationMs = parseDurationMs(text);
        break;
      }
    }
  }

  // 若存在 fixedColumns (桌面端 WEB_REMIX 常将时长置于 fixedColumns[0])
  if (durationMs === undefined && Array.isArray(renderer.fixedColumns)) {
    for (const fixedCol of renderer.fixedColumns) {
      const fixedRuns = fixedCol?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || [];
      for (const run of fixedRuns) {
        const text = (run?.text || '').trim();
        if (/^\d+:\d+(?::\d+)?$/.test(text)) {
          durationMs = parseDurationMs(text);
          break;
        }
      }
      if (durationMs !== undefined) break;
    }
  }

  // 封面提取
  const thumbArray = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const coverUrl = pickBestThumbnail(thumbArray);

  // 脏标 Explicit 判断
  let isExplicit = false;
  const badges = renderer.badges || [];
  for (const badge of badges) {
    const badgeRenderer = badge.musicInlineBadgeRenderer;
    if (badgeRenderer) {
      const iconType = badgeRenderer.icon?.iconType;
      const label = badgeRenderer.accessibilityData?.accessibilityData?.label;
      if (iconType === 'MUSIC_EXPLICIT_BADGE' || /explicit/i.test(label || '')) {
        isExplicit = true;
        break;
      }
    }
  }

  // 可播状态
  const isDisabled = Boolean(renderer.disabled);
  const isAvailable = !isDisabled;
  const status = isAvailable ? 'playable' : 'unplayable';
  const statusText = isAvailable ? '正常' : '下架/不可播';

  // 视频类型
  const musicVideoType =
    col0Runs[0]?.navigationEndpoint?.watchEndpoint?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType ||
    renderer.navigationEndpoint?.watchEndpoint?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType ||
    undefined;

  const youtubeTrackMeta: YoutubeTrackMeta = {
    videoId: videoId || '',
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    musicUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : '',
    videoType: musicVideoType,
    isExplicit: isExplicit || undefined,
    channelId: primaryArtistChannelId,
    channelUrl: primaryArtistChannelId ? `https://www.youtube.com/channel/${primaryArtistChannelId}` : undefined,
    setVideoId: renderer.playlistItemData?.videoId || undefined,
  };

  return {
    index,
    title,
    artist: artists.length > 0 ? artists.join(', ') : '未知歌手',
    album: album || undefined,
    id: videoId || undefined,
    durationMs,
    coverUrl: coverUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined),
    sourceUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : undefined,
    isAvailable,
    status,
    statusText,
    youtube: youtubeTrackMeta,
  };
}

function extractRunsText(obj: any): string {
  if (!obj) return '';
  if (Array.isArray(obj.runs)) {
    return obj.runs.map((r: any) => r?.text || '').join('');
  }
  return '';
}

function pickBestThumbnail(thumbnails: any[]): string | undefined {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return undefined;
  let best = thumbnails[0];
  let maxWidth = best.width || 0;
  for (let i = 1; i < thumbnails.length; i++) {
    const t = thumbnails[i];
    if ((t.width || 0) > maxWidth) {
      maxWidth = t.width || 0;
      best = t;
    }
  }
  return best?.url || undefined;
}

function parseDurationMs(durationStr: string): number | undefined {
  const parts = durationStr.split(':').map(Number);
  if (parts.some(p => isNaN(p))) return undefined;
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return undefined;
}
