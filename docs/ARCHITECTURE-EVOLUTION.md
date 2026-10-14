# PlaylistOut 架构演进路线图与状态跟踪 (Architecture Evolution Roadmap)

> **当前总体状态**：🟢 **P0 已完成，当前就绪待启动 P1 (Ready for P1)**  
> **更新时间**：2026-10-14  
> **核心目标**：从单体中心化分发向自描述 Provider 注册制与功能管道演进，让“加一个厂商”只需新增 1 个目录，“加一个功能”拥有可插拔管道。  
> **Agent 自治执行口令**：当用户输入“按照路线图继续重构，继续走。”时，Agent 必须读取本文档的【当前状态】与【执行规矩】，自动识别下一个待执行任务并无缝推进。

---

## 阶段进展仪表盘 (Progress Dashboard)

| 阶段 | 名称 | 预估工作量 | 状态 | 关键交付物 | 验收方式 |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **P0** | **基础设施补全** | 2-3 天 | 🟢 **已完成 (PASS)** | Hono 路由解耦、统一 `SupportedPlatform`、强化 `MusicProvider` 类型 | `npm run gate` 8 步全绿 + 子 Agent 独立验收通过 |
| **P1** | **Provider 注册中枢** | 3-4 天 | ⚪ **就绪待启动** | `ProviderRegistry`、5 大厂商迁移至 `MusicProvider`、三大 Service 瘦身、`/api/providers` 端点 | `npm run gate` 全绿 + 消灭 resolve-service 硬编码 |
| **P2** | **前端解耦 + CLI 共享核心** | 3-4 天 | ⚪ 未开始 | `App.tsx` Hooks 提取、`api/client.ts` 拆分、组件拆解、`cli/core/` 提取 | `npm run gate` 全绿 + CLI 独立运行正常 |
| **P3** | **新厂商接入 + 功能管道** | 持续 | ⚪ 未开始 | 新增厂商（如咪咕）、Worker 元数据管道、浏览器端导出插件管道 | 新厂商解析测试通过 + 遵从宪法 §1 非目标 |

---

## 核心宪法红线 (Constitutional Invariants)

所有参与本路线图演进的开发者与 AI Agent 必须无条件遵守 [`PROJECT-CONSTITUTION.md`](./PROJECT-CONSTITUTION.md)：
1. **§1 非目标**：严禁服务端爬取歌词、提取音频流、服务端持久化歌单、任意 URL 代理（`/proxy?url=...`）。
2. **§5 客户端导出**：Worker 不得生成或托管文件导出产物（导出计算必须在浏览器客户端或 CLI 本地完成）。
3. **§8 安全策略**：禁止任意代理，上游请求必须使用严格域名白名单。
4. **§11 CLI 独立性**：CLI 是独立的一等公民工具，必须支持在自身目录下独立运行、独立执行 pytest，不得与 Worker 产生运行时强依赖。
5. **Pre-Push Gate**：任何提交与推送前必须运行 `npm run gate`，8 步检查必须 100% 绿灯。

---

## 关键实施规则与已知陷阱规范 (Gotchas & Standards)

在执行重构时，必须严格遵守以下 4 条防踩坑规范：
1. **HTTP 405 语义保持**：Hono 路由默认会在匹配失败时落入 404。现有测试套件对 `/health`、`/api/session/token`、`/api/playlist` 等端点的非法 HTTP Method（如 POST `/health`）强制断言 405 `METHOD_NOT_ALLOWED` 并检查 `Allow` 响应头。Hono 路由分发必须保持此行为。
2. **CORS 分权中间件**：不得直接使用粗粒度的第三方 cors 中间件。必须复用 `worker/src/cors.ts` 中的 `getCorsHeaders` 与 `handleOptions`，保障 `/api/event` 等敏感端点的严格同源限制。
3. **CLI `sys.path` 自适应**：厂商脚本从 `core/` 导入模块时，脚本顶部必须包含两行动态路径注入：
   ```python
   import sys, os
   sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
   ```
   确保 `cd cli/<vendor> && python <vendor>_playlist_export.py` 独立运行不崩溃。
