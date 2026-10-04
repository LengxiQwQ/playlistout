# 把你的歌单带走 (PlaylistOut) — MusicFree 插件使用手册

> **一键跨平台歌单导入与原生音源桥接插件（电脑版 & 手机版通用）**  
> 官方网站：[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)

「把你的歌单带走」是专为 [MusicFree](https://musicfree.upup.fun/) 打造的歌单解析与导入插件。
**一个插件，全端通用**：自动识别电脑端 (Electron) 与手机端 (Android / React Native / Hermes)，根据运行环境智能切换驱动模式：
- **电脑端**：支持一键浏览选文件弹窗、拖拽 `.json`、本地路径导入，配合桌面 Toast 与同级音源插件桥接；
- **手机端**：支持全平台在线链接一键解析，导入曲目自动分流映射至手机上已安装的原生音源插件（网易云、QQ音乐、酷狗、汽水等）。酷狗歌单可在设置中填入 Token，直接粘贴链接全量解析！

---

## 📌 支持平台

| 平台 | 在线链接解析 | 本地 JSON 导入 (PC) | 特别说明 |
| :--- | :---: | :---: | :--- |
| **QQ 音乐** | ✅ | ✅ | 支持公开歌单链接，手机端自动映射为 `qq` 插件 |
| **网易云音乐** | ✅ | ✅ | 支持千首大歌单免登录完整解析，手机端自动映射为 `netease` 插件 |
| **汽水音乐** | ✅ | ✅ | 支持分享链接自动识别与解析，手机端自动映射为 `qishui` 插件 |
| **酷狗音乐** | ⚠️ 前10首 (填Token全量) | ✅ 推荐 | 免登录受官方限制仅解析前 10 首；推荐电脑端导入官网导出的 JSON，或在设置填入 Token 直接全量解析 |

---

## 📥 安装指南（电脑版 & 手机版）

1. 打开 **MusicFree**（电脑端或手机端均可），进入 **「插件设置」**。
2. 点击 **「从网络安装插件」**（或右下角加号）。
3. 复制并粘贴以下插件官方地址，点击确认安装：
   ```text
   https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js
   ```

---

## 📖 使用教程

### 1. 在线歌单链接导入（电脑端 & 手机端通用）

1. 在音乐 App（QQ音乐、网易云、汽水、酷狗等）中复制**歌单分享链接**。
2. 进入 MusicFree 侧边栏，点击 **「导入外部歌单」**。
3. 导入插件选择 **「把你的歌单带走」**。
4. 粘贴歌单链接，点击 **「确认/解析」**。
5. 解析完成后勾选歌曲，即可生成播放歌单。

### 2. 本地 JSON 歌单文件导入（电脑端专属，解决酷狗限制）

1. 前往 [PlaylistOut 官网](https://playlistout.lengxiqwq.com)，登录并解析歌单。
2. 点击 **「导出 JSON」** 保存歌单文件到本地。
3. 打开电脑端 MusicFree 的 **「导入外部歌单」** 弹窗，选择「把你的歌单带走」：
   - 点击输入框下方的 **「📂 选择本地 JSON」** 按钮选取文件，或直接将 `.json` 文件拖入弹窗；亦可直接输入本地文件路径（如 `D:\my_playlist.json`）。
4. 导入完成后秒级呈现全部歌曲（纯离线解析，不受字符长度限制，零流量消耗）。

> 💡 **为什么手机端不推荐直接粘贴 JSON 文本？**  
> 移动端（Android / React Native）输入框与系统剪贴板对长文本存在约 1000~2000 字的强制截断限制。真实的大歌单 JSON 数据通常包含数万字符，粘贴后末尾会被硬生生截断导致 JSON 语法损坏。因此手机端推荐直接粘贴在线链接；若需导入受限的酷狗歌单，建议在设置中填入官网获取的「酷狗 Token」，直接粘贴链接全量拉取。

---

## ⚙️ 插件设置说明

在 MusicFree 的「插件设置」中，点击本插件右侧的**齿轮图标**即可个性化配置：

| 设置项 | 变量名 | 默认值 | 作用与说明 |
| :--- | :--- | :--- | :--- |
| **换源策略** | `fallbackMode` | `strict` | • `strict` (默认)：仅播放原版，跨平台寻源找不到原唱原版时提示并自动跳过<br>• `similar`：无原版时允许播放最相似的音源（翻唱/Live/伴奏）并明确提示<br>• `silent_skip`：仅播原版，无源时静默跳过不弹窗提示 |
| **音源通道** | `targetPlatform` | `auto` | • `auto` (默认)：按歌单来源自动匹配对应插件（网易云->netease，QQ->qq等）<br>• 指定平台：可输入 `qq`、`netease`、`kuwo` 等，强制所有歌曲由此插件接管播放 |
| **酷狗 Token** | `kugouToken` | *(留空)* | *(可选)* 填入官网登录后复制的 Token，可免本地导出 JSON 直接在客户端内解析完整酷狗歌单 |
| **酷狗 UserID** | `kugouUserid` | *(留空)* | *(可选)* 酷狗用户 ID（若在 Token 中已包含 `token:userid` 则无需填写） |

---

## ❓ 常见问题 (FAQ)

**Q：导入后歌曲能正常播放和加载歌词吗？**  
A：可以。本插件负责解析歌单结构并将曲目关联至对应平台的原生插件。播放与歌词依赖您本地已安装的原生音源插件（如网易云、QQ音乐等），请确保已安装对应的音源插件。

**Q：酷狗音乐为什么在客户端内只解析出前 10 首？**  
A：酷狗官方对未登录接口有严格限制。最推荐的做法是前往 [PlaylistOut 官网](https://playlistout.lengxiqwq.com) 登录解析并导出 JSON 文件导入；也可以在插件设置中填入官网复制的酷狗 Token。

**Q：遇到链接解析失败或网络超时怎么办？**  
A：部分音乐平台会动态调整接口或增加风控。如遇解析失败，请前往官网尝试解析，或在 GitHub 提交 Issue 反馈。

---

## 💻 技术架构与实现原理（开发者参考）

本插件遵循 MusicFree 插件开发标准，针对歌单迁移场景进行了多项底层优化与架构设计：

### 1. 原生音源委托机制 (Native Platform Delegation)
- **定位分离**：PlaylistOut 专注于歌单结构解析与元数据标准化，**不提供或硬编码任何盗版音频直链**。
- **元数据注入**：在 `importMusicSheet` 解析歌曲时，自动识别源平台并在导出的 `IMusicItem` 中注入 `_originPlatform` 与精准的原生标识（如 QQ 音乐 `songmid`、网易云音乐 `track.id`、酷狗音乐 `hash` 等）。
- **动态桥接**：在 `getMediaSource` 与 `getLyric` 中，插件会动态加载设备上已安装的同级原生插件（如 `qq`、`netease`、`kugou`、`kuwo` 等），按原平台将曲目无缝委托给对应原生插件播放，直接复用原生插件的高品质音源与逐字歌词。
- **宿主属性保护**：通过属性拦截保护曲目的 `platform` 属性，避免被 MusicFree 宿主内置的 `resetMediaItem` 重置为当前插件名导致换源失效。

### 2. 沙箱穿透与桌面端 UI 增强 (Host Bridge)
- **环境适配**：MusicFree 桌面端（Electron 环境）将插件运行于隔离沙箱中，常规 `require('fs')` 会返回 `null` 且 `process.mainModule` 为 `undefined`。
- **底层穿透**：插件利用原生 ESM dynamic `import('module')` 拿到 Node 底层 `Module._load`，安全按需加载真实的 `fs`、`path` 与 `electron` 模块。
- **桌面端交互增强**：
  - 支持直接唤起操作系统原生文件选择器，秒级导入本地 `.json` 歌单文件；
  - 自动向主窗口 WebContents 注入轻量交互脚本，在导入弹窗中添加「📂 选择本地 JSON」与「🌐 去官网解析」虚线按钮，并支持直接拖拽 `.json` 文件导入；
  - 在客户端顶部提供轻量状态通知（Toast），遇到受限或无源情况时友好引导。

### 3. 双端运行环境分支与分流 (Dual-Mode Adaptation)
- **环境嗅探**：通过 `isHostElectron()` 动态检测运行环境。在电脑端为 Electron 环境，具备 Node.js 宿主集成；在手机端（Android）为 React Native / Hermes 隔离沙箱环境。
- **手机端分流**：由于移动端无法跨沙箱读写文件系统，导入歌单时 `platform` 属性直接分流赋值为目标平台原生标识（如 `netease`, `qq`, `kugou`, `qishui` 等），并注入 `_src` 完整凭证。当用户在手机端点击播放或加载歌词时，MusicFree 手机端原生调度器将直接唤醒已安装的原生插件，完美实现跨端零开销播放与歌词显示！
- **电脑端桥接**：电脑端曲目 `platform` 保持为「把你的歌单带走」，在播放与歌词阶段通过 Sibling Bridge 动态反射加载本地已安装的原生插件，并展示精美桌面 Toast。

### 4. Android Hermes 引擎语法兼容
- Android 版 MusicFree 运行在 Hermes JavaScript 引擎上，部分历史 Hermes 版本对 ES2020+ 的 `?.` (可选链)、`??` (空值合并运算符) 以及 `async () =>` (异步箭头函数) 存在严格语法限制。
- 本插件经全面重构，保证全量代码 100% 遵循 Hermes 兼容的 ES6 标准语法，消除任何潜在移动端 `SyntaxError: Unexpected token`。

---

## 📄 开源与协议

- 官方网站：[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)
- 开源协议：[MIT License](../../LICENSE)

