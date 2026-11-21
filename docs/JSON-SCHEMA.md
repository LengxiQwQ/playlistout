# PlaylistOut JSON 数据格式规范 (Canonical Schema Document)

> v3.1.0 新增 Spotify（`spotify`）和 Apple Music（`applemusic`）公开歌单支持；新增 YouTube Music（`ytmusic`）公开歌单与专属扩展命名空间 `youtube` 支持；新增状态 `unknown`，未知 VIP/可用性保持缺失。输入、字段、格式兼容性和免费额度说明见 [国际平台接入说明](./INTERNATIONAL-PLATFORMS.md)。


本文档详细描述了 PlaylistOut 统一歌单与歌曲 JSON 数据规范（Canonical Playlist & Track Schema），用于指导第三方开发者、音乐迁移工具、播放器插件进行标准化解析与接入。其他导出格式（CSV、XLSX、M3U8、TXT）的结构与兼容性约定见 [Web 导出格式规范](EXPORT-FORMATS.md)。

---

### 1. 规范设计哲学与原则

PlaylistOut 的核心使命是**“采集和交换通用歌单数据”**，同时兼顾特殊内容生态（如哔哩哔哩视频/音频歌单）的无损流转。规范贯彻以下原则：

1. **单一概念单一表达**：同一通用概念在一首歌曲中只允许出现一次。彻底淘汰历史上的同义字段与双写（如 `artist` + `artists` + `artistList`、`album` + `albumObj` 等）。
2. **通用层平铺 + 平台专属命名空间隔离**：
   - **通用层（Canonical Layer）**：以简单、平铺、可跨平台交换的通用字段为主，任何通用解析器只需读取顶层标准字段即可完成歌单解析，遇到不认识的字段直接跳过。
   - **平台扩展层（Platform Namespace Layer）**：针对具有特殊数据结构的平台（如 `bilibili` 的 BV 号、分 P `cid`、UP 主 `mid`），统一收敛在同名子对象（如 `"bilibili": { ... }`）中，既不污染通用顶层结构，又能让同生态播放器（如 BBPlayer）实现 100% 无损导出与秒级还原。
3. **真实可靠与零虚构**：仅保存能从来源平台或宿主客户端可靠获得的真实信息。拿不到的可选字段直接省略（不输出键），**严禁填充 `null`、空字符串 `""`、伪造值或推测值**，严禁为了非核心字段增加大量昂贵的逐曲请求。有效布尔值（如 `isOriginalSound: false`、`isVip: false`、`isMultiPage: false`）正常保留。
4. **单写宽容读（Asymmetric Compatibility）**：
   - **Writer（输出端）**：严格且仅输出新规范，不再双写旧字段。
   - **Reader（读取端，如播放器导入插件）**：在新规范基础上宽容向下兼容历史字段（如 `artists` 数组、`albumObj`、`publishTime` 等），并忽略当前宿主不需要的平台专属扩展块。

---

### 2. 根对象字段规范 (Root Playlist Schema)

根对象推荐将**导出工具与宿主元信息置顶**，以便打开 JSON 文件时即可在首屏识别数据来源与生成工具。

