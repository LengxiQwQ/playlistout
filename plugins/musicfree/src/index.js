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

const PLUGIN_PLATFORM = '把你的歌单带走';
const LEGACY_PLATFORM = 'PlaylistOut';

function isSelfPlatform(plat) {
  return (
    !plat ||
    plat === PLUGIN_PLATFORM ||
    plat === '把你的歌单带走 (PlaylistOut)' ||
    plat === LEGACY_PLATFORM
  );
}

/**
 * 在 MusicFree Desktop 渲染进程弹窗中自动注入：
 * 1. 导入歌单弹窗：「📂 选择本地 JSON」与「🌐 去官网解析歌单」并排虚线按钮 + 拖拽支持
 * 2. 插件设置面板 (userVariables)：可视化单选胶囊按钮（一键切换「无原版音源处理方式」与「音源通道」，免手打字符）
 */
const RENDERER_FILE_PICKER_SCRIPT = `
(function() {
  var SCRIPT_VER = 'v129';
  if (window.__playlistoutFilePickerVer === SCRIPT_VER) return;
  window.__playlistoutFilePickerVer = SCRIPT_VER;

  function ensureUserVariablesStyle() {
    var styleId = 'playlistout-user-variables-style';
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '.panel--user-variables-container .panel--user-variable-item {',
      '  height: auto !important;',
      '  min-height: 48px !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: stretch !important;',
      '  justify-content: flex-start !important;',
      '  padding: 14px 16px 18px 16px !important;',
      '  margin-bottom: 10px !important;',
      '  box-sizing: border-box !important;',
      '  border-bottom: 1px dashed rgba(128, 128, 128, 0.25) !important;',
      '}',
      '.panel--user-variables-container .panel--user-variable-item > span {',
      '  width: 100% !important;',
      '  max-width: 100% !important;',
      '  margin-right: 0 !important;',
      '  margin-bottom: 8px !important;',
      '  white-space: normal !important;',
      '  overflow: visible !important;',
      '  text-overflow: unset !important;',
      '  font-size: 14px !important;',
      '  font-weight: 600 !important;',
      '  line-height: 1.4 !important;',
      '  flex-shrink: 0 !important;',
      '  color: inherit !important;',
      '}',
      '.panel--user-variables-container .panel--user-variable-item > input {',
      '  width: 100% !important;',
      '  box-sizing: border-box !important;',
      '  height: 36px !important;',
      '  line-height: 36px !important;',
      '  padding: 0 10px !important;',
      '  border-radius: 6px !important;',
      '  margin-bottom: 10px !important;',
      '  flex: none !important;',
      '}',
      '.playlistout-var-pills {',
      '  display: flex !important;',
      '  flex-wrap: wrap !important;',
      '  gap: 8px !important;',
      '  width: 100% !important;',
      '  box-sizing: border-box !important;',
      '}',
      '.playlistout-var-pills div[data-val] {',
      '  padding: 6px 12px !important;',
      '  border-radius: 6px !important;',
      '  font-size: 12.5px !important;',
      '  line-height: 1.3 !important;',
      '  cursor: pointer !important;',
      '  user-select: none !important;',
      '  transition: all 0.15s ease !important;',
      '  box-sizing: border-box !important;',
      '}'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(style);
  }

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

      // 修正预输入占位符文字：用中文品牌名「把你的歌单带走」
      var targetPlaceholder = '粘贴歌单链接或分享口令，用「把你的歌单带走」解析';
      if (placeholder !== targetPlaceholder) {
        textInput.setAttribute('placeholder', targetPlaceholder);
      }

      if (modal.querySelector('#playlistout-file-picker-btn')) continue;

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

      // 支持直接把 .json 文件拖拽到弹窗内导入
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

  function injectOptionPillsForItem(itemEl, options, defaultVal) {
    if (!itemEl) return;
    if (itemEl.querySelector('.playlistout-var-pills')) return;
    var inputEl = itemEl.querySelector('input');
    if (!inputEl) return;

    var pillRow = document.createElement('div');
    pillRow.className = 'playlistout-var-pills';

    function refreshActiveState() {
      var cur = (inputEl.value || '').trim() || defaultVal;
      var btns = pillRow.querySelectorAll('div[data-val]');
      for (var j = 0; j < btns.length; j++) {
        var b = btns[j];
        var isHit = b.getAttribute('data-val') === cur;
        b.style.border = isHit ? '1.5px solid #0A95C8' : '1px dashed rgba(128,128,128,0.45)';
        b.style.background = isHit ? 'rgba(10, 149, 200, 0.16)' : 'rgba(128,128,128,0.06)';
        b.style.color = isHit ? '#0A95C8' : 'inherit';
        b.style.fontWeight = isHit ? '600' : '400';
      }
    }

    for (var i = 0; i < options.length; i++) {
      (function(opt) {
        var pill = document.createElement('div');
        pill.setAttribute('role', 'button');
        pill.setAttribute('data-val', opt.value);
        pill.innerText = opt.label;
        pill.onclick = function() {
          setInputValueAndNotify(inputEl, opt.value);
          refreshActiveState();
        };
        pillRow.appendChild(pill);
      })(options[i]);
    }

    inputEl.addEventListener('input', refreshActiveState);
    refreshActiveState();
    itemEl.appendChild(pillRow);
  }

  function enhanceUserVariablesPanel() {
    var containers = document.querySelectorAll('.panel--user-variables-container');
    if (!containers || containers.length === 0) return;

    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      if (container.getAttribute('data-playlistout-panel-done') === 'true') {
        continue;
      }

      var items = container.querySelectorAll('.panel--user-variable-item');
      if (!items || items.length === 0) continue;

      var isOurPanel = false;
      for (var j = 0; j < items.length; j++) {
        var s = items[j].querySelector('span');
        var t = s ? (s.innerText || s.textContent || '') : '';
        if (t.indexOf('无原版音源') !== -1 || t.indexOf('音源路由') !== -1 || t.indexOf('无音源') !== -1) {
          isOurPanel = true;
          break;
        }
      }

      if (!isOurPanel) continue;
      container.setAttribute('data-playlistout-panel-done', 'true');
      ensureUserVariablesStyle();

      for (var k = 0; k < items.length; k++) {
        var itemEl = items[k];
        if (itemEl.getAttribute('data-playlistout-item-done') === 'true') continue;
        itemEl.setAttribute('data-playlistout-item-done', 'true');

        var labelSpan = itemEl.querySelector('span');
        var labelText = labelSpan ? (labelSpan.innerText || labelSpan.textContent || '') : '';
        if (labelText.indexOf('无原版音源') !== -1 || labelText.indexOf('无音源') !== -1) {
          injectOptionPillsForItem(
            itemEl,
            [
              { value: 'strict', label: '🎯 仅播原版 (提示跳过·默认)' },
              { value: 'similar', label: '🔍 允许相似音源 (含翻唱/Live)' },
              { value: 'silent_skip', label: '🔇 仅播原版 (静默跳过)' }
            ],
            'strict'
          );
        } else if (labelText.indexOf('音源路由') !== -1) {
          injectOptionPillsForItem(
            itemEl,
            [
              { value: 'auto', label: '⚡ 自动按原平台 (默认)' },
              { value: 'qq', label: 'QQ音乐 (qq)' },
              { value: 'netease', label: '网易云 (netease)' },
              { value: 'kugou', label: '酷狗音乐 (kugou)' },
              { value: 'kuwo', label: '酷我音乐 (kuwo)' },
              { value: 'qishui', label: '汽水音乐 (qishui)' }
            ],
            'auto'
          );
        }
      }
    }
  }

  var _enhanceTimer = null;
  function triggerEnhanceDebounced() {
    if (_enhanceTimer) return;
    _enhanceTimer = setTimeout(function() {
      _enhanceTimer = null;
      enhancePlaylistOutModal();
      enhanceUserVariablesPanel();
    }, 60);
  }

  triggerEnhanceDebounced();
  var obs = new MutationObserver(triggerEnhanceDebounced);
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
`;

