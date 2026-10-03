# 把你的歌单带走 (PlaylistOut) 官方 MusicFree 插件

> **把你的歌单带走 · Universal Multi-Platform Playlist Parser for MusicFree**  
> 官方单插件安装地址：`https://playlistout.lengxiqwq.com/plugins/musicfree.js`  
> 官方插件订阅源地址：`https://playlistout.lengxiqwq.com/plugins/plugins.json`  
> 官方网站：[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)

`musicfree-plugin-playlistout` 是 PlaylistOut 团队专为 [MusicFree](https://musicfree.upup.fun/) 打造的官方歌单导入与原生音源桥接插件。

PlaylistOut 定位于纯粹的「歌单迁移与导出基础设施」，专注于解决歌单在各大主流平台间的无缝流转与本地化备份。在 **v1.2.6** 版本中，插件全面升级为**接地气中文命名「把你的歌单带走 (PlaylistOut)」 + 原生音源桥接 + 可选音源处理策略 (严格原版/相似音源/静默跳过) + 桌面端可视化设置面板胶囊按钮 + 一键可视浏览选本地 JSON 文件**，将歌单曲目精准路由至用户设备已安装的原生音源插件（网易云、QQ音乐、酷狗、汽水等），绝不错播翻唱/Demo，无源时清晰提示用户并自动跳过！

---

## ✨ 核心特性

1. **🎧 原生音源桥接与智能音源策略 (v1.2.6 重磅升级)**
   - **多档位音源策略可调 (`fallbackMode`)**：
     - **仅播原版，无源提示跳过 (默认)**：跨平台智能寻源时严格核验歌手、歌名与版本标签（Live/Remix/DJ/伴奏），宁缺毋滥，无原版时顶部弹出醒目提示 `⚠️ 暂无《歌名 - 歌手》原版音源，已自动跳过`；
     - **找最相似音源播放**：优先播原版，全网无原版时自动退而求其次寻找最接近的相似音源（如翻唱版、Live版、DJ版），并在顶部弹窗明确提示 `💡 暂无原版，已从「xx」播放最相似音源：《歌名 - 歌手》`；
     - **仅播原版，静默跳过**：无原版时静默跳过，不弹出 Toast 打扰后台挂机听歌。
   - **桌面端可视化设置黑科技**：点击插件齿轮图标进入「配置插件变量」时，自动渲染一键点击的单选胶囊按钮，无需手动输入任何英文字符！
   - **全自动精准分发与 `_src` 元数据注入**：歌单导入时，自动将歌曲映射至用户已安装的原生音源插件并保护 `platform` 不被宿主重置：
     - **网易云**歌单 -> 自动打上 `platform: "netease"`（附带 `_src.netease` 原始 ID，由网易云插件直接加载 VIP/无损音质与歌词）；
     - **QQ 音乐**歌单 -> 自动打上 `platform: "qq"`（附带 `songmid` 与 `_src.qq`，由 QQ 音乐原生插件接管）；
     - **酷狗音乐**歌单 -> 自动打上 `platform: "kugou"`（附带 `_src.kugou.hash`，由酷狗原生插件接管）；
     - **酷我音乐**歌单 -> 自动打上 `platform: "kuwo"`（由酷我原生插件接管）；
     - **汽水音乐**歌单 -> 自动打上 `platform: "qishui"`（附带 `_src.qishui.trackId`，由汽水原生插件接管）；
     - **哔哩哔哩**歌单 -> 自动打上 `platform: "bilibili"`；
     - **咪咕音乐**歌单 -> 自动打上 `platform: "migu"`。
   - **历史已导入歌单无缝兼容**：即使您之前已导入的歌单曲目 `platform` 仍为旧版 `PlaylistOut`，插件也会在播放与歌词加载时自动兼容桥接，无需删歌单重导即可直接播放！

2. **🌐 全平台万能在线解析**
   - 深度支持 **QQ 音乐**、**网易云音乐**、**酷狗音乐**、**汽水音乐 (抖音音乐)**、**B站** 等。
   - 自动清洗分享卡片杂质文本、短链接（`y.qq.com`、`163cn.tv`、`kugou.com`、`qishui` 等）。

3. **📂 本地 JSON 歌单文件一键浏览与官网直达**
   - **并排双按钮交互**：打开 MusicFree 的导入歌单弹窗时，输入框下方会自动出现并排的 **「📂 选择本地 JSON 歌单文件」** 与 **「🌐 去官网解析歌单」** 按钮（同时支持拖拽 `.json` 文件或输入 `1` 唤起系统文件选择器）。
   - 同时兼容直接粘贴本机导出的 `.json` 歌单文件绝对路径（支持带双引号路径如 `"C:\Users\...\歌单.json"` 或 `file:///...`）。
   - 插件通过本地运行时直接读取文件，**零网络请求、零流量消耗、秒级完成千首曲目加载**。

4. **🔥 超大歌单免登录完整解析**
   - 针对网易云等超千首特大歌单，内置深层分页聚合技术，无需配置任何账号 Cookie 即可拉取完整千首歌单。

---

## 📲 安装与更新指南 (MusicFree)

### 方式一：单插件网络链接一键安装（推荐）

1. 打开 **MusicFree** 客户端（Android 或 PC 端）。
2. 点击左侧抽屉菜单中的 **「插件设置 / 插件管理」**（Plugins）。
3. 点击顶部的 **「从网络安装插件」**。
4. 复制并粘贴官方插件地址：
   ```text
   https://playlistout.lengxiqwq.com/plugins/musicfree.js
   ```
5. 点击确认，等待安装完成。安装成功后，插件列表将显示 **把你的歌单带走 (PlaylistOut)** (版本: `1.2.12`)。

### 方式二：通过插件订阅源安装（支持一键检查更新）

在 MusicFree **「插件订阅设置」** 中添加官方订阅源地址：
```text
https://playlistout.lengxiqwq.com/plugins/plugins.json
```

### 历史版本归档链接

如果您的设备或特定场景需要使用旧版本，可随时按需订阅：
- **v1.2.12 (当前推荐，把你的歌单带走 + 三档音源策略 + 桌面端可视化设置 + 酷狗优化)**：`https://playlistout.lengxiqwq.com/plugins/musicfree.js`
- **v1.2.11 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.11.js`
- **v1.2.10 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.10.js`
- **v1.2.9 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.9.js`
- **v1.2.8 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.8.js`
- **v1.2.7 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.7.js`
- **v1.2.6 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.6.js`
- **v1.2.5 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.5.js`
- **v1.2.4 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.4.js`
- **v1.2.3 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.3.js`
- **v1.2.2 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.2.js`
- **v1.2.1 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.1.js`
- **v1.2.0 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.2.0.js`
- **v1.1.0 (历史归档)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.1.0.js`
- **v1.0.0 (历史归档，纯净导入版)**：`https://playlistout.lengxiqwq.com/plugins/musicfree-v1.0.0.js`

---

## ⚙️ 插件自定义设置 (User Variables)

在 MusicFree 的插件设置页面中，点击 **把你的歌单带走 (PlaylistOut)** 插件卡片右侧的齿轮图标：
- **无原版音源时的处理方式 (`fallbackMode`)**：
  - **strict (默认)**：仅播原版，无源提示跳过。
  - **similar**：允许寻找最相似音源（含翻唱/Live）播放并明确提示。
  - **silent_skip**：仅播原版，静默跳过不弹窗。
- **音源路由通道 (`targetPlatform`)**：
  - 默认值：`auto`（自动按歌单原平台路由：网易云->netease，QQ->qq，酷狗->kugou，汽水->qishui，酷我->kuwo 等）。
  - 自定义：可填入您本地最信赖的音源插件平台名（例如输入 `kuwo` 或 `netease`），则导入的所有歌曲均强制由该插件接管播放与检索。
- **酷狗凭证配置 (`kugouToken`, `kugouUserid`)**：
  - 可选：填入从官网登录后复制的 Token，可免本地导出 JSON 直接在客户端内解析完整酷狗歌单。

桌面端点击进入该设置面板时，系统会自动呈现点选胶囊按钮，点击即可直接切换！

## 🎵 使用指南

### 1. 在线导入外部歌单
1. 在各大音乐 App（网易云、QQ音乐、酷狗、汽水）中点击「分享歌单」，复制分享链接。
2. 进入 MusicFree 侧边栏，点击 **「导入外部歌单」**。
3. 选择 **把你的歌单带走** 作为解析插件。
4. 粘贴复制的歌单链接，点击 **「解析/导入」**。
5. 解析完成后勾选想要导入的歌曲，即可生成 MusicFree 本地歌单。

### 2. 本地 JSON 歌单文件路径导入
1. 在 [PlaylistOut 官网](https://playlistout.lengxiqwq.com) 解析歌单并点击 **「导出 JSON」** 保存到本地设备。
2. 进入 MusicFree 侧边栏，点击 **「导入外部歌单」**，选择 **PlaylistOut** 插件。
3. 直接输入本地 `.json` 文件的绝对路径，例如：
   - Windows: `D:\Downloads\my_playlist.json` 或 `file:///D:/Downloads/my_playlist.json`
   - Android/Linux: `/storage/emulated/0/Download/my_playlist.json`
4. 插件将自动读取并秒级呈现歌单内容。

---

## 🛠️ 本地研发与自动化测试

本项目作为 PlaylistOut monorepo 的标准工程化子模块：

### 目录结构
```text
plugins/musicfree/
├── package.json          # 插件元信息与 npm 脚本 (版本 1.2.0)
├── src/
│   └── index.js          # MusicFree CommonJS 规范插件核心源码 (原生音源桥接)
├── dist/
│   ├── musicfree.js      # 最新构建产物 (v1.2.0)
│   ├── musicfree-v1.1.0.js# 历史归档产物
│   └── musicfree-v1.0.0.js# 历史归档产物
├── scripts/
│   └── build.js          # 构建与静态分发同步脚本
├── test/
│   └── test-runner.js    # 自动化测试套件 (E2E + 本地文件路径 + 原生桥接 + userVariables)
└── README.md             # 插件技术与使用文档
```

### 运行自动化测试套件
```bash
# 运行完整的 23 项自动化测试（覆盖元数据契约、平台桥接、userVariables 覆盖、本地文件路径导入、在线真实 E2E 等）
node plugins/musicfree/test/test-runner.js
# 或在 plugins/musicfree 目录下
npm test
```

### 构建与静态分发
```bash
# 执行打包，同步更新 plugins/musicfree/dist 以及 web/public/plugins
npm run build:plugins
```

构建完成后，插件会自动同步至 `web/public/plugins/musicfree.js`，随前端工程部署至 `https://playlistout.lengxiqwq.com/plugins/musicfree.js`。

---

## ❓ 常见问题 (FAQ)

### Q: 为什么导入的网易云歌曲在播放时显示来自「网易云」？
**A**: 这正是 v1.2.0 原生音源桥接的核心优势！PlaylistOut 插件在解析歌单时，完整保留了网易云官方原始歌曲 ID，并自动将平台标识分发给 `netease` 原生插件。播放器会自动调用您已安装的网易云插件进行播放，直接继承您的本地 VIP 账号或原画无损音源。

### Q: 为什么直接粘贴导出的 JSON 字符串会报错？
**A**: 真实的歌单导出 JSON 通常包含数百甚至数千首歌曲，字符长度动辄数万到数十万，直接在输入框粘贴极易造成应用无响应、字符截断或解析失败。为了保证极致的用户体验，插件特别拦截了直接粘贴 JSON 长文本的行为，引导用户使用更加优雅、稳定的**本地文件路径导入**。

### Q: 为什么没有单曲导入功能？
**A**: PlaylistOut 的核心定位是专注的**歌单迁移与聚合基础设施**。单曲无需进行复杂的歌单迁移，用户若需要试听或搜索单曲，直接在 MusicFree 主界面的搜索栏检索即可。

---

## 📄 开源许可证
本项目遵循 [MIT License](../../LICENSE) 开源许可。
