# PlaylistOut JSON 数据格式规范 (Canonical Schema Document)

本文档详细描述了 PlaylistOut 统一歌单与歌曲 JSON 数据规范（Canonical Playlist & Track Schema），用于指导第三方开发者、音乐迁移工具、播放器插件进行标准化解析与接入。其他导出格式（CSV、XLSX、M3U8、TXT）的结构与兼容性约定见 [Web 导出格式规范](EXPORT-FORMATS.md)。

---

### 1. 规范设计哲学与原则

PlaylistOut 的核心使命是**“采集和交换通用歌单数据”**，而不是完整复制各家流媒体平台的内部私有数据库。新版规范贯彻以下原则：

1. **单一概念单一表达**：同一概念在一首歌曲中只允许出现一次。彻底淘汰历史上的同义字段与双写（如 `artist` + `artists` + `artistList`、`album` + `albumObj` 等）。
2. **结构平铺与通用性**：以简单、平铺、可跨平台交换的通用字段为主，不为某个平台私有结构引入冗余嵌套。
3. **真实可靠与零虚构**：仅保存能从来源平台可靠获得的通用信息。拿不到的可选字段直接省略（不输出键），**严禁填充 `null`、空字符串 `""`、伪造值或推测值**，严禁为了非核心字段增加大量昂贵的逐曲请求。有效布尔值（如 `isOriginalSound: false`、`isVip: false`）正常保留。
4. **单写宽容读（Asymmetric Compatibility）**：
   - **Writer（输出端）**：严格且仅输出新规范，不再双写旧字段。
   - **Reader（读取端，如播放器导入插件）**：在新规范基础上宽容向下兼容历史字段（如 `artists` 数组、`albumObj`、`publishTime` 等）。

---

### 2. 根对象字段规范 (Root Playlist Schema)

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `name` | `string` | **必填**。歌单完整名称 |
| `creator` | `string` | 可选。歌单创建者昵称 |
| `coverUrl` | `string` | 可选。歌单封面高清图片直链 URL |
| `platform` | `string` | **必填**。来源平台标识（`"qqmusic"` \| `"netease"` \| `"kugou"` \| `"qishui"`） |
| `id` | `string` | **必填**。来源平台歌单唯一标识 |
| `sourceUrl` | `string` | **必填**。歌单在来源平台的网页直链 URL |
| `trackCount` | `number` | **必填**。歌单包含的曲目条目总数（整型） |
| `loadedTrackCount` | `number` | 可选。实际已加载曲目数。在部分预览或未登录模式下标识当前条数 |
| `isPartial` | `boolean` | 可选。是否为部分预览歌单（例如酷狗未登录受限模式） |
| `createTime` | `string` | 可选。歌单创建时间，标准格式 `YYYY-MM-DD HH:mm:ss`（或 ISO-8601） |
| `updateTime` | `string` | 可选。歌单最后更新时间，标准格式 `YYYY-MM-DD HH:mm:ss` |
| `totalDuration` | `string` | 可选。歌单曲目总时长格式化文本（如 `"3 小时 45 分钟"`） |
| `totalDurationMs` | `number` | 可选。歌单曲目总时长（毫秒整数） |
| `loadedDuration` | `string` | 可选。实际已加载曲目的格式化总时长文本 |
| `loadedDurationMs` | `number` | 可选。实际已加载曲目的总时长（毫秒整数） |
| `playCount` | `number` | 可选。歌单累计播放量总次数（整型） |
| `tags` | `string[]` | 可选。歌单风格/分类标签数组（如 `["流行", "经典"]`） |
| `description` | `string` | 可选。歌单简介与背景文案描述 |
| `tracks` | `Track[]` | **必填**。歌曲对象数组，严格按歌单原始顺序排列 |
| `exportedAt` | `string` | 可选。数据导出时间（客户端/服务端生成时间） |
| `generator` | `string` | 可选。导出工具标识，固定为 `"Playlist Out"` |
| `generatorUrl` | `string` | 可选。平台官方网址，固定为 `"https://playlistout.lengxiqwq.com"` |

---

### 3. 标准歌曲对象规范 (Canonical Track Schema)

