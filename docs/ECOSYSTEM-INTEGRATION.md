# 🎵 PlaylistOut 开源生态接入与第三方播放器集成战略规划 (Ecosystem Integration Plan)

> **文档状态**：规划与实施中 (Active Planning & Execution)  
> **核心目标**：将 PlaylistOut 沉淀的国内主流音乐平台（QQ 音乐、网易云音乐、酷狗音乐、汽水音乐）歌单全量解析能力，以**“插件扩展（即发即用）”**与**“主程序轻量适配 PR（纯本地无依赖）”**双轨模式，全面赋能主流开源音乐播放器生态。

---

## 1. 背景与愿景 (Background & Mission)

### 1.1 现状与用户痛点
开源音乐播放器（如 MusicFree、洛雪音乐 LX Music、BBPlayer、Listen 1 等）凭借清爽无广告、跨平台、支持自定义音源等特性，吸引了大量追求听歌自由的用户。然而，用户从国内商业平台转向开源播放器时，普遍面临严重的**“歌单迁移壁垒”**：
1. **反爬与风控频发**：上游平台接口频繁改动，第三方散装爬虫经常失效（报 403、签名校验失败等）。
2. **截断与深度翻页限制**：未登录状态下，官方接口通常强制截断（如网易云仅返回 10~20 首），导致千首大歌单严重残缺。
3. **平台孤岛化**：汽水音乐等短链平台缺乏通用解析；酷狗音乐非公开歌单缺乏合规的安全授权机制。
4. **私有格式碎片化**：各大开源播放器大多各自定义了一套私有备份 JSON 格式，彼此互不兼容，用户难以在不同工具间流转。

### 1.2 PlaylistOut 的生态定位
PlaylistOut（把你的歌单带走）已建立成熟的**跨平台歌单元数据解析与清洗引擎**：QQ 音乐、网易云音乐与汽水音乐支持免登录公开歌单解析，酷狗音乐免登录提供公开预览、通过可选的临时扫码授权可读取符合条件的完整歌单；大歌单支持有界自动翻页。项目同时提供标准化 JSON、CSV、Excel、M3U8 导出及 Public API。Web 导出字段与兼容性约定统一维护在 [Web 导出格式规范](EXPORT-FORMATS.md)，JSON 的完整数据契约维护在 [JSON Schema](JSON-SCHEMA.md)。

本规划旨在**不重复造轮子**的前提下，作为各大开源播放器的**“外部歌单输入基础设施”**，帮助开源播放器用户一键搬家。

---

## 2. 核心战略：“插件派” vs “主程序派” 双轨制

经过对各大开源项目的架构审视，我们确立了明确的“分类攻坚”战略：

```mermaid
flowchart TD
    A["目标开源播放器生态"] --> B{"是否原生具备插件/扩展机制？"}
    B -- "是 (插件派)" --> C["开发独立插件 / Extension"]
    B -- "否 (主程序派)" --> D["提 Feature Request Issue ➜ 提交极简 PR"]
    
    C --> C1["双入口设计：<br>1. 粘贴链接 ➜ 调 API 秒级解析<br>2. 引导至网页端导出 JSON 离线导入"]
    C --> C2["优势：无需等作者发版，即发即用，掌控主导权"]
    
    D --> D1["主攻方向：<br>在本地导入菜单增加通用 JSON 格式识别"]
    D --> D2["优势：纯前端内存映射，零外部网络依赖，作者无运维负担"]
```

### 2.2 多播放器插件工程目录与分发规范 (Multi-Player Architecture)

插件体系采用**播放器目录隔离 + 插件自描述 + 根层统一发布**。核心原则不是让所有播放器强行使用同一种文件，而是让每个插件声明自己真正需要发布什么。

