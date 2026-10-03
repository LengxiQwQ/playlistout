/**
 * PlaylistOut Official MusicFree Plugin
 * Version: 1.2.0
 * Author: LengxiQwQ
 * Built: 2026-10-03T12:47:08.950Z
 * Homepage: https://playlistout.lengxiqwq.com
 * Source: https://github.com/LengxiQwQ/playlistout
 */

/**
 * PlaylistOut 官方 MusicFree 插件
 * 
 * 遵循 MusicFree 插件开发规范 (CommonJS)
 * 支持双模驱动：本地离线 JSON 零网络导入 + 生产 API 在线毫秒级万能解析
 * 原生音源桥接 (Platform Delegation)：
 *   导入歌单时智能将歌曲映射至用户已安装的原生插件 (netease, 20, WebFilter, kuwo, qishui, bilibili, migu)，
 *   彻底弃用外部失效音频爬取接口，交由原生插件利用本地 Cookie/VIP/无损解码器秒级起播。
 */

/**
 * 三层沙箱逃逸：获取真实 fs 模块
 *
 * MusicFree Desktop 用 Function(...) 沙箱包裹插件，注入的假 require
 * 白名单中不含 fs，直接 require('fs') 返回 null。
 * 通过 new Function() 绕过沙箱，从真实 process/global 取得原生 require。
 */
function getFsModule() {
  // Tier 1: 直接尝试（裸 Node.js 环境直接有效）
  try {
    const m = require('fs');
    if (m && typeof m.readFileSync === 'function') return m;
  } catch (_) {}

  // Tier 2: new Function 逃逸沙箱 → 真实 process.mainModule.require
  try {
    const realProcess = (new Function('return typeof process !== "undefined" ? process : null'))();
    if (realProcess && realProcess.mainModule && typeof realProcess.mainModule.require === 'function') {
      const m = realProcess.mainModule.require('fs');
      if (m && typeof m.readFileSync === 'function') return m;
    }
  } catch (_) {}

  // Tier 3: new Function 逃逸 → global/globalThis.require 或 global.process.mainModule
  try {
    const realGlobal = (new Function(
      'return typeof global !== "undefined" ? global : (typeof globalThis !== "undefined" ? globalThis : null)'
    ))();
    if (realGlobal) {
      if (typeof realGlobal.require === 'function') {
        const m = realGlobal.require('fs');
        if (m && typeof m.readFileSync === 'function') return m;
      }
      if (realGlobal.process && realGlobal.process.mainModule &&
          typeof realGlobal.process.mainModule.require === 'function') {
        const m = realGlobal.process.mainModule.require('fs');
        if (m && typeof m.readFileSync === 'function') return m;
      }
    }
  } catch (_) {}

  return null;
}

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

  // 1. 优先使用 MusicFree 宿主环境注入的 axios 或 require('axios')
  let axiosClient = null;
  if (typeof axios !== 'undefined') {
    axiosClient = axios;
  } else if (typeof globalThis !== 'undefined' && globalThis.axios) {
    axiosClient = globalThis.axios;
  } else {
    try {
      axiosClient = require('axios');
    } catch (_) {
      // 当前环境未安装 axios
    }
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

  // 2. 兜底使用标准 Fetch API (Node 18+、现代浏览器、轻量级 JS 运行时)
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
      } catch (_) {
        // 保留原始字符串
      }
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
 * 获取用户配置的音源路由通道 (来自 MusicFree 宿主环境 env.getUserVariables())
 */
function getUserTargetPlatform() {
  try {
    let userVars = null;
    if (typeof env !== 'undefined' && env && typeof env.getUserVariables === 'function') {
      userVars = env.getUserVariables();
    } else if (
      typeof globalThis !== 'undefined' &&
      globalThis.env &&
      typeof globalThis.env.getUserVariables === 'function'
    ) {
      userVars = globalThis.env.getUserVariables();
    }
    const target = userVars?.targetPlatform;
    if (typeof target === 'string' && target.trim()) {
      return target.trim();
    }
  } catch (_) {}
  return 'auto';
}

/**
 * 将歌单原始平台映射为 MusicFree 宿主安装的原生音源插件标识
 * 
 * 路由规则：
 * - 用户配置为非 auto 时强制走用户指定的 platform (例如强制 'kuwo', 'netease' 等)
 * - 网易云 (netease / 163) -> 'netease' (由网易云原生插件接管，支持真实 Song ID 免登录/VIP原画解码)
 * - QQ音乐 (qq / qqmusic / tencent) -> '20' (由社区 QQ 音乐原生插件接管)
 * - 酷狗音乐 (kugou) -> 'WebFilter' (由社区酷狗原生插件接管)
 * - 酷我音乐 (kuwo) -> 'kuwo' (由酷我原生插件接管)
 * - 汽水音乐 (qishui / soda / luna) -> 'qishui' (由汽水原生插件接管)
 * - 哔哩哔哩 (bilibili) -> 'bilibili'
 * - 咪咕音乐 (migu) -> 'migu'
 * - 未知或未识别 -> 'PlaylistOut'
 */
