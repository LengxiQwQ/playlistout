# PlaylistOut JSON 数据格式规范 (Schema Document)

本文档详细描述了 PlaylistOut Web 导出的核心 JSON 结构，用于指导第三方开发者、音乐迁移工具、播放器等进行标准化解析。CSV、XLSX、M3U8、TXT 的结构与兼容性约定见 [Web 导出格式规范](EXPORT-FORMATS.md)。

### 1. JSON 格式 (`.json`) —— 推荐平台接入规范

- **编码标准**：`UTF-8`（无 BOM）
- **MIME 类型**：`application/json`
- **设计目标**：跨平台导入导出、第三方音乐播放器歌单互通、自动化批处理。

#### 根对象字段规范 (Root Schema)

| 字段名 | 类型 | 空值约定 | 字段说明与格式 |
|---|---|---|---|
| `createTime` | `string \| null` | 可选 | **歌单创建时间**（首位字段）。标准时间字符串 `YYYY-MM-DD HH:mm:ss`，若上游平台未提供则返回 `null` |
| `exportedAt` | `string` | 可选 | **数据导出时间**。客户端生成文件的本地时间 `YYYY-MM-DD HH:mm:ss` |
| `generator` | `string` | 可选 | **导出工具平台标识**。固定为 `"Playlist Out"` |
| `generatorUrl` | `string` | 可选 | **平台官方网址**。固定为 `"https://playlistout.lengxiqwq.com"` |
| `name` | `string` | **必填** | 歌单完整名称 |
| `creator` | `string` | 可选 | 歌单创建者昵称 |
| `coverUrl` | `string` | 可选 | 歌单封面高清图片直链 URL（第三方播放器或脚本可直接获取展示歌单封面） |
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
| `artist` | `string` | 可选 | 便于通用导入器直接读取的扁平歌手字段；多位歌手以 `, ` 连接。与 `artists` 同时保留 |
| `artists` | `string[]` | **必填** | 参与歌手名数组（多位歌手分别作为独立元素，如 `["周杰伦", "阿信"]`） |
| `artistList` | `Array<{id?: string, name: string}>` | 可选 | (*极客增强*) 结构化的歌手对象数组，包含歌手在平台上的唯一 ID，提高匹配准确率 |
| `album` | `string` | **必填** | 收录专辑名称 |
| `isrc` | `string` | 可选 | 国际标准录音制品编码（ISRC）。若来源平台提供，会提升到一级字段，便于迁移工具进行精确匹配；原始值仍可同时保留在 `rawIds` |
| `albumObj` | `{id?: string, name: string}` | 可选 | (*极客增强*) 结构化的专辑对象，包含专辑唯一 ID |
| `durationMs` | `number` | 可选 | 歌曲音频总时长（毫秒，如 `269000` 表示 4分29秒） |
| `coverUrl` | `string` | 可选 | 单曲或所属专辑的高清封面图片直链 URL（第三方播放器或自动化脚本可直接请求展示单曲封面） |
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
  "coverUrl": "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1p501A7I2d.jpg",
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
      "artist": "周杰伦",
      "artists": ["周杰伦"],
      "artistList": [{"id": "0025NhlN2yWrP4", "name": "周杰伦"}],
      "album": "叶惠美",
      "isrc": "TWUM72300001",
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
      "artist": "周杰伦, 阿信",
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
