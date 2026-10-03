/**
 * PlaylistOut Official MusicFree Plugin
 * Version: 1.0.0
 * Author: LengxiQwQ
 * Built: 2026-10-03T10:00:00.000Z
 * Homepage: https://playlistout.lengxiqwq.com
 * Source: https://github.com/LengxiQwQ/playlistout
 */

/**
 * PlaylistOut 官方 MusicFree 插件 (v1.0.0 纯净导入归档版)
 * 
 * 遵循 MusicFree 插件开发规范 (CommonJS)
 * 支持双模驱动：本地离线 JSON 零网络导入 + 生产 API 在线毫秒级万能解析
 * 严格音源合规：仅提供歌单导入，交由 MusicFree 宿主自动换源匹配
 */

/**
 * 跨环境 HTTP GET 请求助手
 * 兼容 MusicFree 宿主环境 (axios) 与 Node.js / 标准 Fetch 环境
 */
async function httpGet(url, options = {}) {
  const timeoutMs = options.timeout || 15000;
  const headers = Object.assign(
    {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://playlistout.lengxiqwq.com',
      Referer: 'https://playlistout.lengxiqwq.com/',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-Mode': 'cors',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    options.headers || {}
  );

  let axiosClient = null;
  if (typeof axios !== 'undefined') {
    axiosClient = axios;
  } else if (typeof globalThis !== 'undefined' && globalThis.axios) {
    axiosClient = globalThis.axios;
  } else {
    try {
      axiosClient = require('axios');
    } catch (_) {}
  }

  if (axiosClient && typeof axiosClient.get === 'function') {
    const res = await axiosClient.get(url, {
      timeout: timeoutMs,
      headers,
      validateStatus: () => true,
    });
    return {
      status: res.status,
      data: res.data,
    };
  }

  if (typeof fetch === 'function') {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller ? controller.signal : undefined,
      });
      const text = await res.text();
      let data = text;
      try {
        data = JSON.parse(text);
      } catch (_) {}
      return {
        status: res.status,
        data,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw new Error('未检测到可用的 HTTP 客户端 (axios 或 fetch)');
}

/**
 * 将 PlaylistOut 歌曲对象映射为 MusicFree 标准 IMusicItem
 */
function mapTrackToMusicItem(track, defaultIndex = 1) {
  if (!track || typeof track !== 'object') {
    return null;
  }

  const title = (track.title || track.name || '未知歌曲').toString().trim() || '未知歌曲';

  let artist = '';
  if (Array.isArray(track.artists) && track.artists.length > 0) {
    artist = track.artists
      .map((a) => (typeof a === 'string' ? a : a?.name || ''))
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
  } else if (Array.isArray(track.artistList) && track.artistList.length > 0) {
    artist = track.artistList
      .map((a) => a?.name || '')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
  } else if (typeof track.artist === 'string' && track.artist.trim()) {
    artist = track.artist.trim();
  } else if (typeof track.author === 'string' && track.author.trim()) {
    artist = track.author.trim();
  } else if (typeof track.singer === 'string' && track.singer.trim()) {
    artist = track.singer.trim();
  }
  if (!artist) {
    artist = '未知歌手';
  }

  let album = '';
  if (typeof track.album === 'string' && track.album.trim()) {
    album = track.album.trim();
  } else if (track.albumObj && typeof track.albumObj.name === 'string') {
    album = track.albumObj.name.trim();
  }

  let artwork = '';
  if (typeof track.artwork === 'string' && track.artwork.trim()) {
    artwork = track.artwork.trim();
  } else if (typeof track.coverUrl === 'string' && track.coverUrl.trim()) {
    artwork = track.coverUrl.trim();
  } else if (typeof track.picUrl === 'string' && track.picUrl.trim()) {
    artwork = track.picUrl.trim();
  }

  let duration = 0;
  if (typeof track.durationMs === 'number' && track.durationMs > 0) {
    duration = Math.round(track.durationMs / 1000);
  } else if (typeof track.duration === 'number' && track.duration > 0) {
    duration =
      track.duration > 10000
        ? Math.round(track.duration / 1000)
        : Math.round(track.duration);
  }

  let id = '';
  if (track.id != null && String(track.id).trim()) {
    id = String(track.id).trim();
  } else {
    id = `${title}_${artist}_${defaultIndex}`;
  }

  return {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
    platform: 'PlaylistOut',
  };
}

/**
 * 解析并标准化 JSON 格式的歌曲列表
 */
function parseJsonTracks(jsonStr, sourceDesc = 'JSON 数据') {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    const errorPrefix = sourceDesc === 'JSON 数据' ? 'JSON 解析失败' : `${sourceDesc} JSON 解析失败`;
    throw new Error(`${errorPrefix}: ${err.message}`);
  }

  let tracks = null;
  if (Array.isArray(parsed)) {
    tracks = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.tracks)) {
      tracks = parsed.tracks;
    } else if (Array.isArray(parsed.data?.result?.tracks)) {
      tracks = parsed.data.result.tracks;
    } else if (Array.isArray(parsed.result?.tracks)) {
      tracks = parsed.result.tracks;
    } else if (Array.isArray(parsed.data?.tracks)) {
      tracks = parsed.data.tracks;
    } else if (Array.isArray(parsed.songList)) {
      tracks = parsed.songList;
    } else if (Array.isArray(parsed.songs)) {
      tracks = parsed.songs;
    }
  }

  if (!tracks) {
    throw new Error(`未在 ${sourceDesc}中找到歌曲列表 (tracks)`);
  }

  if (tracks.length === 0) {
    throw new Error(`${sourceDesc}中未包含任何歌曲`);
  }

  const items = tracks
    .map((t, idx) => mapTrackToMusicItem(t, idx + 1))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error('未解析到有效的歌曲数据');
  }

  return items;
}

