# Spotify 与 Apple Music 接入说明

本功能位于 `feat/spotify-apple-music` 候选分支，尚未上线。两家均只解析公开歌单元数据；不支持私人资料库、登录授权或用户主页歌单发现。

## 输入和输出

- 平台标识：`spotify`、`applemusic`。现有 `/api/playlist`、`/api/v1/playlist`、`/api/v1/resolve` 和 providers 接口保持路由不变。
- Spotify：`https://open.spotify.com/playlist/<22位ID>`，允许分享查询参数、`intl-…` 路径；短链限 `spotify.link`、`spoti.fi`。
- Apple Music：`https://music.apple.com/<地区>/playlist/<可选名称>/pl.…`，包括 `pl.u-…`；保留地区。支持白名单内 `geo.music.apple.com` 跳转。
- 歌曲、专辑、私人集合链接不能作为公开歌单处理。重定向必须为 HTTPS、无用户信息/自定义端口、白名单主机，最多三跳。
- 所有返回歌曲保留上游顺序和合法重复。歌单总数、分页或条目类型无法确认时返回明确错误，不能把部分结果标成完整。

歌曲状态新增 `unknown`。两家的匿名元数据不足以确认用户账号的 VIP、付费或可播放能力，故保留 `status: unknown`，不补 `isVip: false` 或 `isAvailable: true`。Spotify 当前不补查 ISRC、发行日期、碟号；缺失保持未知。Apple 可直接取得更多字段，但单条记录仍可能缺失时长等信息。

Web 和 CLI 提供 XLSX、CSV、JSON、TXT、M3U8、Markdown。Web 仍支持四种复制模式。CLI 的 Markdown 选项为 `md` / `markdown` / 菜单 6，输出 `.md`；统计归一为 `markdown`。

M3U8 沿用项目原有本地文件名列表语义，需用户自行持有对应音频，不包含音频下载或完整播放地址。

洛雪与 Listen 1 格式不具备新平台原生来源映射，页面禁用，底层生成器也拒绝，不回退为 QQ。MusicFree 支持链接/标准 JSON 元数据导入，保留原始来源；不保证播放。移动端优先使用链接或播放器支持的文件导入，不建议粘贴大段 JSON。

## 上游来源与运行方式

