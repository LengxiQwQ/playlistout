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

**Playlist Out** 是一个面向歌单备份、导出与迁移的开源工具。它会把支持平台中的公开歌单解析成统一的结构化数据：普通用户可以直接在网页里查看、整理并导出为 `Excel`、`JSON`、`TXT`、`CSV`、`M3U8`、`Markdown`，也可以通过插件或适配把歌单继续带进支持的开源音乐播放器；开发者则可以通过 Public API、Python CLI 或标准 JSON 数据结构，把这套解析能力接入自己的应用、脚本或迁移工具。

Playlist Out **不是音乐播放器**，也不提供、存储或代理音频文件。项目只处理歌单与曲目元数据，目标是让歌单更容易备份、迁移和继续使用。

---

## 快速开始

不需要安装客户端，直接打开 [playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/) 即可开始：

1. **解析歌单**：粘贴歌单链接、分享内容或支持的 ID，等待 Playlist Out 完成解析。
2. **查看与导出**：确认歌曲列表后，选择需要的 Excel、JSON、TXT、CSV、M3U8 或 Markdown 格式。
3. **继续带走**：如果你使用受支持的开源播放器，还可以通过插件或适配把解析后的歌单继续导入播放器。

---

## 主要能力

| 核心能力 | 说明 |
|---|---|
| **多平台大歌单解析** | 支持各大主流音乐平台（QQ 音乐、网易云、酷狗、酷我、汽水等），大歌单自动完整翻页 |
| **多种输入直接识别** | 支持粘贴 App 分享口令/文本、网页链接、短链、纯数字 ID，以及**酷狗音乐概念版**分享链接与酷狗码，无需手动提取网址 |
| **按用户批量查歌单** | 输入一个用户（如 QQ 号、网易云用户主页 / UID，或扫码授权酷狗账号），即可查出该用户下的**全部歌单**，支持勾选并批量解析导出 |
| **多格式纯本地导出** | 浏览器本地插件化生成 `Excel`、`JSON`、`CSV`、`M3U8`、`TXT`、`Markdown` 文件及剪贴板文本，保留歌曲、歌手、专辑、封面、时长及 VIP / 下架状态 |
| **播放器与迁移互通** | 支持把解析后的歌单直接带进 **MusicFree**、**BBPlayer** 等开源播放器，或通过 **Soundiiz / TuneMyMusic / FreeYourMusic** 跨平台迁移 |
| **CLI 与开放 API** | 提供可本地运行的 **Python CLI** 命令行批量导出工具，以及面向开发者的 **Public API** 与标准 **JSON 数据协议** |

---

## 支持的音乐平台

| 平台 | 单歌单解析 | 按用户批量解析 | 说明 |
|---|:---:|:---:|---|
| **QQ 音乐** | ✅ | ✅ | 免登录；支持歌单链接 / ID，或输入 QQ 号查出该用户下全部公开歌单并批量导出 |
| **网易云音乐** | ✅ | ✅ | 免登录；支持歌单链接 / 短链 / ID，或输入用户主页 / UID 查出该用户下全部公开歌单并批量导出 |
| **酷狗音乐（含概念版）** | ✅ | ✅ | 公开内容可免登录预览歌单 10 首歌曲；扫码授权后可解析完整歌单，并支持查看与批量导出账号下全部歌单 |
| **酷我音乐** | ✅ | — | 免登录；支持歌单链接 / ID / 分享口令，自动完整分页获取全部曲目 |
| **汽水音乐** | ✅ | — | 免登录；支持公开分享歌单，可切换「汽水官方解析」与「抖音全量解析（含视频原声）」 |

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

### ⚡ 全平台统一 CLI (推荐)

统一命令行工具支持**智能自动识别平台**与**手动选择锁定**双轨模式，所有数据均在本地处理，无需启动 Web 服务：

```bash
# 1. 安装依赖
pip install -r cli/requirements.txt

# 2. 交互式启动 (直接粘贴任意平台链接自动识别，或输入数字序号指定平台)
python cli/main.py

# 3. 命令行静默调用示例
python cli/main.py "https://music.163.com/playlist?id=2756674066"
python cli/main.py "9044196528" -p qqmusic -f xlsx,csv
```

👉 [查看统一 CLI 完整说明与使用指南](cli/README.md)

---

### 各平台独立轻量脚本

除了全平台统一入口外，仓库也提供了各平台独立的轻量级导出脚本。所有独立脚本依赖已统一收录，安装一次即可运行任意平台脚本：

```bash
# 统一安装依赖 (所有独立脚本通用)
pip install -r cli/requirements.txt
```

