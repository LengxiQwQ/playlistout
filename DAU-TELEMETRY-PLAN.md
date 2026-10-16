# 日活（DAU）遥测方案

> 状态：**规划稿（未实施，等待评审）**
> 日期：2026-10-16
> 参考：`docs/ANALYTICS-V2.md`、`docs/API.md`、`docs/PROJECT-CONSTITUTION.md`、`.agents/rules/system-architecture.md`

## 1. 背景与目标

PlaylistOut 目前只有「网页访客数」一个近似日活指标（`visitor_unique`，服务端按 天 + IP + UA 哈希去重，见 `worker/src/analytics/v2-recorder.ts`）。插件端（MusicFree）与 CLI 端完全没有日活统计；公开统计 `/api/stats` 的“累计访问人次”也只反映网页访问。

本方案目标：

1. 三端（Web / 插件 / CLI）每日活跃均可统计：当天活跃人数、来自哪里（国家/地区）、什么时候（小时）。
2. 只记录匿名基础信息，不采集任何可识别用户的数据。
3. 同一天同一端同一人只计一次：客户端能拦就拦，服务端兜底去重。
4. 公开统计“累计访问人次”升级为**全端活跃人次**。
5. 洞察系统（Dashboard V3）新增专门的「日活 DAU」板块。

非目标（明确不做）：

- 不给 Web 增加 localStorage 式拦截（保持现状：visit 照旧上报，服务端按人/天去重）。
- 不引入任何客户端用户标识（userId / deviceId 一律不做，维持 `deviceId 被服务端严格拒绝` 的现状）。
- 不做留存 / 队列分析（留作后续议题）。
- 不改变现有 resolve / export 遥测的语义与触发时机。

## 2. 已确认口径（决策记录）

| 项 | 决定 |
| --- | --- |
| 插件端触发点 | **插件被加载（module load）即算活跃** |
| 插件端当日去重 | 内存 gate + 桌面端标记文件；移动端无持久化，靠服务端兜底 |
| Web 端 | 保持现状：visit 照旧上报，日活由服务端按人/天去重 |
| CLI 端 | 解析歌单上报即算活跃；**零客户端改动**（服务端派生） |
| 心跳与导入 | 日活心跳每天最多一次；导入歌单的 resolve 遥测不受影响 |
| 公开统计 | 并入插件端 + CLI 日活，升级为全端活跃人次 |

## 3. 现状评估（代码已核实）

已有能力：

- `worker/src/analytics/v2-recorder.ts`：V2 写入器。`coreUpsert()` 一次同时写 daily / hourly / geo 三张表；`computeDailyVisitorHash()` 用 `date + IP + UA + 盐` 生成截断 SHA-256；`recordVisitEventV2()` 在 `daily_visitor_hashes` 上 `INSERT OR IGNORE`，只有新增行才 `visitor_unique += 1`，并做 7 天修剪。
- `worker/src/analytics/context.ts`：请求归因。读取 `X-PlaylistOut-Client-Type / Client-Id / Client-Version / Device-Class / Host` 声明头；`plugin|app + 注册 id` → `channel=plugin`；`cli + official_cli` → `channel=cli`；注册插件集合为 `REGISTERED_CLIENT_ID_SET`（由 `worker/src/analytics/generated/registered-plugins.ts` 生成）。
- `worker/src/routes/event.ts`：`/api/event` 严格 schema（拒绝未知字段）、Origin 门禁（目前**仅** `cli + official_cli` 免 Origin）、1KB / 64KB 双档体积限制、60 次/分/IP 持久限流、204 fire-and-forget、`isAutomated` 风控。
- `worker/src/stats/public-v2.ts` + `analytics_v2_public_baseline`：公开统计的 V2 连续性桥接 `legacy_total + (v2_now - v2_baseline)`，保证对接 V1 历史基线无跳变。
- `web/src/dashboard/`（`engine.ts` / `types.ts` / `main.ts`）：Dashboard V3 切片引擎 + 6 个 Tab（业务总览 / 待审歌单 / 终端地域 / 稳定偏好 / 生态集成 / 安全风控）的单文件 UI。
- `plugins/musicfree/src/index.js`：`getPlaylistOutHeaders()` 已带完整声明头（`plugin` / `musicfree` / 版本 / 设备 / 系统）；存在 fs 逃逸读取模块（Tier1–Tier3）；测试运行器 `require(plugin)` 早于 `globalThis.env` 注入。
- `cli/core/telemetry.py`：解析 / 导出已上报（携带官方 CLI 声明头），`--no-telemetry` 可整体关闭。

