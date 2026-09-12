<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/favicon.svg" width="76" alt="PlaylistOut" />

# PlaylistOut

*你的歌单，不应该只困在一个音乐平台里。*

[![Website](https://img.shields.io/badge/Website-playlistout.com-2563eb?style=flat-square)](https://playlistout.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github)](https://github.com/LengxiQwQ/playlistout/stargazers)
<<<<<<< HEAD
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
=======
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=000)](https://react.dev/)
>>>>>>> 0a53a1ae462d53e056878f5bd04959f50fc66f00
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)

**[🌐 playlistout.com](https://playlistout.com)**

</div>

<p align="center">
  📖 README Language：<strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

---

## 💡 为什么做 PlaylistOut？

我们在各大音乐平台上花了很多时间和心血整理歌单，但往往遇到这样的尴尬：
想换平台听歌时，旧平台的歌单无法直接迁移；想备份自己的心血时，没有一个地方能把歌曲列表以干净的格式导出来；或者只是想把歌曲整理成表格打印、做统计分析，却只能手动一首首复制粘贴。

主流音乐平台的封闭生态把用户的歌单牢牢锁在单一 App 里。

**PlaylistOut 的目标很简单：把公开歌单解析成结构化数据，交还到你的手中。**

- **纯客户端导出**：所有导出文件 100% 在用户浏览器本地内存中生成并触发下载，不回传服务器。
- **无需登录与授权**：不需要 QQ 音乐账号、不需要 Cookie、无需安装任何浏览器扩展或客户端软件。
- **专注且纯粹**：它不是播放器，不下载音频文件，也不做冗余的云端同步；只专一、稳定、完整地解决“歌单数据导出备份与迁移”这一件事。

---

## 🚀 在线使用

无需安装任何软件，直接打开 **[playlistout.com](https://playlistout.com)** 即可开始：

1. **粘贴歌单** — 支持 PC 网页链接（`y.qq.com`）、手机分享链接（`c6.y.qq.com`）、纯歌单 ID，或直接粘贴带有文字的 App 分享内容（系统自动提取有效链接）。
2. **实时解析** — 边缘 Worker 自动解析歌单元数据、歌曲名、歌手、专辑及封面等完整字段。
3. **完整预览** — 在导出前直接在网页中核对完整歌曲列表与总曲目数。
4. **一键导出 / 复制** — 本地保存为 TXT / CSV / Excel (.xlsx) / JSON，或直接一键复制到剪贴板。

---

## ✨ 主要功能

### 🔗 纯网页免登录直解
无需登录任何音乐平台账号，不需要输入 Cookie 或授权 Token，不安装任何第三方插件。只需一个公开歌单链接，即可在浏览器中一键解析。

### 🎵 大歌单深度翻页支持
彻底打破许多第三方工具“只能抓前 100 首”的限制。PlaylistOut 内置智能分页引擎，无缝支持 **1000+ 首**的超大歌单，严格保留原始添加顺序与合法的重复歌曲，绝不静默丢歌或截断。

### 📦 4 种文件格式本地导出
解析出的歌单可直接导出为多种主流格式，满足不同场景需求：
- **TXT** — 简洁易读的纯文本清单，适合快速查看、记事本备份或导入部分小众播放器。
- **CSV** — 国际标准的逗号分隔文本（默认带 UTF-8 BOM，解决 Windows Excel 打开乱码问题）。
- **Excel (.xlsx)** — 原生带样式的电子表格，适合用 Microsoft Excel、WPS 等软件进行归档、排序与批量整理。
- **JSON** — 结构化完整数据，包含歌曲 ID、歌手、专辑等丰富元数据，专为开发者与自动化脚本设计。

> 所有文件均由前端直接在浏览器内存中组装并生成下载链接，数据不经过任何第三方服务器中转。

### 📋 3 种剪贴板快速复制
如果不需要下载文件，可直接复制格式化内容：
- **仅歌名**：每行一首歌曲名，干净整洁。
- **歌名 - 歌手**：最通用的文本格式，便于直接粘贴到其他音乐软件的搜索框或导入框。
- **歌名 - 歌手 - 专辑**：完整的制表符分隔格式，可直接 Ctrl+V 粘贴进任意电子表格。

### 🛡️ 严格安全与防公式注入
导出 CSV / Excel 时，对首字符为 `=`、`+`、`-`、`@` 等特殊符号的内容自动添加安全转义，防止导出的表格在 Microsoft Excel / WPS 打开时触发恶意的公式注入执行（CSV Injection / DDE）。同时，全链路 API 配备速率限制与安全防护标头。

---

## 🎧 支持平台

| 平台 | 网页版支持 | 备注 |
|---|---|---|
| **QQ 音乐** | ✅ 已支持 | 歌单分享链接 / ID / App 分享文本解析与导出 |
| 网易云音乐 | 计划中 | 路线图规划中 |
| 酷狗音乐 | 计划中 | 路线图规划中 |
| 酷我音乐 | 计划中 | 路线图规划中 |
| 咪咕音乐 | 计划中 | 路线图规划中 |
| 汽水音乐 | 计划中 | 路线图规划中 |

每个音乐平台都作为独立的 Provider 模块接入，前端始终保持统一的数据结构与导出体验。

---

## 🔒 隐私与数据

PlaylistOut 坚持极简与透明的隐私承诺：

- **无账号体系**：完全不设注册、登录或身份验证流程，不收集任何个人身份信息。
- **无状态边缘代理**：歌曲列表仅在请求时由边缘 Cloudflare Worker 代理抓取并实时返回前端，服务器不设歌单数据库，不留存歌曲条目。
- **全本地导出**：TXT、CSV、XLSX 和 JSON 文件全部在用户本地浏览器生成，文件内容绝不上传到服务器。
- **匿名聚合指标**：仅在 Cloudflare D1 中记录匿名聚合计数（如请求成功/失败数、导出格式分布），用于服务健康监控与容量评估，绝不记录用户 IP、歌单 URL 或具体曲目。
- **完整性熔断原则**：向上游抓取歌单时，若遇到数据残缺或网络异常，系统会直接报错提示，绝不为了“伪装成功”而生成缺斤少两的残缺导出。

---

## ⌨️ QQ 音乐 CLI

仓库中依然保留了最初的 Python 命令行工具，适合批量抓取、定时自动化备份或作为技术参考：
- 支持单个歌单快速导出
- 支持输入 QQ 号批量抓取其公开创建的所有歌单

```bash
cd cli/qqmusic
pip install -r requirements.txt
python qq_music_playlist_export.py
```

更详细的参数与使用说明请查看 [`cli/qqmusic/README.md`](./cli/qqmusic/README.md)。

---

## 💻 开发者

PlaylistOut 是一个轻量级 Monorepo 仓库：

| 模块 | 说明 |
|---|---|
| `web/` | 前端应用，基于 React 18 + TypeScript + Vite |
| `worker/` | 边缘 API 服务，基于 Cloudflare Workers + TypeScript + D1 |
| `cli/qqmusic/` | 原始 Python QQ 音乐 CLI 工具 |
| `docs/` | 项目路线图、架构规范、API 文档与运维手册 |

### 本地运行

```bash
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout
npm install
npm run dev
```

### 质量检查与构建

```bash
# TypeScript 类型检查
npm run typecheck

# 单元测试与组件测试
npm run test

# 验证真实 QQ 音乐长歌单解析（含 >1000 首样本）
npm --prefix worker run test:live

# 全栈生产构建
npm run build
```

---

## 📚 文档

- [`ROADMAP.md`](./docs/ROADMAP.md) — 路线图与后续支持计划
- [`PROJECT-CONSTITUTION.md`](./docs/PROJECT-CONSTITUTION.md) — 产品定位、架构约束与安全边界
- [`API.md`](./docs/API.md) — 边缘 API 接口规范与错误码约定
- [`MANUAL-SETUP.md`](./docs/MANUAL-SETUP.md) — 生产环境配置与运维手册
- [`CHANGELOG.md`](./CHANGELOG.md) — 版本变更历史

---

## 🤝 Contributing

欢迎提交 Issue 与 Pull Request！

在添加新的音乐平台 Provider 时，请确保将平台专有解析逻辑封装在独立 Provider 模块内，并转换为通用的标准化歌单数据模型，以确保全平台导出与复制功能的一致性。

---

## 📄 License

PlaylistOut 基于 **GNU Affero General Public License v3.0 (AGPL-3.0)** 开源。详情参见 [LICENSE](./LICENSE)。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a>
</p>