| 平台 | 脚本路径 | 支持内容 | 详细说明 |
|---|---|---|---|
| **QQ 音乐** | [`cli/qqmusic/qq_music_playlist_export.py`](cli/qqmusic/qq_music_playlist_export.py) | 歌单链接 / ID、QQ 号用户歌单、批量导出 | [说明文档](cli/qqmusic/README.md) |
| **网易云音乐** | [`cli/netease/netease_playlist_export.py`](cli/netease/netease_playlist_export.py) | 歌单链接 / 短链 / ID、用户公开歌单 | [说明文档](cli/netease/README.md) |
| **酷我音乐** | [`cli/kuwo/kuwo_playlist_export.py`](cli/kuwo/kuwo_playlist_export.py) | 歌单链接 / 移动端短链 / ID、多页自动分页 | [说明文档](cli/kuwo/README.md) |
| **汽水音乐** | [`cli/qishui/qishui_playlist_export.py`](cli/qishui/qishui_playlist_export.py) | 歌单链接 / 短链 / 抖音收藏分享文案 / ID、全量游标分页 | [说明文档](cli/qishui/README.md) |
| **酷狗音乐** | [`cli/kugou/kugou_playlist_export.py`](cli/kugou/kugou_playlist_export.py) | 官方精选 / 概念版集合 / H5 分享（免登录）、个人云端自建歌单（终端扫码/官网凭证双轨认证） | [说明文档](cli/kugou/README.md) |

> **运行示例**：`python cli/netease/netease_playlist_export.py`（其他平台脚本以此类推）。全平台均支持 **Excel → JSON → TXT → CSV → M3U8** 纯本地导出。

---

## 导出格式

| 格式 | 适合的场景 |
|---|---|
| **Excel (.xlsx)** | 通用表格交换、FreeYourMusic / Soundiiz 等文件导入、整理归档；首个 `Tracks` Sheet 为干净的一歌一行结构 |
| **JSON** | 开发者、脚本、第三方应用和播放器接入；采用统一 Canonical 结构（单一歌手 `artist`、平铺通用、零空值填充） |
| **TXT** | 阅读、简单备份与文本处理 |
| **CSV** | 通用歌单迁移与数据交换；使用 `title / artist / album / isrc` 等语言无关标准列名 |
| **M3U8** | 本地播放器、媒体库以及支持 Extended M3U/M3U8 的迁移工具 |
| **Markdown (.md)** | 知识库笔记、个人博客与社区分享；生成格式工整的 Markdown 表格与信纸头，完美适配 Obsidian / Notion / GitHub |

导出文件由浏览器本地通过模块化插件管道（`web/src/utils/export/`）生成，不需要把导出文件上传到服务器。

如果你需要稳定的数据结构用于程序读取，请优先使用 **JSON**，并参考 [JSON 数据格式规范](docs/JSON-SCHEMA.md)。需要在不同歌单迁移工具之间交换文件时，优先考虑 **CSV / M3U8 / Excel**。各格式当前的字段、Sheet 与插件化扩展约定见 [Web 导出格式规范](docs/EXPORT-FORMATS.md)。

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

如果你正在开发第三方应用、开源音乐播放器、自动化脚本或数据迁移工具，可以通过以下方式直接接入 Playlist Out 的解析能力：

### 1. 免费公共 API（无需搭建，即开即用）

无需注册账号，无需申请 API Key，全端点开放跨域（CORS `*`），可在前端网页、客户端或后端脚本中直接调用：

#### 极速上手：解析歌单
发起一个简单的 `GET` 请求，传入任意主流平台的歌单链接、短链或分享文本，系统会自动识别平台并返回规范化的曲目列表：

```bash
# 终端直接调用示例
curl "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/playlist?id=2756674066"
```

JavaScript / 浏览器直接调用：
```javascript
const res = await fetch("https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=" + encodeURIComponent(playlistUrl));
const { success, data } = await res.json();
console.log(data.result.name, data.result.tracks); // 统一包含 title, artist, album, coverUrl 等
```

#### 核心特性
- **免认证与开放 CORS**：无需携带任何 Token，浏览器前端可直接发起 `fetch()` 请求。
- **智能消歧与自动识别**：支持各大主流平台长链接、短链及移动端分享文本，自动提取并解析。
- **规范化元数据**：抹平各平台字段差异，统一输出标准歌曲 ID、名称、歌手、专辑、封面直链、时长及 VIP/下架状态。
- **调用频次限制**：公共端点提供单 IP 30 次/分钟的标准限额，完全满足普通个人项目与工具接入。

👉 [查阅完整 API 规范、错误码与端点文档](docs/API.md)

---

### 2. 标准 JSON 数据协议（离线文件导入）

如果你的应用不想依赖在线网络，也可以直接支持导入 Playlist Out 生成的 `.json` 导出文件。

我们制定了跨平台统一的 Canonical JSON 数据规范，第三方播放器或迁移工具只需解析一套固定 Schema，即可兼容各大主流平台导出的歌单文件：

```json
{
  "platform": "netease",
  "id": "2756674066",
  "name": "歌单名称",
  "creator": "创建者昵称",
  "trackCount": 100,
  "tracks": [
    {
      "index": 1,
      "title": "歌曲名",
      "artist": "歌手名（单一字符串）",
      "album": "专辑名",
      "durationMs": 240000,
      "coverUrl": "https://...",
      "status": "playable"
    }
  ]
}
```

