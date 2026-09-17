# Changelog / 更新日志

本项目的所有重要变更均记录于此。遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 规范。

All notable changes to **PlaylistOut** will be documented in this file. Adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v2.3.0] - 2026-09-18

### 🚀 Public API v1 开放平台、汽水音乐原生接入与酷狗移动端一键授权 / Public API v1, Soda Music & KuGou Mobile Quick Auth

在完成多平台矩阵拓展后，v2.3.0 正式开放了高可用、边缘原生的 **Public API v1 开放平台**，支持第三方开发者与自动化流水线直接调用，并原生接入**汽水音乐 (Soda Music)**，针对酷狗移动端推出一键拉起 App 授权与开发者 API 凭据复制卡片。

Following the multi-platform matrix expansion, v2.3.0 officially releases the high-performance, edge-native **Public API v1**, enabling external developers and automation pipelines to integrate directly with PlaylistOut. It also natively integrates **Soda Music (汽水音乐)** and adds one-click mobile app deep link authentication and developer credentials copying for KuGou.

### 新增功能 / Added

- **PlaylistOut Public API v1 开放平台 (Public API v1 Open Platform)**：
  - 正式发布面向第三方的现代化公共 API，包含：
    - `GET /api/v1/resolve`：万能智能解析器，完整对齐网页大搜索框能力，支持跨平台数字 ID 并发探测与 `409 AMBIGUOUS_INPUT` 消歧义候选推荐；
    - `GET /api/v1/playlist`：单歌单稳定检索接口；
    - `GET /api/v1/user/playlists`：用户公开歌单合集批量检索接口；
    - `GET /api/v1/stats`：隐私安全的匿名聚合统计接口；
    - `GET /api/v1/health`：高频服务探活与健康检查接口。
  - 公开 GET 接口全面开放跨域（`Access-Control-Allow-Origin: *`），支持第三方纯前端 Web 应用直接调用。
  - 零信任 Header 鉴权规范：严禁在 Query 参数中暴露敏感凭据，凭据（如酷狗 Token）仅允许通过标准 `Authorization: Bearer <token>` 及 `X-Kugou-Userid` 请求头传递。
  - 严谨的错误处理与安全脱敏：500 异常对公网严格返回通用脱敏文本，杜绝内部错误堆栈、数据库连接串及敏感凭据外泄。
  - 独立路由速率限制隔离：`/api/v1/resolve`、`/api/v1/playlist`、`/api/v1/user/playlists` 彼此独立享有 30 次/分钟限额，互不影响。
  - 撰写了详尽完备的开发者接口规范文档 [`docs/API.md`](docs/API.md)（含 cURL / TypeScript / Python 接入代码示例）。
- **汽水音乐 (Soda Music) 原生接入**：
  - 支持汽水音乐分享短链（`qishui.douyin.com/s/...`）及纯数字 ID 识别与解析。
  - 完美支持抖音同步收藏歌单与官方原声原唱识别，纳入标准化数据输出契约。
- **酷狗移动端一键跳转登录与开发者凭证复制 (KuGou Mobile Quick Auth & Developer Credentials)**：
  - 酷狗授权弹窗全新升级为桌面端/移动端双模态：桌面端保留动态二维码扫码，手机端支持通过 `kugouURL://` 协议一键拉起官方酷狗 App 完成登录，解决单设备无法扫码的痛点。
  - 授权成功后，弹窗内提供「开发者 API 凭证」卡片，开发者可一键复制包含凭据的可用 cURL 调试命令、原始 Token 与 UserID。

---

## [v2.2.0] - 2026-09-17

### 🎧 多平台矩阵拓展：网易云音乐、酷狗音乐扫码解锁与歌曲状态识别 / Multi-Platform Expansion: NetEase, KuGou QR Unlock & Track Availability

在 v2.1.0 完善批量导出后，v2.2.0 迎来了重大的跨平台能力跨越：正式接入**网易云音乐**与**酷狗音乐**两大主流平台，推出手机扫码安全解锁超长歌单机制，并全面升级导出格式规范，新增歌曲 VIP 与下架版权状态识别。