推荐键排列顺序：
`generator → generatorUrl → exportedFrom → exportedAt → name → creator → coverUrl → platform → id → sourceUrl → trackCount → loadedTrackCount → isPartial → createTime → updateTime → totalDuration → totalDurationMs → loadedDuration → loadedDurationMs → playCount → tags → description → bilibili → youtube → tracks`

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `generator` | `string` | **必填**。导出引擎与协议规范标识，固定为 `"PlaylistOut"` |
| `generatorUrl` | `string` | 可选。项目官方网址，固定为 `"https://playlistout.lengxiqwq.com"` |
| `exportedFrom` | `string` | **必填**。执行导出的宿主平台/客户端标识（无空格驼峰命名，如 `"PlaylistOutWeb"` \| `"BBPlayer"` \| `"MusicFree"`） |
| `exportedAt` | `string` | 可选。数据导出时间（客户端/服务端生成时间，格式 `YYYY-MM-DD HH:mm:ss`） |
| `name` | `string` | **必填**。歌单完整名称 |
| `creator` | `string` | 可选。歌单创建者昵称 |
| `coverUrl` | `string` | 可选。歌单封面高清图片直链 URL |
| `platform` | `string` | **必填**。歌单所属音源平台标识（`"qqmusic"` \| `"netease"` \| `"kugou"` \| `"qishui"` \| `"kuwo"` \| `"migu"` \| `"spotify"` \| `"applemusic"` \| `"ytmusic"` \| `"bilibili"`） |
| `id` | `string` | **必填**。歌单唯一标识（在线平台歌单 ID 或宿主本地歌单 ID） |
| `sourceUrl` | `string` | 条件必填。歌单在来源平台的网页直链 URL。在线平台歌单**必填**；客户端纯本地创建的歌单（如无对应远端网页链接）直接省略 |
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
| `bilibili` | `object` | 可选。当 `platform === "bilibili"` 时输出的歌单级 B 站专属扩展信息，详见第 4 节 |
| `youtube` | `object` | 可选。当曲目来源于 YouTube Music (`platform === "ytmusic"`) 时输出的歌单级 YouTube 专属扩展信息，详见第 5 节 |
| `tracks` | `Track[]` | **必填**。歌曲对象数组，严格按歌单原始顺序排列 |

---

### 3. 标准歌曲对象规范 (Canonical Track Schema)

标准歌曲对象输出时按照以下推荐键顺序排列，确保数据稳定、整洁：
`index → title → artist → album → id → isrc → durationMs → releaseDate → trackNumber → discNumber → sourceUrl → playbackUrl → coverUrl → isOriginalSound → isVip → isAvailable → status → statusText → maxQuality → mvId → mvUrl → bilibili → youtube`

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `index` | `number` | **必填**。歌曲在歌单中的显示序号，从 1 起始自增 |
| `title` | `string` | **必填**。歌曲标题（B 站音源为视频标题或对应分 P 标题），必须来自真实数据，不允许猜测 |
| `artist` | `string` | **必填**。唯一的歌手/创作者字段（字符串）。多位歌手统一使用 `, ` 连接（如 `"周杰伦, 阿信"`）；B 站音源为 UP 主昵称。**不得再输出 `artists`、`artistList`、`author` 等同义字段** |
| `album` | `string` | 可选。专辑名称（纯字符串）。B 站多 P 视频若有主视频标题（`mainTrackTitle`）可映射至此；若无可靠专辑信息（如短视频原声、单 P 视频），直接省略，不写空字符串，不伪造“未知专辑”。**不再保留 `albumObj`** |
| `id` | `string` | 可选。来源平台主要 ID（QQ 优先 song MID，网易为歌曲 ID，酷狗为主 Hash，汽水为曲目 ID，B 站单 P 为 `bvid`、多 P 带 `cid` 时为 `${bvid}_${cid}`，YouTube 为 11 位 `videoId`） |
| `isrc` | `string` | 可选。国际标准录音制品编码（ISRC）。仅当上游原始响应中可靠存在时输出，不额外网络请求。**取代旧版 `rawIds.isrc`** |
| `durationMs` | `number` | 可选。歌曲时长，统一使用毫秒整数（如 `269000` 表示 4 分 29 秒） |
| `releaseDate` | `string` | 可选。歌曲发行日期，推荐格式 `YYYY-MM-DD`。**取代旧版 `publishTime`** |
| `trackNumber` | `number` | 可选。歌曲在原专辑中的曲目编号（正整数） |
| `discNumber` | `number` | 可选。多碟专辑时所属碟号（正整数） |
| `sourceUrl` | `string` | 可选。来源平台歌曲/视频详情页面直链（例如 B 站曲目固定为原视频链接 `https://www.bilibili.com/video/${bvid}`，YouTube 为 `https://music.youtube.com/watch?v=${videoId}`） |
| `playbackUrl` | `string` | 可选。**预留字段**。直链音频播放资源。PlaylistOut 坚持不做音频提取与盗链代理，目前正常导出中省略该字段 |
| `coverUrl` | `string` | 可选。歌曲/专辑/视频高清封面图片直链 URL |
| `isOriginalSound` | `boolean` | 可选。是否为抖音/汽水视频原声音频 |
| `isVip` | `boolean` | 可选。是否为 VIP 专享歌曲 |
| `isAvailable` | `boolean` | 可选。来源平台是否正常可播（下架/无版权/B 站视频失效时为 `false`） |
| `status` | `string` | 可选。机器标准枚举：`"playable"` \| `"unplayable"` \| `"vip"` \| `"paid"` \| `"geo_blocked"` \| `"unknown"`。`unknown` 不推导 isVip / isAvailable |
| `statusText` | `string` | 可选。用户友好展示文本（如 `"正常"`、`"下架/无版权"`、`"视频已失效"`、`"VIP专享"`、`"付费专辑"`） |
| `maxQuality` | `string` | 可选。平台最高可用音质档位（如 `"FLAC"`、`"320kbps"`、`"lossless"`） |
| `mvId` | `string` | 可选。官方 MV 平台唯一 ID |
| `mvUrl` | `string` | 可选。官方 MV 详情页直链（非视频直链） |
| `bilibili` | `object` | 可选。当曲目来源于哔哩哔哩时输出的专属元数据对象，详见第 4 节 |
| `youtube` | `object` | 可选。当曲目来源于 YouTube Music (`platform === "ytmusic"`) 时输出的专属元数据对象，详见第 5 节 |

