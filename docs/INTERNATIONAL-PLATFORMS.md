# Spotify 与 Apple Music 接入说明

v3.1.0 新增 Spotify 与 Apple Music。两家均只解析公开歌单元数据；不支持私人资料库、登录授权或用户主页歌单发现。

## 输入和输出

- 平台标识：`spotify`、`applemusic`。现有 `/api/playlist`、`/api/v1/playlist`、`/api/v1/resolve` 和 providers 接口保持路由不变。
- Spotify：`https://open.spotify.com/playlist/<22位ID>`，允许分享查询参数、`intl-…` 路径；短链限 `spotify.link`、`spoti.fi`。
- Apple Music：`https://music.apple.com/<地区>/playlist/<可选名称>/pl.…`，包括 `pl.u-…`；保留地区。支持白名单内 `geo.music.apple.com` 跳转。
- 歌曲、专辑、私人集合链接不能作为公开歌单处理。重定向必须为 HTTPS、无用户信息/自定义端口、白名单主机，最多三跳。
- 两家取得完整歌单后，将上游顺序整体反转并从 1 重新编号，统一用于预览、复制、导出和播放器导入；保留合法重复，不推断缺失的添加时间。歌单总数、分页或条目类型无法确认时返回明确错误，不能把部分结果标成完整。

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

## 2026-11-18 实测与免费套餐运行决定

正式 Python 适配器和独立 Cloudflare 测试均取得 Spotify 99/99、Apple Music 中国区 118/118；CLI 两单均已生成六种格式。

| 用户样本 | 冷请求外部次数 | 热令牌外部次数 | CPU 观测 |
|---|---:|---:|---|
| Spotify 99 首 | 2 | 1 | 优化后的解析器冷请求约 7–10 ms；一轮完整路由冷请求 7 ms |
| Apple Music 118 首 | 4 | 2 | 优化后的解析器冷请求 7–12 ms；一轮完整路由冷 / 热为 17 / 4 ms |

完整路由测试使用临时独立 D1，包含限流、数据管道、统计和 JSON 返回，不写生产统计。小样本无法代表长歌单、不同地区或长期分布。

Apple 网页脚本约 3.35 MB，当前令牌在约 0.9 MB 处。Worker 使用原生 BYOB 批量读取（64 KiB），在匹配完整、未过期的公开令牌后取消剩余响应，不拼接或扫描整个脚本。该样本读取约 0.92 MB、14 次读取；此前普通流读取约 450 次。保留跨块边界、总大小和完整性校验，不硬编码脚本名、位置或令牌。便携测试环境回退默认流读取。

继续使用 Workers 免费套餐，不开通任何付费服务。官方 CPU 限制为 10 ms/次，偶发超限有弹性，持续超限可能终止该次执行（1102）；不承诺每次调用都低于 10 ms。维护者接受这一运行边界，决定先接入，不再以全部样本严格低于 10 ms 或两倍峰值余量作为本次合并阻碍。后续可将解析模块迁至 VPS，继续沿用统一 JSON/导出契约。

账户只读分析曾显示近期单日 D1 读取最高约 3,792,534 行（免费 5,000,000 行的 75.9%）。统计缓存和 0019 covering indexes 随本次接入发布；实际降幅需上线后观察，不能以空测试库推断生产节省比例。保留现有限流、请求预算和聚合统计，控制失败重试，不因免费限制自动扩容。

官方边界：[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)、[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)、[BYOB 批量读取](https://developers.cloudflare.com/workers/runtime-apis/streams/readablestreambyobreader/)。

## 验收要求

离线测试覆盖 URL/SSRF、分页、未知字段、重复歌曲、总数不符、请求预算、统计归因、六种导出、复制和播放器拒绝路径。实际环境覆盖两个用户公开歌单、本地浏览器桌面/移动宽度、CLI 成品导出及 Windows 打包冒烟。

完整八项门禁通过后才能推送；本地和独立测试 Worker 通过不能替代生产 D1、手机及播放器真机或长期稳定性验收。发布时先检查生产迁移历史与恢复书签，再部署 Worker/Web，跟踪 CI，最后做少量线上冒烟。失败回滚应用版本，不回写统计基线或删除历史数据。

## 本地验证记录

2026-11-18：完整八项门禁通过（Python 288、Web 356、Worker 507、D1 安全 38，MusicFree 65 项测试），类型检查和两端构建通过。宿主 NO_COLOR=1 会使原有两个颜色测试失败；仅对测试子进程移除该变量后重跑，未改颜色优先级。

实际 CLI 两份歌单均生成六种格式，回读 JSON/CSV/XLSX/M3U8/Markdown 的条目数一致。浏览器 Apple 118 首实际六格式生成成功；Spotify 99 首在 390px 移动视口无横向溢出。Windows x64 独立成品构建与离线自检通过；其他发行平台、真机和播放器实际播放未验。临时云端探测 Worker 与测试 D1 在验证后清理，不保留额外线上服务。