缺口：

- 没有插件 / CLI 日活指标；`visitor_unique` 只覆盖 web 频道。
- 插件当前无法访问 `/api/event`（Origin 门禁会 403）。
- 洞察系统没有跨端日活视图。
- 公开统计“访问人次”不含插件 / CLI。

## 4. 设计总览

### 4.1 数据流

```
Web    打开页面   → POST /api/event {type:"visit"}  → 服务端当日哈希去重 → visitor_unique（现状，不动）
插件   加载插件   → POST /api/event {type:"active"} → 服务端当日报到 → active_user（新增）
插件   解析歌单   → /api/playlist（现状）───────────┐
CLI    解析/导出  → POST /api/event（现状）─────────┴→ 服务端派生：注册插件/官方 CLI 的任何遥测流量
                                                      顺带报一次当日活跃（老版本兼容兜底）
active_user 按 (天, 端, 客户端) 去重 ─┬→ 洞察系统「日活 DAU」Tab
                                     └→ 公开统计：桥接后的 visitor_unique(Web) + active_user(插件/CLI)
```

### 4.2 命名与契约（待评审冻结）

| 名称 | 值 | 用途 |
| --- | --- | --- |
| 指标名 | `active_user` | `analytics_v2_*` 表的 metric 字段 |
| 事件类型 | `{"type":"active"}` | `/api/event` 新增事件 |
| 去重表 | `daily_active_hashes` | 按 `(date, scope, hash)` 去重 |
| scope 值 | `plugin:musicfree` / `cli:official_cli` / … | 端 + 客户端 id |

## 5. 服务端设计

### 5.1 新指标 `active_user`

- 写入 `analytics_v2_daily_core` / `analytics_v2_hourly_core` / `analytics_v2_geo` 三处（复用现有 `coreUpsert()`，天然带小时分布与地理分布，`platform='none'`）。
- **仅**满足以下条件的流量才计入：
  - `channel === 'plugin'` 且 `clientId ∈ REGISTERED_CLIENT_ID_SET`（如 `musicfree`、`bbplayer`）；或
  - `channel === 'cli'` 且 `clientId === 'official_cli'`。
- 明确排除 `unknown_plugin` / `anonymous_api` / `api` / `web` / `internal`，避免与 Web 的 `visitor_unique` 重复计数、也防脚本灌水。
- 每“天 × 端 × 人”只加 1（由 5.4 去重控制）。
- 已核实 `analytics_v2_*` 表没有 metric 白名单 CHECK 约束（`0001`–`0017` 迁移），**不需要为指标新增改表**。

### 5.2 新事件 `{type:"active"}`（`/api/event`）

- 严格 schema：仅允许 `type` 一个字段，其余字段一律拒绝（与现有规则一致）。
- 单条与 batch（`{type:"batch", events:[…]}`）都支持；`active` 不计入未知字段豁免。
- 命中后由新函数 `recordActiveEventV2()` 处理：构造 `AnalyticsRequestContextV2` → 资格校验（5.1）→ 去重（5.4）→ 新增时 `active_user += 1`。
- 加入 batch 时同样按 ctx 资格过滤；非插件/CLI 频道发来的 `active` 是**静默 no-op**（不报错、不污染指标）。
- 请求体 ≤ 1KB 判定不变（`{type:"active"}` 只有约 16 字节）；不授予插件 64KB batch 档。

请求示例：

```http
POST /api/event HTTP/1.1
Content-Type: application/json
X-PlaylistOut-Client-Type: plugin
X-PlaylistOut-Client-Id: musicfree
X-PlaylistOut-Client-Version: 2.1.4
X-PlaylistOut-Device-Class: desktop
X-PlaylistOut-Host: windows

{"type":"active"}
```

