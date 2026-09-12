# PlaylistOut P0 Infrastructure Bootstrap Prompt

下面内容用于交给代码 AI 执行 PlaylistOut 的 **P0：Repository & Infrastructure Foundation**。

---

你现在负责 `LengxiQwQ/playlistout` 的 **P0 基础设施与仓库骨架初始化**。

这是一次有严格边界的基础设施任务。不要把它理解成“开始实现整个产品”。本轮只允许完成 P0，不要提前实现 P1 的 QQ Music Provider 正式解析逻辑。

## 0. 开始前必须先做

在修改任何文件前：

1. 完整阅读：
   - `docs/PROJECT-CONSTITUTION.md`
   - `docs/ROADMAP.md`
2. 检查当前 `main` 的真实仓库结构和现有文件。
3. 检查现有 Python CLI、测试、README、CI 的实际内容。
4. 记录当前 HEAD commit。
5. 确认工作区没有未理解的用户改动；不要覆盖未知改动。

`PROJECT-CONSTITUTION.md` 是本项目的架构宪法；如果你的实现想法与它冲突，以宪法为准，不要自行改方向。

---

# 1. 本轮唯一目标

把当前仍然像“QQ Music 单文件 Python 工具”的仓库，安全地整理成 PlaylistOut monorepo 骨架，并确保：

- 旧 Python QQ Music CLI 完整保留并仍可运行/测试；
- 新 Web 前端骨架建立；
- Cloudflare Worker TypeScript 骨架建立；
- CI 适配新的 monorepo 结构；
- GitHub Pages 部署骨架建立；
- Cloudflare Worker 部署所需配置骨架建立；
- 根 README 改成 PlaylistOut 项目级 README；
- P0 完成后仓库已经具备继续进入 P1 的基础，但**本轮不实现完整 QQ Provider**。

---

# 2. 当前旧代码必须迁移，不允许删除

当前仓库中的旧 QQ Music Python 工具是有效资产，不是垃圾代码。

请优先使用 `git mv` 保留清晰历史，把旧 CLI 整体迁移到：

```text
cli/qqmusic/
```

建议至少完成以下迁移：

```text
qq_music_playlist_export.py  -> cli/qqmusic/qq_music_playlist_export.py
requirements.txt             -> cli/qqmusic/requirements.txt
test_utils.py                 -> cli/qqmusic/test_utils.py
旧的 QQ Music README 内容     -> cli/qqmusic/README.md
```

根目录原来的 QQ-only `README.md` 不应简单删除内容；应把旧说明保存在 `cli/qqmusic/README.md` 后，再创建新的 PlaylistOut 根 README。

`LICENSE` 保持项目根目录，不要随意改许可证。

### 旧 CLI 验收要求

迁移后必须验证：

- Python 依赖路径正确；
- 测试仍能找到模块；
- `pytest` 可执行；
- `python -m compileall` 或等价语法检查通过；
- 不因为目录迁移破坏 CLI 的正常运行入口。

如果为了迁移需要修改 import/test 路径，可以做最小必要调整，但不要顺便重写 Python CLI 架构。

---

# 3. 目标仓库骨架

P0 完成后，顶层至少应清晰呈现：

```text
playlistout/
├── web/
├── worker/
├── cli/
│   └── qqmusic/
├── docs/
├── .github/
│   └── workflows/
├── README.md
├── .gitignore
└── LICENSE
```

不要把 Web、Worker 和 Python CLI 混在同一个源码目录。

---

# 4. Web 前端初始化

在 `web/` 初始化：

- React
- TypeScript
- Vite

使用当前稳定、兼容的依赖版本，不要为了“先进”引入实验性技术。

## Web 本轮只需要骨架

本轮允许：

- 基础 app shell；
- PlaylistOut 品牌占位；
- 简单首页占位；
- 基础 CSS；
- 环境变量读取骨架；
- API client 目录/接口骨架；
- 基础测试/类型检查配置（合理即可）；
- GitHub Pages production build 配置。

本轮不允许：

