/**
 * Kugou API Client
 * Handles playlist retrieval (SSR preview mode, official curated playlists, and authenticated cloudlist mode).
 */

import { ProviderError } from '../../models/playlist';
import type {
  Playlist,
  UserPlaylistsData,
  UserPlaylistSummary,
  PlaylistRetrievalReason,
} from '../../models/playlist';
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
  KUGOU_SONGINFO_KEY,
  encryptKugouLiteRsaRaw,
} from './crypto';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

export interface KugouAuthCredentials {
  token?: string;
  userid?: string;
}

/**
 * Determines whether a response from Kugou gateway indicates an authentication / session rejection.
 */
export function isKugouAuthError(json: {
  status?: number;
  error_code?: number;
  error?: string;
  msg?: string;
  message?: string;
}): boolean {
  if (json.status === 1) return false;
  const code = Number(json.error_code ?? -1);
  if (
    [0, 100, 200, 401, 403, 1000, 1001, 1002, 2000, 2001, 2002, 2003, 2005, 2010, 2011, 2012, 10001, 10002, 20001, 20002, 20003, 20005, 20010, 20011, 20012, 30001, 30002].includes(code)
  ) {
    return true;
  }
  const errorText = `${json.error || ''} ${json.msg || ''} ${json.message || ''}`.toLowerCase();
  if (
    errorText.includes('token') ||
    errorText.includes('auth') ||
    errorText.includes('登录') ||
    errorText.includes('过期') ||
    errorText.includes('失效') ||
    errorText.includes('未登录') ||
    errorText.includes('凭证') ||
    errorText.includes('login') ||
    errorText.includes('param') ||
    errorText.includes('fail')
  ) {
    return true;
  }
  // On authenticated user endpoints, any non-1 response from upstream gateway is treated as auth invalidation
  return true;
}

export interface KugouUserProfile {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  signature?: string;
}

function pickKugouString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function normalizeKugouAvatar(raw?: string): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:\/\//i, 'https://').replace('{size}', '240');
  }
  if (value.startsWith('//')) {
    return `https:${value}`.replace('{size}', '240');
  }
  const clean = value.replace(/^\/+/, '');
  return `https://c1.kgimg.com/v2/kugouicon/${clean}`;
}

/**
 * Fetches the currently authenticated Kugou user's lightweight public profile.
 * This is intentionally independent from playlist retrieval: profile failure
 * must never invalidate a working login session.
 */
