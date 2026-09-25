<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="Playlist Out" />

# Playlist Out（把你的歌单带走）

*你的歌单，不应该只困在一个音乐平台里。*

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)

**🌐 [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)**

</div>

<p align="center">
  📖 README Language：<strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

---

## 💡 为什么做 Playlist Out？

我们在各大音乐平台上花了很多时间和心血整理歌单，但往往遇到这样的尴尬：
想换平台听歌时，旧平台的歌单无法直接迁移；想备份自己的心血时，没有一个地方能把歌曲列表以干净的格式导出来；或者只是想把歌曲整理成表格打印、做统计分析，却只能手动一首首复制粘贴。

主流音乐平台的封闭生态把用户的歌单牢牢锁在单一 App 里。

**Playlist Out 的目标很简单：把公开歌单解析成结构化数据，交还到你的手中。**

- **纯客户端导出**：所有导出文件 100% 在用户浏览器本地内存中生成并触发下载，不回传服务器。
- **零门槛与安全授权**：QQ 音乐与网易云音乐公开歌单 100% 免登录直接导出全部歌曲；酷狗音乐支持免登录公开预览，亦可使用手机 App 扫码安全授权解锁完整歌单（授权凭据仅保存在浏览器本地，服务器零存储）。无需安装任何扩展或客户端软件。
- **专注且纯粹**：它不是播放器，不下载音频文件，也不做冗余的云端同步；只专一、稳定、完整地解决“歌单数据导出备份与迁移”这一件事。

---

## 🚀 在线使用

无需安装任何软件，直接打开 **[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)** 即可开始：

1. **粘贴歌单** — 支持 QQ 音乐、网易云音乐、酷狗音乐与汽水音乐等平台链接（网页链接、手机短链、纯歌单 ID 或带有文字的 App 分享内容，系统自动提取）。输入用户主页链接或数字 ID 亦可直接加载该用户的所有公开歌单合集。
2. **实时解析** — 边缘 Worker 自动解析歌单元数据、歌曲名、歌手、专辑、封面以及 VIP/下架可用性状态。
3. **完整预览** — 在导出前直接在网页中核对完整歌曲列表、曲目总数与歌曲状态。
4. **一键导出 / 复制** — 本地保存为 TXT / CSV / Excel (.xlsx) / JSON，或直接一键复制到剪贴板；支持多歌单批量打包为多 Sheet 工作簿或 ZIP 压缩包。

---

## ✨ 主要功能

### 🔗 跨平台公开歌单极速解析与导出
原生支持 **QQ 音乐**、**网易云音乐**、**酷狗音乐** 与 **汽水音乐** 公开歌单：
- **QQ 音乐 / 网易云音乐**：纯网页免登录直解，无需输入 Cookie 或授权 Token，即可一键解析并无损全量导出整张歌单。
- **汽水音乐 (Soda Music)**：免登录直解分享短链与播放列表，完整解析抖音同步收藏与官方原声原唱。
- **酷狗音乐**：受上游 H5 防爬拉活机制限制，未登录状态下网页端仅提供前 10 首歌曲公开预览；支持在网页端一键扫码或在 API 请求头中直接附带 Token 凭证，无限制解锁整张歌单 100% 全量曲目。

#### 📊 平台支持与上游机制限制对照表

