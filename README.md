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

## ⚡ 极速上手：只需 3 步

无需下载任何客户端，直接在浏览器中打开：

> 🌐 **在线使用**：[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com/)

1. **复制歌单链接**：在任意音乐 App 中分享歌单并复制链接（支持直接粘贴微信/抖音长分享文案，系统秒级自动提取，无需手动删减文字）。
2. **一键智能解析**：粘贴到网页输入框中点击解析，千首大歌单自动翻页抓取，无曲目遗漏。
3. **随心导出带走**：选择需要的格式（Excel、JSON、CSV、TXT 或 M3U8）一键保存到本地，或直接带进支持的开源播放器。

---

## 🎵 支持的主流平台

| 平台 | 单歌单解析 | 按用户批量查歌单 | 特性说明 |
|---|:---:|:---:|---|
| **QQ 音乐** | ✅ | ✅ | 支持歌单链接 / ID，或输入 QQ 号一键查出全部公开歌单并批量导出 |
| **网易云音乐** | ✅ | ✅ | 支持歌单链接 / 短链 / ID，或输入用户主页 / UID 批量导出全部自建歌单 |
| **酷狗音乐（含概念版）** | ✅ | ✅ | 需扫码授权登录，支持完整解析歌单及批量导出账号下全部歌单 |
| **酷我音乐** | ✅ | — | 支持歌单链接 / ID / 分享口令，自动完整分页获取全部曲目 |
| **汽水音乐** | ✅ | — | 支持公开分享歌单，可切换「汽水官方解析」与「抖音全量解析（含视频原声）」 |

---

## 📦 导出的格式怎么用？

你可以根据自己的使用需求选择最合适的导出格式：

| 导出格式 | 常见使用场景与推荐软件 |
|---|---|
| **Excel (.xlsx)** | **最推荐！** 电脑直接双击打开，包含歌曲清单与歌单信息双工作表，最适合本地曲库整理归档、离线备份与打印查看 |
| **JSON 数据** | **核心推荐！** 跨平台标准数据协议，供 **MusicFree、BBPlayer** 等支持外部歌单导入的第三方开源播放器使用 |
| **CSV 表格** | 标准通用表格数据，采用国际通用列名（title, artist, album, isrc 等），最适合导入 **Soundiiz / TuneMyMusic / FreeYourMusic** 等跨平台迁移工具或进行二次数据分析 |
| **TXT 纯文本** | 干净简洁的歌曲清单（歌名 - 歌手），适合直接复制发群、发朋友圈或存入记事本备忘 |
| **M3U8 播放列表** | 标准 Extended M3U 播放列表结构，适合导入兼容该格式的本地媒体管理工具、音乐库或歌单迁移工具 |

---

## 🎧 把歌单带进开源播放器

**Playlist Out 不只帮你把歌单导出来，也能把它继续带进你喜爱的开源音乐播放器。**