export async function fetchKugouUserProfile(
  token: string,
  userid: string,
): Promise<KugouUserProfile> {
  const clienttime = String(Math.floor(Date.now() / 1000));
  const mid = md5(`profile_${clienttime}_${userid}`);
  const rsaPayload = { token, clienttime: Number(clienttime) };
  const postData = {
    visit_time: Number(clienttime),
    usertype: 1,
    p: encryptKugouLiteRsaRaw(rsaPayload).toUpperCase(),
    userid: Number(userid),
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
    plat: '1',
  };
  queryParams.signature = signKugouGatewayParams(queryParams, dataStr, KUGOU_LITE_SALT);

  const response = await fetch(
    `https://gateway.kugou.com/v3/get_my_info?${new URLSearchParams(queryParams).toString()}`,
    {
      method: 'POST',
      headers: {
        'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
        'Content-Type': 'application/json',
        'x-router': 'usercenter.kugou.com',
        dfid: '-',
        clienttime,
        mid,
        'kg-rc': '1',
        'kg-thash': '5d816a0',
        'kg-rec': '1',
        'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
      },
      body: dataStr,
    },
  );

  if (!response.ok) {
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kugou user profile upstream error: ${response.status}`,
      502,
    );
  }

  const json = (await response.json()) as {
    status?: number;
    error_code?: number;
    error?: string;
    msg?: string;
    message?: string;
    data?: Record<string, unknown> & { info?: Record<string, unknown> };
  };

  if (json.status !== 1) {
    if (isKugouAuthError(json)) {
      throw new ProviderError(
        'FORBIDDEN',
        'Kugou credentials invalid or expired',
        401,
        { authInvalid: true, errorCode: json.error_code },
      );
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kugou user profile upstream error: status=${json.status} error_code=${json.error_code}`,
      502,
      { errorCode: json.error_code },
    );
  }

  const data = json.data || {};
  const info = data.info && typeof data.info === 'object' ? data.info : {};
  const source: Record<string, unknown> = { ...data, ...info };

  const nickname =
    pickKugouString(source, ['nickname', 'nick_name', 'username', 'user_name', 'name']) ||
    `酷狗用户_${userid.slice(-4)}`;
  const signature = pickKugouString(source, ['signature', 'memo', 'intro', 'description']);
  const avatarRaw = pickKugouString(source, [
    'pic',
    'photo',
    'avatar',
    'avatar_url',
    'headimgurl',
    'head_img',
  ]);

  return {
    userId: userid,
    nickname,
    avatarUrl: normalizeKugouAvatar(avatarRaw),
    signature,
  };
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

  let expectedTotal = Number(listInfo.songcount || listInfo.count || 0);
  const pageSize = 300;
  const maxPages = 50;
  const rawSongs: KugouRawSong[] = [];
  const seenPageFingerprints = new Set<string>();
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

    // Repeated-page / no-progress detection (Fail-closed on replay loop)
    const pageFingerprint = pageSongs
      .map((s) => `${s.hash || s.FileHash || ''}:${s.name || s.songname || s.filename || ''}`)
      .join(';');

    if (seenPageFingerprints.has(pageFingerprint)) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Pagination made no trustworthy progress: Kugou special playlist returned duplicate page sequence at page ${page}.`,
        502,
        { page, expectedCount: expectedTotal, actualCount: rawSongs.length },
      );
    }
    seenPageFingerprints.add(pageFingerprint);

    // If expectedTotal was not known from listInfo (e.g. info request failed), update it from song API's data.total
    if (expectedTotal <= 0 && typeof songJson.data?.total === 'number' && songJson.data.total > 0) {
      expectedTotal = songJson.data.total;
    }

    rawSongs.push(...pageSongs);

    const totalFromSong = typeof songJson.data?.total === 'number' && songJson.data.total > 0 ? songJson.data.total : expectedTotal;
    if (totalFromSong > 0 && rawSongs.length >= totalFromSong) {
      break;
    }
    if (pageSongs.length < pageSize) {
      break;
    }
    page++;
  }

  // Completeness check: fail-closed if actual retrieved songs do not match expected
  if (expectedTotal > 0 && rawSongs.length !== expectedTotal) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: Kugou special playlist reported ${expectedTotal} songs, but only ${rawSongs.length} could be retrieved.`,
      502,
      { expectedCount: expectedTotal, actualCount: rawSongs.length },
    );
  }

  if (expectedTotal > 0) {
    listInfo.songcount = expectedTotal;
  }

  const tracks = rawSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));

  return normalizeKugouPlaylist({
    id: specialId,
    listInfo,
    tracks,
    sourceUrl: originalUrl || `https://www.kugou.com/yy/special/single/${specialId}.html`,
    isPartialPreview: false,
    retrieval: { mode: 'full' },
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
  expectedCount?: number;
}): Promise<KugouRawSong[]> {
  const { listid, token, userid, expectedCount } = options;
  const pageSize = 300;
  const maxPages = 50;
  let page = 1;
  const allSongs: KugouRawSong[] = [];
  const seenPageFingerprints = new Set<string>();
  let expectedTotal = expectedCount && expectedCount > 0 ? expectedCount : -1;
  let abortedPrematurely = false;

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
      if (page === 1) {
        throw new ProviderError(
          'UPSTREAM_ERROR',
          `Kugou cloudlist gateway returned HTTP ${response.status}`,
          502,
        );
      }
      abortedPrematurely = true;
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
      if (isKugouAuthError(json)) {
        throw new ProviderError(
          'FORBIDDEN',
          'Kugou credentials invalid or expired',
          401,
          { authInvalid: true, errorCode: json.error_code },
        );
      }
      if (page === 1) {
        if (json.status === 1 && (json.data?.count === 0 || !json.data?.info)) {
          // Gracefully treat as empty playlist
          break;
        }
        throw new ProviderError(
          'UPSTREAM_ERROR',
          `Kugou cloudlist gateway returned status=${json.status} error_code=${json.error_code}`,
          502,
          { errorCode: json.error_code },
        );
      }
      abortedPrematurely = true;
      break;
    }

    // Only set from API if expectedTotal wasn't explicitly supplied by trusted caller
    if (expectedTotal <= 0 && typeof json.data?.count === 'number' && json.data.count > 0) {
      expectedTotal = json.data.count;
    }

    const pageSongs = json.data.info;
    if (pageSongs.length === 0) {
      break;
    }

    // Repeated-page / no-progress detection (Fail-closed on replay loop)
    const pageFingerprint = pageSongs
      .map((s) => `${s.hash || s.FileHash || ''}:${s.name || s.songname || s.filename || ''}`)
      .join(';');

    if (seenPageFingerprints.has(pageFingerprint)) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Pagination made no trustworthy progress: Kugou cloudlist returned duplicate page sequence at page ${page}.`,
        502,
        { page, expectedCount: expectedTotal, actualCount: allSongs.length },
      );
    }
    seenPageFingerprints.add(pageFingerprint);

    allSongs.push(...pageSongs);

    if (expectedTotal > 0 && allSongs.length >= expectedTotal) {
      break;
    }
    if (pageSongs.length < pageSize) {
      break;
    }
    page++;
  }

  // Completeness verification:
  // - If aborted prematurely (HTTP or gateway error on page 2+), fail closed with INCOMPLETE_PLAYLIST.
  // - If retrieved count is severely truncated compared to expected (e.g. 2 vs 100), fail closed with INCOMPLETE_PLAYLIST.
  // - For natural completion where track count has minor differences due to delisted/unplayable copyright tracks, accept the retrieved songs.
  const requiredCount = expectedCount && expectedCount > 0 ? expectedCount : expectedTotal;
  if (requiredCount > 0) {
    const isSeverelyTruncated =
      allSongs.length < Math.floor(requiredCount * 0.8) && requiredCount - allSongs.length > 5;
    if (abortedPrematurely || isSeverelyTruncated) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete cloudlist: Kugou reported ${requiredCount} songs, but only ${allSongs.length} could be retrieved.`,
        502,
        { expectedCount: requiredCount, actualCount: allSongs.length },
      );
    }
  }

  // Preserve user's mobile app custom song order:
  // Kugou gateway returns songs in chronological/storage order, but attaches `sort` (and `fsort`)
  // where sort: 0 represents the first track in the playlist, sort: 1 the second, etc.
  allSongs.sort((a, b) => {
    const sortA =
      a.sort !== undefined && a.sort !== null
        ? Number(a.sort)
        : a.fsort !== undefined && a.fsort !== null
          ? Number(a.fsort)
          : null;
    const sortB =
      b.sort !== undefined && b.sort !== null
        ? Number(b.sort)
        : b.fsort !== undefined && b.fsort !== null
          ? Number(b.fsort)
          : null;
    if (sortA !== null && sortB !== null) {
      return sortA - sortB;
    }
    if (sortA !== null) return -1;
    if (sortB !== null) return 1;
    return 0;
  });

  return allSongs;
}