| 平台名称 | 平台代号 | 单歌单能力 | 用户主页歌单能力 | 上游机制与限制说明 |
| :--- | :--- | :--- | :--- | :--- |
| **QQ 音乐** | `qqmusic` | 🟢 **免登录全量解析** (无曲目上限) | 🟢 **免登录全量获取** (支持 QQ 号/直链) | 无需任何 Token 或 Cookie，纯网页公开协议直通。 |
| **网易云音乐** | `netease` | 🟢 **免登录全量解析** (智能分页拉取 1000+ 首) | 🟢 **免登录全量获取** (支持 UID/直链) | 解决第三方工具未登录仅截取 10 首的痛点，免登录全量解析。 |
| **汽水音乐** | `qishui` | 🟢 **免登录全量解析** (支持抖音同步原声) | ⚪ *平台暂无公开用户主页* | 无需 Token，完整提取分享短链内全部歌曲。 |
| **酷狗音乐** | `kugou` | 🟡 **免登录仅前 10 首预览**<br/>🟢 **附带 Token 解锁 100% 全量** | 🟡 **必须提供 Token 与 Userid** | **官方机制限制**：酷狗分享页对未登录用户仅在 HTML 嵌入前 10 首，其余强行引导前往 App。若需导出 10 首以上的完整歌单或批量导出用户个人歌单，需附带歌单创建者凭证：<br/>• **网页端**：点击「连接酷狗账号」一键扫码解锁；<br/>• **API 端**：在请求头中附带 `Authorization` 与 `X-Kugou-Userid`。 |


### 📚 用户公开歌单合集与批量打包
输入用户 QQ 号、网易云 UID 或用户主页链接，一键加载该用户公开创建的所有歌单合集。支持多选与全选，可一键批量打包导出为 **多 Sheet Excel 工作簿**（各歌单独占一页）或 **ZIP 压缩包**（内含各歌单独立的 Excel / CSV / TXT / JSON 文件）。

### 🐕 酷狗音乐扫码安全解锁
酷狗官方未登录状态仅提供前部分歌曲公开预览。PlaylistOut 创新支持**酷狗手机 App 扫码安全授权**，零存储无感换取官方临时凭据，无限制解锁完整超长歌单。所有凭证严格保存在用户本地浏览器，绝不上报或存储在服务器端。

### 🏷️ 歌曲 VIP 与可用性状态识别
自动探测并标注歌曲状态：**正常可播**、**下架/无版权变灰**、**VIP 专享**、**付费专辑**等，在网页预览表格与导出的 CSV / Excel / TXT / JSON 文件中清晰呈现，避免导入其他平台时出现“盲盒式失效”。

### 🔍 跨平台纯数字 ID 智能消歧义
当用户直接输入纯数字时，系统并发探测 QQ 音乐与网易云音乐的单歌单及用户主页，自动辨析或弹出手账风格的消歧义选择窗口，供用户精准挑选目标。

### 🎵 大歌单深度翻页支持
彻底打破许多第三方工具“只能抓前 100 首”或“网易云未登录截断 10 首”的限制。PlaylistOut 内置智能分页与分批详情引擎，无缝支持 **1000+ 首**的超大歌单，严格保留原始添加顺序与合法的重复歌曲，绝不静默丢歌或截断。

### 📦 4 种文件格式本地导出
解析出的歌单可直接导出为多种主流格式，满足不同场景需求：
- **TXT** — 简洁易读的纯文本清单，带信纸卡片排版与状态标注，适合快速查看、记事本备份或导入部分小众播放器。
- **CSV** — 国际标准的逗号分隔文本（默认带 UTF-8 BOM，包含 VIP 与状态列，解决 Windows Excel 打开乱码问题）。
- **Excel (.xlsx)** — 原生带样式的电子表格，包含完整元信息卡片、自适应列宽、VIP 与状态标注，适合用 Microsoft Excel、WPS 等软件进行归档、排序与批量整理。
- **JSON** — 结构化完整数据，包含歌曲 ID、歌手、专辑、时长、VIP、可用性状态等丰富元数据，专为开发者与自动化脚本设计。

> 所有文件均由前端直接在浏览器内存中组装并生成下载链接，数据不经过任何第三方服务器中转。

### 📋 3 种剪贴板快速复制
如果不需要下载文件，可直接复制格式化内容：
- **仅歌名**：每行一首歌曲名，干净整洁。
- **歌名 - 歌手**：最通用的文本格式，便于直接粘贴到其他音乐软件的搜索框或导入框。
- **歌名 - 歌手 - 专辑**：完整的制表符分隔格式（TSV），可直接 Ctrl+V 粘贴进任意电子表格。

