<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="Playlist Out" />

# Playlist Out（把你的歌单带走）

**你的歌单，不应该只困在一个音乐平台里。**

解析、导出，并把歌单继续带进支持的开源播放器。

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/LengxiQwQ/playlistout/ci.yml?style=flat-square&label=CI)](https://github.com/LengxiQwQ/playlistout/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

🌐 在线使用：[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/)

</div>

---

## Playlist Out 是什么？

**Playlist Out** 是一个面向歌单备份、导出与迁移的开源工具。它会把支持平台中的公开歌单解析成统一的结构化数据：普通用户可以直接在网页里查看、整理并导出为 `Excel`、`JSON`、`TXT`、`CSV`、`M3U8`，也可以通过插件或适配把歌单继续带进支持的开源音乐播放器；开发者则可以通过 Public API 或标准 JSON 数据结构，把这套解析能力接入自己的应用、脚本或迁移工具。

Playlist Out **不是音乐播放器**，也不提供、存储或代理音频文件。项目只处理歌单与曲目元数据，目标是让歌单更容易备份、迁移和继续使用。

---

## 快速开始

不需要安装客户端，直接打开 [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/) 即可开始：

1. **解析歌单**：粘贴歌单链接、分享内容或支持的 ID，等待 Playlist Out 完成解析。
2. **查看与导出**：确认歌曲列表后，选择需要的 Excel、JSON、TXT、CSV 或 M3U8 格式。
3. **继续带走**：如果你使用受支持的开源播放器，还可以通过插件或适配把解析后的歌单继续导入播放器。

---

## 主要能力

| 核心能力 | 说明 |
|---|---|
| **多平台大歌单解析** | 支持 **QQ 音乐**、**网易云音乐**、**汽水音乐**、**酷狗音乐（含酷狗概念版）**，大歌单自动完整翻页 |
| **多种输入直接识别** | 支持粘贴 App 分享口令/文本、网页链接、短链、纯数字 ID，以及**酷狗音乐概念版**分享链接与酷狗码，无需手动提取网址 |
| **按用户批量查歌单** | 输入一个用户（如 QQ 号、网易云用户主页 / UID，或扫码授权酷狗账号），即可查出该用户下的**全部歌单**，支持勾选并批量解析导出 |
| **多格式纯本地导出** | 浏览器本地直接生成 `Excel`、`JSON`、`CSV`、`M3U8`、`TXT` 文件及剪贴板文本，保留歌曲、歌手、专辑、封面、时长及 VIP / 下架状态 |
| **播放器与迁移互通** | 支持把解析后的歌单直接带进 **MusicFree**、**BBPlayer** 等开源播放器，或通过 **Soundiiz / TuneMyMusic / FreeYourMusic** 跨平台迁移 |
| **CLI 与开放 API** | 提供可本地运行的 **Python CLI** 命令行批量导出工具，以及面向开发者的 **Public API** 与标准 **JSON 数据协议** |

---

## 支持的音乐平台

| 平台 | 单歌单解析 | 按用户批量解析 | 说明 |
|---|:---:|:---:|---|
| **QQ 音乐** | ✅ | ✅ | 免登录；支持歌单链接 / ID，或输入 QQ 号查出该用户下全部公开歌单并批量导出 |
| **网易云音乐** | ✅ | ✅ | 免登录；支持歌单链接 / 短链 / ID，或输入用户主页 / UID 查出该用户下全部公开歌单并批量导出 |
| **汽水音乐** | ✅ | — | 免登录；支持公开分享歌单，可切换「汽水官方解析」与「抖音全量解析（含视频原声）」 |
| **酷狗音乐（含概念版）** | ✅ | ✅ | 公开内容可免登录预览歌单 10 首歌曲；扫码授权后可解析完整歌单，并支持查看与批量导出账号下全部歌单 |

> 平台能力依赖上游公开页面与接口，可能随着上游机制变化而调整。

---

## 把歌单带进更多地方

**Playlist Out 不只帮你把歌单导出来，也能把它继续带进支持的开源播放器。**  
不同播放器的架构各不相同，Playlist Out 会根据目标应用提供 **独立插件**、**软件原生内置** 或 **通用 JSON 导入兼容** 等接入方式。

### 已接入应用

#### 1. [MusicFree](https://musicfree.catcat.work/)（✅ 已支持 · 插件接入）

在 MusicFree 中安装 Playlist Out 插件后，即可通过「导入外部歌单」直接粘贴歌单链接，或填入本地导出的 JSON 文件路径完成导入。

- **插件安装地址**（对应网页端「复制插件地址」按钮）：
  
  ```text
  https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js
  ```
- **相关入口**：[官网下载](https://musicfree.catcat.work/) · [GitHub 源码](https://github.com/maotoumao/MusicFree) · [插件安装与使用说明](plugins/musicfree/README.md) · [GitHub Discussion](https://github.com/maotoumao/MusicFree/discussions/666)

#### 2. [BBPlayer](https://bbplayer.roitium.com)（⏳ 即将可用 · 软件原生功能）

BBPlayer 已在主程序中原生内置 Playlist Out 导入歌单能力，无需额外安装插件，支持通过歌单链接在线解析或选择本地 JSON 文件导入。该功能当前为**即将可用（待上线）**状态，将随 BBPlayer 新版本发布上线。

- **相关入口**：[官网下载](https://bbplayer.roitium.com) · [GitHub 源码](https://github.com/bbplayer-app/BBPlayer) · [相关讨论 (Issue #340)](https://github.com/bbplayer-app/BBPlayer/issues/340)

### 下一站（正在推进）

| 应用 | 当前状态 | 规划接入方式 | 进展与入口 |
|---|---|---|---|
| **[LX Music](https://lxmusic.toside.cn/)** | 💬 已向上游提案 | 本地 JSON 导入兼容 | [Issue #3001](https://github.com/lyswhut/lx-music-desktop/issues/3001) · [GitHub](https://github.com/lyswhut/lx-music-desktop) |
| **[Listen 1](https://listen1.github.io/listen1/)** | 💬 已向上游提案 | 本地 JSON 导入兼容 | [Issue #1413](https://github.com/listen1/listen1_desktop/issues/1413) · [GitHub](https://github.com/listen1/listen1_desktop) |
| **[Moosync](https://moosync.app/)** | 🗓️ 计划中 | Extension 扩展适配 | [GitHub](https://github.com/Moosync/Moosync) |

---

## Python CLI / 命令行

除了网页和第三方播放器，Playlist Out 也保留了可以直接在本地运行的 Python 命令行工具。CLI 适合希望在终端中完成歌单导出、批量处理，或者不想依赖网页界面的用户。

当前仓库内置两套独立 CLI：

| 平台 | 脚本 | 支持内容 |
|---|---|---|
| **QQ 音乐** | [`cli/qqmusic/qq_music_playlist_export.py`](cli/qqmusic/qq_music_playlist_export.py) | 歌单链接 / ID、QQ 号用户歌单、批量导出 |
| **网易云音乐** | [`cli/netease/netease_playlist_export.py`](cli/netease/netease_playlist_export.py) | 歌单链接 / 短链 / ID、用户公开歌单 |

两套 CLI 均支持 **Excel → JSON → TXT → CSV → M3U8** 导出。

### QQ 音乐 CLI

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

👉 [QQ 音乐 CLI 完整说明](cli/qqmusic/README.md)

### 网易云音乐 CLI

```bash
cd cli/netease
pip install -r requirements.txt
python netease_playlist_export.py
```

👉 [网易云音乐 CLI 完整说明](cli/netease/README.md)

> 当前仓库中的独立 Python CLI 主要覆盖 QQ 音乐与网易云音乐；酷狗音乐和汽水音乐目前通过 Web / Public API 提供解析能力。

---

## 导出格式

| 格式 | 适合的场景 |
|---|---|
| **Excel (.xlsx)** | 通用表格交换、FreeYourMusic / Soundiiz 等文件导入、整理归档；首个 `Tracks` Sheet 为干净的一歌一行结构 |
| **JSON** | 开发者、脚本、第三方应用和播放器接入；采用统一 Canonical 结构（单一歌手 `artist`、平铺通用、零空值填充） |
| **TXT** | 阅读、简单备份与文本处理 |
| **CSV** | 通用歌单迁移与数据交换；使用 `title / artist / album / isrc` 等语言无关标准列名 |
| **M3U8** | 本地播放器、媒体库以及支持 Extended M3U/M3U8 的迁移工具 |

导出文件由浏览器本地生成，不需要把导出文件上传到服务器。

如果你需要稳定的数据结构用于程序读取，请优先使用 **JSON**，并参考 [JSON 数据格式规范](docs/JSON-SCHEMA.md)。需要在不同歌单迁移工具之间交换文件时，优先考虑 **CSV / M3U8 / Excel**。各格式当前的字段、Sheet 与兼容性约定见 [Web 导出格式规范](docs/EXPORT-FORMATS.md)。

---

## 隐私与项目边界

Playlist Out 尽量保持简单、透明：

- 不提供网站账号体系
- 不建立用户歌单数据库
- 导出文件在浏览器本地生成
- 不存储用户导出的歌曲列表或文件
- 酷狗授权信息仅保存在用户本地浏览器
- 服务端仅保留不包含具体歌单内容的匿名聚合统计
- 不提供、不存储、也不代理任何音频流

网站中的「隐私政策」提供更完整的数据处理说明。

---

## 开发者接入

Playlist Out 同时提供面向开发者的 **Public API** 和稳定的 **JSON 数据结构**，可用于开源播放器、歌单迁移工具、自动化脚本以及其他第三方客户端。

### Public API

生产环境 API：

```text
https://playlistout-api.lengxiqwq.com
```

最简单的统一解析入口：

```http
GET /api/v1/resolve?q=<歌单链接或分享内容>
```

Public API 文档包含：

- 支持的 endpoint 与请求参数
- CORS 与认证规则
- 酷狗授权 Header 传递方式
- 限流规则
- 标准响应结构与错误码
- JavaScript / Python / cURL 接入说明

👉 [查看完整 Public API 文档](docs/API.md)

### 数据协议 / JSON Schema

如果你的应用不想依赖在线 API，也可以直接读取 Playlist Out 导出的 JSON 文件。

JSON Schema 文档定义了 Playlist Out 的标准歌单数据结构，包括歌单信息、歌曲字段、平台来源、封面、时长和可用状态等，是第三方播放器做本地导入兼容时最重要的协议文档。

👉 [查看 JSON 数据格式规范](docs/JSON-SCHEMA.md)

### 播放器与插件接入

如果你正在维护开源音乐播放器，并希望接入 Playlist Out：

- 有扩展系统的播放器，可以开发独立插件 / Extension；
- 支持本地文件导入的播放器，可以兼容 Playlist Out JSON；
- 也可以直接调用 Public API 获取统一结构的歌单数据。

👉 [查看开源播放器生态接入与适配计划](docs/ECOSYSTEM-INTEGRATION.md)

---

## 本地开发

Playlist Out 使用 monorepo 管理网页、Worker 与插件代码。

```text
playlistout/
├── web/                  # React / Vite 前端
├── worker/               # Cloudflare Worker API
├── cli/                  # Python 命令行导出工具
│   ├── qqmusic/
│   └── netease/
├── plugins/
│   └── musicfree/        # MusicFree 插件
├── docs/                 # API、数据协议与项目文档
└── scripts/              # 开发、检查与维护脚本
```

安装依赖：

```bash
npm install
```

启动本地开发环境：

```bash
npm run dev
```

运行完整项目检查：

```bash
npm run check
```

构建：

```bash
npm run build
```

---

## 文档导航

README 只保留使用项目所需的核心信息，更详细的协议、接口与架构说明分别放在专门文档中。

| 文档 | 适合谁看 | 内容 |
|---|---|---|
| [Public API](docs/API.md) | 第三方开发者 | API endpoint、参数、认证、CORS、限流、响应结构与错误码 |
| [JSON Schema](docs/JSON-SCHEMA.md) | 播放器 / 工具开发者 | Playlist Out 标准 JSON 数据协议与字段定义 |
| [Web 导出格式规范](docs/EXPORT-FORMATS.md) | 用户 / 迁移工具开发者 | CSV、XLSX、JSON、M3U8、TXT 的当前结构、字段和兼容性约定 |
| [QQ 音乐 CLI](cli/qqmusic/README.md) | 命令行用户 | QQ 音乐歌单 / 用户歌单导出、安装与使用说明 |
| [网易云音乐 CLI](cli/netease/README.md) | 命令行用户 | 网易云歌单 / 用户歌单导出、安装与使用说明 |
| [MusicFree 插件](plugins/musicfree/README.md) | MusicFree 用户与插件开发者 | 插件安装、使用、配置、构建与测试 |
| [生态接入计划](docs/ECOSYSTEM-INTEGRATION.md) | 开源播放器维护者 | 第三方播放器调研、字段映射、Issue / PR 接入规划 |
| [项目规范](docs/PROJECT-CONSTITUTION.md) | 贡献者 / 维护者 | 项目架构、安全、隐私、产品边界和长期原则 |
| [Roadmap](docs/ROADMAP.md) | 用户与贡献者 | 当前进度与后续开发方向 |

---

## 贡献

Issue、功能建议和 Pull Request 都欢迎。

如果你正在开发或维护开源音乐播放器，并希望支持 Playlist Out，可以直接创建 Issue 讨论最适合的接入方式：

👉 [提交 Issue](https://github.com/LengxiQwQ/playlistout/issues)

---

## 开源许可

Playlist Out 使用 [MIT License](LICENSE) 开源。

MIT License 允许你在保留原始版权与许可声明的前提下自由使用、复制、修改和分发代码，包括用于商业项目。具体条款以仓库中的 [`LICENSE`](LICENSE) 文件为准。

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

访问次数：**1,183** ｜ 不重复访客：**240**（近 14 天） ｜ 仓库克隆：**8,630** ｜ 不重复克隆：**948**（近 14 天）

**热门来源（近 14 天）：** github.com · Bing · Google · Baidu · chatgpt.com · sogou.com  
**热门内容（近 14 天）：** plugins/musicfree · tree/main · releases/tag/v2.2.0 · pulls

> 数据开始：2026-09-07 · 最后更新：2026-10-10
<!-- INSIGHTS:END -->

---

<div align="center">

### Playlist Out · 把你的歌单带走

做 Playlist Out 的初衷一直很简单：**让歌单属于用户自己，而不是困在某一个平台里。**

希望它能把你认真整理的歌单带出来，也能继续带到你真正想去的地方。

**Made with ❤️ by [LengxiQwQ](https://github.com/LengxiQwQ)**

</div>