function resolveMusicPlatform(sourcePlatform) {
  const forced = getUserTargetPlatform();
  if (forced && forced.toLowerCase() !== 'auto') {
    return forced;
  }

  if (!sourcePlatform || typeof sourcePlatform !== 'string') {
    return 'PlaylistOut';
  }

  const sp = sourcePlatform.toLowerCase().trim();
  if (sp === 'netease' || sp === '163' || sp === 'wy' || sp.includes('网易')) {
    return 'netease';
  }
  if (sp === '20' || sp === 'qq' || sp === 'qqmusic' || sp === 'tencent' || sp.includes('qq') || sp.includes('企鹅')) {
    return '20';
  }
  if (sp === 'webfilter' || sp === 'kugou' || sp === 'kg' || sp.includes('酷狗')) {
    return 'WebFilter';
  }
  if (sp === 'kuwo' || sp === 'kw' || sp.includes('酷我')) {
    return 'kuwo';
  }
  if (sp === 'qishui' || sp === 'soda' || sp === 'luna' || sp.includes('汽水')) {
    return 'qishui';
  }
  if (sp === 'bilibili' || sp === 'bili' || sp.includes('哔哩') || sp.includes('b站')) {
    return 'bilibili';
  }
  if (sp === 'migu' || sp.includes('咪咕')) {
    return 'migu';
  }

  return 'PlaylistOut';
}

/**
 * 将 PlaylistOut 歌曲对象映射为 MusicFree 标准 IMusicItem
 * @param {object} track 歌曲元数据对象
 * @param {number} defaultIndex 序号兜底
 * @param {string} defaultPlatform 歌单来源平台标识
 */
function mapTrackToMusicItem(track, defaultIndex = 1, defaultPlatform = 'PlaylistOut') {
  if (!track || typeof track !== 'object') {
    return null;
  }

  // 1. 歌曲标题 (默认 '未知歌曲')
  const title = (track.title || track.name || '未知歌曲').toString().trim() || '未知歌曲';

  // 2. 歌手 (数组逗号拼接，如 "周杰伦, 阿信")
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

  // 3. 专辑 (空值兜底 '')
  let album = '';
  if (typeof track.album === 'string' && track.album.trim()) {
    album = track.album.trim();
  } else if (track.albumObj && typeof track.albumObj.name === 'string') {
    album = track.albumObj.name.trim();
  }

  // 4. 封面图 (空值兜底 '')
  let artwork = '';
  if (typeof track.artwork === 'string' && track.artwork.trim()) {
    artwork = track.artwork.trim();
  } else if (typeof track.coverUrl === 'string' && track.coverUrl.trim()) {
    artwork = track.coverUrl.trim();
  } else if (typeof track.picUrl === 'string' && track.picUrl.trim()) {
    artwork = track.picUrl.trim();
  }

  // 5. 时长 (秒，Math.round((track.durationMs || 0) / 1000))
  let duration = 0;
  if (typeof track.durationMs === 'number' && track.durationMs > 0) {
    duration = Math.round(track.durationMs / 1000);
  } else if (typeof track.duration === 'number' && track.duration > 0) {
    duration =
      track.duration > 10000
        ? Math.round(track.duration / 1000)
        : Math.round(track.duration);
  }

  // 6. 唯一标识 (优先使用 track.id，如网易云 song id 或 QQ song mid)
  let id = '';
  if (track.id != null && String(track.id).trim()) {
    id = String(track.id).trim();
  } else {
    id = `${title}_${artist}_${defaultIndex}`;
  }

  // 7. 原生音源平台桥接 (优先使用 track 自身的 platform，否则继承歌单级 platform)
  let rawPlatform = track.platform;
  if (!rawPlatform || rawPlatform === 'PlaylistOut') {
    rawPlatform = defaultPlatform;
  }
  const platform = resolveMusicPlatform(rawPlatform);

  return {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
    platform,
    // 严格遵循原生桥接规范：不硬编码盗版音频直链，交由宿主原生插件负责高清解码播放
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

  // 探测歌单原始平台
  let detectedPlatform = parsed.platform || parsed.result?.platform || parsed.data?.platform || 'PlaylistOut';
  if (detectedPlatform === 'PlaylistOut') {
    const url = parsed.sourceUrl || (Array.isArray(tracks) && tracks[0]?.sourceUrl) || '';
    if (/music\.163\.com/i.test(url)) detectedPlatform = 'netease';
    else if (/qq\.com/i.test(url)) detectedPlatform = 'qq';
    else if (/kugou\.com/i.test(url)) detectedPlatform = 'kugou';
    else if (/kuwo\.cn/i.test(url)) detectedPlatform = 'kuwo';
    else if (/qishui|douyin/i.test(url)) detectedPlatform = 'qishui';
    else if (/bilibili\.com/i.test(url)) detectedPlatform = 'bilibili';
    else if (/migu\.cn/i.test(url)) detectedPlatform = 'migu';
  }

  const items = tracks
    .map((t, idx) => mapTrackToMusicItem(t, idx + 1, detectedPlatform))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error('未解析到有效的歌曲数据');
  }

  return items;
}