### 🛡️ 严格安全与防公式注入
导出 CSV / Excel 时，对首字符为 `=`、`+`、`-`、`@` 等特殊符号的内容自动添加安全转义，防止导出的表格在 Microsoft Excel / WPS 打开时触发恶意的公式注入执行（CSV Injection / DDE）。同时，全链路 API 配备速率限制与安全防护标头。

---

## 🌐 Public API v1 (开放接口)

PlaylistOut 正式开放统一的跨平台公共 API，支持第三方开发者、自动化脚本及自建客户端直接调用。

- **生产 API 基础地址**：`https://playlistout-api.lengxiqwq.com`
- **核心万能解析接口**：`GET /api/v1/resolve?q=<用户输入>`
  - 模拟网站大搜索框的完整识别与清洗逻辑（支持 QQ 音乐、网易云音乐、酷狗音乐、汽水音乐四家平台歌单、用户主页、短链与分享文本）。
  - 支持 `&type=auto|playlist|user` 与 `&platform=auto|qqmusic|netease|kugou|qishui` 显式消歧参数。
  - 公开 GET 接口全面开放跨域（`Access-Control-Allow-Origin: *`），支持在浏览器端直接 `fetch` 调用。
- **单歌单稳定接口**：`GET /api/v1/playlist?url=<歌单链接或ID>`
- **用户合集稳定接口**：`GET /api/v1/user/playlists?uid=<UID或QQ号>`
- **酷狗 Token 凭证获取与传递**：
  - **获取方式**：在网页端「连接酷狗账号」弹窗中，支持桌面端**二维码扫码**与手机端**一键跳转酷狗 App 登录**；连接后可直接在弹窗的「开发者 API 凭证」卡片中**一键复制包含凭据的 cURL 命令、Token 与 UserID**。
  - **安全规范**：严格遵循安全规范，**禁止**在 Query 参数中传递凭证（如 `?token=...` 会被直接拦截拒绝），须通过标准 HTTP 请求头传递：
  ```bash
  # 携带 Token 与 Userid 完整拉取酷狗 400+ 首全量歌单
  curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://m.kugou.com/songlist/gcid_xxx/" \
    -H "Authorization: Bearer <kugou_token>" \
    -H "X-Kugou-Userid: <kugou_userid>"
  ```
- **完整接口文档与接入示例（cURL / JavaScript / Python）**：请参阅 [`docs/API.md`](docs/API.md)。

---

## 📋 数据导出格式规范与开放集成

为方便第三方音乐平台、开发者工具及外部自动化流水线无缝接入与识别从 PlaylistOut 导出的歌单，我们正式确立并标准化了以下 4 种文件格式的存储结构与数据规范。

> 💡 **第三方平台接入建议**：推荐优先读取并解析 **JSON 格式**。JSON 格式包含了最完备的元信息字段、精准类型约束以及未转义的原始曲目数据。

---

### 1. JSON 格式 (`.json`) —— 推荐平台接入规范

- **编码标准**：`UTF-8`（无 BOM）
- **MIME 类型**：`application/json`
- **设计目标**：跨平台导入导出、第三方音乐播放器歌单互通、自动化批处理。

#### 根对象字段规范 (Root Schema)

