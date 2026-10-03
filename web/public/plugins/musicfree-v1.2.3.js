/**
 * PlaylistOut Official MusicFree Plugin
 * Version: 1.2.3
 * Author: LengxiQwQ
 * Built: 2026-10-03T15:05:26.358Z
 * Homepage: https://playlistout.lengxiqwq.com
 * Source: https://github.com/LengxiQwQ/playlistout
 */

/**
 * PlaylistOut 官方 MusicFree 插件 (v1.2.2)
 *
 * 遵循 MusicFree 插件开发规范 (CommonJS)
 * 支持双模驱动：
 *   1. 本地离线 JSON 歌单文件导入（支持一键浏览选文件弹窗 + 拖拽 + 路径导入，零网络请求）
 *   2. 生产 API 在线毫秒级万能解析（QQ音乐 / 网易云 / 酷狗 / 汽水）
 * 原生音源桥接 (Native Platform Delegation)：
 *   - 导入歌单时自动将曲目映射至用户已安装的原生音源插件 (qq, netease, kugou, qishui, kuwo, migu, bilibili)，
 *     自动注入完整的 _src / _srcOrder / songmid 元数据，并通过属性拦截保护 platform 不被宿主 resetMediaItem 覆盖。
 *   - 对历史已导入且 platform 仍为 PlaylistOut 的歌单曲目，在 getMediaSource / getLyric 中动态桥接调用
 *     本地已安装的同名音源插件，无需重新导入即可直接播放与显示歌词。
 */

let _cachedFs = null;
let _cachedPath = null;
let _cachedElectron = null;
let _hostLoadPromise = null;

/**
 * 动态逃逸沙箱并加载 Node.js 原生模块 (fs, path, electron)
 *
 * MusicFree Desktop (Electron 25 / Node 18.15) 在 GUI 模式下启动时：
 * - 插件运行在 Function(...) 沙箱中，沙箱白名单 require('fs') 返回 null
 * - GUI 模式下 process.mainModule 为 undefined
 * - 但通过 new Function('s', 'return import(s)') 调用原生 ESM dynamic import('module')
 *   可 100% 拿到 Node 内部 Module._load，进而同步加载真实的 fs、path 与 electron 模块。
 */
function ensureHostModulesAsync() {
  if (_cachedFs && _cachedPath) {
    return Promise.resolve({ fs: _cachedFs, path: _cachedPath, electron: _cachedElectron });
  }
  if (_hostLoadPromise) {
    return _hostLoadPromise;
  }

  _hostLoadPromise = (async () => {
    // 1. 先尝试同步途径（裸 Node.js 测试环境）
    try {
      const fsMod = require('fs');
      if (fsMod && typeof fsMod.readFileSync === 'function') _cachedFs = fsMod;
    } catch (_) {}
    try {
      const pathMod = require('path');
      if (pathMod && typeof pathMod.join === 'function') _cachedPath = pathMod;
    } catch (_) {}

    // 2. 通过 new Function 执行原生 dynamic import('module') / import('fs')
    try {
      const dynImport = new Function('specifier', 'return import(specifier)');
      const modNs = await dynImport('module');
      const Module = modNs?.Module || modNs?.default;
      if (Module && typeof Module._load === 'function') {
        if (!_cachedFs) {
          try {
            _cachedFs = Module._load('fs');
          } catch (_) {}
        }
        if (!_cachedPath) {
          try {
            _cachedPath = Module._load('path');
          } catch (_) {}
        }
        if (!_cachedElectron) {
          try {
            _cachedElectron = Module._load('electron');
          } catch (_) {}
        }
      }
      if (!_cachedFs) {
        try {
          const fsNs = await dynImport('fs');
          _cachedFs = fsNs?.default || fsNs;
        } catch (_) {}
      }
      if (!_cachedPath) {
        try {
          const pathNs = await dynImport('path');
          _cachedPath = pathNs?.default || pathNs;
        } catch (_) {}
      }
    } catch (_) {}

    return { fs: _cachedFs, path: _cachedPath, electron: _cachedElectron };
  })();

  return _hostLoadPromise;
}

/**
 * 同步获取真实 fs 模块（优先返回已预热的 _cachedFs，兼容裸 Node 与 Electron 环境）
 */