function injectRendererFilePicker() {
  ensureHostModulesAsync()
    .then(({ electron }) => {
      if (!electron) return;

      // 拦截主进程 call-plugin-method：当任何平台的曲目无音源时，根据用户配置的 fallbackMode 执行原版匹配、相似音源匹配或提示跳过
      try {
        const ipcMain = electron.ipcMain;
        const handlers = ipcMain && ipcMain._invokeHandlers;
        const channel = '@shared/plugin-manager/call-plugin-method';
        if (handlers && typeof handlers.get === 'function' && handlers.has(channel)) {
          const origHandler = handlers.get(channel);
          if (typeof origHandler === 'function' && !origHandler.__playlistoutWrapped) {
            const wrapped = async function (event, payload) {
              if (payload && payload.method === 'getMediaSource' && Array.isArray(payload.args)) {
                const item = payload.args[0];
                if (item && item.id) {
                  const title = String(item.title || '').trim();
                  const primaryArtist = String(item.artist || '')
                    .replace(/未知歌手/g, '')
                    .split(/[,，、/]/)[0]
                    .trim();
                  const mode = getUserFallbackMode();
                  const cacheKey = `${item.id}_${title}_${primaryArtist}_${mode}`;
                  const cachedFailAt = _noSourceCache.get(cacheKey);
                  if (cachedFailAt && Date.now() - cachedFailAt < NO_SOURCE_TTL_MS) {
                    return null;
                  }
                }
              }
              const res = await origHandler.call(this, event, payload);
              if (
                payload &&
                payload.method === 'getMediaSource' &&
                payload.platform !== PLUGIN_PLATFORM &&
                (!res || !res.url) &&
                Array.isArray(payload.args) &&
                payload.args[0]
              ) {
                return await getMediaSource(payload.args[0], payload.args[1] || 'standard');
              }
              return res;
            };
            wrapped.__playlistoutWrapped = true;
            handlers.set(channel, wrapped);
          }
        }
      } catch (_) {}

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
 * 获取用户配置的音源路由通道 (targetPlatform)
 */
function getUserTargetPlatform() {
  try {
    const userVars = getRawUserVariables();
    const target = userVars?.targetPlatform;
    if (typeof target === 'string' && target.trim()) {
      return target.trim();
    }
  } catch (_) {}
  return 'auto';
}

/**
 * 获取用户配置的无原版音源处理策略 (fallbackMode):
 * - 'strict' (默认，或 '1' / 留空): 仅播放 100% 原版原唱，无原版时顶部弹窗提示并跳过
 * - 'similar' (或 '2' / '相似' / '翻唱'): 优先播放原版；若无原版，允许寻找最相似音源（如翻唱/Live/同名曲）并弹窗提示
 * - 'silent_skip' (或 '3' / '静默'): 仅播放 100% 原版原唱，无原版时静默跳过（不弹窗打扰）
 */
function getUserFallbackMode() {
  try {
    const userVars = getRawUserVariables();
    const raw = String(userVars?.fallbackMode || '').trim().toLowerCase();
    if (raw === 'similar' || raw === '2' || raw.includes('相似') || raw.includes('翻唱')) {
      return 'similar';
    }
    if (raw === 'silent_skip' || raw === 'silent' || raw === '3' || raw.includes('静默')) {
      return 'silent_skip';
    }
  } catch (_) {}
  return 'strict';
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

  const rawId = String(track?.id ?? item.id ?? '').trim();
  const stripPrefix = (s, prefix) =>
    s.toLowerCase().startsWith(prefix + '_') ? s.slice(prefix.length + 1) : s;

  if (targetPlatform === 'qq' || targetPlatform === '20') {
    const sid = String(
      track?.rawIds?.qq_songmid || track?.songmid || track?.mid || stripPrefix(rawId, 'qq')
    ).trim();
    const mediaMid = String(track?.strMediaMid || track?.mediaMid || sid).trim();
    const vid = String(track?.mvId || track?.vid || '').trim();
    // 当从 IndexedDB 恢复曲目时 track.isVip 为 undefined 且无真实 strMediaMid，
    // 默认置 vip=1 以启用 qq 插件 vipPreRoute 直走 vkeys-legacy 高速通道，避免无意义的官方接口 1000ms 空转
    const vip = track?.isVip !== undefined ? (track.isVip ? 1 : 0) : 1;
    item.songmid = sid;
    item.mid = sid;
    item._src = Object.assign({}, item._src, {
      qq: { mid: sid, mediaMid, vid, vip },
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
      kuwo: { rid: sid, id: sid },
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

  // 7. 识别曲目原平台 (用于内部音源路由与 _src 取链字段封装)
  let rawPlatform = track.platform;
  if (!rawPlatform || rawPlatform === 'PlaylistOut') {
    rawPlatform = defaultPlatform;
  }
  let naturalPlatform = resolveMusicPlatform(rawPlatform);
  if (naturalPlatform === 'PlaylistOut') {
    naturalPlatform = resolveMusicPlatformFromTrackFields(track, { id, title, artwork });
  }

  // 8. 构建 IMusicItem：对外来源 (platform) 始终为本插件品牌名称「把你的歌单带走 (PlaylistOut)」
  const item = {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
    platform: PLUGIN_PLATFORM,
  };
  if (naturalPlatform && naturalPlatform !== 'PlaylistOut') {
    item._originPlatform = naturalPlatform;
  }

  // 9. 注入原生插件所需的 _src / _srcOrder / songmid / hash 等取链字段
  if (naturalPlatform && naturalPlatform !== 'PlaylistOut') {
    attachNativeSourceMetadata(item, track, naturalPlatform);
  }

  return item;
}

/**
 * 从曲目 URL / 封面 / ID 特征推断原始音乐平台
 */
function resolveMusicPlatformFromTrackFields(track, item) {
  const explicitPlat =
    track?._originPlatform ||
    item?._originPlatform ||
    track?.originPlatform ||
    item?.originPlatform;
  if (explicitPlat && !isSelfPlatform(explicitPlat)) {
    return explicitPlat;
  }

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
        let code = fsMod.readFileSync(fullPath, 'utf-8');
        // 跳过自身插件
        if (
          code.includes("platform: 'PlaylistOut'") ||
          code.includes('platform:"PlaylistOut"') ||
          code.includes('把你的歌单带走')
        ) {
          continue;
        }
        // 自动热修补本地 qq / agg 插件中长青通道 ?ID= 大小写错误（该错误会导致服务端无法识别 ID 而恒定返回周杰伦《晴天》测试曲）
        if (code.includes('qq.php?ID=')) {
          code = code.replace(/qq\.php\?ID=/g, 'qq.php?id=');
          try {
            fsMod.writeFileSync(fullPath, code, 'utf-8');
          } catch (_) {}
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
        if (instance && typeof instance.platform === 'string' && !isSelfPlatform(instance.platform)) {
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
 * 拦截第三方音源接口默认回退的假《晴天》测试音频 (M500000bYDlc2XxKLs.mp3 / 0039MnYb0qxYhV)
 */
function isFakeQingtianUrl(url, title) {
  if (!url || typeof url !== 'string') return false;
  const cleanTitle = String(title || '').trim();
  if (cleanTitle.includes('晴天')) return false;
  return url.includes('M500000bYDlc2XxKLs') || url.includes('0039MnYb0qxYhV');
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

  // 1. 版本标签必须 100% 一致（原曲无 Live/DJ/伴奏/翻唱/xx版 时，候选曲目或专辑绝不允许带这些标签）
  const wTags = extractVersionTags(wTitleRaw);
  const cTags = extractVersionTags(`${cTitleRaw} ${cAlbumRaw}`);
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
 * 相似音源匹配（仅当用户在插件设置中主动选择 fallbackMode = 'similar' 时启用）：
 * 允许翻唱、Live、DJ、伴奏或不同歌手演绎的同歌名曲目作为兜底，但核心歌名必须匹配。
 */
function isCandidateSimilarMatched(candidate, wantTitle) {
  if (!candidate || typeof candidate !== 'object') return false;
  const cTitleRaw = String(candidate.title || '').trim();
  const wTitleRaw = String(wantTitle || '').trim();
  if (!cTitleRaw || !wTitleRaw) return false;

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[\s\-_~·•,，.。!！?？:：;；'"“”‘’《》〈〉【】\[\]()（）/\\]/g, '');
  const stripBracket = (s) =>
    String(s || '')
      .replace(/[\(（\[【].*?[\)）\]】]/g, '')
      .trim();

  const cNormBase = norm(stripBracket(cTitleRaw)) || norm(cTitleRaw);
  const wNormBase = norm(stripBracket(wTitleRaw)) || norm(wTitleRaw);
  if (!cNormBase || !wNormBase) return false;

  return (
    cNormBase === wNormBase ||
    (wNormBase.length >= 2 && cNormBase.includes(wNormBase)) ||
    (cNormBase.length >= 2 && wNormBase.includes(cNormBase))
  );
}

/**
 * 在 MusicFree 桌面端顶部渲染醒目且不打断听歌的胶囊提示 (Toast)
 * - kind === 'warn': 暖橙警示（暂无原版音源，已自动跳过）
 * - kind === 'info': 翠绿提示（原平台灰歌/无源，已自动匹配同歌手原曲或相似音源）
 */
async function showPlaybackToast(message, kind = 'warn') {
  try {
    const { electron } = await ensureHostModulesAsync();
    const BrowserWindow = electron?.BrowserWindow;
    if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
    const wins = BrowserWindow.getAllWindows();
    const win = BrowserWindow.getFocusedWindow?.() || wins.find((w) => !w.isDestroyed()) || wins[0];
    if (!win || !win.webContents) return;

    const payload = JSON.stringify({ message: String(message || ''), kind });
    const script = `
      (function(data) {
        try {
          var id = 'playlistout-playback-toast';
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
          requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
          });
          if (window.__playlistoutToastTimer) clearTimeout(window.__playlistoutToastTimer);
          window.__playlistoutToastTimer = setTimeout(function() {
            if (el) {
              el.style.opacity = '0';
              el.style.transform = 'translateX(-50%) translateY(-10px)';
            }
          }, 3600);
        } catch (_) {}
      })(${payload});
    `;
    win.webContents.executeJavaScript(script, true).catch(() => {});
  } catch (_) {}
}

// 负缓存：当某首歌已经走完全部插件确认无原版音源后，缓存 6 秒，
// 防止 MusicFree 宿主对同一首歌连续轮询 low/high/super 4 个音质档位造成卡顿
const _noSourceCache = new Map();
const NO_SOURCE_TTL_MS = 6000;

/**
 * 为历史遗留曲目或无源曲目补齐 _src 并委派给本地已安装的原生插件播放
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

  const title = String(musicItem.title || '').trim();
  const rawArtist = String(musicItem.artist || '')
    .replace(/未知歌手/g, '')
    .trim();
  const primaryArtist = rawArtist.split(/[,，、/]/)[0].trim();
  const songLabel = primaryArtist ? `${title} - ${primaryArtist}` : title || String(musicItem.id);
  const fallbackMode = getUserFallbackMode();

  // 检查 6 秒短期无音源负缓存（避免 MusicFree 同一首歌轮询 4 个音质档位时重复耗时）
  const cacheKey = `${musicItem.id}_${title}_${primaryArtist}_${fallbackMode}`;
  const cachedFailAt = _noSourceCache.get(cacheKey);
  if (cachedFailAt && Date.now() - cachedFailAt < NO_SOURCE_TTL_MS) {
    return null;
  }

  const plugins = await loadInstalledSiblingPlugins();
  if (!plugins || plugins.size === 0) {
    if (fallbackMode !== 'silent_skip') {
      showPlaybackToast(`⚠️ 暂无《${songLabel}》可用音源，请先安装音源插件`, 'warn');
    }
    return null;
  }

  // 1. 推断原平台及用户配置的首选路由通道
  const inferredPlatform = resolveMusicPlatformFromTrackFields(musicItem, musicItem);
  const userTarget = getUserTargetPlatform();
  const prioritizedPlatform =
    userTarget && userTarget.toLowerCase() !== 'auto' && !isSelfPlatform(userTarget)
      ? userTarget.toLowerCase()
      : (inferredPlatform && !isSelfPlatform(inferredPlatform) ? inferredPlatform : null);

  // 优先通过精确 ID / 原生字段从首选平台取链
  if (prioritizedPlatform && plugins.has(prioritizedPlatform)) {
    const targetPlugin = plugins.get(prioritizedPlatform);
    if (targetPlugin && typeof targetPlugin.getMediaSource === 'function') {
      try {
        const cloned = Object.assign({}, musicItem, {
          platform: prioritizedPlatform,
          artist: primaryArtist || musicItem.artist,
        });
        attachNativeSourceMetadata(cloned, musicItem, prioritizedPlatform);
        const res = await targetPlugin.getMediaSource(cloned, quality);
        if (res && res.url && !isFakeQingtianUrl(res.url, title)) {
          return res;
        }
      } catch (_) {}
    }
  }

  // 2. 若首选平台取链失败（如原平台无版权灰歌），跨各大平台优先搜索【100% 同名 + 同歌手 + 同版本】原曲
  if (!title) {
    _noSourceCache.set(cacheKey, Date.now());
    if (fallbackMode !== 'silent_skip') {
      showPlaybackToast(`⚠️ 暂无《${songLabel}》原版音源，已为您自动跳过`, 'warn');
    }
    return null;
  }

  const keyword = primaryArtist ? `${title} ${primaryArtist}` : title;
  const allPlatforms = ['qq', 'netease', 'kugou', 'kuwo', 'qishui', 'migu'];
  const fallbackOrder = [];
  if (userTarget && userTarget.toLowerCase() !== 'auto' && !isSelfPlatform(userTarget)) {
    fallbackOrder.push(userTarget.toLowerCase());
  }
  if (inferredPlatform && !isSelfPlatform(inferredPlatform) && !fallbackOrder.includes(inferredPlatform)) {
    fallbackOrder.push(inferredPlatform);
  }
  for (const plat of allPlatforms) {
    if (!fallbackOrder.includes(plat)) {
      fallbackOrder.push(plat);
    }
  }
  const cachedCandidatesByPlat = new Map();

  for (const plat of fallbackOrder) {
    const p = plugins.get(plat);
    if (!p || typeof p.search !== 'function' || typeof p.getMediaSource !== 'function') continue;
    try {
      const searchRes = await p.search(keyword, 1, 'music');
      const candidates = searchRes?.data;
      if (Array.isArray(candidates) && candidates.length > 0) {
        cachedCandidatesByPlat.set(plat, candidates);
        const matched = candidates.find((c) =>
          isCandidateStrictlyMatched(c, title, rawArtist, musicItem.duration)
        );
        if (!matched) continue;
        const media = await p.getMediaSource(matched, quality);
        if (media && media.url && !isFakeQingtianUrl(media.url, title)) {
          if (fallbackMode !== 'silent_skip') {
            const platLabel = PLATFORM_DISPLAY_NAMES[plat] || plat;
            showPlaybackToast(
              `🔄 原平台无源，已从「${platLabel}」为您匹配同歌手原版《${title}》`,
              'info'
            );
          }
          return media;
        }
      }
    } catch (_) {}
  }

  // 2.5 若用户在设置中开启了 similar（允许寻找最相似音源/翻唱/Live顶替），在无原版时尝试匹配最相似音源并明确提示
  if (fallbackMode === 'similar') {
    for (const plat of fallbackOrder) {
      const p = plugins.get(plat);
      const candidates = cachedCandidatesByPlat.get(plat);
      if (!p || !Array.isArray(candidates) || candidates.length === 0) continue;
      try {
        const simMatched = candidates.find((c) => isCandidateSimilarMatched(c, title));
        if (!simMatched) continue;
        const media = await p.getMediaSource(simMatched, quality);
        if (media && media.url && !isFakeQingtianUrl(media.url, title)) {
          const platLabel = PLATFORM_DISPLAY_NAMES[plat] || plat;
          const simArtist = simMatched.artist ? ` - ${simMatched.artist}` : '';
          showPlaybackToast(
            `💡 暂无原版，已从「${platLabel}」播放最相似音源：《${simMatched.title}${simArtist}》`,
            'info'
          );
          return media;
        }
      } catch (_) {}
    }
  }

  // 3. 没有任何匹配音源时，记录负缓存并根据设置弹出明确提示后跳过
  _noSourceCache.set(cacheKey, Date.now());
  if (fallbackMode !== 'silent_skip') {
    showPlaybackToast(
      `⚠️ 暂无《${songLabel}》原版音源，已自动跳过（可在插件设置切换为相似音源）`,
      'warn'
    );
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
    if (!plugins || plugins.size === 0) return emptyLyric;

    const userTarget = getUserTargetPlatform();
    const inferredPlatform = resolveMusicPlatformFromTrackFields(musicItem, musicItem);
    const candidatePlatforms = [];
    if (userTarget && userTarget.toLowerCase() !== 'auto' && !isSelfPlatform(userTarget)) {
      candidatePlatforms.push(userTarget.toLowerCase());
    }
    if (inferredPlatform && !isSelfPlatform(inferredPlatform) && !candidatePlatforms.includes(inferredPlatform)) {
      candidatePlatforms.push(inferredPlatform);
    }
    const allPlatforms = ['qq', 'netease', 'kugou', 'kuwo', 'migu'];
    for (const p of allPlatforms) {
      if (!candidatePlatforms.includes(p)) candidatePlatforms.push(p);
    }

    for (const plat of candidatePlatforms) {
      if (!plugins.has(plat)) continue;
      const targetPlugin = plugins.get(plat);
      if (!targetPlugin || typeof targetPlugin.getLyric !== 'function') continue;
      try {
        const cloned = Object.assign({}, musicItem, { platform: plat });
        attachNativeSourceMetadata(cloned, musicItem, plat);
        const lrc = await targetPlugin.getLyric(cloned);
        if (lrc && typeof lrc.rawLrc === 'string' && lrc.rawLrc.trim()) {
          return lrc;
        }
      } catch (_) {}
    }
  } catch (_) {}

  return emptyLyric;
}

module.exports = {
  platform: PLUGIN_PLATFORM,
  author: 'LengxiQwQ',
  version: '1.2.9',
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
      key: 'fallbackMode',
      name: '无原版音源时的处理方式',
      hint: 'strict=仅播原版，无源弹窗提示并跳过(默认)；similar=无原版时找最相似音源(含翻唱/Live)播放并提示；silent_skip=仅播原版，静默跳过不弹窗',
    },
    {
      key: 'targetPlatform',
      name: '优先音源路由通道',
      hint: 'auto=自动按歌单原平台路由(网易云->netease, QQ->qq, 酷狗->kugou, 汽水->qishui, 酷我->kuwo); 亦可指定任意音源插件 ID',
    },
  ],
  supportedSearchType: ['sheet'],
  importMusicSheet,
  getMediaSource,
  getLyric,
};