👉 [查阅 JSON 数据格式定义与字段规范](docs/JSON-SCHEMA.md)

---

### 3. 开源播放器与插件生态

我们致力于让歌单能够在更多开源播放器中自由流转。如果你是播放器维护者或插件开发者：

- **插件式播放器**（如 [MusicFree](plugins/musicfree/)）：可直接安装或参考我们的插件实现，通过调用 Public API 为播放器增加外部歌单解析能力；
- **本地播放器**（如 [BBPlayer](https://bbplayer.roitium.com)、LX Music、Listen 1）：可直接在客户端内置对 Playlist Out JSON 格式或 Public API 的导入支持；
- **新应用适配**：欢迎在 [Issue](https://github.com/LengxiQwQ/playlistout/issues) 中提出播放器接入需求，共同扩充开源生态。

👉 [查阅开源播放器生态接入与适配计划](docs/ECOSYSTEM-INTEGRATION.md)

---

## 本地开发

Playlist Out 使用 monorepo 管理网页、Worker 与插件代码。

```text
playlistout/
├── web/                  # React / Vite 前端 (模块化 API 门面、领域 Hooks、插件化导出管道)
├── worker/               # Cloudflare Worker API (Hono 路由、自描述 Provider 注册制、元数据洋葱管道)
├── cli/                  # Python 命令行统一工具 (cli/core/ 核心与统一入口 + 各厂商独立脚本)
├── plugins/              # 开源播放器插件生态 (MusicFree 等)
├── docs/                 # 架构演进路线图、新厂商接入指南、API、数据协议与项目宪法
└── scripts/              # 本地 8 步 CI 门禁、插件构建与自动化维护脚本
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
| [Web 导出格式规范](docs/EXPORT-FORMATS.md) | 用户 / 迁移工具开发者 | CSV、XLSX、JSON、M3U8、TXT、Markdown 的当前结构与扩展约定 |
| [Python CLI 指南](cli/README.md) | 命令行 / 自动化用户 | 全平台统一 CLI 与各大主流厂商独立导出工具使用说明 |
| [新厂商接入规范](docs/PROVIDER-ONBOARDING.md) | 开发者 / 架构贡献者 | 标准化 5 步走厂商接入流水线与单测验收规范 |
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

<!-- WEBSITE_STATS:START -->
### 🌐 网站运营与活跃数据看板

> 📊 数据由 [Cloudflare D1 边缘节点](https://playlistout-api.lengxiqwq.com/api/stats) 实时聚合计算，每日自动化同步存档。

#### 📌 核心流量与使用规模

> 💡 👥 累计日独立访问 = 每天匿名去重后的访客数累加；同一访客跨日可能再次计入，PlaylistOut 不进行跨日追踪。

| 👥 累计日独立访问 | 📄 页面浏览 (PV) | 🎵 解析歌单数 | 💿 处理歌曲数 | 📦 文件导出数 | ⏱️ 稳定运行 |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1,052**<br><sub>今日独立 +27</sub> | **1,823**<br><sub>今日 +29</sub> | **6,076**<br><sub>今日 +151</sub> | **1,372,916**<br><sub>今日 +26,921</sub> | **1,533**<br><sub>今日 +43</sub> | **33 天**<br><sub>上线于 2026-09-12</sub> |

#### 📊 业务转化与平台偏好
- **🎵 平台解析份额：** QQ 音乐 **38%** (2,283 次) ｜ 网易云音乐 **48%** (2,896 次) ｜ 酷狗音乐 **12%** (708 次) ｜ 酷我音乐 **0%** (8 次) ｜ 汽水音乐 **3%** (181 次)
- **📦 导出格式偏好：** Excel 表格 (.xlsx) **64%** ｜ JSON 数据 **11%** ｜ TXT 纯文本 **15%** ｜ CSV 表格 **6%** ｜ M3U8 歌单 **4%**

> 🛡️ **隐私保证**：本统计严格遵循开源宪法规范，所有数据均由边缘节点以粗粒度匿名原子计数存储，**绝不记录真实 IP 地址、私密歌单内容或个人身份凭据**。
<!-- WEBSITE_STATS:END -->

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

访问次数：**1,340** ｜ 不重复访客：**285**（近 14 天） ｜ 仓库克隆：**8,869** ｜ 不重复克隆：**961**（近 14 天）

**热门来源（近 14 天）：** github.com · Bing · Google · Baidu · chatgpt.com · sogou.com  
**热门内容（近 14 天）：** plugins/musicfree · releases/tag/v2.2.0 · pulls · plugins/musicfree/README.md

> 数据开始：2026-09-07 · 最后更新：2026-10-14
<!-- INSIGHTS:END -->

---

<div align="center">

### Playlist Out · 把你的歌单带走

做 Playlist Out 的初衷一直很简单：**让歌单属于用户自己，而不是困在某一个平台里。**

希望它能把你认真整理的歌单带出来，也能继续带到你真正想去的地方。

**Made with ❤️ by [LengxiQwQ](https://github.com/LengxiQwQ)**

</div>