| 字段名 | 类型 | 空值约定 | 字段说明与格式 |
|---|---|---|---|
| `createTime` | `string \| null` | 可选 | **歌单创建时间**（首位字段）。标准时间字符串 `YYYY-MM-DD HH:mm:ss`，若上游平台未提供则返回 `null` |
| `exportedAt` | `string` | 可选 | **数据导出时间**。客户端生成文件的本地时间 `YYYY-MM-DD HH:mm:ss` |
| `generator` | `string` | 可选 | **导出工具平台标识**。固定为 `"PlaylistOut"` |
| `generatorUrl` | `string` | 可选 | **平台官方网址**。固定为 `"https://playlistout.lengxiqwq.com"` |
| `name` | `string` | **必填** | 歌单完整名称 |
| `creator` | `string` | 可选 | 歌单创建者昵称 |
| `updateTime` | `string \| null` | 可选 | 歌单最后修改/更新时间。格式：`YYYY-MM-DD HH:mm:ss` |
| `platform` | `string` | **必填** | 来源平台标识（例如 `"qqmusic"`、`"netease"`、`"kugou"`、`"qishui"`） |
| `id` | `string` | **必填** | 平台原始歌单唯一标识 ID（例如 `"773829104"`） |
| `sourceUrl` | `string` | **必填** | 歌单在来源平台上的网页版直链 URL |
| `trackCount` | `number` | **必填** | 歌单实际包含的曲目条目总数（整型） |
| `loadedTrackCount` | `number` | 可选 | 实际已加载曲目数（整型）。在部分预览或未登录模式下标识当前已解析条数 |
| `isPartial` | `boolean` | 可选 | 是否为部分预览歌单（例如酷狗未登录预览仅展示前部分歌曲时为 true） |
| `totalDuration` | `string \| null` | 可选 | 歌单曲目总时长格式化文本（如 `"3 小时 45 分钟"`），部分预览歌单时为 `null` |
| `totalDurationMs` | `number \| null` | 可选 | 歌单曲目总时长（毫秒，纯数字），部分预览歌单时为 `null` |
| `loadedDuration` | `string \| null` | 可选 | 实际已加载曲目的格式化总时长文本 |
| `loadedDurationMs` | `number \| null` | 可选 | 实际已加载曲目的总时长（毫秒，纯数字） |
| `playCount` | `number \| null` | 可选 | 歌单累计播放量总次数（整型） |
| `tags` | `string[]` | 可选 | 歌单所属风格/分类标签数组（如 `["流行", "轻音乐"]`） |
| `description` | `string` | 可选 | 歌单简介与背景文案描述 |
| `tracks` | `Track[]` | **必填** | 歌曲对象数组，严格按歌单原始顺序排列 |

#### 歌曲对象字段规范 (Track Schema)

| 字段名 | 类型 | 空值约定 | 字段说明与格式 |
|---|---|---|---|
| `index` | `number` | 可选 | 歌曲在歌单中的显示序号（从 1 起始自增） |
| `id` | `string` | 可选 | 来源平台的歌曲唯一 ID / MID（例如 `"0039MnYb0qxYAc"`） |
| `title` | `string` | **必填** | 歌曲标题（保留完整版本名与副标题） |
| `artists` | `string[]` | **必填** | 参与歌手名数组（多位歌手分别作为独立元素，如 `["周杰伦", "阿信"]`） |
| `artistList` | `Array<{id?: string, name: string}>` | 可选 | (*极客增强*) 结构化的歌手对象数组，包含歌手在平台上的唯一 ID，提高匹配准确率 |
| `album` | `string` | **必填** | 收录专辑名称 |
| `albumObj` | `{id?: string, name: string}` | 可选 | (*极客增强*) 结构化的专辑对象，包含专辑唯一 ID |
| `durationMs` | `number` | 可选 | 歌曲音频总时长（毫秒，如 `269000` 表示 4分29秒） |
| `coverUrl` | `string` | 可选 | 单曲或所属专辑的高清封面图片直链 URL |
| `isVip` | `boolean` | 可选 | 是否为 VIP 专享歌曲 |
| `isAvailable` | `boolean` | 可选 | 歌曲在来源平台是否正常可播（下架/无版权变灰时为 `false`） |
| `status` | `string` | 可选 | 歌曲状态枚举：`"playable"` (正常) / `"unplayable"` (下架/无版权) / `"vip"` (VIP专享) / `"paid"` (付费专辑) / `"geo_blocked"` (地区限制) |
| `statusText` | `string` | 可选 | 歌曲状态用户友好文本（如 `"正常"`、`"下架/无版权"`、`"VIP专享"`、`"付费专辑"`） |
| `sourceUrl` | `string` | 可选 | 该歌曲在来源平台上的网页详情直链 URL |
| `isOriginalSound` | `boolean` | 可选 | 是否为平台短视频提取的“原声”音频（如汽水音乐特有属性） |
| `maxQuality` | `string` | 可选 | (*极客增强*) 解析到的歌曲最高可用音质（例如 `"FLAC"`, `"320kbps"`, `"lossless"`），不同平台标准可能不同 |
| `publishTime` | `number` | 可选 | (*极客增强*) 歌曲发布/发行的 Unix 时间戳（秒） |
| `mvId` | `string` | 可选 | (*极客增强*) 关联的音乐视频（MV）的平台唯一 ID |
| `rawIds` | `Record<string, string \| number>` | 可选 | (*极客增强*) 平台提供的所有原始标识字典集合（如 `{ "qq_songid": 1234, "qq_songmid": "..." }`），供自动化脚本提取备用 |

