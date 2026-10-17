<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="Playlist Out" />

# Playlist Out · 把你的歌单带走

**你的歌单，不应该只困在一个音乐平台里。**

解析、导出，并把歌单继续带进支持的开源播放器。

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Release](https://img.shields.io/github/v/release/LengxiQwQ/playlistout?style=flat-square&logo=github&label=Release)](https://github.com/LengxiQwQ/playlistout/releases)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/LengxiQwQ/playlistout/ci.yml?style=flat-square&label=CI)](https://github.com/LengxiQwQ/playlistout/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

</div>

---

## 🚀 快速使用

🌐 **在线网页版**：打开浏览器即可直接使用 👉 **[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/)**

---

### 💻 本地 CLI（交互式 & 命令行参数模式）

| 获取方式 | 适合场景 | 安装与使用 |
| :--- | :--- | :--- |
| ⚡ **包管理器安装** | 喜欢终端命令的玩家 | `npm install -g playlistout`<br>*(装完输入 `playlistout` 启动)* |
| 🗂️ **单文件免安装** | 喜欢桌面双击的用户 | [前往 Releases 下载单文件](https://github.com/LengxiQwQ/playlistout/releases/latest) |

> 💡 注：WinGet (`winget install LengxiQwQ.PlaylistOut`) 与 Scoop 官方源正在同步审核中。

---

## 🎵 支持的平台

| 平台 | 单歌单解析 | 用户歌单批量导出 | 说明 |
|---|:---:|:---:|---|
| **QQ 音乐** | ✅ | ✅ | 支持歌单链接 / 分享短链 / 歌单 ID，或输入 QQ 号查询全部公开歌单并批量导出 |
| **网易云音乐** | ✅ | ✅ | 支持歌单链接 / 分享短链 / 歌单 ID，或输入用户主页 / UID 批量导出公开歌单 |
| **酷狗音乐** | ⚠️ 免登录前 10 首 | ✅ 需登录 | 普通歌单免登录受官方接口限制仅解析前 10 首；扫码登录后可完整导出并查询个人云端歌单 |
| **酷狗概念版** | ✅ | — | 支持概念版集合歌单链接与分享短链，免登录全量解析 |
| **酷我音乐** | ✅ | — | 支持歌单链接 / 分享短链 / 歌单 ID，自动分页获取完整歌单 |
| **汽水音乐** | ✅ | — | 支持歌单链接 / 抖音分享文案 / 歌单 ID，可使用汽水官方或抖音解析通道 |
| **咪咕音乐** | ✅ | — | 支持歌单链接 / 分享短链 / 歌单 ID，自动获取完整歌单 |

---

## 📦 导出格式

| 格式 | 适合场景 |
|---|---|
| **Excel (.xlsx)** | **推荐**：适合本地曲库整理、筛选、查看和长期归档 |
| **JSON (.json)** | **推荐**：Playlist Out 标准数据格式，适合播放器、插件、脚本和第三方程序使用 |
| **CSV (.csv)** | 通用表格格式，适合迁移工具、数据分析和其他软件导入 |
| **TXT (.txt)** | 纯文本歌曲清单（歌名 - 歌手），适合快速查看和复制 |
| **M3U8 (.m3u8)** | 标准 Extended M3U 播放列表，适合兼容该格式的播放器和媒体管理工具 |

详细字段和格式定义见 [导出格式说明](docs/EXPORT-FORMATS.md) 和 [JSON Schema](docs/JSON-SCHEMA.md)。

---

## 🎧 把歌单带进开源播放器

**Playlist Out 不只帮你把歌单导出来，也能把它继续带进你喜爱的开源音乐播放器。**

### [MusicFree](https://musicfree.catcat.work/)（✅ 已支持 · 插件接入）

在 MusicFree 中安装 Playlist Out 插件后，即可在播放器中通过「导入外部歌单」直接粘贴歌单链接或导入导出的 JSON 文件：

- **插件安装链接**（复制下方链接到 MusicFree「插件设置 → 从网络安装插件」中粘贴即可安装）：

```text
https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js
```

- **使用指南**：[MusicFree 插件安装与使用说明](plugins/musicfree/README.md) · [MusicFree 官网](https://musicfree.catcat.work/)

### [BBPlayer](https://bbplayer.roitium.com)（⏳ 即将上线 · 原生功能内置）

BBPlayer 已完成 Playlist Out 歌单导入适配，将在下一正式版本中原生内置，届时无需安装任何插件，直接粘贴链接即可导入。

- [BBPlayer 官网](https://bbplayer.roitium.com) · [GitHub 仓库](https://github.com/bbplayer-app/BBPlayer)

- **更多播放器适配计划**：我们规划了针对 **LX Music**、**Listen 1** 等开源播放器的本地歌单导入适配方案，欢迎社区共同推进。

---

## 💻 本地 CLI 常用命令

Playlist Out CLI 支持**交互向导**与**命令行参数**两种模式，常用调用示例如下：

```bash
# 1. 交互向导模式（直接回车，根据屏幕提示粘贴链接即可）
playlistout

# 2. 单歌单直接导出（可多选格式：xlsx, csv, json, txt, m3u8）
playlistout "https://music.163.com/playlist?id=2756674066" -f xlsx,csv

# 3. 纯数字 ID 解析（通过 -p 锁定平台）
playlistout "9044196528" -p qqmusic -f xlsx

# 4. 用户公开歌单批量导出（支持全量导出或指定编号）
playlistout "1160951354" -p qqmusic --user -f json --no-open
playlistout -p kugou --user --select 1,2 -f json --no-open

# 5. 酷狗凭证配置（亦可直接输入 login 调出终端扫码）
playlistout -p kugou --token <TOKEN> --userid <USERID>
```

👉 更多参数选项、平台特性与退出状态码详见 [Playlist Out CLI 使用指南 (cli/README.md)](cli/README.md)。

---

## 🔌 开发者接入

Playlist Out 提供 Public API 和统一的 Canonical JSON 数据格式，可用于播放器、插件、迁移工具和自动化脚本。

### Public API

无需注册账号或申请 Token，可以直接调用：

```bash
curl "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/playlist?id=2756674066"
```

支持长链接、短链和分享文本自动识别，多平台返回统一的数据结构，并允许浏览器跨域调用。

公共端点单 IP 限制为每分钟最多 6 次请求。

👉 [Public API 完整文档](docs/API.md)

### Canonical JSON

Playlist Out 导出的 JSON 使用统一数据结构。第三方播放器或工具只需适配一套 Schema，即可读取来自不同音乐平台的歌单。

👉 [JSON 数据格式定义](docs/JSON-SCHEMA.md)

---

## 🧩 开源播放器与插件生态

Playlist Out 为第三方播放器、插件和音乐工具提供统一的歌单接入能力：

- 通过 **Public API** 直接解析歌单链接、短链和分享文本。
- 读取 **Playlist Out Canonical JSON**，在本地完成歌单导入和数据转换。
- 根据目标应用的数据结构进行字段映射，并接入现有导入流程。
- 新的播放器、插件或工具适配可以通过 Issue 讨论接入方案和兼容需求。

详细的接入方式、字段映射和适配计划见：

👉 [开源播放器生态接入与适配计划](docs/ECOSYSTEM-INTEGRATION.md)

---

## 🛠️ 开发与构建

仓库使用 monorepo 管理 Web、Worker、CLI 和插件：

```text
playlistout/
├── web/                  # React / Vite 网页前端
├── worker/               # Cloudflare Worker API
├── cli/                  # Python CLI
├── plugins/              # 开源播放器插件
├── docs/                 # API、协议与项目文档
└── scripts/              # CI、构建与发布脚本
```

常用命令：

```bash
# 安装依赖
npm install

# 启动本地开发环境
npm run dev

# 运行完整检查
npm run check

# 构建 Web / Worker / 插件
npm run build

# 从源码运行 CLI
python -m pip install -r cli/requirements.txt
python -m cli

# 构建当前系统的 CLI 发行包
python -m pip install -r cli/requirements-release.txt
python scripts/release/build-cli.py

# 本地一键归集发行文件
npm run build:publish
```

Windows、Linux、macOS Apple Silicon 和 macOS Intel 的完整发行包由 GitHub Actions 自动构建。

推送版本 Tag 后，`Release CLI` Workflow 会在对应系统的 GitHub Runner 上完成构建、测试、校验文件生成和 Draft Release 创建。

更完整的构建与发布流程见 [CLI 维护者发布手册](cli/README.md#-维护者发布手册draft-审核与回滚)，Web、Worker 和生产环境部署见 [部署与运维说明](docs/MANUAL-SETUP.md)。

---

## 📚 文档

| 文档 | 内容 |
|---|---|
| [CLI 指南](cli/README.md) | CLI 使用、参数、认证、构建与发布 |
| [Public API](docs/API.md) | API 参数、响应结构、错误码与限流 |
| [JSON Schema](docs/JSON-SCHEMA.md) | Playlist Out 标准 JSON 数据协议 |
| [导出格式](docs/EXPORT-FORMATS.md) | Excel、JSON、CSV、TXT、M3U8 格式规范 |
| [MusicFree 插件](plugins/musicfree/README.md) | 插件安装、使用、配置与开发 |
| [生态接入计划](docs/ECOSYSTEM-INTEGRATION.md) | 第三方播放器、插件和其他音乐工具接入 |
| [新平台接入](docs/PROVIDER-ONBOARDING.md) | 新音乐平台 Provider 接入流程 |
| [项目规范](docs/PROJECT-CONSTITUTION.md) | 项目架构、安全、隐私与产品边界 |
| [Roadmap](docs/ROADMAP.md) | 当前进度与后续方向 |
| [部署与运维](docs/MANUAL-SETUP.md) | Web、Worker、D1 与生产环境维护 |

---

## 🤝 贡献

Issue、功能建议和 Pull Request 都欢迎。

如果你希望接入新的音乐平台、适配新的播放器或修复兼容问题，可以直接创建 Issue。

👉 [提交 Issue](https://github.com/LengxiQwQ/playlistout/issues)

---

## 📜 开源许可

Playlist Out 使用 [MIT License](LICENSE) 开源。

你可以在保留原始版权与许可声明的前提下自由使用、复制、修改和分发代码，包括用于商业项目。

---

## ⭐ Star 历史

<a href="https://www.star-history.com/?repos=LengxiQwQ%2Fplaylistout&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&theme=dark&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=LengxiQwQ/playlistout&type=date&legend=top-left&sealed_token=OaKwkWC2X0kmrzy16Wj7Qef0e-M9T5jTHXDQh3JN1hdjg3twCmEZxCJ3vmpH8ZMlK6jjI7F_ntJENcAl11D2S64ym_jrGAnMVVtAtYVCtgUGBaYy9T5JPQ" />
 </picture>
</a>

<!-- INSIGHTS:START -->
**📊 仓库流量**

访问次数：**1,495** ｜ 不重复访客：**286**（近 14 天） ｜ 仓库克隆：**9,956** ｜ 不重复克隆：**1,034**（近 14 天）

**热门来源（近 14 天）：** github.com · Google · Bing · audio-file.org · chatgpt.com  
**热门内容（近 14 天）：** plugins/musicfree · issues · pulls · releases/tag/v2.2.0

> 数据开始：2026-09-07 · 最后更新：2026-10-17
<!-- INSIGHTS:END -->

---

<div align="center">

### Playlist Out · Paste. Parse. Export.

做 Playlist Out 的初衷一直很简单：**让歌单属于用户自己，而不是困在某一个平台里。**

**Made with ❤️ by [LengxiQwQ](https://github.com/LengxiQwQ)**

</div>
