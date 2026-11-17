// Protocol reference: omkarcloud/apple-music-scraper, MIT, f7606f84e63b4d07249c8531eb2b68fe20ca23c3.
import { ProviderError, type Playlist, type Track } from '../../models/playlist';
import { RequestBudget, json, requireTotal, complete, setRequestCost } from '../international/http';
import { appleInput } from './input';
import { normalizeAppleTrack } from './normalize';

const HOSTS = new Set(['music.apple.com', 'amp-api.music.apple.com', 'geo.music.apple.com']);
let session: { token: string; expires: number } | undefined;
let blockedUntil = 0;


function payload(token: string): any {
  try { return json(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return {}; }
}


export async function fetchApplePlaylist(input: string): Promise<Playlist> {
  const budget = new RequestBudget(HOSTS);
  let host = '';
  try { host = new URL(input).hostname; } catch { /* rejected below */ }
  if (host === 'geo.music.apple.com') { await budget.get(input); input = budget.lastUrl; }
  const ref = appleInput(input);
  if (!ref) throw new ProviderError('INVALID_INPUT', '请提供包含地区代码的 Apple Music 公开歌单长链接。');
  if (Date.now() < blockedUntil) throw new ProviderError('RATE_LIMITED', 'Apple Music 暂时限制访问，请稍后再试。', 429, { retryAfterSeconds: Math.ceil((blockedUntil - Date.now()) / 1000) });
  try {
    const token = async (force = false): Promise<string> => {
      if (force || !session || session.expires < Date.now() + 86_400_000) {
        const html = await budget.get('https://music.apple.com/us/404', {}, true);
        const asset = html.match(/src="(\/assets\/index~[^\"]+\.js)"/)?.[1];
        if (!asset) throw new ProviderError('PARSE_ERROR', 'Apple Music 网页格式已变化。', 502);
        const bundle = await budget.get('https://music.apple.com' + asset);
        const token = (bundle.match(/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) || []).find(t => payload(t).iss === 'AMPWebPlay');
        if (!token || !Number.isFinite(payload(token).exp)) throw new ProviderError('PARSE_ERROR', 'Apple Music 令牌格式已变化。', 502);
        session = { token, expires: payload(token).exp * 1000 };
      }
      return session!.token;
    };
    await token();
    const headers = { authorization: `Bearer ${session!.token}`, origin: 'https://music.apple.com', referer: 'https://music.apple.com/' };
    const raw = json(await budget.authorized(`https://amp-api.music.apple.com/v1/catalog/${ref.country}/playlists/${ref.id}?include=tracks&extend=trackCount`, headers, () => token(true)));
    const p = raw?.data?.[0];
    if (!p?.attributes?.name) throw new ProviderError('PLAYLIST_NOT_FOUND', '歌单未公开或在此地区不可用。', 404);
    const total = requireTotal(p.attributes.trackCount);
    const tracks: Track[] = [];
    let block = p.relationships?.tracks;
    const seen = new Set<string>();
    for (;;) {
      if (!Array.isArray(block?.data)) throw new ProviderError('INCOMPLETE_PLAYLIST', '缺少歌单歌曲数据。', 502);
      for (const t of block.data) tracks.push(normalizeAppleTrack(t, tracks.length + 1));
      if (!block.next) break;
      if (!block.data.length || tracks.length >= total || seen.has(block.next)) throw new ProviderError('INCOMPLETE_PLAYLIST', 'Apple Music 分页异常。', 502);
      seen.add(block.next);
      const next = new URL(block.next, 'https://amp-api.music.apple.com');
      if (next.origin !== 'https://amp-api.music.apple.com' || next.pathname !== `/v1/catalog/${ref.country}/playlists/${ref.id}/tracks`) throw new ProviderError('PARSE_ERROR', 'Apple Music 分页地址异常。', 502);
      next.searchParams.set('limit', '100');
      block = json(await budget.authorized(next.toString(), headers, () => token(true)));
    }
    complete(tracks.length, total);
    const result: Playlist = {
      platform: 'applemusic', id: ref.id, name: p.attributes.name, creator: p.attributes.curatorName,
      description: p.attributes.description?.standard ?? p.attributes.description?.short,
      sourceUrl: `https://music.apple.com/${ref.country}/playlist/${ref.id}`,
      updateTime: p.attributes.lastModifiedDate ? Date.parse(p.attributes.lastModifiedDate) : undefined,
      coverUrl: p.attributes.artwork?.url?.replace('{w}', '600').replace('{h}', '600'),
      trackCount: total, tracks, retrieval: { mode: 'full' },
    };
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