#### 标准 JSON 示例

```json
{
  "createTime": "2021-06-18 14:30:00",
  "exportedAt": "2026-09-14 23:30:00",
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "name": "华语经典流行精选集",
  "creator": "音乐咖啡馆",
  "updateTime": "2024-03-01 09:15:20",
  "platform": "qqmusic",
  "id": "773829104",
  "sourceUrl": "https://y.qq.com/n/ryqq/playlist/773829104",
  "trackCount": 2,
  "loadedTrackCount": 2,
  "isPartial": false,
  "totalDuration": "8 分钟",
  "totalDurationMs": 491000,
  "loadedDuration": "8 分钟",
  "loadedDurationMs": 491000,
  "playCount": 128500,
  "tags": ["流行", "经典", "华语"],
  "description": "收录那些触动心灵的华语旋律，陪你度过安静时光。",
  "tracks": [
    {
      "index": 1,
      "id": "0039MnYb0qxYAc",
      "title": "晴天",
      "artists": ["周杰伦"],
      "artistList": [{"id": "0025NhlN2yWrP4", "name": "周杰伦"}],
      "album": "叶惠美",
      "albumObj": {"id": "000J1p501A7I2d", "name": "叶惠美"},
      "durationMs": 269000,
      "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1p501A7I2d.jpg",
      "isOriginalSound": false,
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc",
      "maxQuality": "FLAC",
      "rawIds": {"qq_songmid": "0039MnYb0qxYAc"}
    },
    {
      "index": 2,
      "id": "0027fM2M3wD4gS",
      "title": "说好不哭",
      "artists": ["周杰伦", "阿信"],
      "artistList": [{"id": "0025NhlN2yWrP4", "name": "周杰伦"}, {"id": "000aHmbL2aPxVD", "name": "阿信"}],
      "album": "说好不哭",
      "albumObj": {"id": "0018P9X93c1OaO", "name": "说好不哭"},
      "durationMs": 222000,
      "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M0000018P9X93c1OaO.jpg",
      "isOriginalSound": false,
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS",
      "maxQuality": "320kbps",
      "mvId": "c0032ccov8g",
      "rawIds": {"qq_songmid": "0027fM2M3wD4gS"}
    }
  ]
}
```

---

### 2. CSV 格式 (`.csv`)