### 5.3 去重表 `daily_active_hashes`（迁移 `0018_daily_active_hashes.sql`）

已核实下一个迁移编号为 0018（现存 0001–0017）；`migration-manifest.json` 只固化 0001–0008，新迁移无需改动 manifest。

```sql
-- Ephemeral daily active hash table for cross-client DAU deduplication (anonymous, 7-day retention)
CREATE TABLE IF NOT EXISTS daily_active_hashes (
  date TEXT NOT NULL,         -- 'YYYY-MM-DD' (UTC)
  scope TEXT NOT NULL,        -- 'plugin:musicfree' | 'cli:official_cli' | ...
  hash TEXT NOT NULL,         -- truncated one-way SHA-256 hash (16 chars)
  PRIMARY KEY (date, scope, hash)
);

CREATE INDEX IF NOT EXISTS idx_daily_active_hashes_date ON daily_active_hashes (date);
```

与 `daily_visitor_hashes`（0004）同构，只是多了 `scope` 维度。同步登记：

- `scripts/d1/verify-schema.js`：`REQUIRED_TABLES` / `REQUIRED_COLUMNS` / `REQUIRED_INDEXES`。
- `scripts/d1/verify-migration-history.js`：`KNOWN_BUSINESS_TABLES`。

### 5.4 哈希与去重规则

- 哈希输入：`date + scope + IP + 归一化UA + 独立盐`，SHA-256 后截断 16 位十六进制；原始 IP / UA **不落库**（与现有 Web 访客哈希同一模式）。
- **UA 归一去版本号**：`PlaylistOut-MusicFree/2.1.3 (desktop; windows)` → `PlaylistOut-MusicFree (desktop; windows)`，避免插件升级当天同一人被计两次。
- 去重：`INSERT OR IGNORE … WHERE` 新增行（`meta.changes > 0`）才 `active_user += 1`。
- 7 天修剪：`DELETE … WHERE date < ?`，与现有 visit 路径相同的模式。
- 当日重复（客户端拦不住时）：同一 `date + scope + 归一化 UA + IP` → 同一哈希 → 第二次被忽略，**服务端兜底成立**。

### 5.5 Origin 门禁放宽（`worker/src/routes/event.ts`）

现状：`isOfficialCli = (type === 'cli' && id === 'official_cli')` 才免 Origin，插件必然被 403。改动：

```
isRegisteredIntegration = (type === 'plugin' || type === 'app') && REGISTERED_CLIENT_ID_SET.has(id)
if (!isOfficialCli && !isRegisteredIntegration && (!origin || !isEventOriginAllowed(origin))) → 403
```

安全边界说明（如实记录）：

- 声明头本就可伪造，现有插件归因（resolve 统计）同样基于声明头，**不新增信任边界**；限流（60 次/分/IP）与 `isAutomated` 风控不变。
- 未注册 ID（如 `unknown_plugin`）仍然需要合法 Origin，不享受放行。
- 放行只影响门禁，不改变体积限制 / 限流 / schema 校验。

### 5.6 服务端派生（老版本兼容，关键设计）

为了“老版本插件导入一次即可计入”“CLI 零改动”，在服务端记录器里挂派生逻辑：

- 新 helper `maybeRecordDailyActiveV2(db, ctx)`：ctx 满足 5.1 资格（plugin + 注册客户端 / cli + official_cli）且非 `isAutomated` 时，执行与 `active` 事件完全相同的去重写入。
- 调用点：
  - `recordResolveV2()`（插件调用 `/api/playlist` 解析 → 已带插件声明头 → 派生）；
  - `recordProductEventV2()`（插件/CLI 若有 export / clipboard 事件）；
  - `recordBatchEventsV2()`（官方 CLI 的批量遥测主通道）。
- 效果：
  - 老版本插件（无心跳代码）：用户导入一次歌单 → 当天立即计入（口径 = “使用过”）；
  - 新版本插件：加载即计入（口径 = “加载过”），两者当天取并集、不重复。