```text
playlistout/
  ├── plugins/
  │   ├── README.md                    # 通用插件契约
  │   ├── musicfree/
  │   │   ├── plugin.config.json       # ID、展示信息、实际发布产物
  │   │   ├── package.json             # 插件自己的 build / test
  │   │   ├── src/...
  │   │   ├── scripts/...
  │   │   ├── test/...
  │   │   └── dist/                    # 本地生成，不提交 Git
  │   └── <other-player>/
  │       └── ...                       # 可以使用完全不同的 SDK / 文件格式
  │
  ├── scripts/
  │   ├── plugin-utils.js              # 自动发现、校验、依赖安装
  │   ├── build-plugins.js             # 唯一公共发布器
  │   └── test-plugins.js              # 调用各插件自己的测试脚本
  │
  └── web/public/plugins/              # 构建时生成，不提交 Git
      ├── index.json                   # 全生态清单
      ├── musicfree/
      │   ├── <MusicFree 实际入口文件>
      │   └── <MusicFree 专属订阅文件>
      └── <other-player>/
          └── <该播放器实际需要的产物>
```

**关键约束**：

- 每个插件只能构建自己的 `dist/`，不能直接写 `web/public/plugins/`。
- `scripts/build-plugins.js` 是唯一公共发布器，只复制 `plugin.config.json` 明确声明的文件。
- 所有产物严格落在 `/plugins/<player-id>/` 命名空间，插件之间无法覆盖彼此。
- 不再规定所有播放器都必须叫 `把你的歌单带走-PlaylistOut.js`，也不再规定所有播放器都必须有 `plugins.json`；这些属于播放器自身规范。
- 有 npm 依赖的插件使用插件自己的 lockfile，干净 CI 环境会自动执行确定性的 `npm ci`。
- `web/public/plugins/index.json` 自动生成；网页“已支持播放器”卡片直接读取该清单，因此新增一个真实插件不需要再给前端写播放器专属分支。
- “已提案 / 计划中”但还没有插件实现的播放器，才继续保留在前端静态 Roadmap 列表中。

**统一寻址只约束命名空间，不约束文件格式**：

- 插件命名空间：`https://playlistout.lengxiqwq.com/plugins/<player-id>/...`
- 全生态清单：`https://playlistout.lengxiqwq.com/plugins/index.json`
- 具体入口、订阅源或其他资产，以该插件 `plugin.config.json` 声明为准。

发布与 CI 统一执行 `npm run validate:plugins`（先构建/发布，再运行各插件测试），Pages 部署也使用同一条链路，避免本地构建与线上产物漂移。

---

## 3. 目标开源平台深度画像与对症接入方案

### 3.1 第一梯队（核心突破口 ⭐⭐⭐⭐⭐）

#### 1. MusicFree (`maotoumao/MusicFree` / `MusicFreeDesktop`)
- **平台属性**：**插件派（首选主攻）**
- **技术栈**：React Native (移动端) / Electron (桌面端)
- **源码机制深度拆解**：
  - 核心模块 `core/musicSheet` 内部仅处理自身状态持久化。
  - 原生提供标准的插件扩展系统（CommonJS 规范），通过插件暴露 `importMusicSheet(urlLike)` 异步函数实现外部歌单导入，返回结构化 `{ title, id, artwork, musicList: [...] }`。
- **痛点诊断**：社区第三方插件质量良莠不齐，QQ/网易大歌单解析频繁报错截断，汽水音乐完全无插件可用。
- **落地方案**：
  1. **【即发即用】开发独立插件 `musicfree-plugin-playlistout`**：
     - 在插件中调用 `GET https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=<url>`。
     - 一站式支持 QQ音乐、网易云（无损千首）、酷狗、汽水音乐所有链接与短链。
     - 双入口设计：输入框粘贴链接秒级解析；插件提示信息引导访问网页端进行批量备份。
  2. **【主程序增强】提交 Issue / PR**：
     - 建议作者在主程序的“导入本地歌单”功能中，增加对本地标准 JSON 歌单文件的读取支持。

---

#### 2. 洛雪音乐助手 (LX Music) (`lyswhut/lx-music-desktop`)
- **平台属性**：**主程序派（影响力最大，40k+ Stars）**
- **技术栈**：Electron + Vue 3
- **源码机制深度拆解**：
  - 洛雪的“自定义源”机制专用于**搜索和音频流检索**，不负责歌单管理。
  - 歌单管理位于主程序，支持“打开歌单链接”（易受风控）和“我的列表 - 导入列表”（支持 `.json` 备份）。
  - 其私有 JSON 格式具有较强约束（包裹在 `data.userList` 中，曲目字段必须为 `name`, `singer`, `albumName`, `source` 等）。
