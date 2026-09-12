# PlaylistOut

> **Paste. Parse. Export.**  
> 轻量、尊重隐私的在线歌单导出工具，纯客户端驱动导出为 TXT / CSV / Excel (XLSX) / JSON。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![CI](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml)
[![Deploy Web to GitHub Pages](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml)

---

## 当前状态

**v2.0.0 — QQ Music Web MVP 已完成并发布。**

当前正式支持 QQ 音乐公开歌单。后续 QQ 音乐兼容性问题按正常维护处理，不再重新开启 P0–P9；新增音乐平台则作为新的 Provider milestone 单独推进。

- 在线网站：[`https://playlistout.com`](https://playlistout.com)
- 最新路线图：[`docs/ROADMAP.md`](./docs/ROADMAP.md)
- v2.0.0：[`GitHub Release`](https://github.com/LengxiQwQ/playlistout/releases/tag/v2.0.0)

---

## 1. 项目简介

PlaylistOut 是一个专注于**公开音乐歌单结构化解析与多格式导出**的现代化开源工具。

- **核心流程**：打开网站 → 粘贴公开歌单链接 → 一键解析 → 实时预览并导出为 TXT / CSV / Excel (.xlsx) / JSON。
- **隐私至上**：无账号系统、无登录需求。服务端绝不持久化存储歌单历史、歌曲列表、个人身份或导出文件，导出文件 100% 在用户浏览器本地生成。
- **定位原则**：非播放器、非音乐下载器、无侵入性云端同步，专一且可靠地解决“歌单数据导出备份与格式迁移”的需求。

### 生产环境与在线服务

- **前端应用**：[`https://playlistout.com`](https://playlistout.com)（GitHub Pages）
- **根域名重定向**：`https://www.playlistout.com` 自动重定向至主域名
- **无状态 API**：[`https://api.playlistout.com`](https://api.playlistout.com)（Cloudflare Workers）

---

## 2. 功能特性

| 功能模块 | 说明 |
|---|---|
| **当前支持平台** | **QQ 音乐**公开歌单 |
| **输入兼容** | 支持 PC 网页链接、手机分享链接、纯数字歌单 ID 及混合文本快速提取 |
| **超大歌单解析** | 内置自动分页与死循环防护，支持解析 1000+ 首大型歌单，确保条目不遗漏 |
| **本地多格式导出** | 浏览器端本地生成 **TXT**、**CSV**（UTF-8 带 BOM）、**Excel (.xlsx)**、**JSON** |
| **一键剪贴板** | 支持按三种模式快速复制（仅歌名 / 歌名 - 歌手 / 完整歌曲信息） |
| **防公式注入保护** | CSV 与 Excel 导出对特殊字符（`=`、`+`、`-`、`@`）自动转义，防止表格软件公式执行风险 |
| **安全与滥用防护** | 出站严格域名白名单、禁止任意代理、Worker 实例级滑动窗口限流、OWASP 安全标头防护 |
| **无障碍与多端体验** | 支持移动端自适应、键盘导航与明确焦点指示、隐私数据说明 |

---

## 3. 仓库架构 (Monorepo)

本项目采用轻量级 npm monorepo 组织前端、后端与经典工具：

```text
playlistout/
├── web/                 # 前端应用 (React + TypeScript + Vite)
├── worker/              # 后端 API (Cloudflare Worker + TypeScript + D1)
├── cli/
│   └── qqmusic/         # 经典 QQ 音乐 Python CLI
├── docs/
│   ├── PROJECT-CONSTITUTION.md
│   ├── ROADMAP.md       # 当前路线图
│   ├── API.md
│   ├── MANUAL-SETUP.md  # 部署与运维指南
│   └── archive/         # 已完成里程碑的历史入口
├── .github/             # CI、Pages 与 Worker 自动部署
├── CHANGELOG.md
├── package.json
└── README.md
```

---

## 4. 本地开发指南

### 4.1 准备环境

- Node.js ≥ 20.x（推荐 LTS 22.x）
- npm ≥ 10.x
- Python ≥ 3.10（仅调试 Python CLI 需要）

### 4.2 安装所有依赖

```bash
npm install
```

### 4.3 一键启动全栈开发

- **Windows**：双击根目录 `start-dev.bat`
  - Worker：`http://localhost:8787`
  - Web：`http://localhost:5173`
  - 自动打开浏览器并连接本地 API
- **停止服务**：双击 `stop-dev.bat`，或在终端中按 `Ctrl+C`
- **跨平台**：`npm run dev` 启动，`npm run stop` 停止

### 4.4 检查与构建

```bash
# TypeScript 类型检查
npm run typecheck

# Web + Worker 自动化测试
npm run test

# 真实 QQ 音乐公开歌单验证（含 >1000 首分页样本）
npm --prefix worker run test:live

# 生产构建验证
npm run build
```

测试用例数量会随项目维护持续变化，因此 README 不固定声明具体测试总数；以当前 CI 输出为准。

---

## 5. 经典 Python CLI (QQ 音乐)

原有的独立 Python 命令行工具保留在 [`cli/qqmusic/`](./cli/qqmusic/)，支持单歌单导出和 QQ 号批量导出。

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
pytest -v
```

详细用法请查阅 [`cli/qqmusic/README.md`](./cli/qqmusic/README.md)。

---

## 6. 隐私与安全

1. **零歌单数据留存**：服务端不保存解析出的歌单、歌曲条目、提交的歌单 URL / ID 或导出文件。
2. **浏览器本地导出**：所有导出文件在用户本地浏览器内生成。
3. **匿名聚合统计**：D1 仅记录成功/失败等聚合计数，不保存个人标识或歌单内容。
4. **网络边界**：禁止任意外部代理，Provider 仅允许访问明确批准的上游域名。
5. **完整性优先**：上游数据不可信或不完整时优先报错，而不是生成残缺导出。

---

## 7. 文档

- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md)：长期产品、架构、隐私与安全边界
- [`ROADMAP.md`](./docs/ROADMAP.md)：当前维护与后续发展方向
- [`API.md`](./docs/API.md)：公开 API 约定
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md)：部署、恢复与运维
- [`docs/archive/`](./docs/archive/)：已完成里程碑的历史入口
- [`CHANGELOG.md`](./CHANGELOG.md)：版本变更历史

---

## 8. 许可证

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) 开源。
