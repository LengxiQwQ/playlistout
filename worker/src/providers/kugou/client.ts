/**
 * Kugou API Client
 * Handles playlist retrieval (SSR preview mode, official curated playlists, and authenticated cloudlist mode).
 */

import { ProviderError } from '../../models/playlist';
import type { Playlist, UserPlaylistsData, UserPlaylistSummary } from '../../models/playlist';
import type { KugouTarget } from './input';
import {
  normalizeKugouPlaylist,
  normalizeKugouTrack,
  type KugouRawListInfo,
  type KugouRawSong,
} from './normalize';
import {
  md5,
  signKugouGatewayParams,
  KUGOU_LITE_APPID,
  KUGOU_LITE_CLIENTVER,
  KUGOU_LITE_SALT,
} from './crypto';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

export interface KugouAuthCredentials {
  token?: string;
  userid?: string;
}

/**
 * Fetches an official curated/special playlist by specialid.
 */
async function fetchSpecialPlaylist(specialId: string, originalUrl?: string): Promise<Playlist> {
  const infoUrl = `http://mobilecdn.kugou.com/api/v3/special/info?specialid=${specialId}`;

  let listInfo: KugouRawListInfo = { specialname: '酷狗专题歌单' };
  try {
    const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': MOBILE_UA } });
    if (infoRes.ok) {
      const infoJson = (await infoRes.json()) as { data?: KugouRawListInfo };
      if (infoJson.data) listInfo = infoJson.data;
    }
  } catch {
    // Non-fatal if info fails
  }

  const expectedTotal = Number(listInfo.songcount || listInfo.count || 0);
  const pageSize = 300;
  const maxPages = 50;
  const rawSongs: KugouRawSong[] = [];
  let page = 1;

  while (page <= maxPages) {
    const songUrl = `http://mobilecdn.kugou.com/api/v3/special/song?specialid=${specialId}&page=${page}&pagesize=${pageSize}&version=9108&area_code=1`;
    const songRes = await fetch(songUrl, { headers: { 'User-Agent': MOBILE_UA } });

    if (!songRes.ok) {
      if (rawSongs.length > 0) break;
      throw new ProviderError(
        'UPSTREAM_ERROR',
        `Kugou special playlist upstream error: ${songRes.status}`,
        502,
      );
    }

    const songJson = (await songRes.json()) as {
      status?: number;
      errcode?: number;
      data?: {
        info?: KugouRawSong[];
        total?: number;
      };
    };

    const pageSongs = songJson.data?.info;
    if (!Array.isArray(pageSongs) || pageSongs.length === 0) {
      break;
    }

    rawSongs.push(...pageSongs);

    const totalFromSong = typeof songJson.data?.total === 'number' ? songJson.data.total : expectedTotal;
    if (totalFromSong > 0 && rawSongs.length >= totalFromSong) {
      break;
    }
    if (pageSongs.length < pageSize) {
      break;
    }
    page++;
  }

  // Completeness check
  if (expectedTotal > 0 && rawSongs.length !== expectedTotal) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: Kugou special playlist reported ${expectedTotal} songs, but only ${rawSongs.length} could be retrieved.`,
      502,
      { expectedCount: expectedTotal, actualCount: rawSongs.length },
    );
  }

  const tracks = rawSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));

  return normalizeKugouPlaylist({
    id: specialId,
    listInfo,
    tracks,
    sourceUrl: originalUrl || `https://www.kugou.com/yy/special/single/${specialId}.html`,
    isPartialPreview: false,
  });
}

/**
 * Fetches SSR HTML from mobile songlist page and extracts window.$output.
 */