- **痛点诊断**：用户无法直接导入外部通用的歌单文件；原厂链接经常因平台反爬无法完整加载。
- **落地方案**：
  - **提 Issue ➜ 提交极简 PR（主攻本地文件导入兼容）**：
  - 在洛雪本地读取 JSON 文件的解析函数中增加一个轻量兼容分支：
    若检测到传入数据包含 `tracks` 数组（即标准 PlaylistOut 结构），自动映射为洛雪内部的 `userList` 曲目对象。
  - **原则**：纯客户端本地转换，零网络开销，改动量 < 30 行，保证作者审核无顾虑。

---

#### 3. BBPlayer (B站音乐播放器) (`bbplayer-app/BBPlayer`)
- **平台属性**：**主程序派（最契合的应用场景 ⭐⭐⭐⭐⭐）**
- **技术栈**：React Native (Expo)
- **源码机制深度拆解**：
  - 其核心特色是：**“导入外部歌单 ➜ 自动在 B 站全站检索匹配原唱/翻唱/视频音源播放”**。
  - 目前应用内自行编写了针对网易云和 QQ 音乐的简易爬虫，代码耦合在主程序内。
- **痛点诊断**：自身维护外部音乐平台的爬虫极其吃力，经常失效；且不支持酷狗与汽水音乐。
- **落地方案**：
  - **提 Issue 沟通合作**：
    - 方案 A（首选）：在导入歌单面板增加“选择本地 JSON 文件”入口，读取由 PlaylistOut 导出的标准 JSON。
    - 方案 B（可选）：提供直接调用 PlaylistOut API 解析公共歌单的选项，帮助 BBPlayer 一劳永逸解决上游平台反爬维护难题。

---

### 3.2 第二梯队（重要拓展与生态补充 ⭐⭐⭐）

#### 4. Listen 1 (`listen1/listen1_desktop` / `listen1_chrome_extension`)
- **平台属性**：**主程序派**
- **技术栈**：Vue + Electron / Chrome Extension
- **源码机制深度拆解**：
  - 采用独有的 `listen1_backup.json` 备份字典，必须以 `myplaylist_[UUID]` 作为对象键名。
- **落地方案**：
  - 提交 Issue / PR：在 `import_data` 恢复函数中，若传入格式不是 `myplaylist_` 字典，而是标准 `{ name, tracks }`，自动封装为 Listen 1 内部结构写入本地存储。

---

#### 5. Moosync (`Moosync/Moosync` / 4k+ Stars)
- **平台属性**：**插件派**
- **技术栈**：Electron + TypeScript
- **源码机制深度拆解**：
  - 拥有完善的 Extension SDK（`@moosync/moosync-types`），原生支持监听 `api.on('requestedPlaylistFromURL')` 并调用 `api.addPlaylist()`。
- **落地方案**：
  - 为其编写专门的 Moosync 扩展插件，发布至其扩展中心。

---

### 3.3 观察与跟踪梯队 (Watchlist)

| 平台 | 属性 | 当前现状与策略 |
| :--- | :--- | :--- |
| **Spotube** (`KRTirtho/Spotube`) | 海外 Flutter 播放器 | 严格依附 Spotify 账号体系，目前完全没有本地歌单文件导入功能。Issue 区需求众多，跟踪其架构动向，作为中长期功能提案。 |
| **YesPlayMusic** (`qier222/YesPlayMusic`) | 网易云第三方客户端 | 严格绑定网易云账号体系，无独立本地列表设计，暂不建议强行侵入。 |

---

## 4. 跨平台数据规范与字段映射矩阵 (Field Mapping Matrix)

在编写插件与提交适配 PR 时，统一采用以下轻量字段映射标准：

| PlaylistOut 标准字段 | 含义 | MusicFree 目标字段 | LX Music 目标字段 | Listen 1 目标字段 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 歌曲名称 | `title` | `name` | `title` |
| `artists` | 歌手合并字符串 | `artist` | `singer` | `artist` |
| `album` | 专辑名称 | `album` | `albumName` | `album` |
| `durationMs` | 歌曲时长 (毫秒) | `duration` (秒) | `interval` (分:秒) | `—` |
| `coverUrl` | 封面图地址 | `artwork` | `img` | `img_url` |
| `id` / `sourceUrl` | 原始标识 / 原网页 | `id` | `songmid` / `id` | `id` / `source_url` |