- 正式 QQ Music 解析实现；
- 大型 UI 设计；
- Dashboard；
- 用户登录；
- 路由系统（除非确有基础设施必要）；
- Redux/Zustand 等复杂状态管理；
- Next.js；
- SSR；
- Node 后端。

保持前端轻量。

---

# 5. Cloudflare Worker 初始化

在 `worker/` 初始化 Cloudflare Worker TypeScript 项目。

建议使用官方 Wrangler 工具链与现代 Worker module syntax。

本轮 Worker 只需要：

- TypeScript 工程可构建；
- 一个最小的 API/health 骨架；
- 基础路由组织；
- `providers/` 目录；
- `models/` 或等价数据契约目录；
- `stats/` 预留目录；
- 环境配置/绑定位置清晰；
- CORS 配置位置清晰，但不要为了 P0 写死最终生产策略；
- 为未来 `qqmusic` Provider 留出明确入口。

### 绝对禁止

不要创建：

```text
/proxy?url=<任意 URL>
```

不要写通用开放代理。

不要在 P0 中偷偷实现一套未经验证的 QQ 爬虫然后宣布 P1 完成。

如果为了端到端骨架需要一个示例 endpoint，可以返回固定/健康状态 JSON，但必须明确是 skeleton，不是假装已经支持 QQ Music。

---

# 6. Package / workspace 约定

优先使用简单、主流、容易维护的方案。

建议使用 `npm`，不要为了 monorepo 引入 Turborepo/Nx 等额外框架。

可以：

- `web/` 独立 `package.json`
- `worker/` 独立 `package.json`

也可以在根目录增加极薄的 npm workspace/统一脚本，但只有在确实能简化 CI 和开发时才做。

不要过度设计。

如果选择 workspace，请在 README 中清晰写明安装/开发命令。

---

# 7. `.gitignore`

更新根 `.gitignore`，至少正确忽略：

- Python cache/venv
- Node `node_modules`
- Vite build output
- Cloudflare/Wrangler local state
- coverage/test caches
- OS/IDE 常见临时文件（保持克制）

不要把真正需要提交的配置文件误忽略。

---

# 8. CI 重构

当前 CI 是 QQ Python-only CI。本轮必须升级为适合 monorepo 的 CI。

至少验证三个区域：

## Python CLI

- 安装 `cli/qqmusic/requirements.txt`
- 语法检查
- pytest

## Web

- install
- typecheck/lint（如果配置了）
- production build
- tests（如果 P0 建立了测试框架）

## Worker

- install
- TypeScript/typecheck
- build / Wrangler dry-run 或等价不需要真实 Cloudflare secret 的验证
- tests（如果配置了）

不要要求 CI 必须拥有 Cloudflare production secret 才能通过普通 PR/push 验证。

CI 应该验证代码质量；真实部署可以是单独 workflow/受保护步骤。

---

# 9. GitHub Pages 部署骨架

建立 `web` 的 GitHub Pages 自动部署 workflow。

要求：

- 从 `main` 构建 production web；
- 发布 `web` 的 build artifact；
- 适配未来自定义域名 `playlistout.com`；
- 不要把仓库名写死为旧的 `qqmusic-playlist-exporter`；
- Vite base/path 配置要考虑自定义域名场景；
- 不要依赖开发机手工复制 `dist`。

如果自定义域名需要 GitHub/Cloudflare 控制台人工操作，本轮只写清楚步骤，不允许伪造“已经配置成功”。

---

# 10. Cloudflare 基础设施骨架

本项目计划：

```text
playlistout.com      -> Web frontend
api.playlistout.com  -> Cloudflare Worker
```

P0 可以准备：

- Wrangler 配置；
- Worker 名称；
- bindings 占位/说明；
- D1 migration 目录或最小统计 schema 预留（若此时创建合理）；
- `.dev.vars.example` / 环境变量说明（如需要）。

但：

- 不要提交真实 secrets；
- 不要猜测 Cloudflare account ID；
- 不要伪造 D1 database ID；
- 不要声称 DNS/API 域名已经实际绑定，除非你真的有权限并成功验证；
- 无法自动完成的控制台操作写进文档/manual setup checklist。

D1 在 P0 不应成为 Web/Worker 基础 build 的硬依赖。

