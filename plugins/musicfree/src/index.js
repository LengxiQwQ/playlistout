/**
 * PlaylistOut 官方 MusicFree 插件 (v2.2.0)
 *
 * 定位：歌单解析器 + 原生音源路由 + 双层自动兜底（跨插件严格匹配 + 内置兜底音源）
 *   1. 歌单解析：在线链接解析（QQ音乐 / 网易云 / 酷狗 / 汽水）+ 本地 JSON 文件导入
 *   2. 平台路由：每首曲目按「原曲自然平台」归属（qq / netease / kugou / kuwo / qishui / migu / bilibili），
 *      播放与歌词优先由宿主调度用户设备上已安装的对应原生插件，直接复用其音源与歌词能力
 *   3. 第一层兜底（桌面稳定版）：原平台插件缺失或取源失败时，通过宿主插件通道在其它已安装插件中
 *      严格匹配「同名 + 同歌手 + 同版本 + 时长吻合」的原曲并自动换源续播，宁可跳过绝不播放错歌
 *   4. 第二层兜底（全端）：仍无果时启用内置兜底音源（QQ音乐 / 网易云 / 酷狗公开接口，
 *      直链白名单 + 同级严格匹配 + 60 秒负缓存），历史版本导入的老歌单无需重导即可恢复播放
 *   5. Android Hermes 引擎全语法兼容（杜绝 ?., ??, async arrow 语法）
 */

let _cachedFs = null;
let _cachedPath = null;
let _cachedElectron = null;
let _hostLoadPromise = null;

/**
 * 宿主运行环境检测 (Desktop Electron vs Mobile Android/Hermes)
 */
