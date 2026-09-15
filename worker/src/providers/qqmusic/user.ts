import { ProviderError, type UserPlaylistsData, type UserPlaylistSummary } from '../../models/playlist';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 15000;
const ALLOWED_UPSTREAM_HOSTS: ReadonlySet<string> = new Set(['c.y.qq.com', 'u.y.qq.com']);

/**
 * Validates whether a string is a potentially valid QQ uin (4-15 digits).
 */
export function isValidQQNumber(uin: string): boolean {
  if (!uin || typeof uin !== 'string') return false;
  return /^\d{4,15}$/.test(uin.trim());
}

/**
 * Extracts uin from raw input (can be pure numeric QQ or a profile URL).
 * e.g.:
 * - "10001" -> "10001"
 * - "https://y.qq.com/portal/profile.html?uin=10001" -> "10001"
 * - "https://y.qq.com/n/ryqq/profile/like/song?uin=10001" -> "10001"
 */
export function extractQQNumber(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (isValidQQNumber(trimmed)) {
    return trimmed;
  }

  try {
    const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlToParse);
    const uinParam = parsed.searchParams.get('uin') || parsed.searchParams.get('hostuin');
    if (uinParam && isValidQQNumber(uinParam)) {
      return uinParam.trim();
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

interface RawUserCreatedDissItem {
  diss_name?: string;
  diss_cover?: string;
  song_cnt?: number;
  listen_num?: number;
  dirid?: number;
  tid?: number | string;
  dir_show?: number;
}

interface RawUserCreatedDissResponse {
  code?: number;
  subcode?: number;
  message?: string;
  data?: {
    encrypt_uin?: string;
    hostname?: string;
    totoal?: number;
    disslist?: RawUserCreatedDissItem[];
  };
}

/**
 * Fetches public playlists created by a specific QQ user.
 */
export async function fetchQQUserPlaylists(uin: string): Promise<UserPlaylistsData> {
  const cleanUin = uin.trim();
  if (!isValidQQNumber(cleanUin)) {
    throw new ProviderError('INVALID_INPUT', `Invalid QQ number: "${uin}". Expected 4-15 digits.`, 400);
  }

  const endpoint = 'https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss';
  const parsedEndpoint = new URL(endpoint);
  if (!ALLOWED_UPSTREAM_HOSTS.has(parsedEndpoint.hostname)) {
    throw new ProviderError('FORBIDDEN', `Outbound request to unauthorized host ${parsedEndpoint.hostname} is prohibited.`, 403);
  }

  const params = new URLSearchParams({
    hostUin: '0',
    hostuin: cleanUin,
    sin: '0',
    size: '200',
    g_tk: '5381',
    loginUin: '0',
    format: 'json',
    inCharset: 'utf8',
    outCharset: 'utf-8',
    notice: '0',
    platform: 'yqq.json',
    needNewCode: '0',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': UPSTREAM_USER_AGENT,
        Referer: 'https://y.qq.com/portal/profile.html',
        Accept: 'application/json',
      },
      signal: controller.signal,
      redirect: 'manual',
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('UPSTREAM_TIMEOUT', `Request to QQ Music timed out after ${FETCH_TIMEOUT_MS}ms.`, 504);
    }
    throw new ProviderError('UPSTREAM_ERROR', `Failed to connect to QQ Music: ${err instanceof Error ? err.message : String(err)}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music returned HTTP status ${response.status}.`, 502);
  }

  let data: RawUserCreatedDissResponse;
  try {
    data = await response.json();
  } catch {
    throw new ProviderError('UPSTREAM_ERROR', 'Failed to parse JSON response from QQ Music.', 502);
  }

  if (data.code !== 0 || !data.data) {
    throw new ProviderError(
      'USER_NOT_FOUND',
      data.message || `No public playlists found for user ${cleanUin}.`,
      404,
      { code: data.code, subcode: data.subcode },
    );
  }

  const rawData = data.data;
  const nickname = (rawData.hostname || '').trim() || cleanUin;
  const rawList = Array.isArray(rawData.disslist) ? rawData.disslist : [];

  const playlists: UserPlaylistSummary[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;

    // Filter out items hidden by system (dir_show === 0 e.g. QZone background music) or tid === 0
    const tid = item.tid !== undefined && item.tid !== null ? String(item.tid).trim() : '';
    if (!tid || tid === '0' || item.dir_show === 0) {
      continue;
    }

    playlists.push({
      id: tid,
      name: (item.diss_name || '').trim() || `歌单_${tid}`,
      coverUrl: item.diss_cover || undefined,
      trackCount: typeof item.song_cnt === 'number' ? item.song_cnt : 0,
      listenNum: typeof item.listen_num === 'number' ? item.listen_num : undefined,
      sourceUrl: `https://y.qq.com/n/ryqq/playlist/${tid}`,
    });
  }

  return {
    platform: 'qqmusic',
    userId: cleanUin,
    nickname,
    total: playlists.length,
    playlists,
  };
}