---

### 4. 平台专属扩展规范：哔哩哔哩 (`bilibili` Namespace Schema)

由于哔哩哔哩（`platform: "bilibili"`）属于视频与 UP 主社区生态，具有分 P（`cid`）、BV 号（`bvid`）、UP 主 UID（`mid`）等特有属性。为保证通用解析器不受干扰，同时支持支持 B 站生态的客户端（如 BBPlayer）无损导入导出，所有 B 站私有字段统一封装在 `bilibili` 子对象下。

#### 4.1 歌单级 `bilibili` 扩展对象 (`Root.bilibili`)

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `playlistType` | `string` | 可选。歌单在客户端中的原始类型（驼峰命名）：`"local"`（本地歌单/外部匹配生成）\| `"favorite"`（B站收藏夹）\| `"collection"`（B站合集）\| `"series"`（B站系列）\| `"multiPage"`（多P视频歌单）\| `"dynamic"`（动态歌单） |
| `remoteSyncId` | `number` | 可选。关联的 B 站远端收藏夹 `media_id`、合集 `season_id` 或系列 `series_id` |
| `creatorMid` | `string` | 可选。歌单创建者的 B 站用户 UID（`mid`） |

#### 4.2 歌曲级 `bilibili` 扩展对象 (`Track.bilibili`)

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `bvid` | `string` | **必填**。B 站视频 BV 号（如 `"BV1xx411c7mD"`） |
| `cid` | `number` | 可选。B 站视频分 P 的 `cid`（单 P 已缓存或分 P 视频精准定位音频流的核心凭证） |
| `isMultiPage` | `boolean` | 可选。该曲目是否属于多 P 视频中的一个分 P |
| `mainTrackTitle` | `string` | 可选。当 `isMultiPage` 为 `true` 时，保存该分 P 所属主视频的原始总标题 |
| `upMid` | `string` | 可选。视频 UP 主的 B 站 UID（`mid`）。客户端再次导入时可凭此字段直接构建 B 站创作者关联，无需重新搜索 |
| `upAvatarUrl` | `string` | 可选。UP 主头像图片直链 URL |
| `upSignature` | `string` | 可选。UP 主个人签名/简介 |

---

### 5. 平台专属扩展规范：YouTube Music (`youtube` Namespace Schema)