---

## 5. 第三方客户端 / 插件 API 请求归因与遥测标准规范 (Third-Party API Attribution Spec)

任何接入 PlaylistOut 生产 API（`https://playlistout-api.lengxiqwq.com`）的官方插件（如 `musicfree`）或独立生态客户端（如 `bbplayer`），在发起每一次 HTTP 请求（包括 `/api/v1/resolve` 与 `/api/kugou/auth/status`）时，**必须携带标准化的请求头（HTTP Headers）**，以便服务端 Analytics V2 引擎能够准确识别流量来源、终端系统、客户端版本与归属地分布，并避免移动端代理流量被误判为自动化爬虫。

### 5.1 标准请求头一览 (Required HTTP Headers)

| 请求头名称 (Header) | 必填 | 取值规范 / 正则约束 | 示例值 (BBPlayer / MusicFree) | 对应服务端 Analytics V2 维度 |
| :--- | :---: | :--- | :--- | :--- |
| `Accept` | 是 | `application/json, text/plain, */*` | `application/json, text/plain, */*` | 标准内容协商 |
| `User-Agent` | **是** | `PlaylistOut-<ClientName>/<version> (<deviceClass>; <os>)`<br/>必须以 `PlaylistOut-<Name>/` 开头 | `PlaylistOut-BBPlayer/2.7.0 (mobile; android)`<br/>`PlaylistOut-MusicFree/1.3.9 (desktop; windows)` | 解析为 `browser_family = plugin:<id>`（如 `plugin:bbplayer`、`plugin:musicfree`），写入 `analytics_v2_client_env` |
| `X-PlaylistOut-Client-Type` | **是** | `plugin`（推荐标准值，亦兼容 `app`） | `plugin` | 归入 `channel = 'plugin'`，并豁免移动端 VPN/代理触发的云机房 ASN 自动隔离 |
| `X-PlaylistOut-Client-Id` | **是** | 已注册的小写客户端标识 | `bbplayer` / `musicfree` | 归入 `client_id`（覆盖 `daily_core`、`hourly_core`、`geo`、`breakdown`、`client_env` 五大立方体）；未注册 ID 会回退为 `unknown_plugin` |
| `X-PlaylistOut-Client-Version` | **是** | `/^[0-9A-Za-z][0-9A-Za-z._+-]{0,31}$/`（不含空格） | `2.7.0` / `1.3.9` | 写入 `analytics_v2_breakdown` 的 `client_version` 维度 |
| `X-PlaylistOut-Device-Class` | **是** | `mobile` \| `desktop` | `mobile` | 覆盖 `analytics_v2_client_env` 的 `device_class`（解决 React Native / OkHttp 默认 UA 缺少设备标识问题） |
| `X-PlaylistOut-Host` | **是** | `android` \| `ios` \| `windows` \| `macos` \| `linux` \| `unknown` | `android` | 决定 `analytics_v2_client_env` 的 `os_family` 以及 `analytics_v2_breakdown` 的 `host_platform` |

> **可选业务鉴权头（仅酷狗完整歌单解锁时附加）**：
> - `Authorization: Bearer <kugou_token>`
> - `X-Kugou-Token: <kugou_token>`
> - `X-Kugou-Userid: <kugou_userid>`
> 严禁将任何 Token 或用户凭据拼接在 URL Query 参数中（服务端会直接拦截并返回 `400 INVALID_INPUT`）。

---

### 5.2 IP 归属地（国家 / 省份）采集机制说明

- **客户端无需、也不应自行获取或上报任何 IP / 地理位置字段。**
- 当请求到达 Cloudflare 边缘节点时，Worker 会自动从 `request.cf.country`（两位 ISO 国家代码，如 `CN`）和 `request.cf.region`（省份/州名，如 `Guangdong`、`Shanghai`）提取粗粒度归属地。
- 只要客户端正确携带上述 `X-PlaylistOut-Client-Type` 与 `X-PlaylistOut-Client-Id`，服务端就会自动将该次请求的地域归属关联记录到 `analytics_v2_geo` 表的 `(date, channel='plugin', client_id='<id>', platform, country, region, metric)` 中，且**绝不落盘原始 IP 地址**。