Following the v2.1.0 batch export features, v2.2.0 delivers a major multi-platform expansion: native support for **NetEase Cloud Music** and **KuGou Music**, mobile QR safe authorization to unlock full playlists, and an upgraded 7-column export specification with VIP and playable status detection.

### 新增功能 / Added

- **网易云音乐完整支持 (NetEase Cloud Music Support)**：
  - 支持网易云歌单网页链接、手机短链（`163cn.tv`）或纯歌单 ID 解析与导出。
  - 支持输入网易云用户 UID 或个人主页链接，一键批量拉取并导出该用户公开自建的所有歌单。
  - 内置分批详情获取引擎，彻底突破网易云官方未登录仅返回 10 首歌的截断限制。
  - 新增独立 Python CLI 命令行工具 [`cli/netease/`](./cli/netease/)。
- **酷狗音乐免登录预览与 App 扫码安全解锁 (KuGou Music & QR Unlock)**：
  - 支持酷狗公开歌单网页与 App 分享链接解析，提供免登录极速公开预览。
  - 创新推出酷狗手机 App 扫码安全授权弹窗 (`KugouAuthModal`)，零存储换取临时凭据，无限制解锁并导出超长完整歌单。
  - 零数据持久化保障：授权凭据（Token）严格仅保存在本地浏览器 LocalStorage，绝不上报或存储在服务器数据库。
- **歌曲 VIP 与可用性状态识别 (Song VIP & Availability Status)**：
  - 全链路自动识别歌曲状态：正常可播、下架/无版权变灰、VIP 专享、付费专辑等。
  - 网页预览表格增加「VIP」与「状态」两列，彩色手绘手账徽章直观呈现。
  - 导出格式全面升级：CSV 与 Excel (.xlsx) 表格扩展为 7 列（包含 `VIP` 与 `歌曲状态`），TXT 导出自动附带 `[状态]` 后缀，JSON 导出包含完备的 `isVip`、`isAvailable` 与 `statusText` 字段。
- **跨平台纯数字 ID 智能消歧义 (Multi-Platform Disambiguation)**：
  - 当输入纯数字 ID 时，系统并发探测 QQ 音乐与网易云音乐的单歌单及用户主页。
  - 发现多目标时自动弹出消歧义手账卡片 (`DisambiguationModal`)，供用户清晰对比并直达目标。

### 修复与优化 / Fixed & Improved

- **多 Sheet 批量导出链接修正**：修复 `batchExport.ts` 中非 QQ 平台歌单链接缺少 sourceUrl 时错误回退至 QQ 音乐域名的 Bug，统一使用 `getPlatformPlaylistUrl` 动态解析。
- **全站文案与国际化同步**：补齐中英文语言文件中酷狗音乐占位符、错误提示文案、平台筹备文案与隐私政策声明；新增 `sampleNetease` 示例国际化配置。
- **文档规范同步更新**：中英文 README 全面更新平台支持表、7 列导出数据规范、JSON Schema 完整字段定义以及 Python CLI 工具指南。

---

## [v2.1.0] - 2026-09-15

### 🎵 批量歌单导出 & 手账背景装饰 / Batch Playlist Export & Scrapbook Background

继 v2.0.0 全面升级为 Web 版本后，v2.1.0 聚焦于**批量导出体验**的完整落地，并对整体 UI 的手账沉浸感进行了深度打磨。

Following the v2.0.0 Web relaunch, v2.1.0 delivers a complete **batch playlist export** workflow and significantly enriches the music journal visual identity.

### 新增功能 / Added

- **QQ 号批量歌单解析与导出 (Batch Playlist Export by QQ Number)**：
  - 输入 QQ 号或用户主页链接（`y.qq.com/portal/profile.html?uin=...`）可一键拉取该用户名下所有公开自建歌单的完整列表。
  - Input a QQ number or profile URL to fetch all publicly-created playlists for that user in one click.
  - 支持多选 / 全选 / 取消全选，自由选定需要导出的歌单子集。
  - Multi-select, select-all, and deselect-all to choose any subset of playlists for export.
  - 支持 5 种批量导出格式：**多 Sheet Excel 合集**（所有歌单在一个 .xlsx 中各占一 Sheet）、**ZIP（各歌单独立 xlsx / csv / txt / json）**。
  - Supports 5 batch export formats: multi-sheet Excel (all playlists in one workbook) and ZIP archives (xlsx / csv / txt / json per playlist).
  - 实时导出进度条与取消支持，可在导出途中随时中止。
  - Real-time progress bar during batch fetch with cancel support at any time.
