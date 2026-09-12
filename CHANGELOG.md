# Changelog / 更新日志

本项目的所有重要变更均记录于此。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 规范。

All notable changes to **PlaylistOut** will be documented in this file. Adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

---

## [v2.0.0] - 2026-09-12

### 🌟 升级为全新 Web 网页版 / Evolution to PlaylistOut Web

这是 PlaylistOut 的一次重要里程碑升级：项目从最初本地运行的 QQ 音乐 Python 命令行脚本，全面演进为开箱即用的现代化在线 Web 工具 [`playlistout.com`](https://playlistout.com)。无需安装 Python 环境或第三方依赖，在浏览器中即可直接解析与导出公开歌单。

This is a major milestone release for PlaylistOut: the project has evolved from a local Python command-line script into a modern, ready-to-use web application at [`playlistout.com`](https://playlistout.com). Users can now parse and export public playlists directly in their browsers without installing Python or local dependencies.

### 新增功能 / Added

- **在线解析与实时预览 (Online Parse & Preview)**:
  - 访问网站直接粘贴 QQ 音乐公开歌单链接（PC 网页端、手机分享链接或纯歌单 ID）即可一键解析。
  - Direct paste of public QQ Music playlist links (web URLs, mobile share links, or raw IDs) with instant parsing.
  - 展示歌单封面、标题、创建者与歌曲总数，并提供流畅的歌曲列表预览（支持 1000+ 首大型歌单流畅滚动渲染）。
  - Displays playlist cover, title, creator, and total count with a high-performance track preview table handling 1000+ tracks smoothly.
- **客户端本地多格式导出 (Browser-Local Exports)**:
  - 支持将解析结果导出为 **TXT**、**CSV**（带 UTF-8 BOM，Excel 打开不乱码）、**Excel (.xlsx)** 与 **JSON**。
  - Export songs into TXT, CSV (with UTF-8 BOM), Excel (.xlsx), and JSON formats.
  - **100% 浏览器本地生成**：所有文件构建全部在本地内存沙箱中完成，导出的文件绝不上传至任何服务器。
  - 100% client-side generation in browser memory; exported files are never uploaded to any server.
  - **防表格公式注入保护**：对以 `=`, `+`, `-`, `@` 开头的歌曲名或专辑名自动转义，防范表格软件中的公式执行隐患。
  - Spreadsheet formula injection protection (automatic escaping for `=`, `+`, `-`, `@` prefixes).
- **快速剪贴板复制 (One-Click Clipboard Copy)**:
  - 支持一键将整张歌单按 3 种格式复制到剪贴板（仅歌名 / 歌名 - 歌手 / 完整歌曲信息），方便导入其他工具或播放列表。
  - Quick clipboard copy in 3 flexible formatting modes (Title only / Title - Artist / Full track info).
- **超大歌单智能自动翻页 (Automatic Bounded Pagination)**:
  - 后端内置分页拉取机制，支持无损拉取上千首大歌单，内置死循环检测，同时完整保留合法的重复歌曲。
  - Automatic multi-page fetching for large playlists with stalled-loop protection while faithfully preserving legitimate duplicate tracks.
- **隐私与轻量架构 (Privacy & Lightweight Infrastructure)**:
  - 无账号体系，无登录门槛，服务端纯无状态运行，不持久化存储任何用户歌单历史与歌曲条目。
  - Completely stateless architecture: no accounts, no logins, and zero server-side storage of playlist contents.
  - 匿名聚合统计：基于 Cloudflare D1 仅记录按天聚合的成功/失败解析频次，不记录用户 IP、Cookie 或歌单标识。
  - Anonymous aggregated statistics: Cloudflare D1 stores only high-level counters by date, never tracking user IPs, cookies, or playlist identifiers.
  - 安全标头与防滥用：配置严格的出站域名白名单、OWASP 安全响应头及实例级滑动窗口速率限制。
  - Security hardening with strict outbound host allowlists, OWASP response headers, and rate limiting.
- **经典工具保留 (Legacy CLI Preserved)**:
  - 原有的独立 Python 命令行工具完整保留在 [`cli/qqmusic/`](./cli/qqmusic/)，并保持独立测试与功能可用。
  - The original Python CLI is preserved under [`cli/qqmusic/`](./cli/qqmusic/) with independent unit tests.

---

## [v1.1.0] - 2026-06-28

### 🌟 QQ 号批量导出增强版 / Batch Export by QQ Number (Python CLI)

这是早期 QQ 音乐 Python 命令行工具的重要功能更新，引入了基于 QQ 号一键导出用户公开自建歌单的能力。

This release brings a major feature enhancement to the Python CLI tool, enabling batch discovery and export of all public playlists created by a specific user QQ account.

### 新增功能与优化 / Added & Improved

- **QQ 号批量获取与导出 (Batch Export by QQ Number)**:
  - 在命令行直接输入用户 QQ 号，自动查询并列出该用户所有公开自建歌单，支持一键按选定格式批量抓取并分别保存。
  - Input a user's QQ number to list all public playlists and batch-export them in one go.
- **智能歧义消解 (Smart Disambiguation)**:
  - 当输入的纯数字既符合歌单 ID 又符合 QQ 号特征时，自动提示用户选择执行“单歌单导出”还是“批量导出”。
  - Prompts user to choose between single-playlist export and user-batch export when numeric input is ambiguous.
- **系统预设歌单过滤 (Filter System Playlists)**:
  - 自动过滤没有独立 ID 的空间背景音乐等系统歌单，避免抓取报错。
  - Automatically skips system-generated playlists without IDs to avoid fetch failures.
- **终端乱码修复 (Console Encoding Fix)**:
  - 优化 Windows 控制台中文输出编码处理，避免歌单名和进度提示乱码。
  - Fixed character encoding quirks in Windows console environments.
- **工程规范化 (Project Hygiene)**:
  - 添加项目 `.gitignore`，规范临时导出文件忽略规则。
  - Added `.gitignore` to prevent generated playlist export files from being tracked by git.

---

## [v1.0.0] - 2025-11-22

### 🌟 初始开源版本 / Initial Release (Python CLI)

PlaylistOut 最早期的开源版本：一个轻量、实用的 QQ 音乐歌单导出 Python 命令行工具。

The first open-source release of PlaylistOut: a lightweight, standalone Python CLI tool for exporting QQ Music playlists.

### 核心功能 / Features

- **单歌单解析导出 (Single Playlist Export)**:
  - 支持直接输入 QQ 音乐网页链接（`y.qq.com`）或纯数字歌单 ID。
  - Parse public QQ Music playlists by web link or playlist ID.
- **支持 4 种文件格式 (4 Output Formats)**:
  - Excel (`.xlsx`)
  - 标准 CSV (`.csv`，UTF-8 带 BOM)
  - JSON 数组 (`.json`)
  - 纯文本 (`.txt`)
- **跨平台文件名清洗 (Filename Sanitization)**:
  - 自动将歌单名称中 Windows 不允许的特殊字符替换为空格，避免保存失败。
  - Automatically sanitizes illegal characters in playlist names for safe file saving.
- **交互式循环与自动定位 (Interactive CLI Loop & Auto-reveal)**:
  - 命令行交互式提示，导出后可继续输入下一个歌单。
  - Continuous CLI prompt allowing multiple exports in one session.
  - Windows 环境导出完毕后自动在资源管理器中打开目标目录并高亮选中文件。
  - Automatically opens the output directory and highlights the exported file on Windows.