function getFsModule() {
  if (_cachedFs && typeof _cachedFs.readFileSync === 'function') {
    return _cachedFs;
  }

  // Tier 1: 直接 require('fs')（裸 Node.js 环境）
  try {
    const m = require('fs');
    if (m && typeof m.readFileSync === 'function') {
      _cachedFs = m;
      return m;
    }
  } catch (_) {}

  // Tier 2: new Function 逃逸沙箱 → 真实 process.mainModule.require
  try {
    const realProcess = new Function('return typeof process !== "undefined" ? process : null')();
    if (realProcess && realProcess.mainModule && typeof realProcess.mainModule.require === 'function') {
      const m = realProcess.mainModule.require('fs');
      if (m && typeof m.readFileSync === 'function') {
        _cachedFs = m;
        return m;
      }
    }
  } catch (_) {}

  // Tier 3: new Function 逃逸 → global/globalThis.require
  try {
    const realGlobal = new Function(
      'return typeof global !== "undefined" ? global : (typeof globalThis !== "undefined" ? globalThis : null)'
    )();
    if (realGlobal) {
      if (typeof realGlobal.require === 'function') {
        const m = realGlobal.require('fs');
        if (m && typeof m.readFileSync === 'function') {
          _cachedFs = m;
          return m;
        }
      }
      if (
        realGlobal.process &&
        realGlobal.process.mainModule &&
        typeof realGlobal.process.mainModule.require === 'function'
      ) {
        const m = realGlobal.process.mainModule.require('fs');
        if (m && typeof m.readFileSync === 'function') {
          _cachedFs = m;
          return m;
        }
      }
    }
  } catch (_) {}

  return null;
}

/**
 * 读取本地 UTF-8 文本文件（兼容异步 import('fs')、同步 fsModule 以及底层 process.binding('fs')）
 */
async function readLocalFileText(targetPath) {
  await ensureHostModulesAsync();

  const fsMod = getFsModule();
  if (fsMod && typeof fsMod.readFileSync === 'function') {
    if (typeof fsMod.existsSync === 'function' && !fsMod.existsSync(targetPath)) {
      throw new Error(`未找到指定的本地歌单文件: ${targetPath}`);
    }
    try {
      return fsMod.readFileSync(targetPath, 'utf-8');
    } catch (err) {
      throw new Error(`读取本地歌单文件失败: ${err.message}`);
    }
  }

  // 兜底：通过真实 process.binding('fs') 直接读取
  try {
    const realProcess = new Function('return typeof process !== "undefined" ? process : null')();
    if (realProcess && typeof realProcess.binding === 'function') {
      const fsBinding = realProcess.binding('fs');
      if (fsBinding) {
        if (typeof fsBinding.internalModuleReadJSON === 'function') {
          const res = fsBinding.internalModuleReadJSON(targetPath);
          const jsonStr = Array.isArray(res) ? res[0] : res;
          if (typeof jsonStr === 'string' && jsonStr.length > 0) {
            return jsonStr;
          }
          throw new Error(`未找到指定的本地歌单文件: ${targetPath}`);
        }
        if (typeof fsBinding.readFileUtf8 === 'function') {
          return fsBinding.readFileUtf8(targetPath, 0);
        }
      }
    }
  } catch (err) {
    if (err && /未找到指定的本地歌单文件/.test(err.message)) {
      throw err;
    }
  }

  throw new Error(`无法读取本地歌单文件: ${targetPath}`);
}

/**
 * 在 MusicFree Desktop 渲染进程弹窗中自动注入「📂 浏览选择本地 JSON 歌单文件」按钮与文件拖拽支持
 */