由于 YouTube Music（`platform: "ytmusic"`）背靠 YouTube 庞大的视频与艺人频道生态，歌曲天然具备 11 位全局唯一的 YouTube 视频 `videoId`、艺人官方频道、视频类型标识（录音室音源 `ATV` vs 官方 MV `OMV` vs 用户二创 `UGC`）以及欧美音乐主流的家长指导脏标（`isExplicit`）。为了既保留这些强大的元数据，又不破坏通用层规范，所有 YouTube 专属私有字段统一封装在 `youtube` 子对象下。

#### 5.1 歌单级 `youtube` 扩展对象 (`Root.youtube`)

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `playlistId` | `string` | **必填**。YouTube 歌单的原始 ID（如 `"PLxxxx"`、`"RDCLAK5uy_xxxx"`、`"OLAK5uy_xxxx"`） |
| `channelId` | `string` | 可选。歌单创建者的 YouTube 频道 ID（以 `UC` 开头） |
| `channelUrl` | `string` | 可选。创建者 YouTube 频道主页直链（`https://www.youtube.com/channel/${channelId}`） |
| `privacy` | `string` | 可选。歌单可见性状态：`"PUBLIC"` \| `"UNLISTED"` |

#### 5.2 歌曲级 `youtube` 扩展对象 (`Track.youtube`)

| 字段名 | 类型 | 说明与格式 |
|---|---|---|
| `videoId` | `string` | **必填**。YouTube 全局唯一的 11 位视频 ID（如 `"4NRXx6U8ABQ"`） |
| `videoUrl` | `string` | **必填**。普通 YouTube 官方网页播放直链（`https://www.youtube.com/watch?v=${videoId}`） |
| `musicUrl` | `string` | **必填**。YouTube Music 官方播放直链（`https://music.youtube.com/watch?v=${videoId}`） |
| `videoType` | `string` | 可选。视频类型标识：`"MUSIC_VIDEO_TYPE_ATV"`（唱片公司官方提交的静态封面录音室音轨）\| `"MUSIC_VIDEO_TYPE_OMV"`（官方真人大片 MV）\| `"MUSIC_VIDEO_TYPE_UGC"`（用户自制/翻唱视频） |
| `isExplicit` | `boolean` | 可选。欧美家长指导标识（Explicit 内容脏标） |
| `channelId` | `string` | 可选。歌曲第一作者或官方艺人 Topic 频道的 YouTube 频道 ID |
| `channelUrl` | `string` | 可选。艺人 YouTube 频道主页直链 |
| `setVideoId` | `string` | 可选。当前单曲在该歌单内部的唯一条目实例定位 ID（用于精确定位某首歌曲在歌单中的特定位置） |

---

### 6. 淘汰字段与升级对照表

| 旧版字段 | 新版 Canonical 状态 | 迁移方式 / 说明 |
|---|---|---|
| `artists` (`string[]`) | **彻底删除** | 统一为单字符串 `artist`，多歌手使用 `, ` 连接 |
| `artistList` (`object[]`) | **彻底删除** | 结构化 ID 不再污染通用 Schema |
| `albumObj` (`object`) | **彻底删除** | 统一使用纯字符串 `album` |
| `publishTime` (`number`) | **彻底删除** | 如来源可靠，统一格式化为 `releaseDate` (`YYYY-MM-DD`) |
| `rawIds` (`object`) | **从公开 JSON 移除** | 内部调试字典不再暴露到公开规范，重要 ID 提升为根/一级字段 (`id`, `isrc`) 或平台专属命名空间（如 `bilibili.bvid`） |

---

### 7. 标准 JSON 示例

#### 7.1 传统流媒体平台导出示例（PlaylistOutWeb 导出）

```json
{
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "exportedFrom": "PlaylistOutWeb",
  "exportedAt": "2026-10-08 14:20:00",
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
  ]
}
```

#### 7.2 哔哩哔哩歌单导出示例（BBPlayer 导出）