- 成本：权限外流量不产生任何语句；资格内流量每次事件多一条 `INSERT OR IGNORE`，仅当天首个事件产生指标写入（1 次 upsert × 3 表 + 1 次修剪）。

### 5.7 写入路径汇总

| 触发 | D1 语句 | 生效时机 |
| --- | --- | --- |
| 插件心跳（新版本） | 1 × INSERT OR IGNORE +（新）指标 upsert ×3 + 修剪 | 加载当天首次 |
| 插件/CLI 任意遥测（新旧版本） | 1 × INSERT OR IGNORE +（新）指标 upsert ×3 + 修剪 | 使用当天首次 |
| Web visit | 不变（visitor_unique 路径） | 现状 |

## 6. 插件端（MusicFree）

文件：`plugins/musicfree/src/index.js`（+ 测试与 README）。

- 在 module load 完成处（`module.exports` 之前）调用 `reportDailyActiveHeartbeat()`：
  1. 测试/禁用开关检查（见下）；
  2. 内存 gate：`_activeReportedDate === todayUTC()` → 直接返回；
  3. 桌面端标记文件（复用现有 fs 逃逸模块，best-effort 读 / 写；如 `…/playlistout-active.json`）：已报过当天 → 返回；写入失败 → 降级为仅内存 gate（服务端兜底）；
  4. 原生 `fetch` fire-and-forget：`POST {apiBase}/api/event`，body `{"type":"active"}`，headers 用现有 `getPlaylistOutHeaders()`；超时（约 5s）/失败一律静默忽略，**不重试、不依赖宿主桥**（加载时机可能早于 host bridge 就绪）。
- 移动端（Android）：无持久化文件 → 每次冷启动可能重发 → 服务端当日哈希去重兜底（同设备同 IP 当天只计一次）。
- 测试友好：全局开关（如 `globalThis.__PLAYLISTOUT_DISABLE_ACTIVE_PING__ === true`）在心跳第一步检查。`plugins/musicfree/test/test-runner.js` 在 `require(pluginPath)`（第 59 行）**之前**设置该开关——已核实 require 早于 `globalThis.env` 注入，不能用 env 判断。
- 可选（本期建议不做，见第 16 节）：`userVariables` 增加“匿名统计”开关；因加载时机早于宿主注入 env 的实际情况不可靠，本期以 **README 如实披露** 为准：
  - 插件被加载时会发送一次匿名心跳（每天最多一次）；
  - 只包含客户端类型 / 版本 / 设备大类代码，服务端仅记录国家、地区、小时与当日去重哈希；
  - 可通过卸载插件 / 屏蔽插件网络请求关闭。
- 发布：按常规插件流程 bump 版本并重新构建，`scripts/build-plugins.js` 产物照旧，不能手改 `web/public/plugins/`。

## 7. CLI 端

**零客户端改动。**`cli/core/telemetry.py` 已在解析歌单 / 导出时上报（携带 `X-PlaylistOut-Client-Type: cli` + `official_cli`），服务端派生（5.6）自动计入日活。

- `--no-telemetry` 用户不计入（符合预期，无需处理）。
- “CLI 打开但没干活”暂不计入（极端场景；如需可另做启动 ping，属可选事项，见第 16 节）。

## 8. Web 端

**零客户端改动**（已拍板保持现状）。服务端沿用 `visitor_unique` 作为 Web 日活（通道 `web`，平台 `none`）。

- 当日多次打开：visit 事件照旧上报（page_view 不变），`visitor_unique` 只计一次。
- 不做 localStorage 严格拦截。

## 9. 洞察系统「日活 DAU」板块

**结论：需要，建议新增第 7 个 Tab「日活 DAU」**（在「业务总览」KPI 行再补一张“今日活跃”卡片做速览）。

理由：现有 6 个 Tab 均按“域”划分；日活是**跨端每日健康指标**，只有单独一页才能把趋势 / 分端 / 分地区 / 分小时 / 分客户端放在一起看。数据切片（daily / hourly / geo）天然按 `channel + client_id` 分开，一个 Tab 即可全部消化，不需要新表。