- **文件编码**：`UTF-8 with BOM`（首字节包含 `\uFEFF`，防止 Windows 系统下 Microsoft Excel 打开乱码）
- **行换行符**：`\r\n` (CRLF)
- **纯表格标准输出**：默认遵循标准 RFC 4180 规范输出干净纯表格（9 列数据，包含最右侧的歌曲链接列），不添加额外的注释前缀行，以保证与各类现代表格解析器及音乐迁移工具的最大兼容性；
- **元数据扩展模式**：在高级配置中启用元数据时，文件首部以 `# ` 输出歌单元信息与导出工具平台标识；
- **防公式注入保护**：单元格若以 `=`, `+`, `-`, `@`, `\t`, `\r` 开头，自动添加 `'` 前缀进行安全转义，阻断电子表格宏代码执行风险；
- **字段引用规则**：遵循 RFC 4180 规范，包含逗号或双引号的内容使用双引号包裹，内部双引号使用双重转义 `""`。

#### CSV 文件示例

```csv
序号,歌曲标题,歌手,专辑,时长,类型,VIP,歌曲状态,歌曲链接
1,晴天,周杰伦,叶惠美,04:29,歌曲,—,正常,https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc
2,说好不哭,"周杰伦, 阿信",说好不哭,03:42,歌曲,—,正常,https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS
```

---

### 3. Excel 格式 (`.xlsx`)

- **文件规格**：原生 Microsoft Excel OpenXML 工作簿 (`.xlsx`)
- **工作表名称**：`歌单歌曲`
- **布局结构**：
  1. **元数据卡片区（第 1-6/7 行，双列键值对布局）**：
     - 行 1：`['歌单名称', playlist.name, '', '']`
     - 行 2：`['创建时间', createTime, '导出时间', exportedAt]`（*创建时间第 1 位，导出时间第 2 位并列紧邻*）
     - 行 3：`['导出工具', 'PlaylistOut', '平台网址', 'https://playlistout.lengxiqwq.com']`
     - 行 4：`['歌单作者', creator, '歌曲总数', trackCountStr]`
     - 行 5：`['最后更新', updateTime, '总播放量', playCountStr]`
     - 行 6：`['风格标签', tagsStr, '歌单链接', sourceUrl]`
     - 行 7（可选）：`['歌单简介', description, '', '']`（仅在有简介时生成）
  2. **空行分隔区（第 8 行）**：空白行作为卡片区与数据表格的天然分界线。
  3. **表格列头（第 9 行）**：`序号`、`歌曲标题`、`歌手`、`专辑`、`时长`、`类型`、`VIP`、`歌曲状态`、`歌曲链接`（共 9 列）。
  4. **歌曲数据行（第 10 行起）**：按序填入曲目数据，内置防公式注入防护，并预设自适应列宽（10 / 32 / 22 / 25 / 10 / 12 / 8 / 14 / 45）。

---

### 4. TXT 纯文本格式 (`.txt`)

- **文件编码**：`UTF-8`
- **排版风格**：信纸手账式排版（Stationery Format），兼顾人眼直观阅读与简单脚本行读取；
- **排版结构**：
  - 顶部以 `==================================================` 分界线封装元数据卡片；
  - 头部首行固定为 `创建时间:`，次行固定为 `导出时间:`，第三行为 `导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)`；
  - 依次展示歌单名、作者、最后更新、曲目数与总时长、标签、播放量、链接及歌单简介（部分预览歌单时会清晰注明已解析曲目数及对应时长）；
  - 分界线下方为曲目清单，逐行输出：`${歌曲标题} - ${歌手} - ${专辑}`（若无专辑则输出 `${歌曲标题} - ${歌手}`）；
  - 若歌曲为下架、VIP、付费等非默认状态，行末自动附带状态标签（如 `[下架/无版权]`、`[VIP专享]`）；
  - 保留纯净原始文本，不添加表格转义符号。

#### TXT 文件示例

```text
==================================================
  创建时间: 2021-06-18 14:30:00
  导出时间: 2026-09-14 23:30:00
  导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)
  歌单名称: 华语经典流行精选集
  歌单作者: 音乐咖啡馆
  最后更新: 2024-03-01 09:15:20
  歌曲总数: 2 首 (总时长 8 分钟)
  风格标签: 流行 · 经典 · 华语
  总播放量: 128,500 次
  歌单链接: https://y.qq.com/n/ryqq/playlist/773829104
--------------------------------------------------
  歌单简介:
  收录那些触动心灵的华语旋律，陪你度过安静时光。
==================================================

晴天 - 周杰伦 - 叶惠美
说好不哭 - 周杰伦, 阿信 - 说好不哭
```