function isHostElectron() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ === 'boolean') {
    return globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
  }
  try {
    const realProc = new Function('return typeof process !== "undefined" ? process : null')();
    if (realProc && realProc.versions && realProc.versions.electron) {
      return true;
    }
  } catch (_) {}
  return false;
}

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

  _hostLoadPromise = (async function () {
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
      const Module = (modNs && modNs.Module) || (modNs && modNs.default);
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
          _cachedFs = (fsNs && fsNs.default) || fsNs;
        } catch (_) {}
      }
      if (!_cachedPath) {
        try {
          const pathNs = await dynImport('path');
          _cachedPath = (pathNs && pathNs.default) || pathNs;
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

const PLUGIN_PLATFORM = '把你的歌单带走';
const LEGACY_PLATFORM = 'PlaylistOut';
const PLUGIN_VERSION = '2.2.0';

/**
 * 宿主运行环境与形态全方位智能探测
 * @returns {{ deviceClass: 'desktop'|'mobile', os: string, engine: string }}
 */
function detectClientEnvironment() {
  var isElectron = isHostElectron();
  var os = 'unknown';
  var engine = 'unknown';

  // 1. 尝试检测 Hermes 引擎 (Android React Native)
  try {
    if (typeof HermesInternal !== 'undefined' || (typeof globalThis !== 'undefined' && globalThis.HermesInternal)) {
      engine = 'hermes';
    }
  } catch (_) {}

  // 2. 判定设备类别 (deviceClass):
  // MusicFree 官方只有两类客户端：桌面版 (Desktop/Electron) 与 手机版 (Mobile/Android/React Native)
  var deviceClass = isElectron ? 'desktop' : 'mobile';

  // 3. 判定操作系统 (os) 与引擎
  if (deviceClass === 'desktop') {
    try {
      var realProc = new Function('return typeof process !== "undefined" ? process : null')();
      if (realProc && realProc.versions) {
        if (realProc.versions.electron) {
          engine = 'electron';
        } else if (realProc.versions.node) {
          engine = 'v8';
        }
      }
      if (realProc && realProc.platform) {
        if (realProc.platform === 'win32') os = 'windows';
        else if (realProc.platform === 'darwin') os = 'macos';
        else if (realProc.platform === 'linux') os = 'linux';
      }
    } catch (_) {}
    if (os === 'unknown') os = 'windows';
  } else {
    // 手机端
    try {
      var ua = typeof navigator !== 'undefined' && navigator.userAgent ? String(navigator.userAgent) : '';
      if (/iphone|ipad|ios/i.test(ua)) os = 'ios';
      else if (/android/i.test(ua)) os = 'android';
    } catch (_) {}
    if (os === 'unknown') os = 'android';
  }

  return {
    deviceClass: deviceClass,
    os: os,
    engine: engine,
  };
}

function getAnalyticsHostPlatform() {
  return detectClientEnvironment().os;
}

function getPlaylistOutHeaders() {
  var envInfo = detectClientEnvironment();
  return {
    'User-Agent': 'PlaylistOut-MusicFree/' + PLUGIN_VERSION + ' (' + envInfo.deviceClass + '; ' + envInfo.os + ')',
    Accept: 'application/json, text/plain, */*',
    'X-PlaylistOut-Client-Type': 'plugin',
    'X-PlaylistOut-Client-Id': 'musicfree',
    'X-PlaylistOut-Client-Version': PLUGIN_VERSION,
    'X-PlaylistOut-Device-Class': envInfo.deviceClass,
    'X-PlaylistOut-Host': envInfo.os,
  };
}

function isSelfPlatform(plat) {
  return (
    !plat ||
    plat === PLUGIN_PLATFORM ||
    plat === LEGACY_PLATFORM
  );
}

/**
 * 在 MusicFree Desktop 渲染进程弹窗中自动注入：
 * 导入歌单弹窗：「📂 选择本地 JSON」与「🌐 去官网解析歌单」并排虚线按钮 + 拖拽支持
 */
const RENDERER_FILE_PICKER_SCRIPT = `
(function() {
  var SCRIPT_VER = 'v139';
  if (window.__playlistoutFilePickerVer === SCRIPT_VER) return;
  window.__playlistoutFilePickerVer = SCRIPT_VER;

  // 清理历史旧版本残留的药丸与自定义样式，确保面板与弹窗纯净稳定
  try {
    var oldStyle = document.getElementById('playlistout-user-variables-style');
    if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);
    var oldPills = document.querySelectorAll('.playlistout-var-pills');
    for (var p = 0; p < oldPills.length; p++) {
      if (oldPills[p].parentNode) oldPills[p].parentNode.removeChild(oldPills[p]);
    }
    var oldWebTokenBtn = document.getElementById('playlistout-open-web-btn');
    if (oldWebTokenBtn && oldWebTokenBtn.innerText.indexOf('Token') !== -1) {
      oldWebTokenBtn.remove();
    }
  } catch (_) {}

  function openOfficialWebsite() {
    var url = 'https://playlistout.lengxiqwq.com';
    try {
      var shared = window['@shared/utils'];
      if (shared && shared.shell && typeof shared.shell.openExternal === 'function') {
        shared.shell.openExternal(url);
        return;
      }
    } catch (_) {}
    try {
      window.open(url, '_blank');
    } catch (_) {}
  }

  function setInputValueAndNotify(inputEl, newValue) {
    if (!inputEl) return;
    try {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inputEl, newValue);
    } catch (_) {
      inputEl.value = newValue;
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyChosenFile(modal, chosenValue) {
    if (!modal || !chosenValue) return;
    var textInput = modal.querySelector('.input-area input:not([type="file"])');
    if (!textInput) return;
    setInputValueAndNotify(textInput, chosenValue);

    setTimeout(function() {
      var confirmBtn = modal.querySelector('.opeartion-area div[data-type="primaryButton"]');
      if (confirmBtn && confirmBtn.getAttribute('data-disabled') !== 'true') {
        confirmBtn.click();
      }
    }, 80);
  }

  function createDashedButton(id, text, onClick) {
    var btn = document.createElement('div');
    btn.id = id;
    btn.setAttribute('role', 'button');
    btn.innerText = text;
    btn.style.cssText = [
      'box-sizing: border-box',
      'padding: calc(0.6em - 1.5px) 0.85em',
      'border-radius: 8px',
      'border: 1.5px dashed #0A95C8',
      'background: rgba(10, 149, 200, 0.06)',
      'color: #0A95C8',
      'font-size: 0.9em',
      'font-weight: 500',
      'line-height: 1em',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      'user-select: none',
      'white-space: nowrap',
      'transition: all 0.15s ease'
    ].join(';');
    btn.onmouseenter = function() { btn.style.background = 'rgba(10, 149, 200, 0.15)'; };
    btn.onmouseleave = function() { btn.style.background = 'rgba(10, 149, 200, 0.06)'; };
    btn.onclick = onClick;
    return btn;
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
      if (
        placeholder.indexOf('PlaylistOut') === -1 &&
        placeholder.indexOf('把你的歌单带走') === -1 &&
        hintText.indexOf('PlaylistOut') === -1 &&
        hintText.indexOf('playlistout') === -1 &&
        hintText.indexOf('把你的歌单带走') === -1
      ) {
        continue;
      }

      // 修正预输入占位符文字与长度限制
      var targetPlaceholder = '粘贴歌单分享链接（QQ/网易/酷狗/汽水）';
      if (placeholder !== targetPlaceholder) {
        textInput.setAttribute('placeholder', targetPlaceholder);
      }
      if (textInput.hasAttribute('maxlength')) {
        textInput.removeAttribute('maxlength');
      }

      // 动态监听输入：若用户粘贴酷狗音乐链接，动态展示免登录仅解析前 10 首的温馨提示
      function updateKugouModalTip() {
        var val = (textInput.value || '').trim();
        var tip = inputArea.querySelector('#playlistout-kugou-modal-tip');
        var isKugou = /kugou\.com|酷狗/i.test(val);
        if (isKugou) {
          if (!tip) {
            tip = document.createElement('div');
            tip.id = 'playlistout-kugou-modal-tip';
            tip.style.cssText =
              'margin-top:6px;padding:6px 10px;border-radius:6px;background:rgba(245,158,11,0.08);border:1px dashed rgba(245,158,11,0.5);color:#d97706;font-size:12px;line-height:1.45;text-align:left;';
            tip.innerHTML =
              '💡 <b>酷狗全量导入提示：</b>未配置 Token 仅可解析前 10 首。<br>前往官网 (<b>playlistout.lengxiqwq.com</b>) 扫码登录，复制 Token 填入「插件设置」即可全量导入。';
            inputArea.appendChild(tip);
          }
        } else if (tip) {
          tip.remove();
        }
      }
      textInput.removeEventListener('input', updateKugouModalTip);
      textInput.addEventListener('input', updateKugouModalTip);
      updateKugouModalTip();

      if (modal.querySelector('#playlistout-file-picker-btn')) continue;

      var existingWebBtn = modal.querySelector('#playlistout-open-web-btn');
      if (existingWebBtn) existingWebBtn.remove();

      opeArea.style.gap = '10px';
      opeArea.style.flexWrap = 'wrap';

      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';

      var pickBtn = createDashedButton('playlistout-file-picker-btn', '📂 选择本地 JSON', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.value = '';
        fileInput.click();
      });

      var webBtn = createDashedButton('playlistout-open-web-btn', '🌐 去官网解析歌单', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openOfficialWebsite();
      });

      fileInput.onchange = function() {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        var fullPath = f.path || '__PICK_FILE__';
        applyChosenFile(modal, fullPath);
      };

      var confirmBtn = opeArea.querySelector('div[data-type="primaryButton"]');
      if (confirmBtn) {
        opeArea.insertBefore(fileInput, confirmBtn);
        opeArea.insertBefore(pickBtn, confirmBtn);
        opeArea.insertBefore(webBtn, confirmBtn);
      } else {
        opeArea.appendChild(fileInput);
        opeArea.appendChild(pickBtn);
        opeArea.appendChild(webBtn);
      }

      // 支持直接将 .json 文件拖拽到弹窗内导入
      modal.ondragover = function(e) {
        e.preventDefault();
        e.stopPropagation();
        pickBtn.style.background = 'rgba(10, 149, 200, 0.18)';
      };
      modal.ondragleave = function() {
        pickBtn.style.background = 'rgba(10, 149, 200, 0.06)';
      };
      modal.ondrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        pickBtn.style.background = 'rgba(10, 149, 200, 0.06)';
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && f.path) {
          applyChosenFile(modal, f.path);
        }
      };
    }
  }

  var _enhanceTimer = null;
  function triggerEnhanceDebounced() {
    if (_enhanceTimer) return;
    _enhanceTimer = setTimeout(function() {
      _enhanceTimer = null;
      enhancePlaylistOutModal();
    }, 100);
  }

  triggerEnhanceDebounced();
  var obs = new MutationObserver(triggerEnhanceDebounced);
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
`;

/**
 * 安装宿主插件桥接通道（仅 Electron 桌面稳定版可用）
 * 1. 拦截 @shared/plugin-manager/call-plugin-method：任意平台曲目取源/取词失败时，
 *    自动在其它已安装插件中严格匹配同一首原曲并回传结果（自动兜底换源）；
 * 2. 记录 @shared/plugin-manager/get-all-plugins 句柄：枚举设备上已安装的音源插件。
 * 手机端与桌面测试版宿主不提供该通道，将安全地跳过（本插件只剩纯歌单解析能力）。
 */
function installHostBridge(electron) {
  try {
    const ipcMain = electron.ipcMain;
    const handlers = ipcMain && ipcMain._invokeHandlers;
    if (!handlers || typeof handlers.get !== 'function') return;

    const callChannel = '@shared/plugin-manager/call-plugin-method';
    if (handlers.has(callChannel)) {
      const origHandler = handlers.get(callChannel);
      if (typeof origHandler === 'function' && !origHandler.__playlistoutWrapped) {
        _hostCallPluginMethod = origHandler;
        const wrapped = async function (event, payload) {
          const res = await origHandler.call(this, event, payload);
          try {
            return await maybeRescueResult(payload, res);
          } catch (_) {
            return res;
          }
        };
        wrapped.__playlistoutWrapped = true;
        handlers.set(callChannel, wrapped);
      }
    }

    if (!_hostGetAllPlugins) {
      const listChannel = '@shared/plugin-manager/get-all-plugins';
      if (handlers.has(listChannel)) {
        const listHandler = handlers.get(listChannel);
        if (typeof listHandler === 'function') {
          _hostGetAllPlugins = listHandler;
        }
      }
    }
  } catch (_) {}
}

function injectRendererFilePicker() {
  ensureHostModulesAsync()
    .then(({ electron }) => {
      if (!electron) return;

      installHostBridge(electron);

      if (!electron.BrowserWindow) return;
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

// 插件加载时自动在 Electron 宿主中预热模块并注入频道桥接与浏览按钮（仅在 Electron 环境中执行，不阻塞 Node 测试进程退出）
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
  const isPlaylistOutApi = /^https:\/\/playlistout-api\.lengxiqwq\.com\//i.test(url);
  const defaultHeaders = isPlaylistOutApi
    ? getPlaylistOutHeaders()
    : {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://playlistout.lengxiqwq.com',
        Referer: 'https://playlistout.lengxiqwq.com/',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      };
  const headers = Object.assign(defaultHeaders, options.headers || {});

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
    let finalUrl = '';
    try {
      const req = res.request;
      if (req && typeof req.responseURL === 'string' && req.responseURL) {
        finalUrl = req.responseURL;
      } else if (req && req.res && typeof req.res.responseUrl === 'string' && req.res.responseUrl) {
        finalUrl = req.res.responseUrl;
      }
    } catch (_) {}
    return {
      status: res.status,
      data: res.data,
      headers: res.headers || {},
      finalUrl,
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
      const resHeaders = {};
      try {
        res.headers.forEach((value, key) => {
          resHeaders[String(key).toLowerCase()] = String(value);
        });
      } catch (_) {}
      return {
        status: res.status,
        data,
        headers: resHeaders,
        finalUrl: typeof res.url === 'string' ? res.url : '',
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw new Error('未检测到可用的 HTTP 客户端 (axios 或 fetch)');
}

/**
 * 跨环境 HTTP POST 请求助手
 */
async function httpPost(url, body, options = {}) {
  const timeoutMs = options.timeout || 15000;
  const isPlaylistOutApi = /^https:\/\/playlistout-api\.lengxiqwq\.com\//i.test(url);
  const defaultHeaders = isPlaylistOutApi
    ? Object.assign(getPlaylistOutHeaders(), { 'Content-Type': 'application/json' })
    : {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
  const headers = Object.assign(defaultHeaders, options.headers || {});

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

  if (axiosClient && typeof axiosClient.post === 'function') {
    const res = await axiosClient.post(url, body, {
      timeout: timeoutMs,
      headers,
      validateStatus: function () {
        return true;
      },
    });
    return {
      status: res.status,
      data: res.data,
    };
  }

  if (typeof fetch === 'function') {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, timeoutMs)
      : null;
    try {
      const payloadStr = typeof body === 'string' ? body : JSON.stringify(body);
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadStr,
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
 * 获取用户配置的变量对象 (来自 MusicFree 宿主环境 env.getUserVariables())
 */
function getRawUserVariables() {
  try {
    if (typeof env !== 'undefined' && env && typeof env.getUserVariables === 'function') {
      return env.getUserVariables() || {};
    }
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.env &&
      typeof globalThis.env.getUserVariables === 'function'
    ) {
      return globalThis.env.getUserVariables() || {};
    }
  } catch (_) {}
  return {};
}

/**
 * 获取用户配置的酷狗登录凭证 (kugouToken / kugouUserid)
 * 支持格式：
 * 1. kugouToken 填 token，kugouUserid 填 userid
 * 2. kugouToken 填 token:userid 或 userid:token (冒号、逗号或竖线分隔)
 * 3. kugouToken 填 JSON { token, userid }
 * 4. 纯 token (无 userid)
 */
function getKugouCredentials() {
  try {
    const userVars = getRawUserVariables();
    let rawToken = String((userVars && (userVars.kugouToken || userVars.kugou_token)) || '').trim();
    let rawUserid = String((userVars && (userVars.kugouUserid || userVars.kugou_userid)) || '').trim();

    if (!rawToken && !rawUserid) {
      return null;
    }

    // JSON 格式解析
    if (rawToken.startsWith('{') && rawToken.endsWith('}')) {
      try {
        const obj = JSON.parse(rawToken);
        if (obj && typeof obj === 'object') {
          return {
            token: String(obj.token || obj.kugou_token || '').trim(),
            userid: String(obj.userid || obj.kugou_userid || rawUserid || '').trim(),
          };
        }
      } catch (_) {}
    }

    // 复合字符串解析 (以冒号、逗号、竖线分隔)
    if (rawToken.includes(':') || rawToken.includes(',') || rawToken.includes('|')) {
      const parts = rawToken.split(/[:|,]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // 判断哪个是纯数字 userid，哪个是 token
        if (/^\d{5,12}$/.test(parts[0]) && !/^\d{5,12}$/.test(parts[1])) {
          return { userid: parts[0], token: parts[1] };
        } else if (/^\d{5,12}$/.test(parts[1]) && !/^\d{5,12}$/.test(parts[0])) {
          return { token: parts[0], userid: parts[1] };
        } else {
          return { token: parts[0], userid: parts[1] };
        }
      }
    }

    return {
      token: rawToken,
      userid: rawUserid,
    };
  } catch (_) {}
  return null;
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

  const rawId = String((track && track.id) || (item && item.id) || '').trim();
  const stripPrefix = (s, prefix) =>
    s.toLowerCase().startsWith(prefix + '_') ? s.slice(prefix.length + 1) : s;

  if (targetPlatform === 'qq' || targetPlatform === '20') {
    const sid = stripPrefix(rawId, 'qq');
    const mediaMid = sid;
    const vid = String((track && (track.mvId || track.vid)) || '').trim();
    // 当从 IndexedDB 恢复曲目时 track.isVip 为 undefined 且无真实 strMediaMid，
    // 默认置 vip=1 以启用 qq 插件 vipPreRoute 直走 vkeys-legacy 高速通道，避免无意义的官方接口 1000ms 空转
    const vip =
      track && track.isVip !== undefined ? (track.isVip ? 1 : 0) : 1;
    item.songmid = sid;
    item.mid = sid;
    item._src = Object.assign({}, item._src, {
      qq: { mid: sid, mediaMid, vid, vip },
    });
    item._srcOrder = ['qq'];
  } else if (targetPlatform === 'netease') {
    const sid = stripPrefix(rawId, 'netease');
    const mv = String((track && (track.mvId || track.mv)) || '').trim();
    item._src = Object.assign({}, item._src, {
      netease: { id: sid, mv },
    });
    item._srcOrder = ['netease'];
  } else if (targetPlatform === 'kugou' || targetPlatform === 'WebFilter') {
    const sid = stripPrefix(rawId, 'kugou');
    item.hash = sid;
    item._src = Object.assign({}, item._src, {
      kugou: { hash: sid },
    });
    item._srcOrder = ['kugou'];
  } else if (targetPlatform === 'qishui') {
    const sid = stripPrefix(rawId, 'qishui');
    item._src = Object.assign({}, item._src, {
      qishui: { trackId: sid },
    });
    item._srcOrder = ['qishui'];
  } else if (targetPlatform === 'kuwo') {
    const sid = stripPrefix(rawId, 'kuwo');
    item._src = Object.assign({}, item._src, {
      kuwo: { rid: sid, id: sid },
    });
    item._srcOrder = ['kuwo'];
  } else if (targetPlatform === 'migu') {
    const sid = stripPrefix(rawId, 'migu');
    item._src = Object.assign({}, item._src, {
      migu: { contentId: sid, copyrightId: sid },
    });
    item._srcOrder = ['migu'];
  } else if (targetPlatform === 'bilibili') {
    const sid = String(
      (track && track.bvid) || stripPrefix(rawId, 'bilibili')
    ).trim();
    item.bvid = sid;
  }

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
  const title = (track.title || '未知歌曲').toString().trim() || '未知歌曲';

  // 2. 歌手 (统一单一 artist 字符串)
  const artist =
    typeof track.artist === 'string' && track.artist.trim()
      ? track.artist.trim()
      : '未知歌手';

  // 3. 专辑 (统一单一 album 字符串)
  const album =
    typeof track.album === 'string' && track.album.trim()
      ? track.album.trim()
      : '';

  // 4. 封面图 (统一 coverUrl 字符串)
  const artwork =
    typeof track.coverUrl === 'string' && track.coverUrl.trim()
      ? track.coverUrl.trim()
      : '';

  // 5. 时长 (秒，Math.round((track.durationMs || 0) / 1000))
  let duration = 0;
  if (typeof track.durationMs === 'number' && track.durationMs > 0) {
    duration = Math.round(track.durationMs / 1000);
  }

  // 6. 唯一标识 (优先使用 track.id，如网易云 song id 或 QQ song mid)
  let id = '';
  if (track.id != null && String(track.id).trim()) {
    id = String(track.id).trim();
  } else {
    id = `${title}_${artist}_${defaultIndex}`;
  }

  // 7. 识别曲目原平台 (用于内部音源路由与 _src 取链字段封装)
  let rawPlatform = track.platform;
  if (!rawPlatform || rawPlatform === 'PlaylistOut') {
    rawPlatform = defaultPlatform;
  }
  let naturalPlatform = resolveMusicPlatform(rawPlatform);
  if (naturalPlatform === 'PlaylistOut') {
    naturalPlatform = resolveMusicPlatformFromTrackFields(track, { id, title, artwork });
  }

  // 8. 平台归属策略 (Native Platform Routing)：
  // 所有曲目一律按「原曲自然平台」归属（qq / netease / kugou / kuwo / qishui / migu / bilibili），
  // 播放与歌词由宿主优先调度用户设备上已安装的对应原生插件。
  // 无法识别来源的曲目回退为本插件平台；原生插件缺失或取源失败时，跨插件严格匹配兜底链
  // 与内置兜底音源引擎（历史老歌单最后防线，同名同歌手同版本严格匹配）将依次接管。
  let finalPlatform = PLUGIN_PLATFORM;
  if (naturalPlatform && naturalPlatform !== 'PlaylistOut' && !isSelfPlatform(naturalPlatform)) {
    finalPlatform = naturalPlatform;
  }

  const item = {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
    platform: finalPlatform,
  };

  if (naturalPlatform && naturalPlatform !== 'PlaylistOut' && !isSelfPlatform(naturalPlatform)) {
    item._originPlatform = naturalPlatform;
  }

  // 9. 注入原生插件所需的 _src / _srcOrder / songmid / hash 等取链字段
  const targetForSource = finalPlatform !== PLUGIN_PLATFORM ? finalPlatform : naturalPlatform;
  if (targetForSource && targetForSource !== 'PlaylistOut') {
    attachNativeSourceMetadata(item, track, targetForSource);
  }

  // 10. 防改写保护：宿主导入后会以 resetMediaItem(item, this.plugin.name) 强行覆写 platform，
  //     通过访问器拦截自身平台名的写入，确保播放/歌词始终分发给正确的原生插件。
  if (finalPlatform !== PLUGIN_PLATFORM) {
    defineProtectedPlatform(item, finalPlatform);
  }

  return item;
}

/**
 * 从曲目 URL / 封面 / ID 特征推断原始音乐平台
 */
function resolveMusicPlatformFromTrackFields(track, item) {
  const explicitPlat =
    (track && (track._originPlatform || track.originPlatform)) ||
    (item && (item._originPlatform || item.originPlatform));
  if (explicitPlat && !isSelfPlatform(explicitPlat)) {
    return explicitPlat;
  }

  const sourceUrl = String((track && track.sourceUrl) || (item && item.sourceUrl) || '');
  const artwork = String(
    (track && track.coverUrl) || (item && item.artwork) || ''
  );
  const id = String((track && track.id) || (item && item.id) || '').trim();

  if (/qq\.com|gtimg\.cn/i.test(sourceUrl + ' ' + artwork)) {
    return 'qq';
  }
  if (/163\.com|126\.net/i.test(sourceUrl + ' ' + artwork)) {
    return 'netease';
  }
  if (/kugou\.com/i.test(sourceUrl + ' ' + artwork)) {
    return 'kugou';
  }
  if (/qishui|douyinpic\.com|byteimg\.com/i.test(sourceUrl + ' ' + artwork)) {
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
 * 保护 IMusicItem.platform 不被宿主 resetMediaItem(item, this.plugin.name) 覆盖。
 *
 * MusicFree 三端（电脑稳定版 / 电脑测试版 / 手机版）在导入歌单后都会把曲目的 platform
 * 强行刷写为当前插件名；这里以访问器拦截「本插件平台名」的写入（含历史名称 PlaylistOut），
 * 其余合法赋值照常接受，确保曲目始终保留原始平台归属，从而让宿主把播放与歌词请求
 * 分发给正确的原生音源插件。访问器在 JSON / IPC 序列化时自动转为普通值，跨端存储安全。
 */
function defineProtectedPlatform(item, initialPlatform) {
  let currentPlatform = initialPlatform || PLUGIN_PLATFORM;
  try {
    Object.defineProperty(item, 'platform', {
      enumerable: true,
      configurable: true,
      get() {
        return currentPlatform;
      },
      set(val) {
        if (!val) return;
        if (isSelfPlatform(val)) return;
        currentPlatform = val;
      },
    });
  } catch (_) {
    item.platform = currentPlatform;
  }
  return item;
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
    } else if (parsed.data && parsed.data.result && Array.isArray(parsed.data.result.tracks)) {
      tracks = parsed.data.result.tracks;
    } else if (parsed.result && Array.isArray(parsed.result.tracks)) {
      tracks = parsed.result.tracks;
    } else if (parsed.data && Array.isArray(parsed.data.tracks)) {
      tracks = parsed.data.tracks;
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
    parsed.platform ||
    (parsed.result && parsed.result.platform) ||
    (parsed.data && parsed.data.platform) ||
    'PlaylistOut';
  if (detectedPlatform === 'PlaylistOut') {
    const url =
      parsed.sourceUrl ||
      (Array.isArray(tracks) && tracks[0] && tracks[0].sourceUrl) ||
      '';
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
 * 判断输入是否为触发打开官网的指令
 */
function isOfficialWebsiteTrigger(str) {
  if (!str || typeof str !== 'string') return false;
  var s = str.trim().toLowerCase();
  return (
    s === '官网' ||
    s === '去官网' ||
    s === '打开官网' ||
    s === 'gw' ||
    s === 'go' ||
    s === 'http://playlistout.lengxiqwq.com' ||
    s === 'http://playlistout.lengxiqwq.com/' ||
    s === 'https://playlistout.lengxiqwq.com' ||
    s === 'https://playlistout.lengxiqwq.com/' ||
    s === 'playlistout.lengxiqwq.com'
  );
}

/**
 * 尝试在系统默认浏览器中打开 PlaylistOut 官方网站
 */
function tryOpenOfficialWebsite() {
  var url = 'https://playlistout.lengxiqwq.com';
  // 1. Electron 桌面环境
  try {
    if (isHostElectron() && _cachedElectron && _cachedElectron.shell) {
      if (typeof _cachedElectron.shell.openExternal === 'function') {
        _cachedElectron.shell.openExternal(url);
        return true;
      }
    }
  } catch (_) {}

  // 2. React Native / Mobile Android 环境尝试调用 Linking
  try {
    var g = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null);
    if (g) {
      var nm = g.nativeModuleProxy || (g.__fbBatchedBridge && g.__fbBatchedBridge.NativeModules);
      if (nm && nm.LinkingManager && typeof nm.LinkingManager.openURL === 'function') {
        nm.LinkingManager.openURL(url);
        return true;
      }
      if (nm && nm.IntentAndroid && typeof nm.IntentAndroid.openURL === 'function') {
        nm.IntentAndroid.openURL(url);
        return true;
      }
    }
  } catch (_) {}

  // 3. 浏览器环境 window.open
  try {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank');
      return true;
    }
  } catch (_) {}

  return false;
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
    throw new Error('请输入有效的歌单链接或分享文本');
  }

  const trimmed = urlLike.trim();
  if (!trimmed) {
    throw new Error('输入内容不能为空');
  }

  // 0. 官网跳转指令支持 (用户在输入框输入 官网 / gw / 官网网址 等，尝试打开浏览器)
  if (isOfficialWebsiteTrigger(trimmed)) {
    tryOpenOfficialWebsite();
    throw new Error('已尝试为您在浏览器中打开官网 (https://playlistout.lengxiqwq.com)，如未弹出请手动访问');
  }

  // 1. 直接粘贴 JSON 文本支持（移动端与跨端核心：用户从官网导出歌单后复制完整 JSON 字符串直接粘贴导入）
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonTracks(trimmed, '直接粘贴的 JSON 歌单');
  }

  // 2. 在线 JSON 文件 URL 导入（如用户托管在网盘、GitHub Raw、Gitee 或个人服务器的 .json 歌单直链）
  if (/^https?:\/\/[^\s]+\.json(?:\?[^\s]*)?$/i.test(trimmed)) {
    let jsonRes;
    try {
      jsonRes = await httpGet(trimmed, { timeout: 15000 });
    } catch (err) {
      throw new Error(`获取在线 JSON 歌单失败: ${err.message}`);
    }
    if (jsonRes.status !== 200) {
      throw new Error(`获取在线 JSON 失败 (HTTP ${jsonRes.status})`);
    }
    const content = typeof jsonRes.data === 'string' ? jsonRes.data : JSON.stringify(jsonRes.data);
    return parseJsonTracks(content, `在线 JSON (${trimmed})`);
  }

  // 3. 触发系统原生文件选择对话框 (点击「📂 浏览...」按钮或输入 1 / 浏览 / json - 仅桌面端支持)
  if (isFilePickerTrigger(trimmed)) {
    if (!isHostElectron()) {
      throw new Error('移动端不支持系统文件弹窗，请复制并直接粘贴 JSON 歌单文本或歌单分享链接导入');
    }
    const pickedPath = await openNativeJsonFileDialog();
    if (!pickedPath) {
      throw new Error('已取消选择本地 JSON 歌单文件');
    }
    const fileContent = await readLocalFileText(pickedPath);
    return parseJsonTracks(fileContent, `本地文件 (${pickedPath})`);
  }

  // 4. 本地 JSON 文件路径导入 (支持普通路径、带引号路径与 file:/// 协议 - 仅桌面端支持)
  if (isLocalJsonPath(trimmed)) {
    if (!isHostElectron()) {
      throw new Error('移动端无法直接读取设备文件路径，请打开该文件全选复制并直接粘贴 JSON 文本导入');
    }
    const targetPath = resolveLocalPath(trimmed);
    const fileContent = await readLocalFileText(targetPath);
    return parseJsonTracks(fileContent, `本地文件 (${targetPath})`);
  }

  // 5. 在线云端 API 解析模式 (调用 PlaylistOut 生产 API: QQ/网易云/酷狗/汽水)
  const apiUrl = `https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=${encodeURIComponent(
    trimmed
  )}&type=playlist`;

  const creds = getKugouCredentials();
  const requestHeaders = {};
  if (creds && creds.token) {
    requestHeaders['Authorization'] = `Bearer ${creds.token}`;
    requestHeaders['X-Kugou-Token'] = creds.token;
    if (creds.userid) {
      requestHeaders['X-Kugou-Userid'] = creds.userid;
    }
  }

  let res;
  try {
    res = await httpGet(apiUrl, { timeout: 30000, headers: requestHeaders });
  } catch (err) {
    throw new Error(`请求 PlaylistOut API 超时或网络失败: ${err.message}`);
  }

  if (res.status !== 200) {
    const errorMsg =
      (res.data && res.data.error && res.data.error.message) ||
      (typeof res.data === 'string' && res.data ? res.data : `HTTP ${res.status}`);
    throw new Error(`在线解析失败: ${errorMsg}`);
  }

  if (!res.data || !res.data.success) {
    const errorMsg =
      (res.data && res.data.error && res.data.error.message) || '未知解析错误';
    throw new Error(`在线解析失败: ${errorMsg}`);
  }

  const result = (res.data.data && res.data.data.result) || (res.data && res.data.result);
  const rawTracks = result && result.tracks;

  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    throw new Error('在线歌单解析结果为空或未找到歌曲');
  }

  // 探测歌单原始平台
  let detectedPlatform =
    res.data.platform ||
    (res.data.data && res.data.data.platform) ||
    (result && result.platform) ||
    'PlaylistOut';
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

  // 审计与元数据感知：记录服务端返回的客户端识别信息
  const meta = res.data && res.data.meta;
  if (meta && meta.client) {
    try {
      const clientDesc =
        (meta.client.deviceClass === 'desktop' ? '电脑版' : '手机版') +
        ' (' +
        (meta.client.osFamily || 'unknown') +
        ')';
      const serverVer = meta.server && meta.server.version ? meta.server.version : '2.2.0';
      console.log(
        '[PlaylistOut] 歌单解析就绪: 客户端=' +
          clientDesc +
          ', 插件=' +
          (meta.client.id || 'musicfree') +
          ' v' +
          (meta.client.version || PLUGIN_VERSION) +
          ', 服务端 API v' +
          serverVer +
          ', 来源=' +
          detectedPlatform +
          ', 曲目数=' +
          items.length
      );
    } catch (_) {}
  }

  // 若为酷狗歌单且未配置 Token 或仅解析出前 10 首预览歌曲，明确弹出长效提示指导用户
  const isKugouPreview =
    result &&
    ((result.retrieval && result.retrieval.mode === 'preview') ||
      result.isPartialPreview);
  if (
    detectedPlatform === 'kugou' &&
    (!creds || !creds.token || isKugouPreview)
  ) {
    showPlaybackToast(
      `💡【酷狗限制提示】受官方限制仅解析前 ${items.length} 首。推荐前往官网登录解析导出JSON离线导入。`,
      'warn',
      8000
    );
  }

  return items;
}

const PLATFORM_DISPLAY_NAMES = {
  qq: 'QQ音乐',
  netease: '网易云音乐',
  kugou: '酷狗音乐',
  qishui: '汽水音乐',
  migu: '咪咕音乐',
  kuwo: '酷我音乐',
  bilibili: 'B站音乐',
};

/**
 * 提取歌曲版本特征标签（用于保证原版绝不匹配到 Live / DJ / 翻唱 / 伴奏 / 改编版）
 */
function extractVersionTags(str) {
  const s = String(str || '').toLowerCase();
  const tags = [];
  const patterns = [
    ['live', /\blive\b|现场/i],
    ['dj', /\bdj\b|慢摇|蹦迪/i],
    ['remix', /\bremix\b|混音/i],
    ['inst', /伴奏|纯音乐|instrumental|卡拉ok|karaoke|消音/i],
    ['cover', /翻唱|\bcover\b/i],
    ['acoustic', /acoustic|不插电|木吉他|钢琴版|吉他版/i],
    ['demo', /\bdemo\b|小样/i],
    ['cantonese', /粤语/i],
    ['mandarin', /国语/i],
    [' mashup', /串烧|medley/i],
    ['ver', /女生版|女声版|男生版|男声版|抒情版|合唱版|独唱版|说唱版|新版|旧版/i],
  ];
  for (const [name, re] of patterns) {
    if (re.test(s)) tags.push(name);
  }
  return tags.sort().join('+');
}

/**
 * 100% 严格原曲原唱校验（核心歌名 + 版本标签 + 歌手精确相等 + 时长吻合）
 * 宁缺毋滥：只要不是 100% 同一首歌、同一个歌手、同一个版本，一律拒绝顶包！
 */
function isCandidateStrictlyMatched(candidate, wantTitle, wantRawArtist, wantDuration = 0) {
  if (!candidate || typeof candidate !== 'object') return false;
  const cTitleRaw = String(candidate.title || '').trim();
  const cAlbumRaw = String(candidate.album || '').trim();
  const wTitleRaw = String(wantTitle || '').trim();
  if (!cTitleRaw || !wTitleRaw) return false;

  // 1. 版本标签必须 100% 一致（原曲无 Live/DJ/伴奏/翻唱/xx版 时，候选曲目 / 专辑 / 歌手字段绝不允许带这些标签）
  const wTags = extractVersionTags(`${wTitleRaw} ${String(wantRawArtist || '')}`);
  const cTags = extractVersionTags(`${cTitleRaw} ${cAlbumRaw} ${String(candidate.artist || '')}`);
  if (wTags !== cTags) {
    return false;
  }

  // 2. 歌名归一化后必须 100% 严格相等（剔除宽松的 includes 子串包含，杜绝同名衍生曲混入）
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[\s\-_~·•,，.。!！?？:：;；'"“”‘’《》〈〉【】\[\]()（）/\\]/g, '');
  const stripBracket = (s) =>
    String(s || '')
      .replace(/[\(（\[【].*?[\)）\]】]/g, '')
      .trim();

  const cNormFull = norm(cTitleRaw);
  const wNormFull = norm(wTitleRaw);
  const cNormBase = norm(stripBracket(cTitleRaw)) || cNormFull;
  const wNormBase = norm(stripBracket(wTitleRaw)) || wNormFull;

  if (!cNormBase || !wNormBase) return false;
  if (cNormFull !== wNormFull && cNormBase !== wNormBase) {
    return false;
  }

  // 3. 歌手必须严格相等（禁止候选歌手为空时放行，禁止模糊子串凑数）
  const wantArtists = String(wantRawArtist || '')
    .split(/[,，、/&｜|]/)
    .map((a) => norm(stripBracket(a)))
    .filter((a) => a && a !== '未知歌手');

  if (wantArtists.length > 0) {
    const candArtists = String(candidate.artist || '')
      .split(/[,，、/&｜|]/)
      .map((a) => norm(stripBracket(a)))
      .filter((a) => a && a !== '未知歌手');
    if (candArtists.length === 0) return false;
    const exactArtistHit = wantArtists.some((wa) => candArtists.some((ca) => ca === wa));
    if (!exactArtistHit) return false;
  }

  // 4. 时长校验（若双方均有有效秒数，偏差超过 12 秒视为不同版本拒绝）
  const dWant = Number(wantDuration) || 0;
  const dCand = Number(candidate.duration) || 0;
  if (dWant > 0 && dCand > 0 && Math.abs(dWant - dCand) > 12) {
    return false;
  }

  return true;
}

/**
 * 构建 MusicFree 桌面端顶部胶囊提示 (Toast) 的渲染进程脚本
 * - kind === 'warn': 暖橙警示（未找到可用音源，已跳过）
 * - kind === 'info': 翠绿提示（自动匹配换源成功 / 内置兜底音源接管，含仅试听30秒提示）
 *
 * 生命周期健壮性（修复「最小化 / 失焦后提示偶发不自动消失」）：
 * - Chromium 会节流后台页面的 setTimeout、并挂起 requestAnimationFrame。旧实现里若提示
 *   在窗口最小化 / 被完全遮挡时触发，定时器可能先被消耗、而进场回调直到窗口恢复才执行，
 *   恢复后提示便会一直挂着；即使只是节流延迟，用户也会看到提示「超时未消失」。
 * - 因此：页面不可见时直接不展示；页面一旦转入后台立即收起当前提示并清空定时器；
 *   回到前台再按绝对过期时间自检一次，兜底节流导致的延迟。
 * 本函数只做字符串拼装、不依赖宿主模块，可在 Node 测试环境注入模拟 DOM 验证。
 */
function buildPlaybackToastScript(message, kind, durationMs) {
  const duration = Number(durationMs) > 0 ? Number(durationMs) : 3600;
  const payload = JSON.stringify({
    message: String(message || ''),
    kind: kind === 'warn' ? 'warn' : 'info',
    duration: duration,
  });
  return `
      (function(data) {
        try {
          var id = 'playlistout-playback-toast';

          function hideToast() {
            if (window.__playlistoutToastTimer) {
              clearTimeout(window.__playlistoutToastTimer);
              window.__playlistoutToastTimer = null;
            }
            window.__playlistoutToastExpiresAt = 0;
            var cur = document.getElementById(id);
            if (cur) {
              cur.style.opacity = '0';
              cur.style.transform = 'translateX(-50%) translateY(-10px)';
            }
          }
          window.__playlistoutToastHide = hideToast;

          // 页面处于后台（最小化 / 完全遮挡到不可见）时不展示：此刻用户看不到提示，
          // 而后台定时器又会被节流，展示出来反而会在恢复窗口后变成常驻提示。
          if (document.visibilityState === 'hidden') return;

          // 页面转入后台时立即收起当前提示并清掉定时器，避免「回来时提示还挂在屏幕上」
          if (!window.__playlistoutToastVisibilityHook) {
            window.__playlistoutToastVisibilityHook = true;
            document.addEventListener('visibilitychange', function() {
              if (document.visibilityState === 'hidden') {
                if (typeof window.__playlistoutToastHide === 'function') window.__playlistoutToastHide();
                return;
              }
              // 回到前台自检：定时器若曾被节流拖延且提示已过期，立即收起
              var cur = document.getElementById(id);
              var expiresAt = window.__playlistoutToastExpiresAt || 0;
              if (cur && expiresAt > 0 && Date.now() >= expiresAt) {
                if (typeof window.__playlistoutToastHide === 'function') window.__playlistoutToastHide();
              }
            });
          }

          var el = document.getElementById(id);
          if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.style.cssText = 'position:fixed;top:52px;left:50%;transform:translateX(-50%) translateY(-10px);z-index:2147483647;pointer-events:none;padding:10px 20px;border-radius:999px;font-size:13.5px;font-weight:600;letter-spacing:0.3px;color:#fff;background:rgba(20,20,24,0.95);border:1.5px solid rgba(245,158,11,0.65);box-shadow:0 10px 30px rgba(0,0,0,0.55);backdrop-filter:blur(12px);transition:opacity 0.22s ease, transform 0.22s ease;opacity:0;max-width:85vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,-apple-system,sans-serif;';
            document.body.appendChild(el);
          }
          if (data.kind === 'warn') {
            el.style.borderColor = 'rgba(245,158,11,0.75)';
            el.style.color = '#fde68a';
            el.style.background = 'rgba(28,22,16,0.95)';
          } else {
            el.style.borderColor = 'rgba(16,185,129,0.7)';
            el.style.color = '#a7f3d0';
            el.style.background = 'rgba(14,28,24,0.95)';
          }
          el.textContent = data.message;
          void el.offsetWidth; // 强制重排触发进场过渡（替代会被后台挂起的 requestAnimationFrame）
          el.style.opacity = '1';
          el.style.transform = 'translateX(-50%) translateY(0)';

          window.__playlistoutToastExpiresAt = Date.now() + data.duration;
          if (window.__playlistoutToastTimer) clearTimeout(window.__playlistoutToastTimer);
          window.__playlistoutToastTimer = setTimeout(hideToast, data.duration);
        } catch (_) {}
      })(${payload});
    `;
}

/**
 * 在 MusicFree 桌面端顶部渲染醒目且不打断听歌的胶囊提示 (Toast)
 * - kind === 'warn': 暖橙警示（未找到可用音源，已跳过）
 * - kind === 'info': 翠绿提示（自动匹配换源成功 / 内置兜底音源接管，含仅试听30秒提示）
 */
async function showPlaybackToast(message, kind = 'warn', durationMs = 3600) {
  try {
    const { electron } = await ensureHostModulesAsync();
    const BrowserWindow = electron && electron.BrowserWindow;
    if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
    const wins = BrowserWindow.getAllWindows();
    const isUsable = (w) => {
      try {
        return !!w && !w.isDestroyed();
      } catch (_) {
        return false;
      }
    };
    const isShown = (w) => {
      try {
        return isUsable(w) && typeof w.isVisible === 'function' && w.isVisible();
      } catch (_) {
        return false;
      }
    };
    const win =
      (typeof BrowserWindow.getFocusedWindow === 'function' &&
        BrowserWindow.getFocusedWindow()) ||
      wins.find(isShown) ||
      wins.find(isUsable) ||
      wins[0];
    if (!win || !win.webContents) return;
    try {
      if (typeof win.webContents.isDestroyed === 'function' && win.webContents.isDestroyed()) return;
    } catch (_) {}

    const script = buildPlaybackToastScript(message, kind, durationMs);
    win.webContents.executeJavaScript(script, true).catch(() => {});
  } catch (_) {}
}

// ============================================================================
// 自动兜底换源引擎 (Auto Rescue)
// 当某首曲目的原平台插件缺失或取源失败时，通过宿主自身的插件调用通道，在设备上其它
// 已安装插件中严格匹配「同名 + 同歌手 + 同版本 + 时长吻合」的原曲并回传音源：
// 找到即无缝续播，找不到则自动跳过——宁可跳过，绝不播放错歌。
// 跨插件通道仅桌面稳定版宿主提供；通道缺失或全部插件无果时，由内置兜底音源引擎接管。
// ============================================================================

let _hostCallPluginMethod = null;
let _hostGetAllPlugins = null;

const _matchCache = new Map(); // 曲目键 -> { platform, item, at }（30 分钟内复用，音质切换秒回）
const MATCH_TTL_MS = 30 * 60 * 1000;
const _noMatchCache = new Map(); // 全平台严格匹配为空 -> 60 秒内不重复搜索
const NO_MATCH_TTL_MS = 60 * 1000;
const _noSourceCache = new Map(); // 已匹配到曲目但该音质取链失败 -> 8 秒内不重复请求
const NO_SOURCE_TTL_MS = 8000;
const _noLyricCache = new Map(); // 歌词获取失败 -> 60 秒内不重复请求
const NO_LYRIC_TTL_MS = 60 * 1000;
const _toastCache = new Map(); // 同一首歌的兜底提示 10 分钟内只弹一次
const TOAST_TTL_MS = 10 * 60 * 1000;
const _rescuesInFlight = new Map(); // 并发去重：同一首歌同时触发取源/取词时只搜索一次

// 兜底搜索平台优先级：原平台优先，其余按主流平台顺序，最后补上其余已安装插件
const RESCUE_PLATFORM_ORDER = ['netease', 'qq', 'kugou', 'kuwo', 'migu', 'qishui', 'bilibili'];
const _pluginsCache = { at: 0, list: null };
const PLUGINS_CACHE_TTL_MS = 60000;

/**
 * 测试专用：注入模拟的宿主插件桥接通道（会同时重置所有兜底缓存）
 */
function _setHostBridge(bridge) {
  _hostCallPluginMethod =
    bridge && typeof bridge.callPluginMethod === 'function' ? bridge.callPluginMethod : null;
  _hostGetAllPlugins =
    bridge && typeof bridge.getAllPlugins === 'function' ? bridge.getAllPlugins : null;
  _pluginsCache.at = 0;
  _pluginsCache.list = null;
  _matchCache.clear();
  _noMatchCache.clear();
  _noSourceCache.clear();
  _noLyricCache.clear();
  _toastCache.clear();
  _rescuesInFlight.clear();
  _embeddedMatchCache.clear();
  _embeddedNoSourceCache.clear();
  _embeddedInFlight.clear();
}

/**
 * 通过宿主通道同步调用其它插件方法（与宿主行为完全一致的标准化包装）
 */
function hostCallPluginMethod(payload) {
  return Promise.resolve()
    .then(function () {
      if (!_hostCallPluginMethod) return null;
      return _hostCallPluginMethod.call(null, {}, payload);
    })
    .catch(function () {
      return null;
    });
}

/**
 * 判断该曲目是否由本插件导入（带有 _originPlatform / _src 原生标识）
 */
function isPlaylistOutImportedItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item._originPlatform && !isSelfPlatform(item._originPlatform)) return true;
  if (item._src && typeof item._src === 'object' && Object.keys(item._src).length > 0) return true;
  return false;
}

/**
 * 兜底缓存键：平台 + ID + 歌名 + 主歌手
 */
function getRescueCacheKey(item) {
  if (!item || typeof item !== 'object') return '';
  var title = String(item.title || '').trim();
  var artist = String(item.artist || '').replace(/未知歌手/g, '').trim();
  if (!title) return '';
  return String(item.platform || '') + '|' + String(item.id || '') + '|' + title + '|' + artist;
}

/**
 * 枚举设备上已安装的音源插件平台（需同时具备 search + getMediaSource 能力）
 */
async function getInstalledMediaPlatforms() {
  var now = Date.now();
  if (_hostGetAllPlugins) {
    if (_pluginsCache.list && now - _pluginsCache.at < PLUGINS_CACHE_TTL_MS) {
      return _pluginsCache.list;
    }
    try {
      var list = await _hostGetAllPlugins.call(null);
      var found = [];
      if (Array.isArray(list)) {
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          if (!p || typeof p.platform !== 'string' || !p.platform) continue;
          if (isSelfPlatform(p.platform)) continue;
          var methods = p.supportedMethod;
          if (
            Array.isArray(methods) &&
            (methods.indexOf('search') < 0 || methods.indexOf('getMediaSource') < 0)
          ) {
            continue;
          }
          if (found.indexOf(p.platform) < 0) found.push(p.platform);
        }
      }
      if (found.length > 0) {
        _pluginsCache.list = found;
        _pluginsCache.at = now;
        return found;
      }
    } catch (_) {}
  }
  return RESCUE_PLATFORM_ORDER.slice();
}

/**
 * 构建兜底搜索平台顺序：原平台优先 -> 主流平台 -> 其余已安装插件
 */
async function buildRescuePlatformOrder(item) {
  var order = [];
  var push = function (p) {
    if (p && !isSelfPlatform(p) && order.indexOf(p) < 0) order.push(p);
  };
  if (item && item._originPlatform && !isSelfPlatform(item._originPlatform)) {
    push(String(item._originPlatform));
  } else if (item && typeof item.platform === 'string') {
    push(item.platform);
  }
  for (var i = 0; i < RESCUE_PLATFORM_ORDER.length; i++) push(RESCUE_PLATFORM_ORDER[i]);
  var installed = await getInstalledMediaPlatforms();
  for (var j = 0; j < installed.length; j++) push(installed[j]);
  return order;
}

/**
 * 校验兜底音源直链：仅接受 http(s) 链接
 */
function isUsableRescuedUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

/**
 * 在全部已安装插件中严格搜索原曲（并发去重 + 匹配缓存）
 * @returns {Promise<{platform: string, item: object, at: number}|null>}
 */
async function findStrictMatch(item) {
  var key = getRescueCacheKey(item);
  if (!key) return null;

  var cached = _matchCache.get(key);
  if (cached && Date.now() - cached.at < MATCH_TTL_MS) return cached;

  var noMatchAt = _noMatchCache.get(key);
  if (noMatchAt && Date.now() - noMatchAt < NO_MATCH_TTL_MS) return null;

  var inFlight = _rescuesInFlight.get(key);
  if (inFlight) return inFlight;

  var task = searchStrictMatchAcrossPlatforms(item).then(
    function (entry) {
      if (entry) {
        _matchCache.set(key, entry);
      } else {
        _noMatchCache.set(key, Date.now());
      }
      _rescuesInFlight.delete(key);
      return entry;
    },
    function () {
      _rescuesInFlight.delete(key);
      return null;
    }
  );
  _rescuesInFlight.set(key, task);
  return task;
}

/**
 * 按平台顺序逐一搜索并执行 100% 严格匹配（同名同歌手同版本 + 时长吻合）
 */
async function searchStrictMatchAcrossPlatforms(item) {
  var title = String(item.title || '').trim();
  if (!title) return null;
  var rawArtist = String(item.artist || '')
    .replace(/未知歌手/g, '')
    .trim();
  var primaryArtist = rawArtist.split(/[,，、/]/)[0].trim();
  var keyword = primaryArtist ? title + ' ' + primaryArtist : title;

  var order = await buildRescuePlatformOrder(item);
  for (var i = 0; i < order.length; i++) {
    var plat = order[i];
    var res = await hostCallPluginMethod({
      platform: plat,
      method: 'search',
      args: [keyword, 1, 'music'],
    });
    var candidates = Array.isArray(res) ? res : res && Array.isArray(res.data) ? res.data : [];
    for (var j = 0; j < candidates.length; j++) {
      var cand = candidates[j];
      if (isCandidateStrictlyMatched(cand, title, rawArtist, item.duration)) {
        return { platform: plat, item: cand, at: Date.now() };
      }
    }
  }
  return null;
}

/**
 * 同一首歌的兜底提示 10 分钟内只弹一次（成功 / 失败各自独立去重）
 */
function notifyRescueOnce(key, message, kind) {
  var toastKey = key + '|' + kind;
  var last = _toastCache.get(toastKey);
  if (last && Date.now() - last < TOAST_TTL_MS) return;
  _toastCache.set(toastKey, Date.now());
  showPlaybackToast(message, kind);
}

/**
 * 统一失败提示：跨插件兜底与内置兜底音源均无果时提示「未找到可用音源，已跳过」（同一首歌 10 分钟去重）
 */
function notifyNoMediaSourceOnce(item) {
  var key = getRescueCacheKey(item) || String((item && item.id) || '');
  notifyRescueOnce(key, '未找到可用音源，已跳过', 'warn');
}

/**
 * 自动兜底取源：先在其它已安装插件中严格匹配原曲，再向命中插件请求音源。
 * 命中即返回并将曲目写入匹配缓存（后续音质切换直接复用），未命中返回 null。
 */
async function rescueMediaSource(item, quality) {
  if (!item || typeof item !== 'object' || !_hostCallPluginMethod) return null;
  var key = getRescueCacheKey(item);
  if (!key) return null;

  var q = quality || 'standard';
  var noSourceAt = _noSourceCache.get(key + '|' + q);
  if (noSourceAt && Date.now() - noSourceAt < NO_SOURCE_TTL_MS) return null;

  var match = await findStrictMatch(item);
  if (!match) {
    return null;
  }

  var source = await hostCallPluginMethod({
    platform: match.platform,
    method: 'getMediaSource',
    args: [match.item, q],
  });
  if (!source || !isUsableRescuedUrl(source.url)) {
    _noSourceCache.set(key + '|' + q, Date.now());
    return null;
  }

  var platLabel = PLATFORM_DISPLAY_NAMES[match.platform] || match.platform;
  notifyRescueOnce(key, '音源：' + platLabel, 'info');
  return source;
}

/**
 * 自动兜底歌词：复用已匹配到的曲目（或重新严格匹配）获取原生歌词（失败缓存由总入口统一管理）
 */
async function rescueLyric(item) {
  if (!item || typeof item !== 'object' || !_hostCallPluginMethod) return null;
  var match = await findStrictMatch(item);
  if (!match) return null;

  var lrc = await hostCallPluginMethod({
    platform: match.platform,
    method: 'getLyric',
    args: [match.item],
  });
  if (lrc && typeof lrc.rawLrc === 'string' && lrc.rawLrc.trim()) {
    return lrc;
  }
  return null;
}

/**
 * 兜底歌词总入口：跨插件换词 -> 内置兜底歌词（QQ / 网易云官方接口），全灭后 60 秒内不再重试
 */
async function autoResolveFallbackLyric(item) {
  if (!item || typeof item !== 'object') return null;
  var key = getRescueCacheKey(item);
  if (!key) return null;

  var noLyricAt = _noLyricCache.get(key);
  if (noLyricAt && Date.now() - noLyricAt < NO_LYRIC_TTL_MS) return null;

  var rescued = await rescueLyric(item);
  if (rescued) return rescued;

  var embedded = await embeddedResolveLyric(item);
  if (embedded) return embedded;

  _noLyricCache.set(key, Date.now());
  return null;
}

/**
 * 内置兜底播放提示文案：平台名 + 实际取链的接口服务名（酷狗为官方接口时不加后缀）；
 * 试听片段用「X仅试听30秒（服务名）」区分于完整曲目。
 */
function embeddedNoticeText(platLabel, source) {
  var suffix = source && source.provider ? '（' + source.provider + '）' : '';
  var base = source && source.trial ? platLabel + '仅试听30秒' : '内置音源：' + platLabel;
  return base + suffix;
}

/**
 * 兜底取源总入口：跨插件严格匹配换源 -> 内置兜底音源引擎（历史老歌单最后防线）
 */
async function autoResolveFallbackSource(item, quality) {
  var rescued = await rescueMediaSource(item, quality);
  if (rescued) return rescued;

  var embedded = await embeddedResolveMedia(item, quality);
  if (embedded && embedded.source) {
    var platLabel = PLATFORM_DISPLAY_NAMES[embedded.platform] || embedded.platform;
    notifyRescueOnce(getRescueCacheKey(item), embeddedNoticeText(platLabel, embedded.source), 'info');
    return embedded.source;
  }
  return null;
}

// ============================================================================
// 内置兜底音源引擎 (Embedded Fallback Sources)
// 历史版本导入的老歌单兼容层 + 原生音源全灭时的最后防线：
//   · QQ音乐  : VKeys（落月API）直链（无损 / 320k / 128k 自动降级）+ QQ 官方 smartbox 搜索严格匹配
//   · 网易云  : GD音乐台 直链（含无损）+ Meting 302 兜底（128k）
//   · 酷狗音乐: 官方搜索 songsearch + getSongInfo 免费曲直链（付费灰歌自动跳过）
// 内置层播放提示会附上实际取链的接口服务名（内置音源：X（服务名）/ X仅试听30秒（服务名））。
// 网易云 VIP/受限曲目只能拿到 30 秒试听片段（jd-musicrep-ts 标记 / 字节数校验）时不会被
// 误当完整曲：先继续匹配其它平台的完整版，全灭时兜底播放试听并提示「X仅试听30秒」。
// 跨源搜索一律执行与跨插件兜底同级的 100% 严格匹配（同名 + 同歌手 + 同版本 + 时长吻合），
// 匹配不到完全一致的原曲立即跳过——宁可跳过，绝不播放错歌。
// 全部请求均在用户设备本地直连公开接口，不经任何 PlaylistOut 服务器转发与缓存。
// ============================================================================

const EMBEDDED_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 内置兜底媒体直链白名单（命中域名后缀才允许回传播放，杜绝未知来源直链） */
const EMBEDDED_MEDIA_HOST_SUFFIXES = ['qqmusic.qq.com', 'music.126.net', 'kugou.com'];
const EMBEDDED_METING_HOST = 'api.injahow.cn';

const _embeddedMatchCache = new Map(); // 曲目键 -> { platform, info, at }（严格匹配结果 30 分钟复用）
const _embeddedNoSourceCache = new Map(); // 曲目键|音质档 -> 取源失败时间（60 秒内不重复请求第三方）
const EMBEDDED_NO_SOURCE_TTL_MS = 60 * 1000;
const _embeddedInFlight = new Map(); // 并发去重：同一首歌同时被多处触发时只解析一次

function embeddedQualityTier(quality) {
  var q = String(quality || 'standard');
  if (q === 'super') return 'super';
  if (q === 'high') return 'high';
  return 'standard';
}

function embeddedQualityLabel(kbps, url) {
  var u = String(url || '').toLowerCase();
  var n = parseInt(String(kbps || '').replace(/[^0-9]/g, ''), 10) || 0;
  if (u.indexOf('.flac') >= 0 || n >= 900) return 'flac';
  if (n >= 250) return '320k';
  return '128k';
}

/** 曲目秒数（MusicFree 标准字段；超 1 小时的异常值按未知处理，避免误判试听闸门） */
function embeddedItemDurationSec(item) {
  var d = Number(item && item.duration) || 0;
  return d > 0 && d <= 3600 ? d : 0;
}

/** 试听片段识别：网易云试听直链带专属路径标记（VIP 未登录/受限时为 30 秒片段） */
function embeddedIsTrialUrl(url) {
  return /\/jd-musicrep-ts\//i.test(String(url || ''));
}

/** 试听时长闸门：容忍 ±12 秒与 40% 的元数据偏差，明显低于闸门的整段视为试听片段 */
function embeddedTrialDurationFloor(durationSec) {
  var dur = Number(durationSec) || 0;
  if (dur <= 0) return 0;
  return Math.min(dur - 12, dur * 0.6);
}

/** 从响应头解析完整资源字节数（206 优先 Content-Range 总长；仅 200 才信任 Content-Length） */
function embeddedResponseTotalBytes(status, headers) {
  if (!headers) return 0;
  var cr = String(headers['content-range'] || headers['Content-Range'] || '');
  var m = cr.match(/\/(\d+)\s*$/);
  if (m) return Number(m[1]) || 0;
  if (Number(status) === 200) {
    return Number(headers['content-length'] || headers['Content-Length'] || 0) || 0;
  }
  return 0;
}

/** 试听片段识别：整段按闸门时长摊下来的等效码率低于 64kbps 视为试听（正常直链最低也在 96kbps 上下） */
function embeddedLooksLikeTrialBytes(totalBytes, durationSec) {
  var total = Number(totalBytes) || 0;
  var floor = embeddedTrialDurationFloor(durationSec);
  if (total <= 0 || floor <= 0) return false;
  return total / floor < 8000;
}

/** 腾讯系 CDN 同时支持 https，统一升级避免 Android 明文流量拦截 */
function embeddedHttpsUrl(url) {
  var u = String(url || '').trim();
  if (/^http:\/\/ws\.stream\.qqmusic\.qq\.com\//i.test(u)) {
    u = 'https://' + u.slice(7);
  }
  return u;
}

/** 媒体直链白名单校验：仅允许 QQ音乐 / 网易云 / 酷狗 CDN 与 Meting 跳转地址 */
function isAllowedEmbeddedMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  var m = url.match(/^https?:\/\/([^/?#]+)/i);
  if (!m) return false;
  var host = m[1].toLowerCase().split(':')[0];
  if (host === EMBEDDED_METING_HOST) return true;
  for (var i = 0; i < EMBEDDED_MEDIA_HOST_SUFFIXES.length; i++) {
    var suffix = EMBEDDED_MEDIA_HOST_SUFFIXES[i];
    if (host === suffix || host.slice(-(suffix.length + 1)) === '.' + suffix) return true;
  }
  return false;
}

/**
 * QQ音乐：vkeys 精确取链（quality 10=无损, 8=320k, 6=128k），按音质档自动降级
 */
async function embeddedVkeysQqLink(mid, quality) {
  if (!mid) return null;
  var tier = embeddedQualityTier(quality);
  var order = tier === 'super' ? [10, 8, 6] : tier === 'high' ? [8, 6] : [6, 8];
  for (var i = 0; i < order.length; i++) {
    var body;
    try {
      var res = await httpGet(
        'https://api.vkeys.cn/music/tencent/song/link?mid=' + encodeURIComponent(mid) + '&quality=' + order[i],
        { timeout: 4000, headers: { 'User-Agent': EMBEDDED_UA } }
      );
      body = res && res.data;
    } catch (_) {
      return null;
    }
    var data = body && body.code === 0 && body.data ? body.data : null;
    if (!data || !data.url) continue;
    var url = embeddedHttpsUrl(String(data.url));
    if (!isAllowedEmbeddedMediaUrl(url)) continue;
    return { url: url, quality: embeddedQualityLabel(data.kbps, url), provider: 'VKeys' };
  }
  return null;
}

/**
 * QQ音乐：smartbox 官方联想搜索（返回 mid + 歌名 + 歌手，供严格匹配）
 */
async function embeddedSearchQqCandidates(keyword) {
  var res = await httpGet(
    'https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key=' +
      encodeURIComponent(keyword) +
      '&format=json&inCharset=utf8&outCharset=utf-8',
    { timeout: 4000, headers: { 'User-Agent': EMBEDDED_UA, Referer: 'https://y.qq.com' } }
  );
  var list = res && res.data && res.data.data && res.data.data.song && res.data.data.song.itemlist;
  var out = [];
  if (Array.isArray(list)) {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it && it.mid && it.name) {
        out.push({
          mid: String(it.mid),
          title: String(it.name),
          artist: String(it.singer || ''),
          album: '',
          duration: 0,
        });
      }
    }
  }
  return out;
}

/**
 * 网易云：GD Studio 精确取链（br=999/320/128，含无损；试听片段自动标记）
 */
async function embeddedGdNeteaseUrl(id, quality, durationSec) {
  if (!id) return null;
  var tier = embeddedQualityTier(quality);
  var br = tier === 'super' ? 999 : tier === 'high' ? 320 : 128;
  var res = await httpGet(
    'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=' + encodeURIComponent(id) + '&br=' + br,
    { timeout: 4500, headers: { 'User-Agent': EMBEDDED_UA } }
  );
  var data = res && res.data;
  var url = data && data.url ? embeddedHttpsUrl(String(data.url)) : '';
  if (!url || !isAllowedEmbeddedMediaUrl(url)) return null;
  var trial = embeddedIsTrialUrl(url);
  if (!trial) {
    var estSec = data.size && data.br ? (Number(data.size) * 8) / (Number(data.br) * 1000) : 0;
    var floor = embeddedTrialDurationFloor(durationSec);
    if (estSec > 0 && floor > 0 && estSec < floor) trial = true;
  }
  return { url: url, quality: embeddedQualityLabel(data.br, url), trial: trial, provider: 'GD音乐台' };
}

/**
 * 网易云：Meting 302 兜底（128k）。先用 Range 探测确认真实可播，避免回传死链；
 * 跳转目标命中试听标记或字节数明显不足原曲时标记试听片段（不再当作完整曲目）
 */
async function embeddedMetingNeteaseUrl(id, durationSec) {
  if (!id) return null;
  var metingUrl = 'https://api.injahow.cn/meting/?server=netease&type=url&id=' + encodeURIComponent(id);
  var res = await httpGet(metingUrl, {
    timeout: 5000,
    headers: { 'User-Agent': EMBEDDED_UA, Range: 'bytes=0-0' },
  });
  var ok =
    res &&
    (res.status === 200 || res.status === 206) &&
    typeof res.data === 'string' &&
    res.data.length > 0;
  if (!ok) return null;
  var trial = embeddedIsTrialUrl(res.finalUrl);
  if (!trial) {
    var total = embeddedResponseTotalBytes(res.status, res.headers);
    if (embeddedLooksLikeTrialBytes(total, durationSec)) trial = true;
  }
  return { url: metingUrl, quality: '128k', trial: trial, provider: 'Meting' };
}

/**
 * 网易云：GD Studio 官方搜索（歌名 + 歌手数组 + 专辑，供严格匹配）
 */
async function embeddedSearchNeteaseCandidates(keyword) {
  var res = await httpGet(
    'https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=' +
      encodeURIComponent(keyword) +
      '&count=10',
    { timeout: 4500, headers: { 'User-Agent': EMBEDDED_UA } }
  );
  var list = res && res.data;
  var out = [];
  if (Array.isArray(list)) {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || !it.id || !it.name) continue;
      var artists = Array.isArray(it.artist) ? it.artist.join(', ') : String(it.artist || '');
      out.push({
        id: String(it.id),
        title: String(it.name),
        artist: artists,
        album: String(it.album || ''),
        duration: 0,
      });
    }
  }
  return out;
}

/**
 * 酷狗：官方搜索（返回 FileHash / HQ / SQ 哈希 + 时长，供严格匹配）
 */
async function embeddedSearchKugouCandidates(keyword) {
  var res = await httpGet(
    'https://songsearch.kugou.com/song_search_v2?keyword=' +
      encodeURIComponent(keyword) +
      '&page=1&pagesize=6&platform=WebFilter&userid=0&clientver=2000&iscorrection=1&privilege_filter=0&area_code=1&filter=10',
    { timeout: 4000, headers: { 'User-Agent': EMBEDDED_UA, Referer: 'https://www.kugou.com/' } }
  );
  var lists = res && res.data && res.data.data && res.data.data.lists;
  var out = [];
  if (Array.isArray(lists)) {
    for (var i = 0; i < lists.length; i++) {
      var it = lists[i];
      if (!it || !it.FileHash || !it.SongName) continue;
      out.push({
        hash: String(it.FileHash),
        hqHash: it.HQFileHash ? String(it.HQFileHash) : '',
        sqHash: it.SQFileHash ? String(it.SQFileHash) : '',
        title: String(it.SongName),
        artist: String(it.SingerName || '').replace(/、/g, ','),
        album: it.AlbumName ? String(it.AlbumName) : '',
        duration: Number(it.Duration) || 0,
      });
    }
  }
  return out;
}

/**
 * 酷狗：按哈希取播放直链（getSongInfo 免费曲出链；付费灰歌返回空自动跳过）
 */
async function embeddedKugouUrl(lookup, quality) {
  var tier = embeddedQualityTier(quality);
  var hashes = [];
  var push = function (h) {
    if (h && hashes.indexOf(h) < 0) hashes.push(h);
  };
  if (tier === 'super') {
    push(lookup.sqHash);
    push(lookup.hqHash);
  } else if (tier === 'high') {
    push(lookup.hqHash);
  }
  push(lookup.hash);
  for (var i = 0; i < hashes.length; i++) {
    var data;
    try {
      var res = await httpGet(
        'https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=' + encodeURIComponent(hashes[i]),
        { timeout: 4000, headers: { 'User-Agent': EMBEDDED_UA } }
      );
      data = res && res.data;
    } catch (_) {
      return null;
    }
    var url = data && data.url ? embeddedHttpsUrl(String(data.url)) : '';
    if (url && isAllowedEmbeddedMediaUrl(url)) {
      return { url: url, quality: embeddedQualityLabel(0, url) };
    }
  }
  return null;
}

/**
 * 提取曲目的原平台精确取链标识（优先 _src 原生凭证，兼容历史 ID 前缀与直填字段）
 */
function embeddedOriginLookup(item) {
  if (!item || typeof item !== 'object') return null;
  var src = item._src && typeof item._src === 'object' ? item._src : null;
  var plat =
    item._originPlatform && !isSelfPlatform(item._originPlatform)
      ? String(item._originPlatform)
      : typeof item.platform === 'string' && !isSelfPlatform(item.platform)
        ? String(item.platform)
        : '';
  var rawId = item.id != null ? String(item.id) : '';

  if ((src && src.qq && (src.qq.mid || src.qq.id)) || plat === 'qq' || /^qq_/i.test(rawId)) {
    var mid = src && src.qq ? String(src.qq.mid || src.qq.id || '') : '';
    if (!mid) mid = String(item.songmid || '').replace(/^qq_/i, '');
    if (!mid) mid = rawId.replace(/^qq_/i, '');
    if (mid) return { platform: 'qq', mid: mid };
  }
  if ((src && src.netease && src.netease.id) || plat === 'netease' || /^netease_/i.test(rawId)) {
    var nid = src && src.netease ? String(src.netease.id || '') : '';
    if (!nid) nid = rawId.replace(/^netease_/i, '');
    if (nid) return { platform: 'netease', id: nid };
  }
  if ((src && src.kugou && (src.kugou.hash || src.kugou.FileHash)) || plat === 'kugou' || /^kugou_/i.test(rawId)) {
    var khash = src && src.kugou ? String(src.kugou.hash || src.kugou.FileHash || '') : '';
    if (!khash) khash = rawId.replace(/^kugou_/i, '');
    if (khash) {
      return {
        platform: 'kugou',
        hash: khash,
        hqHash: src && src.kugou && src.kugou.hqHash ? String(src.kugou.hqHash) : '',
        sqHash: src && src.kugou && src.kugou.sqHash ? String(src.kugou.sqHash) : '',
      };
    }
  }
  if (plat) return { platform: plat };
  return null;
}

/** 由搜索候选构造精确取链标识 */
function embeddedLookupFromCandidate(platform, cand) {
  if (platform === 'qq') return { platform: 'qq', mid: cand.mid };
  if (platform === 'netease') return { platform: 'netease', id: cand.id };
  if (platform === 'kugou') {
    return { platform: 'kugou', hash: cand.hash, hqHash: cand.hqHash || '', sqHash: cand.sqHash || '' };
  }
  return null;
}

/** 按平台派发搜索（各通道相互独立，任一通道故障不影响其它通道） */
async function embeddedLaneSearch(platform, keyword) {
  if (platform === 'qq') return await embeddedSearchQqCandidates(keyword);
  if (platform === 'netease') return await embeddedSearchNeteaseCandidates(keyword);
  if (platform === 'kugou') return await embeddedSearchKugouCandidates(keyword);
  return [];
}

/**
 * 按精确标识取链：QQ -> vkeys / 网易云 -> GD Studio + Meting / 酷狗 -> getSongInfo
 * 网易云渠道若只能拿到试听片段：先补齐另一条网易云通道，仍无完整版则带 trial 标记返回，
 * 由调用方继续尝试其它平台，只有在全部无完整版时才兜底播放试听
 */
async function embeddedResolveLookup(lookup, quality, durationSec) {
  if (!lookup || !lookup.platform) return null;
  if (lookup.platform === 'qq' && lookup.mid) {
    var qq = await embeddedVkeysQqLink(lookup.mid, quality);
    if (qq) return { platform: 'qq', info: { mid: lookup.mid }, source: qq };
  }
  if (lookup.platform === 'netease' && lookup.id) {
    var ne = null;
    try {
      ne = await embeddedGdNeteaseUrl(lookup.id, quality, durationSec);
    } catch (_) {}
    if (ne && !ne.trial) return { platform: 'netease', info: { id: lookup.id }, source: ne };
    var mg = null;
    try {
      mg = await embeddedMetingNeteaseUrl(lookup.id, durationSec);
    } catch (_) {}
    if (mg && !mg.trial) return { platform: 'netease', info: { id: lookup.id }, source: mg };
    var trialSource = mg || ne;
    if (trialSource) return { platform: 'netease', info: { id: lookup.id }, source: trialSource };
  }
  if (lookup.platform === 'kugou' && lookup.hash) {
    var kg = await embeddedKugouUrl(lookup, quality);
    if (kg) {
      return {
        platform: 'kugou',
        info: { hash: lookup.hash, hqHash: lookup.hqHash || '', sqHash: lookup.sqHash || '' },
        source: kg,
      };
    }
  }
  return null;
}

/**
 * 跨平台严格搜索兜底：QQ -> 网易云 -> 酷狗 依次搜索，
 * 仅当候选与原曲 100% 严格匹配（同名 + 同歌手 + 同版本 + 时长吻合）且成功取链才返回。
 * 若命中的候选只能拿到试听片段，先记下作为最后兜底，继续尝试其它平台的完整版。
 */
async function embeddedResolveBySearch(item, quality) {
  var title = String(item.title || '').trim();
  if (!title) return null;
  var rawArtist = String(item.artist || '')
    .replace(/未知歌手/g, '')
    .trim();
  var primaryArtist = rawArtist.split(/[,，、/]/)[0].trim();
  var keyword = primaryArtist ? title + ' ' + primaryArtist : title;
  var durationSec = embeddedItemDurationSec(item);
  var trialEntry = null;

  var lanes = ['qq', 'netease', 'kugou'];
  for (var i = 0; i < lanes.length; i++) {
    var platform = lanes[i];
    var candidates = [];
    try {
      candidates = await embeddedLaneSearch(platform, keyword);
    } catch (_) {
      continue;
    }
    for (var j = 0; j < candidates.length; j++) {
      var cand = candidates[j];
      var matched = isCandidateStrictlyMatched(
        { title: cand.title, artist: cand.artist, album: cand.album || '', duration: cand.duration || 0 },
        title,
        rawArtist,
        item.duration
      );
      if (!matched) continue;
      var lookup = embeddedLookupFromCandidate(platform, cand);
      var resolved = null;
      try {
        resolved = await embeddedResolveLookup(lookup, quality, durationSec);
      } catch (_) {
        resolved = null;
      }
      if (resolved && resolved.source && !resolved.source.trial) return resolved;
      if (resolved) trialEntry = resolved;
      // 严格命中的候选只有试听片段或取链失败：同平台不再尝试其它候选，直接换下一个平台
      break;
    }
  }
  return trialEntry;
}

/**
 * 跨平台严格搜索定位（不取链）：为「来源无法识别的极老曲目」的取词通道提供原平台标识。
 * 与取源通道使用完全相同的严格匹配标准（同名 + 同歌手 + 同版本 + 时长吻合）。
 */
async function embeddedLocateBySearch(item) {
  var title = String(item.title || '').trim();
  if (!title) return null;
  var rawArtist = String(item.artist || '')
    .replace(/未知歌手/g, '')
    .trim();
  var primaryArtist = rawArtist.split(/[,，、/]/)[0].trim();
  var keyword = primaryArtist ? title + ' ' + primaryArtist : title;

  var lanes = ['qq', 'netease', 'kugou'];
  for (var i = 0; i < lanes.length; i++) {
    var platform = lanes[i];
    var candidates = [];
    try {
      candidates = await embeddedLaneSearch(platform, keyword);
    } catch (_) {
      continue;
    }
    for (var j = 0; j < candidates.length; j++) {
      var cand = candidates[j];
      var matched = isCandidateStrictlyMatched(
        { title: cand.title, artist: cand.artist, album: cand.album || '', duration: cand.duration || 0 },
        title,
        rawArtist,
        item.duration
      );
      if (!matched) continue;
      // 歌词通道仅支持 QQ / 网易云；酷狗严格命中说明前两个通道均无匹配，直接返回空
      if (platform === 'qq' && cand.mid) return { platform: 'qq', mid: cand.mid };
      if (platform === 'netease' && cand.id) return { platform: 'netease', id: cand.id };
      return null;
    }
  }
  return null;
}

/**
 * 内置兜底解析主流程：原平台精确取链 -> 复用历史严格匹配 -> 跨平台严格搜索
 */
async function embeddedResolveMediaTask(item, quality, key) {
  var durationSec = embeddedItemDurationSec(item);
  var trialEntry = null;

  var origin = embeddedOriginLookup(item);
  if (origin) {
    try {
      var exact = await embeddedResolveLookup(origin, quality, durationSec);
      if (exact && exact.source && !exact.source.trial) return exact;
      if (exact) trialEntry = exact;
    } catch (_) {}
  }

  var cached = key ? _embeddedMatchCache.get(key) : null;
  if (cached && Date.now() - cached.at < MATCH_TTL_MS && cached.info) {
    var lookup = {
      platform: cached.platform,
      mid: cached.info.mid,
      id: cached.info.id,
      hash: cached.info.hash,
      hqHash: cached.info.hqHash,
      sqHash: cached.info.sqHash,
    };
    try {
      var reused = await embeddedResolveLookup(lookup, quality, durationSec);
      if (reused && reused.source && !reused.source.trial) return reused;
      if (reused && !trialEntry) trialEntry = reused;
    } catch (_) {}
  }

  var bySearch = await embeddedResolveBySearch(item, quality);
  if (bySearch && bySearch.source && !bySearch.source.trial) return bySearch;
  if (bySearch && !trialEntry) trialEntry = bySearch;
  return trialEntry;
}

/**
 * 内置兜底取源（含并发去重 / 严格匹配缓存 / 60 秒失败缓存）
 * @returns {Promise<{platform: string, info: object, source: {url: string, quality: string}}|null>}
 */
async function embeddedResolveMedia(item, quality) {
  if (!item || typeof item !== 'object' || !item.title) return null;
  var key = getRescueCacheKey(item);
  if (!key) return null;
  var tier = embeddedQualityTier(quality);
  var gateKey = key + '|' + tier;

  var noAt = _embeddedNoSourceCache.get(gateKey);
  if (noAt && Date.now() - noAt < EMBEDDED_NO_SOURCE_TTL_MS) return null;

  var inFlight = _embeddedInFlight.get(gateKey);
  if (inFlight) return inFlight;

  var task = embeddedResolveMediaTask(item, quality, key).then(
    function (entry) {
      _embeddedInFlight.delete(gateKey);
      if (entry && entry.source && entry.source.url) {
        _embeddedMatchCache.set(key, { platform: entry.platform, info: entry.info, at: Date.now() });
        _embeddedNoSourceCache.delete(gateKey);
        return entry;
      }
      _embeddedNoSourceCache.set(gateKey, Date.now());
      return null;
    },
    function () {
      _embeddedInFlight.delete(gateKey);
      _embeddedNoSourceCache.set(gateKey, Date.now());
      return null;
    }
  );
  _embeddedInFlight.set(gateKey, task);
  return task;
}

/**
 * 内置兜底歌词：QQ（s01s -> QQ 官方歌词接口）与网易云（官方歌词接口）
 */
async function embeddedQqLyric(mid) {
  if (!mid) return null;
  try {
    var res = await httpGet('https://tang.api.s01s.cn/music_open_api.php?mid=' + encodeURIComponent(mid), {
      timeout: 4500,
      headers: { 'User-Agent': EMBEDDED_UA },
    });
    var data = res && res.data;
    var lrc = data ? data.song_lyric || data.lyric : '';
    if (typeof lrc === 'string' && lrc.trim() && lrc.indexOf('[') >= 0) return lrc;
  } catch (_) {}
  try {
    var res2 = await httpGet(
      'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=' +
        encodeURIComponent(mid) +
        '&format=json&nobase64=1',
      { timeout: 4500, headers: { 'User-Agent': EMBEDDED_UA, Referer: 'https://y.qq.com' } }
    );
    var lrc2 = res2 && res2.data && res2.data.lyric;
    if (typeof lrc2 === 'string' && lrc2.trim() && lrc2.indexOf('[') >= 0) return lrc2;
  } catch (_) {}
  return null;
}

async function embeddedNeteaseLyric(id) {
  if (!id) return null;
  try {
    var res = await httpGet(
      'https://music.163.com/api/song/lyric?id=' + encodeURIComponent(id) + '&lv=1&kv=1&tv=-1',
      { timeout: 4500, headers: { 'User-Agent': EMBEDDED_UA } }
    );
    var lrc = res && res.data && res.data.lrc && res.data.lrc.lyric;
    if (typeof lrc === 'string' && lrc.trim() && lrc.indexOf('[') >= 0) return lrc;
  } catch (_) {}
  return null;
}

/**
 * 内置兜底歌词解析：优先原平台标识，其次复用内置取源时记住的严格匹配结果；
 * 均无时（来源无法识别的极老曲目）跨平台严格搜索定位后再取词
 */
async function embeddedResolveLyric(item) {
  if (!item || typeof item !== 'object') return null;
  var lookups = [];
  var origin = embeddedOriginLookup(item);
  if (origin && origin.platform) lookups.push(origin);

  var key = getRescueCacheKey(item);
  var cached = key ? _embeddedMatchCache.get(key) : null;
  if (cached && Date.now() - cached.at < MATCH_TTL_MS && cached.info) {
    lookups.push({ platform: cached.platform, mid: cached.info.mid, id: cached.info.id });
  }

  // 无任何原平台标识（来源无法识别的极老曲目）：先跨平台严格搜索定位，再取词
  if (!lookups.length && item.title) {
    var located = null;
    try {
      located = await embeddedLocateBySearch(item);
    } catch (_) {
      located = null;
    }
    if (located) lookups.push(located);
  }

  var seen = {};
  for (var i = 0; i < lookups.length; i++) {
    var lk = lookups[i];
    var sig = lk.platform + '|' + (lk.mid || lk.id || '');
    if (seen[sig]) continue;
    seen[sig] = true;
    if (lk.platform === 'qq' && lk.mid) {
      var qqLrc = await embeddedQqLyric(lk.mid);
      if (qqLrc) return { rawLrc: qqLrc };
    } else if (lk.platform === 'netease' && lk.id) {
      var neLrc = await embeddedNeteaseLyric(lk.id);
      if (neLrc) return { rawLrc: neLrc };
    }
  }
  return null;
}

/**
 * 宿主插件调用拦截：取源 / 取词失败且曲目由本插件导入时，自动兜底换源 / 换词
 */
async function maybeRescueResult(payload, res) {
  if (!payload || !Array.isArray(payload.args) || !payload.args[0]) return res;
  var pl = payload.platform;
  if (pl && isSelfPlatform(pl)) return res;
  if (!_hostCallPluginMethod) return res;

  var item = payload.args[0];
  if (payload.method === 'getMediaSource') {
    if (res && res.url) return res;
    if (!isPlaylistOutImportedItem(item)) return res;
    var rescued = await autoResolveFallbackSource(item, payload.args[1] || 'standard');
    if (rescued) return rescued;
    notifyNoMediaSourceOnce(item);
    return res;
  }
  if (payload.method === 'getLyric') {
    if (res && typeof res.rawLrc === 'string' && res.rawLrc.trim()) return res;
    if (!isPlaylistOutImportedItem(item)) return res;
    var rescuedLrc = await autoResolveFallbackLyric(item);
    return rescuedLrc || res;
  }
  return res;
}

/**
 * 获取音源 (getMediaSource)
 * 「原生优先 + 双层兜底」策略，服务历史版本导入的歌单与原生插件缺失场景：
 *   1. 历史曲目（platform 仍是本插件名）：先按原平台原生标识在对应插件上精确取源；
 *   2. 跨插件严格匹配兜底（宿主通道，桌面稳定版可用）；
 *   3. 内置兜底音源引擎（QQ音乐 / 网易云 / 酷狗，全部严格匹配，找不到就跳过）。
 * 手机端 / 桌面测试版无宿主通道时第 2 步安全跳过，第 3 步仍可保证老歌单正常播放。
 */
async function getMediaSource(musicItem, quality) {
  if (!musicItem || typeof musicItem !== 'object' || !musicItem.id) {
    return null;
  }
  var q = quality || 'standard';

  // 历史导入兼容：若曲目带原平台显式标识，先在原平台插件上精确取源（免搜索、最精准）
  var origin = musicItem._originPlatform;
  if (origin && !isSelfPlatform(origin) && _hostCallPluginMethod) {
    var exact = await hostCallPluginMethod({
      platform: String(origin),
      method: 'getMediaSource',
      args: [musicItem, q],
    });
    if (exact && isUsableRescuedUrl(exact.url)) {
      var platLabel = PLATFORM_DISPLAY_NAMES[origin] || origin;
      notifyRescueOnce(getRescueCacheKey(musicItem), '音源：' + platLabel, 'info');
      return exact;
    }
  }

  var resolved = await autoResolveFallbackSource(musicItem, q);
  if (resolved) return resolved;
  notifyNoMediaSourceOnce(musicItem);
  return null;
}

/**
 * 获取歌词 (getLyric)
 * 跨插件严格匹配换词 -> 内置兜底歌词（QQ / 网易云官方接口）依次尝试；
 * 获取不到时返回空歌词对象，保证绝不返回 null，防止 MusicFree 宿主读取 rawLrc 崩溃。
 */
async function getLyric(musicItem) {
  var emptyLyric = { rawLrc: '' };
  if (!musicItem || typeof musicItem !== 'object' || !musicItem.id) {
    return emptyLyric;
  }
  var resolved = await autoResolveFallbackLyric(musicItem);
  if (resolved) return resolved;
  return emptyLyric;
}

// ── 每日匿名活跃心跳（DAU）────────────────────────────────────────────
// 插件被加载时发送一次匿名心跳（每天最多一次），用于统计跨端日活。
// 静默、无任何 UI 提示、不重试、失败一律忽略；任何异常都绝不影响插件加载。
// 上报内容仅 {"type":"active"}；服务端从声明头与请求指纹派生渠道/客户端/地区/小时。
var _activeReportedDate = '';
var ACTIVE_PING_URL = 'https://playlistout-api.lengxiqwq.com/api/event';
var ACTIVE_MARKER_FILE = 'playlistout-active.json';

function _todayUtcDate() {
  try {
    var d = new Date();
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch (_) {
    return '';
  }
}

function _resolveActiveMarkerPath(pathMod) {
  try {
    var proc = new Function('return typeof process !== "undefined" ? process : null')();
    var env = (proc && proc.env) || {};
    var base = env.TEMP || env.TMPDIR || env.TMP || env.USERPROFILE || env.HOME || '';
    if (!base || !pathMod || typeof pathMod.join !== 'function') return '';
    return pathMod.join(base, ACTIVE_MARKER_FILE);
  } catch (_) {
    return '';
  }
}

function _readActiveMarkerDate(fsMod, markerPath) {
  try {
    if (!markerPath || !fsMod || typeof fsMod.readFileSync !== 'function') return '';
    var parsed = JSON.parse(fsMod.readFileSync(markerPath, 'utf-8'));
    return parsed && typeof parsed.date === 'string' ? parsed.date : '';
  } catch (_) {
    return '';
  }
}

function _writeActiveMarkerDate(fsMod, markerPath, date) {
  try {
    if (!markerPath || !fsMod || typeof fsMod.writeFileSync !== 'function') return;
    fsMod.writeFileSync(markerPath, JSON.stringify({ date: date }), 'utf-8');
  } catch (_) {}
}

function _sendActivePing() {
  // 仅用原生 fetch：加载时刻可能早于宿主 bridge 就绪，不依赖 axios / 宿主桥。
  var fetchFn = null;
  try {
    if (typeof fetch === 'function') fetchFn = fetch;
    else if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') fetchFn = globalThis.fetch;
  } catch (_) {}
  if (!fetchFn) return Promise.resolve();

  var headers;
  try {
    headers = Object.assign(getPlaylistOutHeaders(), { 'Content-Type': 'application/json' });
  } catch (_) {
    return Promise.resolve();
  }

  var controller = null;
  var timer = null;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, 5000);
    }
  } catch (_) {}

  var settle = function () {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  try {
    var p = fetchFn(ACTIVE_PING_URL, {
      method: 'POST',
      headers: headers,
      body: '{"type":"active"}',
      signal: controller ? controller.signal : undefined,
    });
    if (p && typeof p.then === 'function') return p.then(settle, settle);
    settle();
    return Promise.resolve();
  } catch (_) {
    settle();
    return Promise.resolve();
  }
}

function reportDailyActiveHeartbeat() {
  try {
    // 测试/显式禁用开关：测试运行器在 require 插件之前设置（加载早于 env 注入，不能用 env 判断）。
    if (typeof globalThis !== 'undefined' && globalThis.__PLAYLISTOUT_DISABLE_ACTIVE_PING__ === true) {
      return;
    }
  } catch (_) {
    return;
  }

  var today = _todayUtcDate();
  if (!today) return;

  // 内存 gate：同一进程生命周期内每天最多一次（同步置位，避免并发重复触发）。
  if (_activeReportedDate === today) return;
  _activeReportedDate = today;

  // 桌面端标记文件 best-effort 检查与写入；写入失败降级为仅内存 gate（服务端哈希去重兜底）。
  Promise.resolve()
    .then(function () { return ensureHostModulesAsync(); })
    .then(function (mods) {
      var fsMod = mods && mods.fs;
      var pathMod = mods && mods.path;
      var markerPath = _resolveActiveMarkerPath(pathMod);
      if (_readActiveMarkerDate(fsMod, markerPath) === today) {
        return null; // 当天已上报，跳过
      }
      _writeActiveMarkerDate(fsMod, markerPath, today);
      return _sendActivePing();
    })
    .catch(function () {
      // 宿主模块不可用（如移动端无文件系统）：仍尝试一次原生 fetch，服务端当日去重兜底。
      return _sendActivePing().catch(function () {});
    });
}

// 每日匿名活跃心跳：静默 fire-and-forget，任何失败都不影响插件加载
try {
  reportDailyActiveHeartbeat();
} catch (_) {}

module.exports = {
  platform: PLUGIN_PLATFORM,
  author: 'LengxiQwQ',
  version: PLUGIN_VERSION,
  appVersion: '>0.1.0-alpha.0',
  srcUrl: 'https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js',
  cacheControl: 'no-store',
  description: [
    '## 把你的歌单带走 官方插件',
    '',
    '支持 QQ音乐、网易云音乐、酷狗音乐、汽水音乐等主流平台歌单在线解析与导入。',
    '导入的曲目会自动归属原平台，优先由您设备上已安装的原生音源插件播放；缺失或取源失败时会自动严格匹配同一首原曲换源（同名+同歌手+同版本，绝不播放错歌）。',
    '老版本导入的歌单即使原生插件缺失，也会自动调用内置兜底音源（QQ音乐 / 网易云音乐 / 酷狗音乐）严格匹配原曲恢复播放；匹配不到完全一致的原曲时自动跳过。',
    '',
    '### 🌐 官方网站（点击可直接在浏览器打开）',
    '- [👉 点击一键前往官网 (playlistout.lengxiqwq.com)](https://playlistout.lengxiqwq.com)',
    '',
    '### 💡 酷狗音乐全量导入说明',
    '因酷狗官方限制，未登录仅可解析前 10 首预览歌曲。',
    '1. 前往官网 (playlistout.lengxiqwq.com) 扫码登录酷狗。',
    '2. 复制 Token 与 UserID（或直接复制插件凭据）。',
    '3. 在本插件「插件设置」填入「酷狗Token」与「酷狗UID」，即可直接粘贴歌单链接全量导入！',
    '',
    '### 🎧 内置兜底音源接口',
    '内置兜底音源接口由 VKeys（落月API）、GD音乐台、Meting 等社区公开服务提供，酷狗通道为酷狗官方公开接口，与本项目均无隶属关系。',
  ].join('\n'),
  hints: {
    importMusicSheet: [
      '【支持平台】QQ音乐、网易云音乐、酷狗音乐、汽水音乐',
      '【播放说明】优先使用已装原生音源插件；缺源时自动跨插件 + 内置兜底音源严格匹配换源（绝不播放错歌）',
      '【酷狗限制】酷狗官方限制免登录仅解析前10首',
      '【完整解析】在官网登录复制Token填入插件设置即可全量导入',
      '【官方网站】playlistout.lengxiqwq.com',
    ],
  },
  userVariables: [
    {
      key: 'kugouToken',
      name: '酷狗Token',
      hint: '官网登录获取(可填token:uid)',
    },
    {
      key: 'kugouUserid',
      name: '酷狗UID',
      hint: '官网登录获取(可选)',
    },
  ],
  supportedSearchType: ['sheet'],
  importMusicSheet,
  getMediaSource,
  getLyric,
  _getKugouCredentials: getKugouCredentials,
  _isOfficialWebsiteTrigger: isOfficialWebsiteTrigger,
  _tryOpenOfficialWebsite: tryOpenOfficialWebsite,
  _detectClientEnvironment: detectClientEnvironment,
  _getPlaylistOutHeaders: getPlaylistOutHeaders,
  _reportDailyActiveHeartbeat: reportDailyActiveHeartbeat,
  _setHostBridge: _setHostBridge,
  _buildPlaybackToastScript: buildPlaybackToastScript,
  _isCandidateStrictlyMatched: isCandidateStrictlyMatched,
  _maybeRescueResult: maybeRescueResult,
  _embeddedResolveMedia: embeddedResolveMedia,
  _embeddedResolveLyric: embeddedResolveLyric,
  _embeddedOriginLookup: embeddedOriginLookup,
  _embeddedNoticeText: embeddedNoticeText,
  _isAllowedEmbeddedMediaUrl: isAllowedEmbeddedMediaUrl,
  _embeddedIsTrialUrl: embeddedIsTrialUrl,
  _embeddedTrialDurationFloor: embeddedTrialDurationFloor,
  _embeddedResponseTotalBytes: embeddedResponseTotalBytes,
  _embeddedLooksLikeTrialBytes: embeddedLooksLikeTrialBytes,
};