Tab 内容设计：

- **KPI 行**：今日全端活跃 / Web / 插件 / CLI，各带昨日对比（Δ%）；插件可展开 `musicfree`、`bbplayer` 等明细。
- **趋势**：近 30 天全端 DAU 折线 + 分端堆叠柱。
- **地区**：国家 / 地区 Top（复用 geo 切片）。
- **时间**：小时分布柱状（UTC，界面标注时区）。
- **口径说明条**：Web = 每日去重访客；插件 = 插件加载即计（每日一次）；CLI = 使用即计（解析 / 导出时）。

改动点（均为读取侧，无 D1 结构变化）：

- `worker/src/stats/v2.ts`：`CORE_METRICS` 增加 `'active_user'`（快照 / 内部 API 指标白名单，已核实当前 11 项）。
- `web/src/dashboard/types.ts`：`AnalyticsSlice` 增加 `active_user` 及 DAU 分组字段。
- `web/src/dashboard/engine.ts`：`CORE_METRICS` 增加 `'active_user'`；新增“按 channel / client 汇总”的 DAU 聚合；缺失字段默认 0（自动兼容旧切片）。
- `web/src/dashboard/main.ts`：新增 Tab 渲染与导航项，总览追加卡片。

## 10. 公开统计 `/api/stats` 并入

目标口径（不新增字段，仅升级现有“累计访问人次”的数值语义）：

```
totalVisitors = 桥接(visitor_unique).total + SUM(active_user 全域).total
visitorsToday = 桥接(visitor_unique).day   + SUM(active_user date=today)
```

- Web 部分沿用现有 `analytics_v2_public_baseline` 桥接（**不变**，无跳变）；
- 插件 / CLI 部分直接累加 `active_user`（从零开始、天然单调），无需新基线；
- `worker/src/stats/public-v2.ts`：指标查询加入 `active_user`，两处求和并入。

**必须同一版本更新**（否则部署后对账失败）：

- `scripts/d1/verify-production-public-stats.js`：期望值计算同步加 `active_user` 的 SUM(total) / SUM(today)。
- 前端文案：`web/src/i18n/zh-CN.ts` + `web/src/components/stats/StatsJournal.tsx`，把“累计访问人次”升级为“**全端活跃人次（按天去重）**”并补充 tooltip（覆盖网页访客、插件与 CLI 每日去重活跃）。
- `docs/API.md`：§7.5 `/api/event` 契约（新增 `active` 事件、门禁放宽说明）+ 公共统计语义。

## 11. 隐私与合规

- 新增落库数据只有：`(date, scope, 截断 SHA-256 哈希)`；与现有 Web 访客哈希同一模式；不存原始 IP / UA。
- `active` 事件本身不含任何字段（除 `type`），不采集歌单 / 账号 / Token / cookie；D1 红线（`docs/PROJECT-CONSTITUTION.md`：不存歌单 URL/ID、track、QQ 号、cookie、token）不受影响。
- 保留期 7 天（哈希表），指标本身是聚合计数。
- 平台名 / 版本号沿用现有声明头机制，不新增采集面。

## 12. 文档更新清单

- `docs/ANALYTICS-V2.md`：指标目录新增 `active_user`；事件表新增 `active`；新表与保留策略；三端口径差异与派生规则。
- `docs/API.md`：§7.5 `/api/event`（`active` 事件、注册插件免 Origin 放行）；公开统计语义。
- `plugins/musicfree/README.md`：加载心跳披露（匿名、每日最多一次、仅记录国家/时间，卸载或屏蔽网络即关闭）。
- 本文件（`DAU-TELEMETRY-PLAN.md`）：实施完成后可作为历史记录保留或按仓库惯例归档。

## 13. 测试与部署门禁

Worker（`npm --prefix worker test` + `npm --prefix worker run test:d1`）：

- `active` schema：合法通过；未知字段 / 错误类型拒绝；batch 内支持。
- Origin 门禁：注册插件（`plugin + musicfree`）免 Origin 通过；未注册（`plugin + unknown`）仍然 403；官方 CLI 行为不回归。
- 记录器：当天首个事件 → `active_user += 1`；重复 → no-op；非资格频道 → no-op。
- 派生：插件 resolve / CLI batch 事件触发当日活跃；`isAutomated` 不触发；修剪生效。
- D1 安全套件：0018 迁移可应用、`verify-schema` 通过。