---

## 🎧 支持平台

| 平台 | 网页版支持 | 备注 |
|---|---|---|
| **QQ 音乐** | ✅ 已支持 | 歌单分享链接 / ID / App 分享文本 / QQ 号公开自建歌单批量导出（免登录） |
| **网易云音乐** | ✅ 已支持 | 歌单链接 / 短链 / 纯 ID / 用户 UID 公开自建歌单批量 / VIP与版权状态识别（免登录） |
| **酷狗音乐** | ✅ 已支持 | 网页及 App 分享链接 / 纯 ID（免登录支持公开前排预览；完整全量歌单需手机 App 扫码授权） |
| 酷我音乐 | 计划中 | 路线图规划中 |
| 咪咕音乐 | 计划中 | 路线图规划中 |
| 汽水音乐 | 计划中 | 路线图规划中 |

每个音乐平台都作为独立的 Provider 模块接入，前端始终保持统一的数据结构与导出体验。

---

## 🔒 隐私与数据

PlaylistOut 坚持极简与透明的隐私承诺：

- **无网站账号体系**：PlaylistOut 本身不设任何注册、登录或账户系统。QQ 音乐与网易云音乐解析完全免登录；使用酷狗音乐扫码解锁完整歌单时，换取的官方临时 Token 仅严格保存在用户本地浏览器 LocalStorage 中，绝不上报或留存在任何服务器数据库。
- **无状态边缘代理**：歌曲列表仅在请求时由边缘 Cloudflare Worker 代理抓取并实时返回前端，服务器不设歌单数据库，不留存歌曲条目。
- **全本地导出**：TXT、CSV、XLSX 和 JSON 文件全部在用户本地浏览器生成，文件内容绝不上传到服务器。
- **匿名聚合指标**：仅在 Cloudflare D1 中记录匿名聚合计数（如请求成功/失败数、导出格式分布），用于服务健康监控与容量评估，绝不记录用户 IP、歌单 URL 或具体曲目。
- **完整性熔断原则**：向上游抓取歌单时，若遇到数据残缺或网络异常，系统会直接报错提示，绝不为了“伪装成功”而生成缺斤少两的残缺导出。

---

## ⌨️ 命令行工具 (CLI)

除了网页版外，仓库在 `cli/` 目录下还提供了独立的 Python 命令行脚本，适合开发者进行定时备份、自动化流水线或脚本集成：
- **支持平台**：现已支持 **QQ 音乐** (`cli/qqmusic/`) 与 **网易云音乐** (`cli/netease/`)。
- **核心能力**：支持单歌单链接/ID 快速导出，以及通过 QQ 号或网易云 UID 批量导出名下所有公开自建歌单；网易云 CLI 独家支持歌曲可用性与 VIP 状态识别。

进入对应目录安装依赖即可运行（更详尽的说明请查阅各目录下的 `README.md`）：

```bash
# QQ 音乐 CLI
cd cli/qqmusic && pip install -r requirements.txt && python qq_music_playlist_export.py

# 网易云音乐 CLI
cd cli/netease && pip install -r requirements.txt && python netease_playlist_export.py
```

---

## 💻 开发者

PlaylistOut 是一个轻量级 Monorepo 仓库：

| 模块 | 说明 |
|---|---|
| `web/` | 前端应用，基于 React 18 + TypeScript + Vite |
| `worker/` | 边缘 API 服务，基于 Cloudflare Workers + TypeScript + D1 |
| `cli/qqmusic/` | 原始 Python QQ 音乐 CLI 工具 |
| `cli/netease/` | 独立 Python 网易云音乐 CLI 工具 |
| `docs/` | 项目路线图、架构规范、API 文档与运维手册 |

