# Spotify / Apple Music 独立能力测试

> 以下为接入前独立实验记录；当前产品适配器、用户歌单实测和上线限制见 [接入说明](../../docs/INTERNATIONAL-PLATFORMS.md)。

这套脚本只做接入前调查，不修改 Worker、Web、CLI 平台注册或播放器插件。
测试数据和上游源码保存在被 Git 忽略的 `scratch/international-playlists/`。
不下载音频、试听、封面文件或歌词，不要求登录、Cookie、开发者账号或 API Key。
封面和媒体 URL 可能作为上游返回的元数据出现在原始 JSON，但脚本不会请求媒体内容。

## 运行

在项目根目录使用 Python 3.14 和 Git。首次联网准备隔离环境：

```powershell
python -X utf8 scripts/research/test-international-playlists.py --setup
```

该命令获取两个固定提交的上游源码，在实验目录创建独立虚拟环境。
Spotify 安装为可编辑包；Apple 直接调用上游模块，不启动它的 HTTP 服务。
不安装上游的浏览器、下载器或 MCP 附加功能，不修改项目运行时依赖。

运行四个内置公开样本：

```powershell
python -X utf8 scripts/research/test-international-playlists.py --samples
```

测试自己的公开歌单（两个参数都可重复，也可以只测一家）：

```powershell
python -X utf8 scripts/research/test-international-playlists.py --spotify "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF" --apple "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb"
```

参数：

- `--detail-samples 3`：每个歌单额外补查前 3 首的歌曲详情；设为 0 可关闭。
- `--page-size 25`：Apple 分页大小，默认 25，故 100 首歌单实际读取 4 页。
- `--max-pages 100`：Apple 分页上限；达到上限不会标为完整。
- `--timeout 180`：单个歌单的总超时秒数；超时后继续下一个。
- Spotify 固定使用 `max_tracks=None`，取消上游默认的 100 首上限。

每次生成独立结果目录，不覆盖旧报告：

```text
scratch/international-playlists/results/<时间>/
  REPORT.md                 字段覆盖表、数量、逐曲补查摘要
  report.json               结构化报告及逐曲补查数据
  <序号>-<平台>-raw.json     上游库返回的模型数据（不包含认证握手响应）
  <序号>-<平台>-mapped.json  可映射到项目模型的字段；缺失字段不补假值
```

退出码 0：所有歌单数量与上游报告总数一致、歌名歌手无缺失。
退出码 1：有失败、超时、数量不一致、核心字段缺失或完整性未确认。
参数错误退出码 2。数量吻合不证明顺序、内容或平台总数绝对正确。
报告按当前 `worker/src/models/playlist.ts` 自动列出全部 Playlist / Track 字段。

## 应该提供什么链接

**Spotify**：打开歌单 → 分享 → 复制歌单链接，使用最终长链接：

```text
https://open.spotify.com/playlist/<22位歌单ID>
https://open.spotify.com/playlist/<22位歌单ID>?si=...
```

支持 `intl-xx` 语言路径。`spotify.link` 等分享短链先在浏览器打开，再复制最终地址。
不要传歌曲、专辑、个人主页链接；“已点赞的歌曲”等私人集合不在本实验范围。

**Apple Music**：打开可公开分享的歌单 → 分享歌单 → 复制链接：

```text
https://music.apple.com/cn/playlist/<歌单名称>/pl.<歌单ID>
https://music.apple.com/us/playlist/<歌单名称>/pl.<歌单ID>
```

保留链接里的国家/地区（如 `cn`、`us`、`my`），也保留 `pl.u-...` 形式的完整用户歌单 ID。
不要传 `album` / `song` 链接或私人资料库链接。
这些是脚本接受的输入形式；个人公开歌单、中文区歌单尚需用实际链接另测。

## 2026-11-18 实测结果

上游来源（均 MIT；源码和 LICENSE 保留在本地实验目录，未复制到产品）：

