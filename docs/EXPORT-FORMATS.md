# Playlist Out Web 导出格式规范

本文档描述 **Playlist Out 网页版** 当前生成的导出文件结构，以及这些格式各自适合的使用场景。

> 注意：`cli/qqmusic` 与 `cli/netease` 是独立的命令行实现，历史上有自己的 CSV / Excel 输出结构。本文档只约束 Web 端 `web/src/utils/export.ts` 生成的文件，不应据此推断 CLI 文件结构。

## 设计原则

Web 导出遵循以下原则：

- 优先使用跨语言、跨工具都容易识别的字段名。
- 通用迁移字段放在前面，Playlist Out 自己的扩展字段放在后面。
- 不为了某一家迁移服务设计私有格式。
- 保留原始歌曲顺序与合法重复歌曲。
- CSV / XLSX 保留表格公式注入防护。
- 文件全部在浏览器本地生成。
- TXT 偏向人类阅读；JSON 偏向程序接入；CSV / XLSX / M3U8 优先考虑跨工具互操作。

## CSV

编码：UTF-8 with BOM

默认 CSV 是标准 RFC 4180 表格，不在表头前插入歌单说明行，第一行固定为：

```text
title,artist,album,isrc,duration,url,index,type,vip,status
```

字段说明：

| 字段 | 含义 |
|---|---|
| `title` | 歌曲标题 |
| `artist` | 歌手；多位歌手使用 `, ` 连接 |
| `album` | 专辑名称 |
| `isrc` | ISRC；来源平台没有提供时为空 |
| `duration` | 时长，单位为秒；未知时为空 |
| `url` | 来源平台歌曲详情 URL |
| `index` | 原歌单中的序号 |
| `type` | `track` / `original_sound` / `video` |
| `vip` | `true` / `false` |
| `status` | `playable` / `vip` / `paid` / `unplayable` / `geo_blocked` 等 |

前六列属于优先面向通用导入器的核心字段；后四列是 Playlist Out 的扩展信息。第三方工具可以忽略自己不认识的列。

当内部调用显式启用 `includeMetadata` 时，CSV 可以在表格前附加以 `#` 开头的歌单说明；网页默认下载不使用这一模式，以保持最大导入兼容性。

## Excel (.xlsx)

单歌单 Excel 固定包含两个工作表：

### 1. `Tracks`

第一张工作表，专门给表格软件和第三方导入器读取。

第一行直接是：

```text
title | artist | album | isrc | duration | url | index | type | vip | status
```

之后每行一首歌曲，不在上方插入歌单标题、作者或说明卡片。

`Tracks` 必须保持为工作簿的第一张表，因为部分外部工具只读取首个工作表。

### 2. `Playlist Info`

第二张工作表保存歌单级元数据，采用 `field | value` 两列：

- `name`
- `creator`
- `platform`
- `id`
- `sourceUrl`
- `trackCount`
- `loadedTrackCount`
- `isPartial`
- `createTime`
- `updateTime`
- `exportedAt`
- `totalDuration`
- `playCount`
- `tags`
- `description`
- `generator`
- `generatorUrl`

这样既保留完整的歌单信息，又不会让迁移工具把元数据行误当成歌曲。

> 多歌单“多 Sheet Excel”由 `web/src/utils/batchExport.ts` 单独生成，结构与单歌单 XLSX 不同，主要用于人工整理和归档，不应假设它等同于上述单歌单交换格式。

## JSON

JSON 是 Playlist Out 面向程序、脚本、开源播放器和 API 生态的主要结构化格式。

根对象继续使用 Playlist Out 自己的稳定 schema，例如：

- `name`
- `platform`
- `id`
- `sourceUrl`
- `trackCount`
- `tracks`

每首歌曲保留完整结构化字段，同时为了通用导入器增加便利字段：

- `artist`：扁平字符串，多位歌手使用 `, ` 连接
- `artists`：原有字符串数组，继续保留
- `isrc`：如果来源平台提供 ISRC，则提升为一级字段
- `rawIds`：来源平台原始 ID 字典，继续保留

因此第三方应用既可以简单读取 `title / artist / album / isrc`，也可以使用 `artists / artistList / albumObj / rawIds` 获取更完整的数据。

完整字段定义见 [JSON 数据格式规范](JSON-SCHEMA.md)。

## M3U8

Playlist Out 生成标准 Extended M3U8：

```text
#EXTM3U
#PLAYLIST:歌单名称
#EXTINF:269,周杰伦 - 晴天
周杰伦 - 晴天.mp3
```

其中 `#EXTINF` 使用：

```text
歌手 - 歌名
```

用于向播放器或支持 Extended M3U/M3U8 的迁移工具提供可识别的曲目信息。

M3U8 中的 `.mp3` 行是逻辑播放列表条目名称，不代表 Playlist Out 下载或提供音频文件。

## TXT

TXT 的定位是“人类可读备份”，不是严格的第三方交换 schema。

文件前部保留歌单信息，歌曲区域采用：

```text
歌名 - 歌手 - 专辑
```

因此不要假定任意迁移工具都可以无损解析 Playlist Out TXT。需要跨工具导入时，优先使用 CSV、M3U8 或 XLSX。

## 推荐选择

| 场景 | 推荐格式 |
|---|---|
| 程序 / API / 开源播放器接入 | JSON |
| 通用迁移工具交换 | CSV |
| 支持 M3U/M3U8 的播放器或迁移工具 | M3U8 |
| Excel / 表格分析与部分迁移工具 | XLSX |
| 人工阅读与简单备份 | TXT |

## 兼容性变更约定

如果未来需要调整 Web 导出字段：

1. 优先增加字段，不随意删除现有通用字段。
2. 避免改变 `title / artist / album / isrc` 的语义。
3. 保持 CSV 第一行和 XLSX `Tracks` 第一行可直接作为表头。
4. JSON 的破坏性 schema 变更必须同步更新 [JSON-SCHEMA.md](JSON-SCHEMA.md)。
5. 所有格式结构变更都必须同步更新本文档、README 以及相关测试。