插件（`npm run validate:plugins`）：

- 测试开关下加载模块 **不发网络请求**（用 fetch spy / 桩断言）。
- gate 行为单测（内存 gate、当天重复跳过）。

Web（`npm --prefix web test` + `npm --prefix web run typecheck`）：

- engine：`active_user` 聚合、缺字段默认 0。
- 文案 / tooltip 快照（如 StatsJournal 已有测试）。

部署（现有顺序不变）：migrations → verify-schema → verify-analytics-v2 → deploy → 生产对账（含更新后的 `verify-production-public-stats.js`）。全部改动通过 `npm run gate` 后方可 push。

## 14. 分阶段实施计划

### Phase 1：Worker 基建

- `worker/migrations/0018_daily_active_hashes.sql`（新）
- `worker/src/analytics/v2-recorder.ts`（`active_user` 记录 + 派生 helper + 哈希归一）
- `worker/src/analytics/types.ts`（`SingleEventPayload` 增加 `active`）
- `worker/src/routes/event.ts`（schema + 门禁 + 分发）
- `scripts/d1/verify-schema.js`、`scripts/d1/verify-migration-history.js`
- Worker 测试 + `docs/ANALYTICS-V2.md` + `docs/API.md`

### Phase 2：插件加载心跳

- `plugins/musicfree/src/index.js`（心跳）
- `plugins/musicfree/test/test-runner.js`（预 require 禁用开关）+ 新测试
- `plugins/musicfree/README.md` + 版本 bump 与插件发布流程

### Phase 3：洞察「日活 DAU」+ 公开统计

- `worker/src/stats/v2.ts`（`CORE_METRICS`）
- `worker/src/stats/public-v2.ts`（全端并入）
- `scripts/d1/verify-production-public-stats.js`
- `web/src/dashboard/{engine,types,main}.ts`（新区块 + 总览卡片）
- i18n / StatsJournal 文案

### Phase 4：部署与观察

- `npm run gate` → 按既定流程部署 Worker → 对账。
- 观察 7 天：老版本插件派生是否如期生效、移动端兜底去重是否符合预期、公开统计单调性。

## 15. 风险与已知边界（如实记录）

- **NAT / 共享出口低估**：同 IP + 归一化 UA 的不同用户可能合并为一人（频率低，插件 UA 含设备与系统）。
- **移动端冷启动重报**：无持久化时依赖服务端兜底；跨 IP 切换可能轻微高估。
- **升级过渡期口径混合**：老插件 = “使用过”，新插件 = “加载过”，同一指标混排（文档与界面如实标注）。
- **声明头可伪造**：与现状同级，不新增信任边界；限流兜底。
- **公开统计与对账脚本强耦合**：两者必须同版本上线，否则部署对账失败（列为发布检查项）。
- **旧切片兼容**：DAU Tab 上线前生成的切片没有 `active_user`，引擎按 0 处理；上线后从新切片开始有值。

## 16. 待评审确认的开放问题

1. 契约命名是否冻结：指标 `active_user`、事件 `{"type":"active"}`、表 `daily_active_hashes` / scope 格式。
2. 公开统计文案：“全端活跃人次（按天去重）”表述是否接受（替代“累计访问人次”）。
3. 插件 `userVariables` 匿名统计开关：建议本期不做（加载时机早于 env 注入不可靠），仅 README 披露 + 测试开关；是否接受？
4. CLI “打开但没干活”不补 ping：是否确认？
5. 哈希保留期 7 天：是否确认？
6. 心跳仅用原生 `fetch`、失败静默不重试：是否接受（以绝大多数宿主可用为前提）？
7. 「日活 DAU」Tab 名称、图标（建议 📈）与位置（第 7 个 Tab）：是否确认？
8. NAT 低估 / 跨 IP 轻微高估的边界：是否接受并写入文档？