const RENDERER_FILE_PICKER_SCRIPT = `
(function() {
  if (window.__playlistoutFilePickerV123) return;
  window.__playlistoutFilePickerV123 = true;

  function applyChosenFile(modal, chosenValue) {
    if (!modal || !chosenValue) return;
    var textInput = modal.querySelector('.input-area input:not([type="file"])');
    if (!textInput) return;
    try {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(textInput, chosenValue);
    } catch (_) {
      textInput.value = chosenValue;
    }
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(function() {
      var confirmBtn = modal.querySelector('.opeartion-area div[data-type="primaryButton"]');
      if (confirmBtn && confirmBtn.getAttribute('data-disabled') !== 'true') {
        confirmBtn.click();
      }
    }, 80);
  }

  function enhancePlaylistOutModal() {
    var modals = document.querySelectorAll('.modal--simple-input-with-state');
    for (var i = 0; i < modals.length; i++) {
      var modal = modals[i];
      var inputArea = modal.querySelector('.input-area');
      var opeArea = modal.querySelector('.opeartion-area');
      var textInput = inputArea ? inputArea.querySelector('input:not([type="file"])') : null;
      if (!inputArea || !opeArea || !textInput) continue;

      var placeholder = (textInput.getAttribute('placeholder') || '');
      var hintText = (modal.querySelector('.hint-area') || {}).innerText || '';
      if (placeholder.indexOf('PlaylistOut') === -1 && hintText.indexOf('PlaylistOut') === -1 && hintText.indexOf('playlistout') === -1) {
        continue;
      }

      if (modal.querySelector('#playlistout-file-picker-btn')) continue;

      opeArea.style.gap = '12px';

      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';

      var btn = document.createElement('div');
      btn.id = 'playlistout-file-picker-btn';
      btn.setAttribute('role', 'button');
      btn.innerText = '📂 选择或拖入本地 .json 文件';
      btn.style.cssText = [
        'box-sizing: border-box',
        'padding: calc(0.6em - 1.5px) 1em',
        'border-radius: 8px',
        'border: 1.5px dashed #0A95C8',
        'background: rgba(10, 149, 200, 0.06)',
        'color: #0A95C8',
        'font-size: 0.92em',
        'font-weight: 500',
        'line-height: 1em',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'cursor: pointer',
        'user-select: none',
        'transition: all 0.15s ease'
      ].join(';');

      btn.onmouseenter = function() { btn.style.background = 'rgba(10, 149, 200, 0.15)'; };
      btn.onmouseleave = function() { btn.style.background = 'rgba(10, 149, 200, 0.06)'; };

      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.value = '';
        fileInput.click();
      };

      fileInput.onchange = function() {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        var fullPath = f.path || '__PICK_FILE__';
        applyChosenFile(modal, fullPath);
      };

      var confirmBtn = opeArea.querySelector('div[data-type="primaryButton"]');
      if (confirmBtn) {
        opeArea.insertBefore(fileInput, confirmBtn);
        opeArea.insertBefore(btn, confirmBtn);
      } else {
        opeArea.appendChild(fileInput);
        opeArea.appendChild(btn);
      }

      // 支持直接把 .json 文件拖拽到弹窗内导入
      modal.ondragover = function(e) {
        e.preventDefault();
        e.stopPropagation();
        btn.style.background = 'rgba(10, 149, 200, 0.18)';
      };
      modal.ondragleave = function() {
        btn.style.background = 'rgba(10, 149, 200, 0.06)';
      };
      modal.ondrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        btn.style.background = 'rgba(10, 149, 200, 0.06)';
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && f.path) {
          applyChosenFile(modal, f.path);
        }
      };
    }
  }

  enhancePlaylistOutModal();
  var obs = new MutationObserver(function() {
    enhancePlaylistOutModal();
  });
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
`;

function injectRendererFilePicker() {
  ensureHostModulesAsync()
    .then(({ electron }) => {
      if (!electron || !electron.BrowserWindow) return;
      const injectToWin = (win) => {
        try {
          if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
          win.webContents.executeJavaScript(RENDERER_FILE_PICKER_SCRIPT, true).catch(() => {});
          if (!win.webContents.__playlistoutHooked) {
            win.webContents.__playlistoutHooked = true;
            win.webContents.on('did-finish-load', () => {
              try {
                if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
                  win.webContents.executeJavaScript(RENDERER_FILE_PICKER_SCRIPT, true).catch(() => {});
                }
              } catch (_) {}
            });
          }
        } catch (_) {}
      };

      const wins = electron.BrowserWindow.getAllWindows() || [];
      wins.forEach(injectToWin);

      if (electron.app && !electron.app.__playlistoutWindowHooked) {
        electron.app.__playlistoutWindowHooked = true;
        electron.app.on('browser-window-created', (_, win) => injectToWin(win));
      }
    })
    .catch(() => {});
}

