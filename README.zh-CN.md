<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/favicon.svg" width="76" alt="PlaylistOut" />

# PlaylistOut

*你的歌单，不应该只困在一个音乐平台里。*

[![Website](https://img.shields.io/badge/Website-playlistout.com-2563eb?style=flat-square)](https://playlistout.com)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![CI](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml/badge.svg)](https://github.com/LengxiQwQ/playlistout/actions/workflows/ci.yml)

**[🌐 playlistout.com](https://playlistout.com)**

</div>

<p align="center">
  📖 README Language：<a href="README.md">English</a> · <strong>简体中文</strong>
</p>

---

## 💡 为什么做 PlaylistOut？

音乐平台很容易创建歌单，但当你想备份、整理、做数据处理，或者以后迁移到别的平台时，往往很难直接拿到一份干净的歌曲列表。

**PlaylistOut 做的事情很简单：**把公开歌单解析成结构化数据，然后让你把它真正保存下来。

粘贴一个支持的歌单链接，PlaylistOut 会自动读取歌单名称、歌曲、歌手、专辑等可用信息，整理成统一的数据结构，并直接导出为 TXT、CSV、Excel 或 JSON。

它不播放音乐，不下载歌曲，也不要求你登录账号。它只专注一件事：把歌单数据清楚、可靠地导出来。

---

## 🚀 在线使用

无需安装，直接打开 **[playlistout.com](https://playlistout.com)**，粘贴公开歌单链接即可使用。

1. **粘贴歌单** — 支持公开歌单链接、手机分享链接和歌单 ID。
2. **自动解析** — 获取歌单名称、歌曲、歌手、专辑等可用信息。
3. **预览结果** — 在导出前先检查完整歌曲列表。
4. **导出或复制** — 保存为 TXT / CSV / Excel / JSON，或者直接复制歌曲信息。

---

## ✨ 主要功能

### 🔗 粘贴链接，直接解析

当前正式支持 QQ 音乐公开歌单。可以直接粘贴 PC 网页链接、手机分享链接、纯数字歌单 ID，也可以从一整段分享文本中自动提取支持的歌单。

### 🎵 完整读取大型歌单

自动处理歌单分页，支持 **1000+ 首**的大型歌单，并保留原始歌曲顺序和正常存在的重复歌曲，不因为分页或去重逻辑静默丢失条目。

### 📦 导出你真正能用的数据

解析完成后可以直接导出为：

- **TXT** — 最简单的纯文本歌曲列表
- **CSV** — 适合表格处理和其他程序读取
- **Excel (.xlsx)** — 直接用 Excel、WPS 等软件打开整理
- **JSON** — 适合程序、脚本和二次处理

所有导出文件都在浏览器本地生成，不需要上传到服务器。

### 📋 快速复制

不想下载文件时，也可以直接复制歌曲列表。目前支持多种常用格式，例如：

- 仅歌名
- 歌名 - 歌手
- 歌名 - 歌手 - 专辑

### 🛡️ 表格导出保护

CSV 和 Excel 导出会处理可能被表格软件识别为公式的特殊内容，避免普通歌曲信息被错误执行为公式。

---

## 🎧 支持平台

| 平台 | 状态 |
|---|---|
| **QQ 音乐** | ✅ 已支持 |
| 网易云音乐 | 计划中 |
| 酷狗音乐 | 计划中 |
| 酷我音乐 | 计划中 |
| 咪咕音乐 | 计划中 |
| 汽水音乐 | 计划中 |

不同音乐平台会通过独立 Provider 接入，但前端始终使用统一的数据结构，因此预览和导出方式保持一致。

---

## 🔒 隐私与数据

PlaylistOut 没有账号系统，也不会把你的歌单变成自己的云端资料库。

- 不保存解析后的歌曲列表
- 不保存你提交过的歌单历史
- 不保存导出的 TXT / CSV / XLSX / JSON 文件
- 导出文件全部在浏览器本地生成
- 服务端只保留匿名聚合统计，例如解析成功 / 失败次数

如果上游数据明显不完整或无法确认可靠性，PlaylistOut 会优先报错，而不是生成一份看起来正常、实际上缺歌的导出文件。

---

## ⌨️ QQ 音乐 CLI

仓库中仍然保留最初的 QQ 音乐 Python 命令行版本，适合脚本化处理、批量工作流或作为技术参考。它支持单歌单导出，也支持按 QQ 号进行批量导出。

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

详细使用方式可以查看 [`cli/qqmusic/README.md`](./cli/qqmusic/README.md)。

---

## 💻 开发者

PlaylistOut 是一个轻量 Monorepo：

| 部分 | 用途 |
|---|---|
| `web/` | React + TypeScript + Vite 前端 |
| `worker/` | Cloudflare Worker API 与 Provider |
| `cli/qqmusic/` | 原有 Python QQ 音乐 CLI |
| `docs/` | 路线图、API、项目规则与部署文档 |

### 本地运行

```bash
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout
npm install
npm run dev
```

### 验证

```bash
npm run typecheck
npm run test
npm --prefix worker run test:live
npm run build
```

---

## 📚 文档

- [`ROADMAP.md`](./docs/ROADMAP.md) — 当前维护与后续平台扩展计划
- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md) — 产品、架构、隐私与实现边界
- [`API.md`](./docs/API.md) — PlaylistOut API 约定
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md) — 部署、恢复与运维
- [`CHANGELOG.md`](./CHANGELOG.md) — 版本更新记录

---

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request。

如果想添加新的音乐平台 Provider，请尽量保持平台特有逻辑只存在于 Provider 内部，并继续使用 PlaylistOut 的统一歌单数据结构。

---

## 📄 License

PlaylistOut 基于 **GNU Affero General Public License v3.0 (AGPL-3.0)** 开源。详见 [LICENSE](./LICENSE)。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a>
</p>