4. **子 Agent 独立验收机制**：每个阶段开发完毕并通过本地测试后，必须派发无历史上下文的独立子 Agent（`invoke_subagent`），提供客观验收标准进行独立审计，杜绝“既当裁判又当运动员”。

---

## 详细子任务清单

### 🔴 P0: 基础设施补全 (已完成)
- [x] **P0.1 引入 Hono 并解耦路由**
  - [x] `worker/package.json` 添加 `hono` 依赖并安装
  - [x] 创建 `worker/src/middleware/cors.ts`（适配现有 `cors.ts`）
  - [x] 创建 `worker/src/middleware/security.ts`（适配现有 `security/headers.ts`）
  - [x] 创建 `worker/src/middleware/rate-limit.ts`（适配现有速率限制）
  - [x] 提取 `worker/src/routes/` 模块（health, session, resolve, playlist, user, kugouAuth, stats, event, feedback, migration, internal）
  - [x] 保证 405 Method Not Allowed 精确返回与现有测试兼容
  - [x] 改造 `worker/src/index.ts` 缩减为 Hono 入口包装（7 行）
- [x] **P0.2 统一 `SupportedPlatform` 定义**
  - [x] 创建 `worker/src/providers/platforms.ts` 作为平台唯一事实来源
  - [x] 调整 `worker/src/analytics/types.ts` 与 `worker/src/services/resolve-service.ts` 引用统一类型
- [x] **P0.3 强化 Provider 接口类型**
  - [x] 在 `worker/src/providers/types.ts` 中定义 `ProviderCapabilities`, `ProviderMeta`, `MusicProvider`
  - [x] 保留 `LegacyProvider` 确保 P0 阶段零破坏性
- [x] **P0 质量门禁验证与子 Agent 独立验收**
  - [x] 本地运行 `npm run gate` 8 步全绿
  - [x] 派发无上下文独立子 Agent 进行全量审计并出具报告 (PASS)

### 🟠 P1: Provider 注册中枢
- [ ] **P1.1 建立 `ProviderRegistry`** (`worker/src/providers/registry.ts`)
- [ ] **P1.2 迁移 5 大厂商至 `MusicProvider` 契约** (`qqmusic`, `netease`, `kugou`, `qishui`, `kuwo`)
- [ ] **P1.3 重构 `resolve-service.ts`**（消除硬编码 if-else 瀑布，行数从 1200 → ~300）
- [ ] **P1.4 重构 `playlist-service.ts` & `user-service.ts`**（完全改为 Registry 与能力驱动）
- [ ] **P1.5 提供 `GET /api/providers` 端点**
- [ ] **P1.6 分析维度动态适配 (`dimensions.ts`)**
- [ ] **P1 质量门禁与子 Agent 验收**

### 🟡 P2: 前端解耦 + CLI 共享核心
- [ ] **P2.1 `App.tsx` 提取业务 Hooks** (`usePlaylistParser`, `useDisambiguation`, `useViewMode`, `useChannelCache`)
- [ ] **P2.2 拆分 `api/client.ts`** 为单一职责文件
- [ ] **P2.3 拆解超大组件** (`KugouAuthModal`, `StatsJournal`, `PlaylistSummary`, `SearchNote`)
- [ ] **P2.4 前端输入校验规则声明化** (`validation.ts`)
- [ ] **P2.5 建立 `cli/core/` 共享库** (`terminal.py`, `exporters.py`, `http.py`, `formatters.py`, `cli_runner.py`)
- [ ] **P2 质量门禁与子 Agent 验收**

### 🟢 P3: 新厂商 + 功能管道
- [ ] **P3.1 接入新厂商标准范式落地** (例如接入第 6 家平台)
- [ ] **P3.2 Worker 元数据处理管道** (失效歌曲标注、VIP 状态标注)
- [ ] **P3.3 客户端导出管道插件化** (多格式扩展)
- [ ] **P3 质量门禁与子 Agent 验收**