### 本地运行

```bash
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout
npm install
npm run dev
```

### 质量检查与构建

```bash
# TypeScript 类型检查
npm run typecheck

# 单元测试与组件测试（Web & Worker）
npm run test

# 验证真实公开歌单解析与翻页（QQ 音乐 / 网易云 / 酷狗）
npm --prefix worker run test:live

# 全栈生产构建
npm run build
```

---

## 📚 文档

- [`ROADMAP.md`](./docs/ROADMAP.md) — 路线图与后续支持计划
- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md) — 产品定位、架构约束与安全边界
- [`API.md`](./docs/API.md) — 边缘 API 接口规范与错误码约定
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md) — 生产环境配置与运维手册
- [`CHANGELOG.md`](./CHANGELOG.md) — 版本变更历史

---

## 🤝 Contributing

欢迎提交 Issue 与 Pull Request！

在添加新的音乐平台 Provider 时，请确保将平台专有解析逻辑封装在独立 Provider 模块内，并转换为通用的标准化歌单数据模型，以确保全平台导出与复制功能的一致性。

---

## 📄 License

PlaylistOut 基于 **MIT License** 开源。详情参见 [LICENSE](./LICENSE)。

---

<!-- WEBSITE_STATS:START -->
### 🌐 网站运营与活跃数据看板

> 📊 数据由 [Cloudflare D1 边缘节点](https://playlistout-api.lengxiqwq.com/api/stats) 实时聚合计算，每日自动化同步存档。

#### 📌 核心流量与使用规模

> 💡 👥 累计日独立访问 = 每天匿名去重后的访客数累加；同一访客跨日可能再次计入，PlaylistOut 不进行跨日追踪。

| 👥 累计日独立访问 | 📄 页面浏览 (PV) | 🎵 解析歌单数 | 💿 处理歌曲数 | 📦 文件导出数 | ⏱️ 稳定运行 |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **144**<br><sub>今日独立 +2</sub> | **342**<br><sub>今日 +2</sub> | **335**<br><sub>今日 +7</sub> | **59,177**<br><sub>今日 +511</sub> | **78**<br><sub>今日 +1</sub> | **14 天**<br><sub>上线于 2026-09-12</sub> |

#### 📊 业务转化与平台偏好
- **🎵 平台解析份额：** QQ 音乐 **70%** (234 次) ｜ 网易云音乐 **15%** (51 次) ｜ 酷狗音乐 **13%** (43 次) ｜ 汽水音乐 **2%** (7 次)
- **📦 导出格式偏好：** Excel 表格 (.xlsx) **42%** ｜ TXT 纯文本 **19%** ｜ CSV 表格 **17%** ｜ JSON 数据 **22%**

> 🛡️ **隐私保证**：本统计严格遵循开源宪法规范，所有数据均由边缘节点以粗粒度匿名原子计数存储，**绝不记录真实 IP 地址、私密歌单内容或个人身份凭据**。
<!-- WEBSITE_STATS:END -->

---

## ⭐ Star 历史

<a href="https://www.star-history.com/?repos=LengxiQwQ%2Fplaylistout&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&theme=dark&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
 </picture>
</a>

<!-- INSIGHTS:START -->
**📊 仓库流量**

访问次数：**587** ｜ 不重复访客：**141**（近 14 天） ｜ 仓库克隆：**2,202** ｜ 不重复克隆：**414**（近 14 天）

**热门来源（近 14 天）：** github.com · Google · Bing · Baidu · open.cd · Yahoo  
**热门内容（近 14 天）：** LengxiQwQ/qqmusic-playlist-exporter · releases · LengxiQwQ/music-playlist-exporter · commits/main

> 数据开始：2026-09-07 · 最后更新：2026-09-25
<!-- INSIGHTS:END -->

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a></sub>
</p>