- **智能双模式识别 (Smart Dual-Detection for Numeric Input)**：
  - 当输入纯数字时，系统并行探测「单一歌单 ID」与「QQ 用户号」两种可能，自动选取最合理的结果。
  - Numeric input concurrently probes both single-playlist and user-QQ interpretations, auto-selecting the best match.
  - 若两者均命中（歌单 ID 恰好与 QQ 号同数字），展示「碰撞提示横幅」供用户手动切换。
  - A collision banner is shown when both interpretations are valid, letting the user switch manually.
- **歌单详情无缝返回 (Seamless Back-to-Collection Navigation)**：
  - 在批量列表中点击"查看曲目"下钻单歌单详情页后，左上角出现「🔙 返回歌单集合」按钮。
  - When viewing a single playlist drilled down from a batch collection, a "🔙 Back to Collection" button appears at the top.
  - 返回时无需重新请求，之前的歌单列表、勾选状态、格式选择全部完好保留。
  - Returning is instant with no re-fetch; all selection state and format preferences are preserved.
- **手账背景板装饰 (Scrapbook Background Decorations)**：
  - 新增 `BackgroundDecorations` 组件，在页面背景层随机散落贴纸（"🎵 music"、"♥ favorited"、"chill vibes"、"mix vol.1"、"PLAYLIST OUT"）、胶带与手绘涂鸦符号（♪ ★ ✧ ❥ ♬ 等）。
  - Added `BackgroundDecorations` component that layers stickers, tape strips, and hand-drawn doodles (♪ ★ ✧ ❥ ♬) across the page background.
  - 所有装饰元素均设置 `pointer-events: none`，不干扰任何交互操作。
  - All decorations are pointer-events-none and never interfere with interaction.

### 优化 / Changed

- **装饰元素位置优化**：`UserPlaylistsPaper` 的粉色胶带贴到纸张左上角边缘（`top: -1rem`，更大尺寸、更大旋转角度），金色星星 ✦ 移至右侧外边缘，同时避免遮挡标题内容。
- Repositioned decorative tape (bigger, sharper angle, top-left corner) and star (further right) on the batch paper for better visual balance.
- **"全选"按钮位置下移**：从「批量打包导出」面板内移至「公开歌单目录」列表标题行的右侧，与选项列表语义对齐，操作更直观。
- Moved "Select All" button from the export panel to the playlist catalog header row, co-located with the list it controls.
- **响应式装饰防溢出**：将胶带与星星的绝对定位外移量收窄（`-1.5rem → -1rem`），并外套绝对定位 `<div>` 容器，防止在小屏幕上触发横向滚动条。
- Tightened absolute-positioned decorative offsets to prevent overflow-x on narrow viewports.

### 修复 / Fixed

- **CI 构建兼容**：`Tape` 组件不支持 `"blue"` 颜色值，本地 Vite 打包未报错但 CI `tsc --noEmit` 严格类型检查会失败，已替换为合法的 `"cyan"`。
- Fixed `Tape color="blue"` TypeScript error (not in the allowed union) that only surfaces during CI strict typecheck (`tsc --noEmit`), replaced with `"cyan"`.

---

## [v2.0.0] - 2026-09-12

### 🌟 升级为全新 Web 网页版 / Evolution to PlaylistOut Web

这是 PlaylistOut 的一次重要里程碑升级：项目从最初本地运行的 QQ 音乐 Python 命令行脚本，全面演进为开箱即用的现代化在线 Web 工具 [`playlistout.lengxiqwq.com`](https://playlistout.lengxiqwq.com)。无需安装 Python 环境或第三方依赖，在浏览器中即可直接解析与导出公开歌单。

This is a major milestone release for PlaylistOut: the project has evolved from a local Python command-line script into a modern, ready-to-use web application at [`playlistout.lengxiqwq.com`](https://playlistout.lengxiqwq.com). Users can now parse and export public playlists directly in their browsers without installing Python or local dependencies.

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