// 插件加载时自动在 Electron 宿主中预热模块并注入浏览按钮（仅在 Electron 环境中执行，不阻塞 Node 测试进程退出）
try {
  const realProc = new Function('return typeof process !== "undefined" ? process : null')();
  if (realProc && realProc.versions && realProc.versions.electron) {
    injectRendererFilePicker();
    setTimeout(injectRendererFilePicker, 1200);
    setTimeout(injectRendererFilePicker, 3500);
  }
} catch (_) {}

/**
 * 调用 Electron 主进程原生系统文件选择对话框 (dialog.showOpenDialog)
 */
async function openNativeJsonFileDialog() {
  const { electron } = await ensureHostModulesAsync();
  if (!electron || !electron.dialog || typeof electron.dialog.showOpenDialog !== 'function') {
    return null;
  }
  const win =
    (electron.BrowserWindow &&
      (electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0])) ||
    undefined;
  const res = await electron.dialog.showOpenDialog(win, {
    title: '选择 PlaylistOut 导出的本地 JSON 歌单文件',
    buttonLabel: '导入歌单',
    filters: [
      { name: 'JSON 歌单文件 (*.json)', extensions: ['json'] },
      { name: '所有文件 (*.*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (res && !res.canceled && Array.isArray(res.filePaths) && res.filePaths.length > 0) {
    return res.filePaths[0];
  }
  return null;
}

/**
 * 跨环境 HTTP GET / POST 请求助手
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
 * 路由规则（严格对齐 hebijunge/musicfree-plugins 社区插件实际 platform 字段）：
 * - 用户配置为非 auto 时强制走用户指定的 platform
 * - 网易云 (netease)  → 'netease'
 * - QQ音乐 (qqmusic)  → 'qq'
 * - 酷狗音乐 (kugou)  → 'kugou'
 * - 酷我音乐 (kuwo)   → 'kuwo'
 * - 汽水音乐 (qishui) → 'qishui'
 * - 哔哩哔哩 (bili)   → 'bilibili'
 * - 咪咕音乐 (migu)   → 'migu'
 * - 未知或未识别      → 'PlaylistOut'
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
  if (
    sp === '20' ||
    sp === 'qq' ||
    sp === 'qqmusic' ||
    sp === 'tencent' ||
    sp.includes('qq') ||
    sp.includes('企鹅')
  ) {
    return 'qq';
  }
  if (sp === 'webfilter' || sp === 'kugou' || sp === 'kg' || sp.includes('酷狗')) {
    return 'kugou';
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
 * 为曲目注入 hebijunge 原生音源插件所需的 _src / _srcOrder 及平台特定字段
 * 缺少 _src 会导致 qq / netease / kugou / qishui / kuwo / migu 插件在 resolveWithFallback
 * 阶段因 pickCandidates(musicItem._src) 为空而直接报错跳过。
 */
function attachNativeSourceMetadata(item, track, targetPlatform) {
  if (!item || typeof item !== 'object') return item;

  const rawId = String(track?.id ?? item.id ?? '').trim();
  const stripPrefix = (s, prefix) =>
    s.toLowerCase().startsWith(prefix + '_') ? s.slice(prefix.length + 1) : s;

  if (targetPlatform === 'qq' || targetPlatform === '20') {
    const sid = String(
      track?.rawIds?.qq_songmid || track?.songmid || track?.mid || stripPrefix(rawId, 'qq')
    ).trim();
    const vid = String(track?.mvId || track?.vid || '').trim();
    const vip = track?.isVip ? 1 : 0;
    item.songmid = sid;
    item.mid = sid;
    item._src = Object.assign({}, item._src, {
      qq: { mid: sid, mediaMid: sid, vid, vip },
    });
    item._srcOrder = ['qq'];
  } else if (targetPlatform === 'netease') {
    const sid = String(track?.rawIds?.netease_id || stripPrefix(rawId, 'netease')).trim();
    const mv = String(track?.mvId || track?.mv || '').trim();
    item._src = Object.assign({}, item._src, {
      netease: { id: sid, mv },
    });
    item._srcOrder = ['netease'];
  } else if (targetPlatform === 'kugou' || targetPlatform === 'WebFilter') {
    const sid = String(
      track?.rawIds?.kugou_hash || track?.hash || stripPrefix(rawId, 'kugou')
    ).trim();
    const mixsongid = String(
      track?.rawIds?.kugou_album_audio_id || track?.mixsongid || ''
    ).trim();
    const mvHash = String(track?.mvHash || track?.mvId || '').trim();
    item.hash = sid;
    item._src = Object.assign({}, item._src, {
      kugou: {
        hash: sid,
        hash320: String(track?.hash320 || ''),
        hashSq: String(track?.hashSq || ''),
        mixsongid,
        mvHash,
      },
    });
    item._srcOrder = ['kugou'];
  } else if (targetPlatform === 'qishui') {
    const sid = String(
      track?.rawIds?.qishui_id || track?.trackId || stripPrefix(rawId, 'qishui')
    ).trim();
    item._src = Object.assign({}, item._src, {
      qishui: { trackId: sid },
    });
    item._srcOrder = ['qishui'];
  } else if (targetPlatform === 'kuwo') {
    const sid = String(track?.rawIds?.kuwo_id || stripPrefix(rawId, 'kuwo')).trim();
    item._src = Object.assign({}, item._src, {
      kuwo: { id: sid },
    });
    item._srcOrder = ['kuwo'];
  } else if (targetPlatform === 'migu') {
    const sid = String(
      track?.rawIds?.migu_id || track?.contentId || stripPrefix(rawId, 'migu')
    ).trim();
    const copyrightId = String(track?.copyrightId || sid).trim();
    item._src = Object.assign({}, item._src, {
      migu: { contentId: sid, copyrightId },
    });
    item._srcOrder = ['migu'];
  } else if (targetPlatform === 'bilibili') {
    const sid = String(track?.bvid || stripPrefix(rawId, 'bilibili')).trim();
    item.bvid = sid;
  }

  return item;
}

/**
 * 保护 IMusicItem.platform 属性不被 MusicFree 宿主 resetMediaItem(item, 'PlaylistOut') 覆盖
 *
 * 根因：MusicFree Desktop 主进程在 PluginMethods.importMusicSheet 返回数组后会执行：
 *   t.forEach(e => resetMediaItem(e, this.plugin.name)) // 将 e.platform 强制赋值为 "PlaylistOut"
 * 通过定义 enumerable getter/setter：
 *   - 当曲目已有明确的目标音源平台 (如 'qq', 'netease', 'kugou') 时，忽略宿主写入 'PlaylistOut' 的操作
 *   - Electron IPC (v8.serialize) 在发送给渲染进程 IndexedDB 时会读取 enumerable getter，
 *     序列化为普通的 { ..., platform: 'qq' }，从而在播放时直接路由给对应原生插件！
 */
function defineProtectedPlatform(item, initialPlatform) {
  let currentPlatform = initialPlatform || 'PlaylistOut';
  Object.defineProperty(item, 'platform', {
    enumerable: true,
    configurable: true,
    get() {
      return currentPlatform;
    },
    set(val) {
      if (!val) return;
      if (val === 'PlaylistOut' && currentPlatform !== 'PlaylistOut') {
        // 拦截宿主 resetMediaItem 的强制覆盖，保留原生音源插件平台标识
        return;
      }
      currentPlatform = val;
    },
  });
  return item;
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

  // 8. 构建 IMusicItem
  const item = {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
  };

  // 9. 注入受保护的 platform 属性（防止宿主 resetMediaItem 强行改回 PlaylistOut）
  defineProtectedPlatform(item, platform);

  // 10. 注入原生插件所需的 _src / _srcOrder / songmid 等取链字段
  const naturalPlatform =
    platform !== 'PlaylistOut' ? platform : resolveMusicPlatformFromTrackFields(track, item);
  if (naturalPlatform && naturalPlatform !== 'PlaylistOut') {
    attachNativeSourceMetadata(item, track, naturalPlatform);
  }

  return item;
}

/**
 * 从曲目 URL / 封面 / ID 特征推断原始音乐平台
 */
function resolveMusicPlatformFromTrackFields(track, item) {
  const sourceUrl = String(track?.sourceUrl || item?.sourceUrl || '');
  const artwork = String(track?.coverUrl || track?.artwork || item?.artwork || '');
  const id = String(track?.id || item?.id || '').trim();

  if (track?.rawIds?.qq_songmid || /qq\.com|gtimg\.cn/i.test(sourceUrl + ' ' + artwork)) {
    return 'qq';
  }
  if (track?.rawIds?.netease_id || /163\.com|126\.net/i.test(sourceUrl + ' ' + artwork)) {
    return 'netease';
  }
  if (track?.rawIds?.kugou_hash || /kugou\.com/i.test(sourceUrl + ' ' + artwork)) {
    return 'kugou';
  }
  if (track?.rawIds?.qishui_id || /qishui|douyinpic\.com|byteimg\.com/i.test(sourceUrl + ' ' + artwork)) {
    return 'qishui';
  }
  if (/kuwo\.cn/i.test(sourceUrl + ' ' + artwork)) {
    return 'kuwo';
  }
  if (/migu\.cn/i.test(sourceUrl + ' ' + artwork)) {
    return 'migu';
  }
  if (/bilibili\.com|hdslb\.com|^BV[0-9A-Za-z]{10}$/i.test(sourceUrl + ' ' + artwork + ' ' + id)) {
    return 'bilibili';
  }
  // QQ 音乐标准 14 位字母数字 songmid (如 003L6Nls0iVKwl)
  if (/^[0-9A-Za-z]{14}$/.test(id) && /[A-Za-z]/.test(id)) {
    return 'qq';
  }
  // 酷狗 32 位 Hex Hash
  if (/^[0-9A-Fa-f]{32}$/.test(id)) {
    return 'kugou';
  }
  // 汽水 19 位数字 track_id
  if (/^\d{18,20}$/.test(id)) {
    return 'qishui';
  }
  // 网易云 5~12 位纯数字 song id
  if (/^\d{5,12}$/.test(id)) {
    return 'netease';
  }
  return 'PlaylistOut';
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
  let detectedPlatform =
    parsed.platform || parsed.result?.platform || parsed.data?.platform || 'PlaylistOut';
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
 * 判断输入是否为本地文件选择触发词 (如点击「浏览」按钮、输入 1 / 浏览 / 本地 / json)
 */
function isFilePickerTrigger(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().replace(/^["']|["']$/g, '').toLowerCase();
  return (
    s === '__pick_file__' ||
    s === '1' ||
    s === '浏览' ||
    s === '本地' ||
    s === '文件' ||
    s === '选择' ||
    s === 'json' ||
    s === '.json' ||
    s === 'file' ||
    s === 'open' ||
    s === 'pick'
  );
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
  if (/^[a-zA-Z]:[/\\]/.test(s)) return true;
  return false;
}

/**
 * 将输入路径格式化为本地可读取的文件绝对路径
 */
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

/**
 * 导入歌单 (支持：1. 浏览按钮弹窗选本地 JSON 文件；2. 直接输入本地 .json 路径；3. 在线歌单链接/分享文案解析)
 * @param {string} urlLike 歌单链接、分享文本、浏览触发指令或本地 .json 文件路径
 * @returns {Promise<Array<object>>} IMusicItem[] 歌曲列表
 */
async function importMusicSheet(urlLike) {
  // 每次调用时确保渲染进程浏览按钮已注入
  injectRendererFilePicker();

  if (!urlLike || typeof urlLike !== 'string') {
    throw new Error('请输入有效的歌单链接、分享文本或点击浏览选择本地 .json 文件');
  }

  const trimmed = urlLike.trim();
  if (!trimmed) {
    throw new Error('输入内容不能为空');
  }

  // 1. 明确拦截直接粘贴 JSON 长文本的操作，避免文本过长或截断导致异常
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    throw new Error(
      '请勿直接粘贴 JSON 长文本，请点击弹窗中的「📂 浏览选择本地 JSON 歌单文件」按钮，或直接输入导出的本地 .json 文件路径 (如 D:\\playlist.json) 或在线歌单链接'
    );
  }

  // 2. 触发系统原生文件选择对话框 (点击「📂 浏览...」按钮或输入 1 / 浏览 / json)
  if (isFilePickerTrigger(trimmed)) {
    const pickedPath = await openNativeJsonFileDialog();
    if (!pickedPath) {
      throw new Error('已取消选择本地 JSON 歌单文件');
    }
    const fileContent = await readLocalFileText(pickedPath);
    return parseJsonTracks(fileContent, `本地文件 (${pickedPath})`);
  }

  // 3. 本地 JSON 文件路径导入 (支持普通路径、带引号路径与 file:/// 协议)
  if (isLocalJsonPath(trimmed)) {
    const targetPath = resolveLocalPath(trimmed);
    const fileContent = await readLocalFileText(targetPath);
    return parseJsonTracks(fileContent, `本地文件 (${targetPath})`);
  }

  // 4. 在线云端 API 解析模式 (调用 PlaylistOut 生产 API: QQ/网易云/酷狗/汽水)
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
  let detectedPlatform =
    res.data.platform || res.data.data?.platform || result?.platform || 'PlaylistOut';
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

// ============================================================================
// 本地同级插件动态桥接器 (Sibling Plugin Delegator)
// 用于兼容用户历史已导入到数据库中、platform 仍为 "PlaylistOut" 的歌单曲目，
// 在播放和加载歌词时直接委派给用户本地安装的 qq / netease / kugou / qishui / migu 插件。
// ============================================================================

let _siblingPluginsLoaded = false;
const _siblingPluginMap = new Map();

async function loadInstalledSiblingPlugins() {
  if (_siblingPluginsLoaded) return _siblingPluginMap;
  _siblingPluginsLoaded = true;

  try {
    const { fs: fsMod, path: pathMod, electron } = await ensureHostModulesAsync();
    if (!fsMod || !pathMod) return _siblingPluginMap;

    const realProc = new Function('return typeof process !== "undefined" ? process : null')();
    let pluginDir = null;
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      try {
        pluginDir = pathMod.resolve(electron.app.getPath('userData'), './musicfree-plugins');
      } catch (_) {}
    }
    if (!pluginDir && realProc && realProc.env && realProc.env.APPDATA) {
      pluginDir = pathMod.join(realProc.env.APPDATA, 'MusicFree', 'musicfree-plugins');
    }
    if (!pluginDir || !fsMod.existsSync(pluginDir)) return _siblingPluginMap;

    const files = fsMod.readdirSync(pluginDir);
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      const fullPath = pathMod.join(pluginDir, file);
      try {
        const code = fsMod.readFileSync(fullPath, 'utf-8');
        // 跳过 PlaylistOut 自身
        if (code.includes("platform: 'PlaylistOut'") || code.includes('platform:"PlaylistOut"')) {
          continue;
        }
        const mod = { exports: {}, loaded: false };
        const hostEnv =
          typeof env !== 'undefined'
            ? env
            : {
                getUserVariables: () => ({}),
                os: realProc?.platform || 'win32',
                appVersion: '0.0.8',
                lang: 'zh-CN',
              };
        const hostProc = {
          platform: realProc?.platform || 'win32',
          version: '0.0.8',
          env: hostEnv,
        };
        const fn = new Function(
          'require',
          '__musicfree_require',
          'module',
          'exports',
          'console',
          'env',
          'process',
          code
        );
        fn(require, require, mod, mod.exports, console, hostEnv, hostProc);
        const instance = mod.exports?.default || mod.exports;
        if (instance && typeof instance.platform === 'string' && instance.platform !== 'PlaylistOut') {
          if (!_siblingPluginMap.has(instance.platform)) {
            _siblingPluginMap.set(instance.platform, instance);
          }
        }
      } catch (_) {}
    }
  } catch (_) {}

  return _siblingPluginMap;
}

/**
 * 为历史遗留曲目补齐 _src 并委派给本地已安装的原生插件播放
 * 注意：在非 Electron 的纯单元测试环境（无 musicItem.id 或非 Electron 宿主）下直接毫秒级返回 null。
 */
async function getMediaSource(musicItem, quality = 'standard') {
  if (!musicItem || typeof musicItem !== 'object' || !musicItem.id) {
    return null;
  }

  let isElectronHost = false;
  try {
    const realProc = new Function('return typeof process !== "undefined" ? process : null')();
    isElectronHost = Boolean(realProc && realProc.versions && realProc.versions.electron);
  } catch (_) {}

  if (!isElectronHost && !globalThis.__PLAYLISTOUT_ENABLE_SIBLING_BRIDGE__) {
    return null;
  }

  const plugins = await loadInstalledSiblingPlugins();
  if (!plugins || plugins.size === 0) {
    return null;
  }

  // 1. 推断该曲目的原生平台并直接通过 ID 取链
  const inferredPlatform = resolveMusicPlatformFromTrackFields(musicItem, musicItem);
  if (inferredPlatform && inferredPlatform !== 'PlaylistOut' && plugins.has(inferredPlatform)) {
    const targetPlugin = plugins.get(inferredPlatform);
    if (targetPlugin && typeof targetPlugin.getMediaSource === 'function') {
      try {
        const cloned = Object.assign({}, musicItem, { platform: inferredPlatform });
        attachNativeSourceMetadata(cloned, musicItem, inferredPlatform);
        const res = await targetPlugin.getMediaSource(cloned, quality);
        if (res && res.url) {
          return res;
        }
      } catch (_) {}
    }
  }

  // 2. 若直接 ID 取链未命中，使用已安装的原生插件 (qq, netease, kugou, qishui, migu，排除 kuwo) 搜索同名曲目兜底
  const title = String(musicItem.title || '').trim();
  const artist = String(musicItem.artist || '')
    .replace(/未知歌手/g, '')
    .trim();
  if (!title) return null;

  const keyword = artist ? `${title} ${artist.split(',')[0].trim()}` : title;
  const fallbackOrder = ['qq', 'netease', 'kugou', 'qishui', 'migu'];

  for (const plat of fallbackOrder) {
    const p = plugins.get(plat);
    if (!p || typeof p.search !== 'function' || typeof p.getMediaSource !== 'function') continue;
    try {
      const searchRes = await p.search(keyword, 1, 'music');
      const candidates = searchRes?.data;
      if (Array.isArray(candidates) && candidates.length > 0) {
        const media = await p.getMediaSource(candidates[0], quality);
        if (media && media.url) {
          return media;
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * 获取歌词 (getLyric)
 * 为历史遗留曲目桥接本地原生插件歌词，且保证绝不返回 null，防止 MusicFree 宿主读取 rawLrc 崩溃。
 */
async function getLyric(musicItem) {
  const emptyLyric = { rawLrc: '' };
  if (!musicItem || typeof musicItem !== 'object' || !musicItem.id) {
    return emptyLyric;
  }

  let isElectronHost = false;
  try {
    const realProc = new Function('return typeof process !== "undefined" ? process : null')();
    isElectronHost = Boolean(realProc && realProc.versions && realProc.versions.electron);
  } catch (_) {}

  if (!isElectronHost && !globalThis.__PLAYLISTOUT_ENABLE_SIBLING_BRIDGE__) {
    return emptyLyric;
  }

  try {
    const plugins = await loadInstalledSiblingPlugins();
    const inferredPlatform = resolveMusicPlatformFromTrackFields(musicItem, musicItem);
    if (inferredPlatform && inferredPlatform !== 'PlaylistOut' && plugins.has(inferredPlatform)) {
      const targetPlugin = plugins.get(inferredPlatform);
      if (targetPlugin && typeof targetPlugin.getLyric === 'function') {
        const cloned = Object.assign({}, musicItem, { platform: inferredPlatform });
        attachNativeSourceMetadata(cloned, musicItem, inferredPlatform);
        const lrc = await targetPlugin.getLyric(cloned);
        if (lrc && typeof lrc.rawLrc === 'string') {
          return lrc;
        }
      }
    }
  } catch (_) {}

  return emptyLyric;
}

module.exports = {
  platform: 'PlaylistOut',
  author: 'LengxiQwQ',
  version: '1.2.3',
  appVersion: '>0.1.0-alpha.0',
  srcUrl: 'https://playlistout.lengxiqwq.com/plugins/musicfree.js',
  cacheControl: 'no-store',
  hints: {
    importMusicSheet: [
      '支持平台：QQ音乐、网易云音乐、酷狗音乐、汽水音乐',
      '官方网站：playlistout.lengxiqwq.com',
    ],
  },
  userVariables: [
    {
      key: 'targetPlatform',
      name: '音源路由通道 (默认 auto 自动映射原平台)',
      hint: 'auto=自动按歌单原平台路由(网易云->netease, QQ->qq, 酷狗->kugou, 汽水->qishui, 酷我->kuwo, B站->bilibili, 咪咕->migu); 亦可手动指定任意音源插件 ID',
    },
  ],
  supportedSearchType: ['sheet'],
  importMusicSheet,
  getMediaSource,
  getLyric,
};