---

# 11. 根 README 重写

新的根 `README.md` 应介绍 **PlaylistOut**，而不是继续看起来像 QQ-only Python exporter。

至少包含：

- PlaylistOut 是什么；
- 当前状态：MVP development / QQ Music first；
- 目标用户流程：Paste → Parse → Export；
- 技术架构概览；
- monorepo 目录说明；
- Web 本地开发方式；
- Worker 本地开发方式；
- 旧 QQ Music Python CLI 的位置和使用入口；
- 指向 `docs/PROJECT-CONSTITUTION.md`；
- 指向 `docs/ROADMAP.md`；
- `playlistout.com` 作为项目域名（如果网站尚未上线，明确状态，不伪造上线情况）。

不要在 P0 README 中声称尚未实现的多平台功能已经可用。

---

# 12. 本轮不要做的事

以下内容不属于 P0，禁止顺手实现：

- 完整 QQ Music Worker Provider；
- 网易云/酷狗/酷我/咪咕/汽水 Provider；
- 账号系统；
- 登录；
- 数据库用户表；
- 播放器；
- 下载音乐；
- 歌词；
- AI 功能；
- 平台迁移；
- 支付；
- 广告；
- 复杂 dashboard；
- 任意 URL proxy；
- 重写/删除旧 Python CLI；
- git filter / history rewrite；
- 为追求“整洁”删除当前功能。

---

# 13. 本轮测试与验证

完成修改后必须实际执行并记录结果。

至少包括：

### CLI

```text
Python dependency install
Python syntax check
pytest
```

### Web

```text
npm install / npm ci
TypeScript check
production build
相关测试（若配置）
```

### Worker

```text
npm install / npm ci
TypeScript check
Worker build/dry-run
相关测试（若配置）
```

### Repository

检查：

- 顶层目录符合目标；
- 旧文件均有明确去向；
- README 链接没有引用旧仓库名；
- CI 路径全部更新；
- 没有 secret 被提交；
- 没有 build output / node_modules 被提交；
- `git status` 最终干净（提交后）。

---

# 14. 完成标准

只有同时满足以下条件才能宣布 P0 完成：

1. 旧 QQ Python CLI 完整迁移且仍通过测试。
2. `web/` React + TypeScript + Vite 骨架可安装、运行、构建。
3. `worker/` Cloudflare Worker TypeScript 骨架可安装、验证/构建。
4. monorepo 结构清晰。
5. CI 已按新结构更新。
6. GitHub Pages workflow 已准备。
7. Cloudflare Worker deployment/config skeleton 已准备。
8. 根 README 已切换为 PlaylistOut。
9. Constitution / Roadmap 未被绕过或擅自改写。
10. 没有提前假装完成 QQ Provider。
11. 没有删除旧功能。
12. 所有无法自动完成的 GitHub/Cloudflare 控制台步骤已列为明确 manual checklist。

---

# 15. Git / 提交要求

- 不重写历史。
- 不 force push。
- 尽量使用 `git mv` 表达旧文件迁移。
- 修改前记录 HEAD。
- 完成全部验证后再提交。
- 使用清晰 commit message，例如：

```text
chore: bootstrap PlaylistOut monorepo infrastructure
```

如果你拥有当前仓库的 push 权限，在全部验证通过后 push 当前工作分支/约定目标分支；如果环境不允许 push，不要伪造成功，明确给出 commit SHA 和尚未完成的 push 步骤。

---

# 16. 最终报告格式

完成后不要只回复“完成”。

最终必须给我：

1. **P0 结论：PASS / BLOCKED**
2. 当前 HEAD / 最终 commit SHA
3. 最终目录树（关键两层即可）
4. 旧文件迁移映射表
5. 新增基础设施列表
6. CI / Pages / Worker 配置说明
7. 所有实际执行的测试命令和结果
8. 仍需我手工在 GitHub / Cloudflare 控制台完成的事项
9. 明确声明本轮没有实现哪些 P1+ 功能
10. 任何风险、TODO 或 blocker

不要把“文件存在”当作验收；必须以实际 install/build/test 结果作为证据。