/**
 * Fetches and normalizes a Kugou Collection playlist (Kugou Lite / 酷狗概念版 / 新版集合歌单).
 * Completely login-free; public metadata from mobiles.kugou.com/v5/special/info_v2 (with fallback)
 * and all tracks from pubsongscdn.kugou.com/v2/get_other_list_file.
 */
export async function fetchKugouCollectionPlaylist(target: KugouTarget): Promise<Playlist> {
  const collectionId = target.id;
  const specialid = target.specialid ?? 0;

  // 1. Fetch metadata (playlist title, creator nickname, avatar)
  let listName: string | undefined;
  let creatorNickname: string | undefined;
  let coverUrl: string | undefined;
  let createTime: number | undefined;

  try {
    const nowMs = Date.now();
    const queryParams: Record<string, string> = {
      srcappid: '2919',
      clientver: '20000',
      clienttime: String(nowMs),
      mid: String(nowMs),
      uuid: String(nowMs),
      dfid: '-',
      specialid: String(specialid),
      global_specialid: collectionId,
      sign: 'h5',
    };
    const sortedKeys = Object.keys(queryParams).sort();
    const pairs = sortedKeys.map((k) => `${k}=${queryParams[k]}`).join('');
    queryParams.signature = md5(KUGOU_SONGINFO_KEY + pairs + KUGOU_SONGINFO_KEY);

    const url = `https://mobiles.kugou.com/v5/special/info_v2?${new URLSearchParams(queryParams).toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        Referer: 'https://activity.kugou.com/',
        clienttime: String(nowMs),
        dfid: '-',
        mid: String(nowMs),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = (await res.json()) as Record<string, any>;
      if (json && json.status === 1 && json.data) {
        const d = json.data;
        if (d.specialname && typeof d.specialname === 'string') listName = d.specialname.trim();
        if (d.nickname && typeof d.nickname === 'string') creatorNickname = d.nickname.trim();
        if (d.user_avatar && typeof d.user_avatar === 'string') coverUrl = d.user_avatar.trim();
        else if (d.imgurl && typeof d.imgurl === 'string') coverUrl = d.imgurl.trim();
        if (d.publishtime) {
          const ts = Date.parse(String(d.publishtime).replace(' ', 'T'));
          if (!isNaN(ts)) createTime = Math.floor(ts / 1000);
        }
      }
    }
  } catch {
    // Non-fatal if info_v2 fails or times out
  }

  // Fallback defaults from collection ID structure (collection_{type}_{userid}_{listid}_{...})
  const parts = collectionId.split('_');
  const userId = parts[2] || '';
  const listId = parts[3] || '';
  if (!listName) {
    listName = `酷狗歌单_${listId || collectionId}`;
  }
  if (!creatorNickname && userId) {
    creatorNickname = `酷狗用户_${userId}`;
  }

  // 2. Fetch full track list with pagination from pubsongscdn.kugou.com
  const allSongs: KugouRawSong[] = [];
  let page = 1;
  const pagesize = 100;
  let totalCount = Infinity;
  const maxPages = 50; // Safety cap (up to 5,000 tracks)

  while (allSongs.length < totalCount && page <= maxPages) {
    const nowMs = Date.now();
    const params: Record<string, string> = {
      srcappid: '2919',
      clientver: '20000',
      clienttime: String(nowMs),
      mid: String(nowMs),
      uuid: String(nowMs),
      dfid: '-',
      uid: '0',
      appid: '1058',
      token: '',
      type: '0',
      module: 'playlist',
      page: String(page),
      pagesize: String(pagesize),
      global_collection_id: collectionId,
    };
    const sortedKeys = Object.keys(params).sort();
    const pairs = sortedKeys.map((k) => `${k}=${params[k]}`).join('');
    params.signature = md5(KUGOU_SONGINFO_KEY + pairs + KUGOU_SONGINFO_KEY);

    const pageUrl = `https://pubsongscdn.kugou.com/v2/get_other_list_file?${new URLSearchParams(params).toString()}`;
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        Referer: 'https://activity.kugou.com/',
      },
    });

    if (!res.ok) {
      if (allSongs.length > 0) break;
      throw new ProviderError(
        'UPSTREAM_ERROR',
        `Failed to fetch songs from Kugou collection (HTTP ${res.status})`,
        502,
      );
    }

    const json = (await res.json()) as Record<string, any>;
    if (json.status !== 1 || !json.data || !Array.isArray(json.data.info)) {
      if (allSongs.length > 0) break;
      throw new ProviderError(
        'PLAYLIST_NOT_FOUND',
        `Kugou collection playlist not found or empty (${json.errmsg || 'no songs'})`,
        404,
      );
    }

    totalCount = Number(json.data.count || 0);
    const batch: KugouRawSong[] = json.data.info;
    if (batch.length === 0) break;

    // Use first song cover as playlist cover fallback if header cover is missing
    if (!coverUrl && batch[0]) {
      coverUrl = batch[0].cover || batch[0].trans_param?.union_cover;
    }

    allSongs.push(...batch);
    if (allSongs.length >= totalCount || batch.length < pagesize) {
      break;
    }
    page++;
  }

  // 3. Map tracks through canonical normalizer
  const tracks = allSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));

  return normalizeKugouPlaylist({
    id: collectionId,
    listInfo: {
      name: listName,
      pic: coverUrl,
      count: tracks.length,
      nickname: creatorNickname,
      list_create_username: creatorNickname,
      ctime: createTime,
    },
    tracks,
    sourceUrl: target.originalUrl,
    isPartialPreview: false,
    retrieval: { mode: 'full' },
  });
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

  // 1b. Collection playlist (Kugou Lite / 概念版 / 新版集合歌单, full without auth)
  if (target.type === 'collection') {
    return fetchKugouCollectionPlaylist(target);
  }

  // 2. Direct Cloudlist playlist (requires auth token & userid)
  if (target.type === 'cloudlist') {
    if (!auth?.token || !auth?.userid) {
      throw new ProviderError(
        'FORBIDDEN',
        'Kugou cloudlist playlist requires connected user credentials',
        401,
        { authRequired: true, platform: 'kugou' },
      );
    }

    let listName = `酷狗歌单_${target.id}`;
    let listCover: string | undefined;
    let expectedCount = -1;

    try {
      const userLists = await fetchKugouUserPlaylists(auth.token, auth.userid);
      const matched = userLists.playlists.find((p) => String(p.id) === String(target.id));
      if (matched) {
        listName = matched.name;
        listCover = matched.coverUrl;
        expectedCount = matched.trackCount;
      }
    } catch {
      // Non-fatal if user playlists lookup fails
    }

    const fullSongs = await fetchCloudlistAllTracks({
      listid: target.id,
      token: auth.token,
      userid: auth.userid,
    });

    const tracks = fullSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));
    return normalizeKugouPlaylist({
      id: target.id,
      listInfo: {
        name: listName,
        pic: listCover,
        count: fullSongs.length,
      },
      tracks,
      sourceUrl: target.originalUrl,
      isPartialPreview: false,
      retrieval: { mode: 'full' },
    });
  }

  // 3. User created / shared songlist (via public H5 preview + owner unlocking)
  const { listInfo, songs, encodeGic } = await fetchSonglistH5Output(target.id);
  const playlistId = encodeGic || target.id;

  let retrievalReason: PlaylistRetrievalReason = 'auth_required';

  // Check if authenticated credentials are provided
  if (auth?.token && auth?.userid) {
    try {
      // 2a. Owner verification: check if H5 songlist declares a creator ID
      // CRITICAL SECURITY RULE: NEVER read creator ID from target.originalUrl (?uid= or ?userid=).
      // User-supplied URL query parameters are untrusted and must NOT prove ownership.
      let creatorUserId: string | undefined;
      const rawListInfo = listInfo as Record<string, unknown>;
      if (rawListInfo.list_create_userid) {
        creatorUserId = String(rawListInfo.list_create_userid).trim();
      } else if (rawListInfo.uid) {
        creatorUserId = String(rawListInfo.uid).trim();
      } else if (rawListInfo.userid) {
        creatorUserId = String(rawListInfo.userid).trim();
      }

      const isOwnerConfirmed = Boolean(
        creatorUserId && creatorUserId === String(auth.userid).trim(),
      );

      // Determine tentative owner-related preview reason in case cloudlist matching does not succeed
      if (!creatorUserId) {
        retrievalReason = 'owner_unconfirmed';
      } else if (!isOwnerConfirmed) {
        retrievalReason = 'owner_mismatch';
      } else {
        retrievalReason = 'identity_unresolved';
      }

      // If owner is explicitly known and is NOT current user, do not attempt cloudlist matching
      if (!isOwnerConfirmed && creatorUserId) {
        // Safe fall-through to preview mode with reason 'owner_mismatch'
      } else {
        // Fetch user's own playlists to find matching cloudlist listid
        let userPlaylists: UserPlaylistsData;
        try {
          userPlaylists = await fetchKugouUserPlaylists(auth.token, auth.userid);
        } catch (userListErr: unknown) {
          if (
            userListErr instanceof ProviderError &&
            (userListErr.code === 'FORBIDDEN' || (userListErr.details as any)?.authInvalid)
          ) {
            retrievalReason = 'auth_invalid';
          } else {
            retrievalReason = 'upstream_unavailable';
          }
          throw userListErr;
        }

        // Multi-stage high-confidence matching:
        // Priority 1: Match by direct listid if target.id matches a user list ID
        // Priority 2: Match by exact playlist name
        // Priority 3: Match by favorite/default collection (e.g. "是冷汐呀喜欢的音乐" <-> "我喜欢")
        // Priority 4: Match by normalized name (stripping user prefix and common suffixes)
        // Priority 5: Match by unique track count for confirmed owner
        const targetName = (listInfo.name || '').trim();
        const expectedTrackCount = Number(listInfo.count || 0);
        let matched = userPlaylists.playlists.find((p) => String(p.id) === target.id);

        if (!matched && isOwnerConfirmed && targetName) {
          const nameMatches = userPlaylists.playlists.filter(
            (p) => p.name.trim() === targetName,
          );
          if (nameMatches.length === 1) {
            matched = nameMatches[0];
          } else if (nameMatches.length > 1 && expectedTrackCount > 0) {
            const countMatches = nameMatches.filter(
              (p) => p.trackCount === expectedTrackCount,
            );
            if (countMatches.length === 1) {
              matched = countMatches[0];
            } else if (countMatches.length > 1) {
              matched = countMatches[0];
            }
          }
        }

        // Priority 3: Favorite / default playlist matching
        if (!matched && isOwnerConfirmed) {
          const isDef = Number((listInfo as any).is_def || 0);
          const isTargetFavorite =
            isDef > 0 ||
            targetName.includes('喜欢的音乐') ||
            targetName.includes('我喜欢') ||
            targetName.endsWith('喜欢的音乐') ||
            targetName.endsWith('的收藏');

          if (isTargetFavorite) {
            if (isDef === 2 || targetName.includes('喜欢')) {
              // Kugou default list 2 is "我喜欢"
              matched =
                userPlaylists.playlists.find((p) => String(p.id) === '2') ||
                userPlaylists.playlists.find((p) => p.name.includes('喜欢'));
            } else if (isDef === 1 || targetName.includes('默认') || targetName.includes('收藏')) {
              // Kugou default list 1 is "默认收藏"
              matched =
                userPlaylists.playlists.find((p) => String(p.id) === '1') ||
                userPlaylists.playlists.find((p) => p.name.includes('默认') || p.name.includes('收藏'));
            } else {
              matched =
                userPlaylists.playlists.find((p) => p.trackCount === expectedTrackCount) ||
                userPlaylists.playlists.find((p) => String(p.id) === '2') ||
                userPlaylists.playlists.find((p) => p.name.includes('喜欢')) ||
                userPlaylists.playlists.find((p) => String(p.id) === '1');
            }
          }
        }

        // Priority 4: Normalized title matching
        if (!matched && isOwnerConfirmed && targetName) {
          const creatorName = (listInfo.list_create_username || '').trim();
          const normalizeTitle = (title: string) => {
            let s = title.trim();
            if (creatorName && s.startsWith(creatorName)) {
              s = s.slice(creatorName.length);
            }
            s = s.replace(/^创建的歌单[:：]/, '').replace(/^我/, '').replace(/^的/, '').replace(/歌单$/, '');
            return s.trim();
          };

          const targetNorm = normalizeTitle(targetName);
          if (targetNorm) {
            const normMatches = userPlaylists.playlists.filter(
              (p) => normalizeTitle(p.name) === targetNorm,
            );
            if (normMatches.length === 1) {
              matched = normMatches[0];
            } else if (normMatches.length > 1 && expectedTrackCount > 0) {
              matched =
                normMatches.find((p) => p.trackCount === expectedTrackCount) ||
                normMatches[0];
            }
          }
        }

        // Priority 5: Unique track count matching for confirmed owner
        if (!matched && isOwnerConfirmed && expectedTrackCount >= 5) {
          const countMatches = userPlaylists.playlists.filter(
            (p) => p.trackCount === expectedTrackCount,
          );
          if (countMatches.length === 1) {
            matched = countMatches[0];
          }
        }

        if (matched && matched.id !== undefined && matched.id !== '') {
          const trustedExpected = Number(matched.trackCount || listInfo.count || 0);
          const fullSongs = await fetchCloudlistAllTracks({
            listid: matched.id,
            token: auth.token,
            userid: auth.userid,
            expectedCount: trustedExpected,
          });

          if (fullSongs.length > 0) {
            const tracks = fullSongs.map((s, idx) => normalizeKugouTrack(s, idx + 1));
            return normalizeKugouPlaylist({
              id: playlistId,
              listInfo: {
                ...listInfo,
                name: matched.name || listInfo.name,
                pic: matched.coverUrl || listInfo.pic,
                count: fullSongs.length >= trustedExpected ? fullSongs.length : (trustedExpected || fullSongs.length),
              },
              tracks,
              sourceUrl: target.originalUrl,
              isPartialPreview: false,
              retrieval: { mode: 'full' },
            });
          }
        }
      }
    } catch (err: unknown) {
      // Re-throw INCOMPLETE_PLAYLIST: NEVER swallow severe completeness failure into a partial preview!
      if (err instanceof ProviderError && err.code === 'INCOMPLETE_PLAYLIST') {
        throw err;
      }
      if (
        err instanceof ProviderError &&
        (err.code === 'FORBIDDEN' || (err.details as any)?.authInvalid)
      ) {
        retrievalReason = 'auth_invalid';
      } else {
        retrievalReason = 'upstream_unavailable';
      }
      // Fall through to preview mode with the established retrievalReason
    }
  }

  // Preview mode (unauthenticated or cloudlist fallback): return the SSR preview songs
  const tracks = songs.map((s, idx) => normalizeKugouTrack(s, idx + 1));
  return normalizeKugouPlaylist({
    id: playlistId,
    listInfo,
    tracks,
    sourceUrl: target.originalUrl,
    isPartialPreview: true,
    retrieval: {
      mode: 'preview',
      reason: auth?.token && auth?.userid ? retrievalReason : 'auth_required',
    },
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
    error?: string;
    msg?: string;
    message?: string;
    data?: {
      info?: Array<{
        listid?: number | string;
        name?: string;
        pic?: string;
        count?: number;
        total?: number;
        type?: number;
        list_create_userid?: number | string;
      }>;
      total?: number;
    };
  };

  if (json.status !== 1) {
    if (isKugouAuthError(json)) {
      throw new ProviderError(
        'FORBIDDEN',
        'Kugou credentials invalid or expired',
        401,
        { authInvalid: true, errorCode: json.error_code },
      );
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kugou user playlists upstream error: status=${json.status} error_code=${json.error_code}`,
      502,
      { errorCode: json.error_code },
    );
  }

  const rawLists = [...(json.data?.info || [])];
  const totalReported = typeof json.data?.total === 'number' ? json.data.total : rawLists.length;

  if (totalReported > rawLists.length && rawLists.length >= 100) {
    let currentPage = 2;
    const maxPage = Math.min(10, Math.ceil(totalReported / 100));
    while (currentPage <= maxPage) {
      try {
        const pageClienttime = String(Math.floor(Date.now() / 1000));
        const pageMid = md5(`userlist_${pageClienttime}_${userid}_${currentPage}`);
        const pagePostData = {
          userid: String(userid),
          token,
          total_ver: 979,
          type: 2,
          page: currentPage,
          pagesize: 100,
        };
        const pageDataStr = JSON.stringify(pagePostData);
        const pageQueryParams: Record<string, string> = {
          dfid: '-',
          mid: pageMid,
          uuid: '-',
          appid: KUGOU_LITE_APPID,
          clientver: KUGOU_LITE_CLIENTVER,
          clienttime: pageClienttime,
          token,
          userid: String(userid),
          plat: '1',
        };
        pageQueryParams.signature = signKugouGatewayParams(pageQueryParams, pageDataStr, KUGOU_LITE_SALT);
        const pageUrl = `https://gateway.kugou.com/v7/get_all_list?${new URLSearchParams(pageQueryParams).toString()}`;
        const pageRes = await fetch(pageUrl, {
          method: 'POST',
          headers: {
            'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
            'Content-Type': 'application/json',
            'x-router': 'cloudlist.service.kugou.com',
            dfid: '-',
            clienttime: pageClienttime,
            mid: pageMid,
            'kg-rc': '1',
            'kg-thash': '5d816a0',
            'kg-rec': '1',
            'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
          },
          body: pageDataStr,
        });
        if (!pageRes.ok) break;
        const pageJson = (await pageRes.json()) as typeof json;
        if (pageJson.status === 1 && Array.isArray(pageJson.data?.info) && pageJson.data.info.length > 0) {
          rawLists.push(...pageJson.data.info);
        } else {
          break;
        }
      } catch {
        break;
      }
      currentPage++;
    }
  }

  // Filter for self-created playlists only:
  // In Kugou API, self-created playlists (including "我喜欢" and "默认收藏") have type === 0 and list_create_userid === userid.
  // Third-party collected / subscribed playlists (收藏的歌单) have type === 1 and list_create_userid !== userid.
  const createdLists = rawLists.filter((item) => {
    if (item.type === 1) {
      return false;
    }
    if (
      item.list_create_userid !== undefined &&
      item.list_create_userid !== null &&
      String(item.list_create_userid) !== '' &&
      String(item.list_create_userid) !== '0'
    ) {
      return String(item.list_create_userid) === String(userid);
    }
    return true;
  });

  const playlists: UserPlaylistSummary[] = createdLists.map((item) => ({
    id: String(item.listid !== undefined && item.listid !== null ? item.listid : ''),
    name: item.name || '自建歌单',
    coverUrl: item.pic ? item.pic.replace('{size}', '400').replace(/^http:\/\//i, 'https://') : undefined,
    trackCount: Number(item.count || item.total || 0),
    sourceUrl: `https://m.kugou.com/songlist/?listid=${item.listid}`,
  }));

  return {
    platform: 'kugou',
    userId: userid,
    nickname: `酷狗用户_${userid.slice(-4)}`,
    total: playlists.length,
    playlists,
  };
}
