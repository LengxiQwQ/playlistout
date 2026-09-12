# PlaylistOut

> **Paste. Parse. Export.**  
> 轻量、尊重隐私的在线歌单导出工具，纯客户端驱动导出为 TXT / CSV / Excel (XLSX) / JSON。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![CI](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml)
[![Deploy Web to GitHub Pages](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/deploy-pages.yml)

---

## 1. 项目简介

PlaylistOut 是一个专注于**公开音乐歌单结构化解析与多格式导出**的现代化开源工具。

- **核心流程**：打开网站 &rarr; 粘贴公开歌单链接 &rarr; 一键解析 &rarr; 实时预览并导出为 TXT / CSV / Excel (.xlsx) / JSON。
- **隐私至上**：无账号系统、无登录需求。服务端绝不持久化存储歌单历史、歌曲列表、个人身份或导出文件，导出文件 100% 在用户浏览器本地生成。
- **定位原则**：非播放器、非音乐下载器、无侵入性云端同步，专一且可靠地解决“歌单数据导出备份与格式迁移”的需求。

### 生产环境与在线服务

- **前端应用**：[`https://playlistout.com`](https://playlistout.com)（全球 CDN 加速，托管于 GitHub Pages）
- **根域名重定向**：`https://www.playlistout.com` 自动重定向至主域名
- **无状态 API**：[`https://api.playlistout.com`](https://api.playlistout.com)（运行于 Cloudflare Workers）

---

## 2. 功能特性

| 功能模块 | 说明 |
|---|---|
| **支持平台** | **QQ 音乐** 公开歌单（MVP 版本首发平台） |
| **输入兼容** | 支持 PC 网页链接、手机分享短链、纯数字歌单 ID 及混合文本快速提取 |
| **超大歌单解析** | 内置自动分页与死循环防护，支持解析 1000+ 首大型歌单，确保条目不遗漏 |
| **本地多格式导出** | 浏览器端本地生成 **TXT**、**CSV**（UTF-8 带 BOM）、**Excel (.xlsx)**、**JSON** |
| **一键剪贴板** | 支持按三种模式快速复制（仅歌名 / 歌名 - 歌手 / 完整歌曲信息） |
| **防公式注入保护** | CSV 与 Excel 导出对特殊字符（`=`、`+`、`-`、`@`）自动转义，防止表格软件公式执行风险 |
| **安全与滥用防护** | 出站严格域名白名单、禁止任意代理、Worker 实例级滑动窗口限流（单节点约 30 次/分钟）、OWASP 安全标头防护 |
| **无障碍与多端体验** | 支持移动端自适应（<640px）、键盘导航与明确焦点指示、无弹窗阻断的隐私数据说明 |

---

## 3. 仓库架构 (Monorepo)

本项目采用轻量级 npm monorepo 组织前端、后端与经典工具：

```text
playlistout/
├── web/                 # 前端应用 (React 18 + TypeScript + Vite)
├── worker/              # 后端无状态 API (Cloudflare Worker + TypeScript + D1)
├── cli/                 # 命令行工具
│   └── qqmusic/         # 经典 QQ 音乐 Python 命令行导出工具（完整保留并维护）
├── docs/                # 项目架构宪法、完整路线图、API 规范与运维配置手册
│   ├── PROJECT-CONSTITUTION.md
│   ├── ROADMAP.md
│   ├── API.md
│   └── MANUAL-SETUP.md
├── .github/             # GitHub Actions CI、Pages 部署与 Worker 自动化发布工作流
├── CHANGELOG.md         # 版本更新历史记录
├── package.json         # 根级 npm workspaces 配置
└── README.md
```

---

## 4. 本地开发指南

### 4.1 准备环境

- Node.js &ge; 20.x（推荐 LTS 22.x）
- npm &ge; 10.x
- Python &ge; 3.10（仅调试 Python CLI 需要）

### 4.2 安装所有依赖

在仓库根目录下执行：

```bash
npm install
```

### 4.3 一键启动全栈开发与自动打开浏览器

- **Windows 用户（极简推荐）**：直接双击根目录下的 **`start-dev.bat`**！
  - 自动启动后端 Worker（端口 `8787`）；
  - 自动启动前端 Web（端口 `5173`）；
  - 自动在默认浏览器中打开 `http://localhost:5173`；
  - 自动配置反向代理，前端可无缝调用本地后端 API。
- **一键停止服务**：双击根目录下的 **`stop-dev.bat`**（或在运行终端中按 `Ctrl+C`）。
- **跨平台命令行运行**：在根目录下执行 `npm run dev`（启动）或 `npm run stop`（关闭）。

### 4.4 运行全面检查与构建

在根目录下可一键对所有 workspace 执行自动化校验：

```bash
# TypeScript 类型检查 (web + worker)
npm run typecheck

# 单元测试与端到端模拟测试 (44 web + 54 worker = 98 tests)
npm run test

# 真实 QQ 音乐公开歌单在线抓取矩阵测试 (包含 >1000 首分页真实测试)
npm --prefix worker run test:live

# 生产级构建验证
npm run build
```

---

## 5. 经典 Python CLI (QQ 音乐)

原有的独立 Python 命令行工具已迁移至 [`cli/qqmusic/`](./cli/qqmusic/)，所有抓取、解析、多格式导出以及 QQ 号批量导出逻辑**完全保留并可继续使用**。

```bash
cd cli/qqmusic

# 安装 Python 依赖
pip install -r requirements.txt

# 运行导出工具
python qq_music_playlist_export.py

# 运行测试
pytest -v
```

详细用法与更新日志请查阅 [`cli/qqmusic/README.md`](./cli/qqmusic/README.md)。

---

## 6. 隐私与安全承诺

1. **零数据留存**：服务端无状态运行，不存储任何解析出的歌单、歌曲条目、提交的歌单 URL 或 ID。
2. **本地客户端导出**：所有导出文件的编码、排版与组装全部在用户本地浏览器内存中完成。
3. **匿名宏观统计**：仅在 Cloudflare D1 中记录匿名的成功/失败计数，不包含任何个人标识或歌单具体内容。
4. **安全加固**：禁用任意外部代理、限制单次处理最大分页、防范 CSV 公式注入与 SSRF。
5. **依赖安全评估**：前端仅单向调用 SheetJS (`xlsx`) 进行内存中表格构建与文件下载，绝不接收或解析用户上传的外部二进制文件，不受表格解析器反序列化攻击面影响。

---

## 7. 许可证

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) 开源。