- [SpotifyScraper](https://github.com/AliAkhtari78/SpotifyScraper/tree/9cbf05aa4963bac3684bb941270dcb62fc851ab7)：公开嵌入页面匿名令牌及网页 GraphQL 歌单分页。
- [apple-music-scraper](https://github.com/omkarcloud/apple-music-scraper/tree/f7606f84e63b4d07249c8531eb2b68fe20ca23c3)：网页脚本令牌、地区目录与歌单分页。

两者均 MIT，完整声明见根目录 `THIRD-PARTY-NOTICES.md`。Worker 使用原生 TypeScript/fetch；CLI 独立使用现有 requests，不依赖上游托管 API、本机代理服务或新 Python 包。只复用必要协议，不加入上游的媒体、歌词、登录功能。

网页令牌只保存在进程内。Worker 到期重新获取，401 只刷新一次，5xx 最多重试一次，全部计入同一请求预算。403/429 不立即重试，并在当前 isolate 冷却；返回 Retry-After。冷却不保证跨地区全局同步。CLI 每次运行重新取得匿名令牌，上游报错即停止，不自动连续重试。

## 资源边界

- 单歌单最多 3000 条，外部请求总预算 40 次，总截止时间 25 秒，单响应上限 8 MiB。
- Worker 上游响应读取并发最多 2（每 isolate）；现有客户端分级限流保留，新增两平台共用的每 IP 每分钟 6 次持久限流，D1 不可用时拒绝新平台解析。
- 不为每首歌曲发详情补查请求，不在服务器持久化或缓存歌单内容。浏览器内缓存和已解析数据可复用，导出/复制不会重新爬取上游。
- 统计增加 `upstream_requests` 聚合指标，只按整次成功解析累计，不记录 URL、ID、令牌、曲目内容。失败请求以失败指标和 40 次硬预算评估；该指标不冒充 Cloudflare 全账户实际计费子请求。
- 一次成功 Web 解析的统计测试产生 19 条聚合写入语句；另有安全/限流语句，不能把 SQL 条数当成实际计费行数。D1 的真实读取/写入量需以上线后 meta/账户分析复核。
- 本次不升级套餐、不创建付费服务、不发布 CLI 安装包。

## 2026-11-18 实测与上线阻碍

正式 Python 适配器和真实 Cloudflare 独立测试 Worker 均取得 Spotify 99/99、Apple Music 中国区 118/118。CLI 两单均已生成六种格式。测试 Worker 不绑定生产 D1；CPU 数据不包含生产路由、安全、统计完整开销。

| 用户样本 | 冷请求外部次数 | 热令牌外部次数 | 优化后 CPU 实测 |
|---|---:|---:|---|
| Spotify 99 首 | 2 | 1 | 一轮 7 / 8 ms；此前为 11–15 ms |
| Apple Music 118 首 | 4 | 2 | 一轮 38 ms 冷 / 3 ms 热；此前冷请求 61 ms |

次数已包含冷请求令牌初始化。Apple 冷请求要读取约 3.3 MB 网页脚本；没有通过持久保存令牌规避现有隐私约束。网络耗时不等于 CPU 时间，单次返回 200 也不代表稳定满足免费 CPU 限制。

**当前不能批准免费套餐上线**：用户确认使用 Workers 免费套餐，公布 CPU 限制为 10 ms/次；Apple 冷请求仍明显超出。Spotify 独立测试已有超限样本，完整链路和更长歌单仍需验证。

账户只读分析还显示近期单日 D1 读取最高约 3,792,534 行（免费 5,000,000 行的 75.9%）；按既定两倍峰值验收已超过容量。现有统计缓存和 0019 covering indexes 纳入候选，尚未应用生产，不能声称生产读取量已经降低。

因此保留候选分支，不合并 main、不推送触发生产部署、不自动升级。需要先解决冷启动 CPU 和 D1 峰值余量，再复核预算。现有套餐详情接口权限不足返回 403，Worker usage_model=standard 本身不能证明账户是付费套餐。

官方边界：[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)、[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)。这些限制可能变化，正式部署前重新核对。

## 验收要求

离线测试覆盖 URL/SSRF、分页、未知字段、重复歌曲、总数不符、请求预算、统计归因、六种导出、复制和播放器拒绝路径。实际环境覆盖两个用户公开歌单、本地浏览器桌面/移动宽度、CLI 成品导出及 Windows 打包冒烟。

完整八项门禁通过后才能推送；本地和独立测试 Worker 通过不能替代生产 D1、手机及播放器真机或长期稳定性验收。上线解除阻碍后，先检查生产迁移历史与恢复书签，再部署 Worker/Web，跟踪 CI，最后做少量线上冒烟。失败回滚应用版本，不回写统计基线或删除历史数据。

## 本地验证记录

2026-11-18：完整八项门禁通过（Python 288、Web 356、Worker 502、D1 安全 38，MusicFree 65 项测试），类型检查和两端构建通过。宿主 NO_COLOR=1 会使原有两个颜色测试失败；仅对测试子进程移除该变量后重跑，未改颜色优先级。

实际 CLI 两份歌单均生成六种格式，回读 JSON/CSV/XLSX/M3U8/Markdown 的条目数一致。浏览器 Apple 118 首实际六格式生成成功；Spotify 99 首在 390px 移动视口无横向溢出。Windows x64 独立成品构建与离线自检通过；其他发行平台、真机和播放器实际播放未验。独立云端探测 Worker 已删除，不保留额外线上服务。