---

### 5.3 服务端注册新客户端 Checklist (Server-Side Onboarding)

当有新的第三方播放器或插件接入时，按以下两种方式之一在 `playlistout` 仓库完成注册：

1. **仓内托管插件（位于 `plugins/<player-id>/`）**：
   - 在 `plugins/<player-id>/plugin.config.json` 中声明 `"id": "<player-id>"`。
   - 运行 `npm run build:plugins`，构建脚本会自动将其写入 `worker/src/analytics/generated/registered-plugins.ts`。
2. **独立仓库生态客户端（如 `BBPlayer`）**：
   - 在 `worker/src/analytics/context.ts` 的 `REGISTERED_ECOSYSTEM_CLIENT_IDS` 数组中添加客户端 ID（如 `'bbplayer'`）。
   - 在 `scripts/utils/dashboard.py` 的 `CORE_BRAND_COLORS` 与 `formatHumanLabel` 中添加对应的品牌色与中文展示名称，使本地监控大盘（Dashboard V3）自动渲染专属配色与名称。

---

### 5.4 服务端响应 `meta` 自检契约 (Response Attribution Verification)

接入完成后，客户端可通过检查 `/api/v1/resolve` 响应体顶层的 `meta` 字段，确认服务端是否已正确识别并归因该客户端：

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "server": {
      "service": "playlistout-api",
      "version": "1.3.9"
    },
    "client": {
      "channel": "plugin",
      "id": "bbplayer",
      "version": "2.7.0",
      "deviceClass": "mobile",
      "osFamily": "android",
      "rawHost": "android"
    },
    "hints": ["mobile_client_detected"],
    "parseInfo": {
      "resolvedPlatform": "netease",
      "trackCount": 128,
      "mode": "full",
      "timestamp": 1759860000000
    }
  }
}
```

- 若 `meta.client.channel === "plugin"` 且 `meta.client.id === "<你的客户端ID>"`（而非 `"anonymous_api"` 或 `"unknown_plugin"`），说明归因接入完全成功。

---

### 5.5 标准接入代码模板 (Reference Implementation)

#### 模板 A：React Native / Expo 客户端（以 BBPlayer 为例）

```ts
import * as Application from 'expo-application'
import { Platform } from 'react-native'

const FALLBACK_APP_VERSION = '2.7.0'

export function detectClientEnvironment() {
  const rawOs = String(Platform.OS || '').toLowerCase()
  let os: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown'
  if (rawOs === 'android') os = 'android'
  else if (rawOs === 'ios') os = 'ios'
  else if (rawOs === 'windows') os = 'windows'
  else if (rawOs === 'macos') os = 'macos'

  const deviceClass: 'mobile' | 'desktop' =
    os === 'windows' || os === 'macos' || os === 'linux' ? 'desktop' : 'mobile'

  const rawVer = (Application.nativeApplicationVersion || FALLBACK_APP_VERSION).trim()
  const version = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,31}$/.test(rawVer)
    ? rawVer
    : FALLBACK_APP_VERSION

  return { deviceClass, os, version }
}

export function getPlaylistOutHeaders(): Record<string, string> {
  const envInfo = detectClientEnvironment()
  return {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': `PlaylistOut-BBPlayer/${envInfo.version} (${envInfo.deviceClass}; ${envInfo.os})`,
    'X-PlaylistOut-Client-Type': 'plugin',
    'X-PlaylistOut-Client-Id': 'bbplayer',
    'X-PlaylistOut-Client-Version': envInfo.version,
    'X-PlaylistOut-Device-Class': envInfo.deviceClass,
    'X-PlaylistOut-Host': envInfo.os,
  }
}
```

#### 模板 B：Node / Electron / CommonJS 插件（以 MusicFree 为例）

```js
const PLUGIN_VERSION = '1.3.9';