function isLocalJsonPath(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().replace(/^["']|["']$/g, '');
  if (/^https?:\/\//i.test(s)) return false;
  if (s.startsWith('file://')) return true;
  if (/\.json$/i.test(s)) return true;
  return false;
}

function resolveLocalPath(inputPath) {
  let cleanPath = inputPath.trim().replace(/^["']|["']$/g, '');
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.slice(7);
    if (/^\/[a-zA-Z]:[/\\]/.test(cleanPath)) {
      cleanPath = cleanPath.slice(1);
    }
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (_) {}
  }
  return cleanPath;
}

async function importMusicSheet(urlLike) {
  if (!urlLike || typeof urlLike !== 'string') {
    throw new Error('请输入有效的歌单链接、分享文本或本地 .json 文件路径');
  }

  const trimmed = urlLike.trim();
  if (!trimmed) {
    throw new Error('输入内容不能为空');
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    throw new Error(
      '请勿直接粘贴 JSON 长文本，请直接输入导出的本地 .json 文件路径 (如 D:\\playlist.json) 或在线歌单链接'
    );
  }

  if (isLocalJsonPath(trimmed)) {
    let fsModule = null;
    try {
      fsModule = require('fs');
    } catch (_) {}

    if (!fsModule || typeof fsModule.readFileSync !== 'function') {
      throw new Error('当前运行环境不支持直接读取本地文件系统');
    }

    const targetPath = resolveLocalPath(trimmed);
    if (!fsModule.existsSync(targetPath)) {
      throw new Error(`未找到指定的本地歌单文件: ${targetPath}`);
    }

    let fileContent = '';
    try {
      fileContent = fsModule.readFileSync(targetPath, 'utf-8');
    } catch (err) {
      throw new Error(`读取本地歌单文件失败: ${err.message}`);
    }

    return parseJsonTracks(fileContent, `本地文件 (${targetPath})`);
  }

  const apiUrl = `https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=${encodeURIComponent(
    trimmed
  )}&type=playlist`;

  let res;
  try {
    res = await httpGet(apiUrl, { timeout: 15000 });
  } catch (err) {
    throw new Error(`请求 PlaylistOut API 超时或网络失败: ${err.message}`);
  }

  if (res.status !== 200) {
    const errorMsg =
      res.data?.error?.message ||
      (typeof res.data === 'string' && res.data ? res.data : `HTTP ${res.status}`);
    throw new Error(`在线解析失败: ${errorMsg}`);
  }

  if (!res.data || !res.data.success) {
    const errorMsg = res.data?.error?.message || '未知解析错误';
    throw new Error(`在线解析失败: ${errorMsg}`);
  }

  const result = res.data.data?.result;
  const rawTracks = result?.tracks;

  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    throw new Error('在线歌单解析结果为空或未找到歌曲');
  }

  const items = rawTracks
    .map((t, idx) => mapTrackToMusicItem(t, idx + 1))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error('未解析到有效的歌曲数据');
  }

  return items;
}

module.exports = {
  platform: 'PlaylistOut',
  author: 'LengxiQwQ',
  version: '1.0.0',
  appVersion: '>0.1.0-alpha.0',
  srcUrl: 'https://playlistout.lengxiqwq.com/plugins/musicfree-v1.0.0.js',
  cacheControl: 'no-store',
  hints: {
    importMusicSheet: [
      '【在线解析】直接粘贴 QQ音乐/网易云/酷狗/汽水 歌单链接、分享文本或短链',
      '【本地导入】直接输入本地导出的 .json 歌单文件路径 (如 D:\\playlist.json)',
      '【千首无损】网易云支持超大歌单免登录完整解析',
      '【官方网站】playlistout.lengxiqwq.com',
    ],
  },
  supportedSearchType: ['sheet'],
  importMusicSheet,
};
