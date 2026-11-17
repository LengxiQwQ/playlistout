// Protocol reference: AliAkhtari78/SpotifyScraper, MIT, 9cbf05aa4963bac3684bb941270dcb62fc851ab7.
import { ProviderError, type Playlist, type Track } from '../../models/playlist';
import { RequestBudget, json, requireTotal, complete, setRequestCost } from '../international/http';
import { spotifyId } from './input';
import { normalizeSpotifyTrack } from './normalize';
import { reversePlaylistTracks } from '../international/order';

export const SPOTIFY_HOSTS = new Set(['open.spotify.com', 'api-partner.spotify.com', 'spotify.link', 'spoti.fi']);
let session: { token: string; expires: number } | undefined;
let blockedUntil = 0;
const HASH = 'a65e12194ed5fc443a1cdebed5fabe33ca5b07b987185d63c72483867ad13cb4';



export async function fetchSpotifyPlaylist(input: string): Promise<Playlist> {
  const budget = new RequestBudget(SPOTIFY_HOSTS);
  let host = '';
  try { host = new URL(input).hostname; } catch { /* rejected by ID validator */ }
  if (host === 'spotify.link' || host === 'spoti.fi') { await budget.get(input); input = budget.lastUrl; }
  const id = spotifyId(input);
  if (!id) throw new ProviderError('INVALID_INPUT', '请提供 Spotify 公开歌单长链接。');
  if (Date.now() < blockedUntil) throw new ProviderError('RATE_LIMITED', 'Spotify 暂时限制访问，请稍后再试。', 429, { retryAfterSeconds: Math.ceil((blockedUntil - Date.now()) / 1000) });
  try {
    const token = async (force = false): Promise<string> => {
      if (force || !session || session.expires < Date.now() + 60_000) {
        const html = await budget.get('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
        const data = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
        const s = data ? json(data)?.props?.pageProps?.state?.settings?.session : null;
        if (typeof s?.accessToken !== 'string' || !s.accessToken || !s.isAnonymous ||
            !Number.isFinite(s.accessTokenExpirationTimestampMs) || s.accessTokenExpirationTimestampMs <= Date.now()) {
          throw new ProviderError('PARSE_ERROR', 'Spotify 匿名令牌格式已变化。', 502);
        }
        session = { token: s.accessToken, expires: s.accessTokenExpirationTimestampMs };
      }
      return session!.token;
    };
    await token();
    let result: Playlist | undefined;
    const tracks: Track[] = [];
    let offset = 0;
    for (;;) {
      const url = new URL('https://api-partner.spotify.com/pathfinder/v1/query');
      url.searchParams.set('operationName', 'fetchPlaylist');
      url.searchParams.set('variables', JSON.stringify({ uri: `spotify:playlist:${id}`, offset, limit: 100, enableWatchFeedEntrypoint: false }));
      url.searchParams.set('extensions', JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }));
      const raw = json(await budget.authorized(url.toString(), { authorization: `Bearer ${session!.token}` }, () => token(true)));
      const p = raw?.data?.playlistV2;
      if (raw.errors?.length || !p?.content || !p.name) throw new ProviderError('UPSTREAM_ERROR', 'Spotify 无法返回此公开歌单。', 502);
      const total = requireTotal(p.content.totalCount);
      if (result && result.trackCount !== total) throw new ProviderError('INCOMPLETE_PLAYLIST', '歌单在解析期间发生变化，请重试。', 502);
      result ||= {
        platform: 'spotify', id, name: p.name, description: p.description,
        creator: p.ownerV2?.data?.name ?? p.ownerV2?.data?.displayName,
        coverUrl: p.images?.items?.[0]?.sources?.[0]?.url,
        sourceUrl: `https://open.spotify.com/playlist/${id}`, trackCount: total, tracks,
        retrieval: { mode: 'full' },
      };
      const items = p.content.items;
      if (!Array.isArray(items) || (items.length === 0 && offset < total)) throw new ProviderError('INCOMPLETE_PLAYLIST', 'Spotify 分页提前结束。', 502);
      for (const item of items) tracks.push(normalizeSpotifyTrack(item, tracks.length + 1));
      offset += items.length;
      if (offset >= total) { complete(tracks.length, total); break; }
    }
    reversePlaylistTracks(tracks);
    setRequestCost(result, budget.count);
    return result;
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'RATE_LIMITED') {
      blockedUntil = Date.now() + ((error.details as any)?.retryAfterSeconds || 60) * 1000;
    }
    session = undefined;
    throw error;
  }
}