### 1. [MusicFree](https://musicfree.catcat.work/)（✅ 已支持 · 插件接入）
在 MusicFree 中安装 Playlist Out 插件后，即可在播放器中通过「导入外部歌单」直接粘贴歌单链接或导入导出的 JSON 文件：
- **插件地址**：在 [网页端](https://playlistout.lengxiqwq.com/) 直接点击「**复制插件地址**」按钮，或复制下方链接到 MusicFree 插件管理中安装：
  ```text
  https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js
  ```
- **使用指南**：[MusicFree 插件安装与使用说明](plugins/musicfree/README.md) · [MusicFree 官网](https://musicfree.catcat.work/)

### 2. [BBPlayer](https://bbplayer.roitium.com)（⏳ 即将上线 · 原生功能内置）
BBPlayer 已在主程序中原生内置 Playlist Out 歌单导入功能，无需安装任何插件，在新版中直接粘贴链接即可导入。
- [BBPlayer 官网](https://bbplayer.roitium.com) · [GitHub 仓库](https://github.com/bbplayer-app/BBPlayer)

### 3. 更多播放器适配中
我们正积极推进与 **LX Music**、**Listen 1** 等更多优质开源播放器的兼容集成，敬请期待！

---

## 💻 进阶使用：CLI 命令行与跨平台独立发行版

如果你更喜欢在终端中使用，或者需要做批量离线处理与定时任务，可以直接使用 Playlist Out CLI。所有数据同样 100% 在本地运行：

### 1. 跨平台独立可执行文件 (推荐，无需安装 Python)

最终用户**无需安装 Python、无需 pip、无需配置任何依赖**，直接前往 [GitHub Releases](https://github.com/LengxiQwQ/playlistout/releases) 下载对应系统的独立发行版即可使用：

| 操作系统 / 架构 | 下载文件 | 运行方式 | 说明 |
|---|---|---|---|
| **Windows x64** | `PlaylistOut-v{version}-windows-x64.exe` | 直接双击运行，或在终端传参调用 | 自动调出控制台交互菜单；支持命令行参数 |
| **macOS Apple Silicon** (M1/M2/M3/M4) | `PlaylistOut-v{version}-macos-arm64.tar.gz` | 解压后双击 `PlaylistOut.command` 或运行 `./PlaylistOut` | 包含一键终端启动脚本；当前为未签名构建（首次启动需在系统设置中允许） |
| **macOS Intel** (x86_64) | `PlaylistOut-v{version}-macos-x64.tar.gz` | 解压后双击 `PlaylistOut.command` 或运行 `./PlaylistOut` | 包含一键终端启动脚本；当前为未签名构建（首次启动需在系统设置中允许） |
| **Linux x64** | `PlaylistOut-v{version}-linux-x64.tar.gz` | `tar -xzf PlaylistOut-*.tar.gz && ./PlaylistOut` | 基于 Ubuntu 22.04 构建，兼容标准 glibc Linux 环境 |

> **提示**：每个正式发布均提供 `SHA256SUMS.txt` 与 `release-manifest.json`，供用户核验文件完整性。

### 2. 源码运行模式 (开发者)

如果你已拥有 Python 3.14 环境，可以直接运行仓库源码：

```bash
# 1. 安装运行时依赖
pip install -r cli/requirements.txt

# 2. 交互式启动 (直接粘贴任意平台链接自动识别，或输入数字序号指定平台)
python cli/main.py
# 或使用模块入口
python -m cli

# 3. 命令行直接调用示例
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
- **调用频次限制**：公共端点单 IP 限制为 **1 分钟最多请求 6 次**，适合个人轻量使用与脚本调用。

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
| [Web 导出格式规范](docs/EXPORT-FORMATS.md) | 用户 / 迁移工具开发者 | CSV、XLSX、JSON、M3U8、TXT 的当前结构与扩展约定 |
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

## 使用须知

- **完全免费开源**：无收费套路，代码完全公开，遵循 MIT 开源许可。
- **无需账号**：不建立用户系统，公开歌单直接解析。
- **纯粹解析**：不提供、不存储音频文件或播放流，仅专注于公开歌单元数据的提取、转换与整理。

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

访问次数：**1,406** ｜ 不重复访客：**280**（近 14 天） ｜ 仓库克隆：**9,217** ｜ 不重复克隆：**969**（近 14 天）

**热门来源（近 14 天）：** github.com · Google · Bing · Baidu · audio-file.org · chatgpt.com  
**热门内容（近 14 天）：** plugins/musicfree · releases/tag/v2.2.0 · pulls · releases

> 数据开始：2026-09-07 · 最后更新：2026-10-15
<!-- INSIGHTS:END -->

---

<div align="center">

### Playlist Out · 把你的歌单带走

做 Playlist Out 的初衷一直很简单：**让歌单属于用户自己，而不是困在某一个平台里。**

希望它能把你认真整理的歌单带出来，也能继续带到你真正想去的地方。

**Made with ❤️ by [LengxiQwQ](https://github.com/LengxiQwQ)**

</div>