function detectClientEnvironment() {
  let os = 'unknown';
  let deviceClass = 'mobile';
  try {
    if (typeof process !== 'undefined' && process && process.platform) {
      const p = String(process.platform).toLowerCase();
      if (p === 'win32') { os = 'windows'; deviceClass = 'desktop'; }
      else if (p === 'darwin') { os = 'macos'; deviceClass = 'desktop'; }
      else if (p === 'linux') { os = 'linux'; deviceClass = 'desktop'; }
      else if (p === 'android') { os = 'android'; deviceClass = 'mobile'; }
      else if (p === 'ios') { os = 'ios'; deviceClass = 'mobile'; }
    }
    if (os === 'unknown') {
      os = 'android';
      deviceClass = 'mobile';
    }
  } catch (_) {
    os = 'android';
    deviceClass = 'mobile';
  }
  return { deviceClass, os, version: PLUGIN_VERSION };
}

function getPluginHeaders() {
  const envInfo = detectClientEnvironment();
  return {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': `PlaylistOut-MusicFree/${envInfo.version} (${envInfo.deviceClass}; ${envInfo.os})`,
    'X-PlaylistOut-Client-Type': 'plugin',
    'X-PlaylistOut-Client-Id': 'musicfree',
    'X-PlaylistOut-Client-Version': envInfo.version,
    'X-PlaylistOut-Device-Class': envInfo.deviceClass,
    'X-PlaylistOut-Host': envInfo.os
  };
}
```

---

## 6. 开源合规、隐私安全与免责声明

在与各开源项目作者沟通与提 PR 时，必须严格恪守以下原则：

1. **绝对不碰音源（零侵权风险）**：
   - PlaylistOut 仅解析和传递公开歌单的**文字元数据（歌名、歌手、专辑）**，绝不提取、存储或代理任何未授权音频流文件。
   - 所有播放音源均由目标播放器自身的音源插件或用户自建源完成匹配。
2. **零隐私追踪**：
   - 本地 JSON 文件导入 100% 在用户本地设备运行，无需网络请求。
   - Public API 采用纯无状态设计，绝不存储任何用户歌单与曲目历史。
3. **高可用保障**：
   - 生产 API 全链路部署于 Cloudflare 边缘计算节点，内置单 IP 30次/分钟的防刷限频，免费计划支持每日 100,000 次请求，具备充足的冗余度。

---

## 7. 实施路线图与执行排期 (Action Plan)

- [x] **Phase 1: MusicFree 官方插件研发与交付（已完成）**
  - 在 [`plugins/musicfree`](../plugins/musicfree/README.md) 中完整实现 `musicfree-plugin-playlistout`，通过 12 项全绿自动化测试套件。
  - 聚焦**双核心入口**（云端 API 在线万能解析 + 本地 .json 文件路径直接极速导入），彻底移除单曲冗余逻辑并拦截直接粘贴长文本，专注歌单迁移基础设施。
  - 构建产物同步托管至官方分发节点：`https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js`，国内用户一键极速安装。
- [x] **Phase 2: 洛雪音乐 (LX Music)、BBPlayer 与 Listen 1 官方 Issue 正式发起（已完成）**
  - **洛雪音乐 (LX Music)**: 已提交 [#3001](https://github.com/lyswhut/lx-music-desktop/issues/3001) - 建议在“导入列表”中支持自动兼容通用歌单 JSON 结构（附轻量 PR 方案）。
  - **BBPlayer**: 已提交 [#340](https://github.com/bbplayer-app/BBPlayer/issues/340) 并已在主程序中完成标准化的 PlaylistOut API + 本地/在线 JSON 双通道接入与遥测归因对齐。
  - **Listen 1**: 已提交 [#1413](https://github.com/listen1/listen1_desktop/issues/1413) - 建议在歌单导入/恢复功能中向下兼容通用歌单 JSON 格式（附 PR 意向）。
- [ ] **Phase 3: 静待作者反馈并提交轻量 PR**
  - 根据各平台维护者反馈，提交 20~40 行极简、零侵入的本地 JSON 导入兼容 PR。
- [ ] **Phase 4: Moosync 扩展接入**
  - 为 Moosync 基于官方 Extension SDK 编写并上架导入扩展。
- [ ] **Phase 5: 建立跨生态兼容性持续集成验证**
  - 在 CI 流程中建立对标准 JSON 格式向前兼容的自动化断言，确保导出的 JSON 永远满足生态导入规范。