/**
 * 判断输入是否为本地 .json 文件路径或 file:// URI
 */
function isLocalJsonPath(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().replace(/^["']|["']$/g, '');
  if (/^https?:\/\//i.test(s)) return false;
  if (s.startsWith('file://')) return true;
  if (/\.json$/i.test(s)) return true;
  return false;
}

/**
 * 将输入路径格式化为本地可读取的文件绝对路径
 */
function resolveLocalPath(inputPath) {
  let cleanPath = inputPath.trim().replace(/^["']|["']$/g, '');
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.slice(7);
    // 兼容 Windows 系统的 file:///D:/... 格式
    if (/^\/[a-zA-Z]:[/\\]/.test(cleanPath)) {
      cleanPath = cleanPath.slice(1);
    }
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (_) {}
  }
  return cleanPath;
}

/**
 * 导入歌单 (精简聚焦：在线歌单链接/分享文案 + 本地 .json 文件路径导入两大核心入口)
 * @param {string} urlLike 歌单链接、分享文本或本地 .json 文件路径
 * @returns {Promise<Array<object>>} IMusicItem[] 歌曲列表
 */
async function importMusicSheet(urlLike) {
  if (!urlLike || typeof urlLike !== 'string') {
    throw new Error('请输入有效的歌单链接、分享文本或本地 .json 文件路径');
  }

  const trimmed = urlLike.trim();
  if (!trimmed) {
    throw new Error('输入内容不能为空');
  }

  // 1. 明确拦截直接粘贴 JSON 长文本的操作，避免文本过长或截断导致异常
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    throw new Error(
      '请勿直接粘贴 JSON 长文本，请直接输入导出的本地 .json 文件路径 (如 D:\\playlist.json) 或在线歌单链接'
    );
  }

  // 2. 本地 JSON 文件路径导入 (支持普通路径与 file:/// 协议，本地 fs 极速读取)
  if (isLocalJsonPath(trimmed)) {
    const fsModule = getFsModule();

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

  // 3. 在线云端 API 解析模式 (调用 PlaylistOut 生产 API: QQ/网易云/酷狗/汽水)
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

  // 探测歌单原始平台
  let detectedPlatform = res.data.platform || res.data.data?.platform || result?.platform || 'PlaylistOut';
  if (detectedPlatform === 'PlaylistOut') {
    if (/music\.163\.com/i.test(trimmed)) detectedPlatform = 'netease';
    else if (/qq\.com/i.test(trimmed)) detectedPlatform = 'qq';
    else if (/kugou\.com/i.test(trimmed)) detectedPlatform = 'kugou';
    else if (/kuwo\.cn/i.test(trimmed)) detectedPlatform = 'kuwo';
    else if (/qishui|douyin/i.test(trimmed)) detectedPlatform = 'qishui';
    else if (/bilibili\.com/i.test(trimmed)) detectedPlatform = 'bilibili';
    else if (/migu\.cn/i.test(trimmed)) detectedPlatform = 'migu';
  }

  const items = rawTracks
    .map((t, idx) => mapTrackToMusicItem(t, idx + 1, detectedPlatform))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error('未解析到有效的歌曲数据');
  }

  return items;
}

/**
 * 获取歌曲播放音源 (getMediaSource)
 * 纯净桥接规范：不内置或抓取任何第三方私有/失效音频接口，
 * 占位返回 null，全面由宿主原生音源插件 (netease, 20, WebFilter 等) 负责高清解码播放。
 * @returns {Promise<null>}
 */
async function getMediaSource() {
  return null;
}

module.exports = {
  platform: 'PlaylistOut',
  author: 'LengxiQwQ',
  version: '1.2.0',
  appVersion: '>0.1.0-alpha.0',
  srcUrl: 'https://playlistout.lengxiqwq.com/plugins/musicfree.js',
  cacheControl: 'no-store',
  hints: {
    importMusicSheet: [
      '【在线解析】直接粘贴 QQ音乐/网易云/酷狗/汽水 歌单链接、分享文本或短链',
      '【本地导入】直接输入本地导出的 .json 歌单文件路径 (如 D:\\playlist.json)',
      '【原生音源桥接】自动按歌单原平台路由到本地原生插件 (网易云->netease, QQ->20, 酷狗->WebFilter 等)',
      '【自定义路由】可在插件设置中将音源通道强制指定为某个特定插件 ID',
      '【千首无损】网易云支持超大歌单免登录完整解析',
      '【官方网站】playlistout.lengxiqwq.com',
    ],
  },
  userVariables: [
    {
      key: 'targetPlatform',
      name: '音源路由通道 (默认 auto 自动映射原平台)',
      hint: 'auto=自动按歌单原平台路由(网易云->netease, QQ->20, 酷狗->WebFilter, 汽水->qishui, 酷我->kuwo, B站->bilibili, 咪咕->migu); 亦可手动指定任意音源插件 ID',
    },
  ],
  supportedSearchType: ['sheet'],
  importMusicSheet,
  getMediaSource,
};