```json
{
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "exportedFrom": "BBPlayer",
  "exportedAt": "2026-10-08 14:25:00",
  "name": "我的B站宝藏音乐歌单",
  "coverUrl": "https://i0.hdslb.com/bfs/archive/sample_cover.jpg",
  "platform": "bilibili",
  "id": "15",
  "trackCount": 2,
  "loadedTrackCount": 2,
  "isPartial": false,
  "createTime": "2026-10-07 20:00:00",
  "updateTime": "2026-10-08 14:10:00",
  "totalDuration": "8 分钟",
  "totalDurationMs": 491000,
  "loadedDuration": "8 分钟",
  "loadedDurationMs": 491000,
  "description": "通过 PlaylistOut 匹配并整理保存在 BBPlayer 的歌单",
  "bilibili": {
    "playlistType": "local"
  },
  "tracks": [
    {
      "index": 1,
      "title": "【4K修复】周杰伦 - 晴天 官方MV",
      "artist": "杰威尔音乐",
      "id": "BV1xx411c7mD",
      "durationMs": 269000,
      "sourceUrl": "https://www.bilibili.com/video/BV1xx411c7mD",
      "coverUrl": "https://i0.hdslb.com/bfs/archive/xxx.jpg",
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "bilibili": {
        "bvid": "BV1xx411c7mD",
        "isMultiPage": false,
        "upMid": "12345678",
        "upAvatarUrl": "https://i0.hdslb.com/bfs/face/xxx.jpg"
      }
    },
    {
      "index": 2,
      "title": "P2 说好不哭 (with 五月天阿信)",
      "artist": "音樂收藏家",
      "album": "【Hi-Res】周杰伦单曲精选合集",
      "id": "BV1yy411c7mE_98765432",
      "durationMs": 222000,
      "sourceUrl": "https://www.bilibili.com/video/BV1yy411c7mE",
      "coverUrl": "https://i0.hdslb.com/bfs/archive/yyy.jpg",
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "bilibili": {
        "bvid": "BV1yy411c7mE",
        "cid": 98765432,
        "isMultiPage": true,
        "mainTrackTitle": "【Hi-Res】周杰伦单曲精选合集",
        "upMid": "87654321"
      }
    }
  ]
}
```

#### 7.3 YouTube Music 歌单导出示例（PlaylistOutWeb 导出）

```json
{
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "exportedFrom": "PlaylistOutWeb",
  "exportedAt": "2026-11-22 15:30:00",
  "name": "Today's Biggest Hits",
  "creator": "YouTube Music",
  "coverUrl": "https://lh3.googleusercontent.com/sample_cover=w544-h544-l90-rj",
  "platform": "ytmusic",
  "id": "RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ",
  "sourceUrl": "https://music.youtube.com/playlist?list=RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ",
  "trackCount": 1,
  "loadedTrackCount": 1,
  "isPartial": false,
  "totalDuration": "3 分钟 20 秒",
  "totalDurationMs": 200000,
  "description": "The biggest songs right now.",
  "youtube": {
    "playlistId": "RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ",
    "privacy": "PUBLIC"
  },
  "tracks": [
    {
      "index": 1,
      "title": "Blinding Lights",
      "artist": "The Weeknd",
      "album": "After Hours",
      "id": "4NRXx6U8ABQ",
      "durationMs": 200000,
      "sourceUrl": "https://music.youtube.com/watch?v=4NRXx6U8ABQ",
      "coverUrl": "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
      "isAvailable": true,
      "status": "playable",
      "statusText": "正常",
      "youtube": {
        "videoId": "4NRXx6U8ABQ",
        "videoUrl": "https://www.youtube.com/watch?v=4NRXx6U8ABQ",
        "musicUrl": "https://music.youtube.com/watch?v=4NRXx6U8ABQ",
        "videoType": "MUSIC_VIDEO_TYPE_ATV",
        "isExplicit": false,
        "channelId": "UC0WP5P-ufpRfjbNrmOWwLBQ",
        "channelUrl": "https://www.youtube.com/channel/UC0WP5P-ufpRfjbNrmOWwLBQ"
      }
    }
  ]
}
```
