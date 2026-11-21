import { ProviderError, type Playlist } from '../../models/playlist';
import { RequestBudget, json, setRequestCost } from '../international/http';
import { ytmusicId } from './input';
import { normalizeYoutubeMusicPlaylist } from './normalize';

// YouTube Music 客户端通用公开 API 密钥 (与官方 Web 端及开源逆向库一致)
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4usTF0kyav5FSzMoocSFc';
const INNERTUBE_HOSTS = new Set(['music.youtube.com', 'www.youtube.com', 'youtube.com']);

const DEFAULT_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20241118.01.00',
    hl: 'zh-CN',
    gl: 'US',
  },
};

export async function fetchYoutubeMusicPlaylist(rawInput: string): Promise<Playlist> {
  const playlistId = ytmusicId(rawInput);
  if (!playlistId) {
    throw new ProviderError('INVALID_INPUT', '请提供有效的 YouTube Music 或 YouTube 歌单链接或 ID。');
  }

  const budget = new RequestBudget(INNERTUBE_HOSTS);
  const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;

  // 1. 发起首屏 browse 请求
  const firstUrl = `https://music.youtube.com/youtubei/v1/browse?key=${INNERTUBE_API_KEY}`;
  const firstPayload = JSON.stringify({
    context: DEFAULT_CONTEXT,
    browseId,
  });

  const firstText = await budget.post(firstUrl, firstPayload, {
    origin: 'https://music.youtube.com',
    referer: 'https://music.youtube.com/',
  });

  const firstData = json(firstText);

  // 检查首屏是否存在未找到或私密限制
  const alertRenderer = firstData?.alerts?.[0]?.alertRenderer;
  if (alertRenderer && alertRenderer.type === 'ERROR') {
    const msg = alertRenderer.text?.runs?.map((r: any) => r.text).join('') || '歌单不存在或未公开。';
    throw new ProviderError('PLAYLIST_NOT_FOUND', msg, 404);
  }

  // 提取首屏列表容器与歌曲
  const sectionContents =
    firstData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
    [];

  let shelf = sectionContents[0]?.musicPlaylistShelfRenderer || sectionContents[0]?.musicShelfRenderer;
  if (!shelf) {
    for (const section of sectionContents) {
      if (section?.musicPlaylistShelfRenderer || section?.musicShelfRenderer) {
        shelf = section.musicPlaylistShelfRenderer || section.musicShelfRenderer;
        break;
      }
    }
  }

  const trackItems: any[] = [];
  if (shelf?.contents && Array.isArray(shelf.contents)) {
    trackItems.push(...shelf.contents);
  }

  let continuationToken: string | undefined = extractContinuationToken(shelf?.continuations);

  // 2. 分页处理 Continuation Tokens (上限 3000 首，请求次数受 RequestBudget 限制)
  while (continuationToken && trackItems.length < 3000) {
    const nextUrl = `https://music.youtube.com/youtubei/v1/browse?key=${INNERTUBE_API_KEY}&continuation=${continuationToken}`;
    const nextPayload = JSON.stringify({
      context: DEFAULT_CONTEXT,
    });

    const nextText = await budget.post(nextUrl, nextPayload, {
      origin: 'https://music.youtube.com',
      referer: 'https://music.youtube.com/',
    });

    const nextData = json(nextText);
    const contShelf =
      nextData?.continuationContents?.musicPlaylistShelfContinuation ||
      nextData?.continuationContents?.musicShelfContinuation;

    if (!contShelf) {
      break;
    }

    if (contShelf.contents && Array.isArray(contShelf.contents)) {
      trackItems.push(...contShelf.contents);
    }

    continuationToken = extractContinuationToken(contShelf.continuations);
  }

  const playlist = normalizeYoutubeMusicPlaylist(playlistId, firstData, trackItems);
  setRequestCost(playlist, budget.count);

  return playlist;
}

function extractContinuationToken(continuations: any[] | undefined): string | undefined {
  if (!Array.isArray(continuations) || continuations.length === 0) return undefined;
  return continuations[0]?.nextContinuationData?.continuation;
}