async function fetchSonglistH5Output(gcid: string): Promise<{
  listInfo: KugouRawListInfo;
  songs: KugouRawSong[];
  encodeGic?: string;
}> {
  const url = `https://m.kugou.com/songlist/${gcid}/`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': MOBILE_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new ProviderError(
      'PLAYLIST_NOT_FOUND',
      `Kugou songlist not found or unavailable (HTTP ${response.status})`,
      404,
    );
  }

  const html = await response.text();
  const match = html.match(/window\.\$output\s*=\s*(\{.+?\});/s);

  if (!match) {
    throw new ProviderError(
      'PARSE_ERROR',
      'Failed to parse Kugou songlist payload from HTML page.',
      502,
    );
  }

  try {
    const data = JSON.parse(match[1]) as {
      encode_gic?: string;
      info?: {
        listinfo?: KugouRawListInfo;
        songs?: KugouRawSong[];
      };
    };

    return {
      listInfo: data.info?.listinfo || {},
      songs: data.info?.songs || [],
      encodeGic: data.encode_gic,
    };
  } catch (err: unknown) {
    throw new ProviderError(
      'PARSE_ERROR',
      `Failed to deserialize Kugou songlist JSON data: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }
}

/**
 * Fetches all tracks of a cloudlist playlist using authenticated credentials.
 * Handles pagination up to 50 pages (15,000 songs) and verifies completeness.
 */
async function fetchCloudlistAllTracks(options: {
  listid: string | number;
  token: string;
  userid: string;
}): Promise<KugouRawSong[]> {
  const { listid, token, userid } = options;
  const pageSize = 300;
  const maxPages = 50;
  let page = 1;
  const allSongs: KugouRawSong[] = [];
  let expectedTotal = -1;

  while (page <= maxPages) {
    const clienttime = String(Math.floor(Date.now() / 1000));
    const mid = md5(`cloudlist_${clienttime}_${userid}_${page}`);

    const postData = {
      listid: String(listid),
      userid: String(userid),
      area_code: 1,
      show_relate_goods: 1,
      pagesize: pageSize,
      allplatform: 1,
      show_cover: 1,
      type: 0,
      token,
      page,
    };

    const dataStr = JSON.stringify(postData);

    const queryParams: Record<string, string> = {
      dfid: '-',
      mid,
      uuid: '-',
      appid: KUGOU_LITE_APPID,
      clientver: KUGOU_LITE_CLIENTVER,
      clienttime,
      token,
      userid,
    };

    queryParams.signature = signKugouGatewayParams(queryParams, dataStr, KUGOU_LITE_SALT);

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `https://gateway.kugou.com/v4/get_list_all_file?${queryString}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
        'Content-Type': 'application/json',
        'x-router': 'cloudlist.service.kugou.com',
        dfid: '-',
        clienttime,
        mid,
        'kg-rc': '1',
        'kg-thash': '5d816a0',
        'kg-rec': '1',
        'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
      },
      body: dataStr,
    });

    if (!response.ok) {
      break;
    }

    const json = (await response.json()) as {
      status?: number;
      error_code?: number;
      data?: {
        info?: KugouRawSong[];
        count?: number;
      };
    };

    if (json.status !== 1 || !Array.isArray(json.data?.info)) {
      break;
    }

    if (expectedTotal === -1 && typeof json.data?.count === 'number') {
      expectedTotal = json.data.count;
    }

    const pageSongs = json.data.info;
    if (pageSongs.length === 0) {
      break;
    }

    allSongs.push(...pageSongs);

    if (expectedTotal >= 0 && allSongs.length >= expectedTotal) {
      break;
    }
    if (pageSongs.length < pageSize) {
      break;
    }
    page++;
  }

  // Completeness check
  if (expectedTotal >= 0 && allSongs.length < expectedTotal) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete cloudlist: Kugou reported ${expectedTotal} songs, but only ${allSongs.length} could be retrieved.`,
      502,
      { expectedCount: expectedTotal, actualCount: allSongs.length },
    );
  }

  return allSongs;
}

/**
 * Main entrypoint to parse a Kugou playlist.
 */
export async function fetchKugouPlaylist(
  target: KugouTarget,
  auth?: KugouAuthCredentials,
): Promise<Playlist> {
  // 1. Curated / Special playlist (full without auth)
  if (target.type === 'special') {
    return fetchSpecialPlaylist(target.id, target.originalUrl);
  }

  // 2. User created / shared songlist
  const { listInfo, songs, encodeGic } = await fetchSonglistH5Output(target.id);
  const playlistId = encodeGic || target.id;

  // Check if authenticated credentials are provided
  if (auth?.token && auth?.userid) {
    try {
      // 2a. Fetch user's own playlists to find matching cloudlist listid
      const userPlaylists = await fetchKugouUserPlaylists(auth.token, auth.userid);

      // High-confidence matching:
      // Priority 1: Match by direct listid if target.id matches a user list ID
      // Priority 2: Match by exact playlist name
      // If multiple user playlists have the same name, disambiguate with trackCount
      // STRICT SAFETY: NEVER match solely by trackCount (prevent wrong playlist extraction)
      const targetName = (listInfo.name || '').trim();
      let matched = userPlaylists.playlists.find((p) => String(p.id) === target.id);

      if (!matched && targetName) {
        const nameMatches = userPlaylists.playlists.filter(
          (p) => p.name.trim() === targetName,
        );
        if (nameMatches.length === 1) {
          matched = nameMatches[0];
        } else if (nameMatches.length > 1) {
          const countMatch = nameMatches.find(
            (p) => p.trackCount === Number(listInfo.count || 0),
          );
          matched = countMatch || nameMatches[0];
        }
      }

      if (matched && matched.id) {
        const fullSongs = await fetchCloudlistAllTracks({
          listid: matched.id,
          token: auth.token,
          userid: auth.userid,
        });

        if (fullSongs.length > 0) {
          const tracks = fullSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));
          return normalizeKugouPlaylist({
            id: playlistId,
            listInfo: {
              ...listInfo,
              name: matched.name || listInfo.name,
              pic: matched.coverUrl || listInfo.pic,
              count: matched.trackCount || listInfo.count || fullSongs.length,
            },
            tracks,
            sourceUrl: target.originalUrl,
            isPartialPreview: false,
          });
        }
      }
    } catch {
      // Fall through to preview mode if cloudlist resolution fails
    }
  }

  // Preview mode (unauthenticated or cloudlist fallback): return the 10 SSR songs
  const tracks = songs.map((s, idx) => normalizeKugouTrack(s, idx + 1));
  return normalizeKugouPlaylist({
    id: playlistId,
    listInfo,
    tracks,
    sourceUrl: target.originalUrl,
    isPartialPreview: true,
  });
}

/**
 * Fetches all playlists owned by a Kugou user (requires token & userid).
 */
export async function fetchKugouUserPlaylists(
  token: string,
  userid: string,
): Promise<UserPlaylistsData> {
  const clienttime = String(Math.floor(Date.now() / 1000));
  const mid = md5(`userlist_${clienttime}_${userid}`);

  const postData = {
    userid: String(userid),
    token,
    total_ver: 979,
    type: 2,
    page: 1,
    pagesize: 100,
  };

  const dataStr = JSON.stringify(postData);

  const queryParams: Record<string, string> = {
    dfid: '-',
    mid,
    uuid: '-',
    appid: KUGOU_LITE_APPID,
    clientver: KUGOU_LITE_CLIENTVER,
    clienttime,
    token,
    userid: String(userid),
    plat: '1',
  };

  queryParams.signature = signKugouGatewayParams(queryParams, dataStr, KUGOU_LITE_SALT);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://gateway.kugou.com/v7/get_all_list?${queryString}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
      'Content-Type': 'application/json',
      'x-router': 'cloudlist.service.kugou.com',
      dfid: '-',
      clienttime,
      mid,
      'kg-rc': '1',
      'kg-thash': '5d816a0',
      'kg-rec': '1',
      'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
    },
    body: dataStr,
  });

  if (!response.ok) {
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kugou user playlists upstream error: ${response.status}`,
      502,
    );
  }

  const json = (await response.json()) as {
    status?: number;
    error_code?: number;
    data?: {
      info?: Array<{
        listid?: number | string;
        name?: string;
        pic?: string;
        count?: number;
        total?: number;
      }>;
      total?: number;
    };
  };

  const rawLists = json.data?.info || [];
  const playlists: UserPlaylistSummary[] = rawLists.map((item) => ({
    id: String(item.listid || ''),
    name: item.name || '自建歌单',
    coverUrl: item.pic ? item.pic.replace('{size}', '400') : undefined,
    trackCount: Number(item.count || item.total || 0),
    sourceUrl: `https://www.kugou.com/songlist/`,
  }));

  return {
    platform: 'kugou',
    userId: userid,
    nickname: `酷狗用户_${userid.slice(-4)}`,
    total: playlists.length,
    playlists,
  };
}
