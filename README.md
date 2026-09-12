# PlaylistOut

> **Paste. Parse. Export.**  
> 轻量、尊重隐私的在线歌单导出工具，纯客户端驱动导出为 TXT / CSV / Excel (XLSX) / JSON。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml)
[![Deploy Web to GitHub Pages](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml)

---

## 1. 项目简介

PlaylistOut 是一个专注于**公开音乐歌单结构化导出**的轻量级工具。

- **核心流程**：打开网站 &rarr; 粘贴公开歌单链接 &rarr; 一键解析 &rarr; 预览并导出为 TXT / CSV / XLSX / JSON。
- **隐私至上**：绝不在服务端或数据库存储歌单历史、歌曲列表、用户账号或导出文件。
- **定位原则**：非播放器、非音乐下载器、无账号系统、无跨平台同步服务，保持极简实用。

### 当前状态：Phase 1 完成（QQ 音乐 Provider 核心打通）

- **MVP 目标平台**：首发支持 **QQ 音乐** 公开歌单。
- **当前进度**：
  - **Phase 0 完成**：Monorepo 骨架与基础设施、CI、GitHub Pages 部署跑通；
  - **Phase 1 完成**：Cloudflare Worker 中实现真实的 QQ 音乐 Provider（输入校验、上游请求、分页拉取、完整性核验与标准化数据契约），并通过多组真实公开歌单验证。
- **已上线服务**：
  - 前端静态站点：`https://playlistout.com`（GitHub Pages 全球加速）
  - API 服务端：`https://api.playlistout.com`（Cloudflare Worker 生产环境）

规范与规划详见：
- 架构宪法：[`docs/PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md)
- 路线图与交付门禁：[`docs/ROADMAP.md`](./docs/ROADMAP.md)
- 外部手动配置清单：[`docs/MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md)

---

## 2. 仓库架构 (Monorepo)

本项目采用轻量级 npm monorepo 组织代码与工具：

```text
playlistout/
├── web/                 # 前端应用 (React 18 + TypeScript + Vite)
├── worker/              # 后端服务 (Cloudflare Worker + TypeScript)
├── cli/                 # 命令行工具
│   └── qqmusic/         # 经典 QQ 音乐 Python 命令行导出工具（完整保留并维护）
├── docs/                # 项目架构宪法、路线图与手动配置文档
├── .github/             # GitHub Actions CI 与 Pages 部署工作流
├── package.json         # 根级 npm workspaces 配置
└── README.md
```

---

## 3. 本地开发指南

### 3.1 准备环境

- Node.js &ge; 20.x
- npm &ge; 10.x
- Python &ge; 3.10（仅调试 Python CLI 需要）

### 3.2 安装所有依赖

在仓库根目录下执行：

```bash
npm install
```

### 3.3 启动 Web 前端开发服务器

```bash
cd web
npm run dev
# 或在根目录: npm --prefix web run dev
```

前端将在 `http://localhost:5173` 启动。

### 3.4 启动 Cloudflare Worker 本地模拟

```bash
cd worker
npm run dev
# 或在根目录: npm --prefix worker run dev
```

Worker 本地接口在 `http://localhost:8787` 运行，支持 `/health` 与预留的 `/api/playlist` 骨架路由。

### 3.5 运行全面检查

在根目录下可一键对所有 workspace 执行检查与构建：

```bash
# 类型检查
npm run typecheck

# 单元测试 (web + worker)
npm run test

# 生产构建 (web + worker dry-run)
npm run build
```

---

## 4. 经典 Python CLI (QQ 音乐)

原有的独立 Python 命令行工具已安全迁移至 [`cli/qqmusic/`](./cli/qqmusic/)，所有抓取、解析、多格式导出以及 QQ 号批量导出逻辑**完全保留并可继续使用**。

### 运行 Python CLI

```bash
cd cli/qqmusic

# 安装 Python 依赖
pip install -r requirements.txt

# 运行导出工具
python qq_music_playlist_export.py
```

### 运行 Python CLI 测试

```bash
pytest -v cli/qqmusic/
```

详细用法与更新日志请查阅 [`cli/qqmusic/README.md`](./cli/qqmusic/README.md)。

---

## 5. 许可证

本项目基于 [MIT License](./LICENSE) 开源。