标准歌曲对象输出时按照以下推荐键顺序排列，确保数据稳定、整洁：
`index → title → artist → album → id → isrc → durationMs → releaseDate → trackNumber → discNumber → sourceUrl → playbackUrl → coverUrl → isOriginalSound → isVip → isAvailable → status → statusText → maxQuality → mvId → mvUrl`

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `index` | `number` | **必填**。歌曲在歌单中的显示序号，从 1 起始自增 |
| `title` | `string` | **必填**。歌曲标题，必须来自真实上游，不允许猜测 |
| `artist` | `string` | **必填**。唯一的歌手字段（字符串）。多位歌手统一使用 `, ` 连接（如 `"周杰伦, 阿信"`）。**不得再输出 `artists`、`artistList`、`author` 等同义字段** |
| `album` | `string` | 可选。专辑名称（纯字符串）。若来源平台无可靠专辑信息（如短视频原声），直接省略，不写空字符串，不伪造“未知专辑”。**不再保留 `albumObj`** |
| `id` | `string` | 可选。来源平台主要 ID（QQ 优先 song MID，网易为歌曲 ID，酷狗为主 Hash，汽水为曲目 ID） |
| `isrc` | `string` | 可选。国际标准录音制品编码（ISRC）。仅当上游原始响应中可靠存在时输出，不额外网络请求。**取代旧版 `rawIds.isrc`** |
| `durationMs` | `number` | 可选。歌曲时长，统一使用毫秒整数（如 `269000` 表示 4 分 29 秒） |
| `releaseDate` | `string` | 可选。歌曲发行日期，推荐格式 `YYYY-MM-DD`。**取代旧版 `publishTime`** |
| `trackNumber` | `number` | 可选。歌曲在原专辑中的曲目编号（正整数） |
| `discNumber` | `number` | 可选。多碟专辑时所属碟号（正整数） |
| `sourceUrl` | `string` | 可选。来源平台歌曲详情页面直链（去来源平台查看该曲） |
| `playbackUrl` | `string` | 可选。**预留字段**。直链音频播放资源。PlaylistOut 坚持不做音频提取与盗链代理，目前正常导出中省略该字段 |
| `coverUrl` | `string` | 可选。歌曲/专辑高清封面图片直链 URL |
| `isOriginalSound` | `boolean` | 可选。是否为抖音/汽水视频原声音频 |
| `isVip` | `boolean` | 可选。是否为 VIP 专享歌曲 |
| `isAvailable` | `boolean` | 可选。来源平台是否正常可播（下架/无版权时为 `false`） |
| `status` | `string` | 可选。机器标准枚举：`"playable"` \| `"unplayable"` \| `"vip"` \| `"paid"` \| `"geo_blocked"` |
| `statusText` | `string` | 可选。用户友好展示文本（如 `"正常"`、`"下架/无版权"`、`"VIP专享"`、`"付费专辑"`） |
| `maxQuality` | `string` | 可选。平台最高可用音质档位（如 `"FLAC"`、`"320kbps"`、`"lossless"`） |
| `mvId` | `string` | 可选。官方 MV 平台唯一 ID |
| `mvUrl` | `string` | 可选。官方 MV 详情页直链（非视频直链） |

---

### 4. 淘汰字段与升级对照表

| 旧版字段 | 新版 Canonical 状态 | 迁移方式 / 说明 |
|---|---|---|
| `artists` (`string[]`) | **彻底删除** | 统一为单字符串 `artist`，多歌手使用 `, ` 连接 |
| `artistList` (`object[]`) | **彻底删除** | 结构化 ID 不再污染通用 Schema |
| `albumObj` (`object`) | **彻底删除** | 统一使用纯字符串 `album` |
| `publishTime` (`number`) | **彻底删除** | 如来源可靠，统一格式化为 `releaseDate` (`YYYY-MM-DD`) |
| `rawIds` (`object`) | **从公开 JSON 移除** | 内部调试字典不再暴露到公开规范，重要 ID 提升为根/一级字段 (`id`, `isrc`) |

---

### 5. 标准 JSON 示例

```json
{
  "name": "华语流行经典精选",
  "creator": "音乐咖啡馆",
  "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1p501A7I2d.jpg",
  "platform": "qqmusic",
  "id": "773829104",
  "sourceUrl": "https://y.qq.com/n/ryqq/playlist/773829104",
  "trackCount": 2,
  "loadedTrackCount": 2,
  "isPartial": false,
  "createTime": "2021-06-18 14:30:00",
  "updateTime": "2024-03-01 09:15:20",
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
      "title": "晴天",
      "artist": "周杰伦",
      "album": "叶惠美",
      "id": "0039MnYb0qxYAc",
      "durationMs": 269000,
      "releaseDate": "2003-07-31",
      "trackNumber": 3,
      "discNumber": 1,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc",
      "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1p501A7I2d.jpg",
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "maxQuality": "FLAC"
    },
    {
      "index": 2,
      "title": "说好不哭",
      "artist": "周杰伦, 阿信",
      "album": "说好不哭",
      "id": "0027fM2M3wD4gS",
      "durationMs": 222000,
      "releaseDate": "2019-09-16",
      "trackNumber": 1,
      "discNumber": 1,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS",
      "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M0000018P9X93c1OaO.jpg",
      "isVip": false,
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "maxQuality": "320kbps",
      "mvId": "c0032ccov8g",
      "mvUrl": "https://y.qq.com/n/ryqq/mv/c0032ccov8g"
    }
  ],
  "exportedAt": "2026-10-07 02:00:00",
  "generator": "Playlist Out",
  "generatorUrl": "https://playlistout.lengxiqwq.com"
}
```