- [SpotifyScraper](https://github.com/AliAkhtari78/SpotifyScraper)，3.9.2，提交 `9cbf05aa4963bac3684bb941270dcb62fc851ab7`。
- [apple-music-scraper](https://github.com/omkarcloud/apple-music-scraper)，提交 `f7606f84e63b4d07249c8531eb2b68fe20ca23c3`。
- 核心网络库：`httpx==0.28.1`、`curl_cffi==0.14.0`；实际环境依赖清单在实验目录 `dependencies.txt`。

| 平台 | 样本 | 已取 / 上游总数 | 结论 |
|---|---|---|---|
| Spotify | Top 50 - Global | 50 / 50 | 数量吻合 |
| Spotify | All Out 2010s | 150 / 150 | 数量吻合，已跨越默认 100 首界限 |
| Apple Music | Today’s Hits | 50 / 50 | 数量吻合，2 页 |
| Apple Music | Top 100: Global | 100 / 100 | 数量吻合，4 页 |

四个样本共 350 条记录，来自公开编辑歌单，不需要用户凭证。

| 项目字段 | Spotify（200 条列表记录） | Apple Music（150 条列表记录） |
|---|---|---|
| 歌单 ID、名称、作者、封面、简介、总数、来源链接 | 两个样本均有 | 两个样本均有 |
| 歌单更新时间 | 无 | 两个样本均有，可转换为毫秒时间戳 |
| 歌单创建时间、标签、歌单播放量 | 无 | 无 |
| 歌名、歌手、专辑、歌曲 ID、封面、曲号 | 200 / 200 | 150 / 150 |
| 歌曲详情链接 | 可用返回 ID 构造，保留来源区别 | 150 / 150 直接返回 |
| 时长 | 200 / 200 | 149 / 150；`E85`（ID `1878377419`）缺时长 |
| ISRC | 库的 Track 模型不提供，逐曲补查也没有 | 150 / 150 |
| 发行日期 | 列表无；6 / 6 抽样逐曲详情有 | 150 / 150 |
| 碟号 | 库的 Track 模型不提供 | 150 / 150 |
| MV | 此次库返回结果未提供 | 列表无；6 首补查中 1 首有 MV ID 和链接 |
| VIP / 付费、项目 status/statusText | 无可靠映射 | 无可靠映射 |
| 用户账号对应的可播放状态 | 不能确认；原始 playable 是匿名上下文标记 | 不能确认 |
| 项目 maxQuality | 无 | 有额外 audio_traits，如 lossless / atmos，但不能直接当最高音质 |
| 完整音频播放地址 playbackUrl | 未取得 | 未取得 |

`index` 按返回顺序生成；无人工客户端顺序对照。`isOriginalSound`、`channel`、
`availableChannels` 属于现有汽水/抖音等平台专用语义，不能据缺失认定基本导出失败。
`retrieval` 应由未来适配器按完整性生成，不是要求上游直接提供。
Spotify 的歌曲 play_count、歌单 followers 不应误填成项目的歌单 playCount。

**判断**：两家均可提供基础歌单导出数据，但都不能填满项目所有可选字段。
Apple Music 字段更全；Spotify 的 ISRC 和碟号不能靠当前库直接补齐，发行日期可抽样补查。
不应因为默认模型值而把未知的 isAvailable/isVip/status 输出为已验证事实。

## 验证边界

本次验证为本机 Python 直连及模型字段核对；未验证 Cloudflare Worker 的 fetch、
普通用户自建歌单、中国区/其他地区差异、私人歌单、超大歌单、下架歌曲或长期稳定性。
数量吻合只表示与同次上游报告相符；没有使用官方客户端逐项核对，也没有上线。
脚本保留原始字段，逐曲补查和列表覆盖率分开，避免 3 首补查冒充整单补齐。
上游分页失败可能返回部分记录；报告会比较总数，不把缺总数的结果标成完整。

本轮还验证了 `--max-pages 1` 将 25/100 标为不完整，以及误传 Spotify 歌曲链接时拒绝解析。
脚本语法检查通过。项目 `npm run gate` 八项通过：首次执行受宿主 `NO_COLOR=1`
影响，两个 CLI 颜色测试失败；仅在门禁子进程移除该环境变量后重跑全部通过，未改产品代码。
