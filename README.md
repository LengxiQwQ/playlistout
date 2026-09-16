<div align="center">

<img src="https://raw.githubusercontent.com/LengxiQwQ/playlistout/main/web/public/logo-180.png" width="96" alt="PlaylistOut" />

# Playlist Out

*你的歌单，不应该只困在一个音乐平台里。*

[![Website](https://img.shields.io/badge/Website-playlistout.lengxiqwq.com-EAA008?style=flat-square)](https://playlistout.lengxiqwq.com)
[![Stars](https://img.shields.io/github/stars/LengxiQwQ/playlistout?style=flat-square&logo=github&color=D97706)](https://github.com/LengxiQwQ/playlistout/stargazers)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)

**[🌐 playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)**

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

无需安装任何软件，直接打开 **[playlistout.lengxiqwq.com](https://playlistout.lengxiqwq.com)** 即可开始：

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

## 📋 数据导出格式规范与开放集成

为方便第三方音乐平台、开发者工具及外部自动化流水线无缝接入与识别从 PlaylistOut 导出的歌单，我们正式确立并标准化了以下 4 种文件格式的存储结构与数据规范。

> 💡 **第三方平台接入建议**：推荐优先读取并解析 **JSON 格式**。JSON 格式包含了最完备的元信息字段、精准类型约束以及未转义的原始曲目数据。

---

### 1. JSON 格式 (`.json`) —— 推荐平台接入规范

- **编码标准**：`UTF-8`（无 BOM）
- **MIME 类型**：`application/json`
- **设计目标**：跨平台导入导出、第三方音乐播放器歌单互通、自动化批处理。

#### 根对象字段规范 (Root Schema)

| 字段名 | 类型 | 空值约定 | 字段说明与格式 |
|---|---|---|---|
| `createTime` | `string \| null` | 可选 | **歌单创建时间**（首位字段）。标准时间字符串 `YYYY-MM-DD HH:mm:ss`，若上游平台未提供则返回 `null` |
| `exportedAt` | `string` | 可选 | **数据导出时间**。客户端生成文件的本地时间 `YYYY-MM-DD HH:mm:ss` |
| `generator` | `string` | 可选 | **导出工具平台标识**。固定为 `"PlaylistOut"` |
| `generatorUrl` | `string` | 可选 | **平台官方网址**。固定为 `"https://playlistout.lengxiqwq.com"` |
| `name` | `string` | **必填** | 歌单完整名称 |
| `creator` | `string` | 可选 | 歌单创建者昵称 |
| `updateTime` | `string \| null` | 可选 | 歌单最后修改/更新时间。格式：`YYYY-MM-DD HH:mm:ss` |
| `platform` | `string` | **必填** | 来源平台标识（例如 `"qqmusic"`） |
| `id` | `string` | **必填** | 平台原始歌单唯一标识 ID（例如 `"773829104"`） |
| `sourceUrl` | `string` | **必填** | 歌单在来源平台上的网页版直链 URL |
| `trackCount` | `number` | **必填** | 歌单实际包含的曲目条目总数（整型） |
| `totalDuration` | `string \| null` | 可选 | 歌单曲目总时长格式化文本（如 `"3 小时 45 分钟"`） |
| `playCount` | `number \| null` | 可选 | 歌单累计播放量总次数（整型） |
| `tags` | `string[]` | 可选 | 歌单所属风格/分类标签数组（如 `["流行", "轻音乐"]`） |
| `description` | `string` | 可选 | 歌单简介与背景文案描述 |
| `tracks` | `Track[]` | **必填** | 歌曲对象数组，严格按歌单原始顺序排列 |

#### 歌曲对象字段规范 (Track Schema)

| 字段名 | 类型 | 空值约定 | 字段说明与格式 |
|---|---|---|---|
| `index` | `number` | 可选 | 歌曲在歌单中的显示序号（从 1 起始自增） |
| `id` | `string` | 可选 | 来源平台的歌曲唯一 ID / MID（例如 `"0039MnYb0qxYAc"`） |
| `title` | `string` | **必填** | 歌曲标题（保留完整版本名与副标题） |
| `artists` | `string[]` | **必填** | 参与歌手名数组（多位歌手分别作为独立元素，如 `["周杰伦", "阿信"]`） |
| `album` | `string` | **必填** | 收录专辑名称 |
| `durationMs` | `number` | 可选 | 歌曲音频总时长（毫秒，如 `269000` 表示 4分29秒） |
| `sourceUrl` | `string` | 可选 | 该歌曲在来源平台上的网页详情直链 URL |

#### 标准 JSON 示例

```json
{
  "createTime": "2021-06-18 14:30:00",
  "exportedAt": "2026-09-14 23:30:00",
  "generator": "PlaylistOut",
  "generatorUrl": "https://playlistout.lengxiqwq.com",
  "name": "华语经典流行精选集",
  "creator": "音乐咖啡馆",
  "updateTime": "2024-03-01 09:15:20",
  "platform": "qqmusic",
  "id": "773829104",
  "sourceUrl": "https://y.qq.com/n/ryqq/playlist/773829104",
  "trackCount": 2,
  "totalDuration": "8 分钟",
  "playCount": 128500,
  "tags": ["流行", "经典", "华语"],
  "description": "收录那些触动心灵的华语旋律，陪你度过安静时光。",
  "tracks": [
    {
      "index": 1,
      "id": "0039MnYb0qxYAc",
      "title": "晴天",
      "artists": ["周杰伦"],
      "album": "叶惠美",
      "durationMs": 269000,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYAc"
    },
    {
      "index": 2,
      "id": "0027fM2M3wD4gS",
      "title": "说好不哭",
      "artists": ["周杰伦", "阿信"],
      "album": "说好不哭",
      "durationMs": 222000,
      "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/0027fM2M3wD4gS"
    }
  ]
}
```

---

### 2. CSV 格式 (`.csv`)

- **文件编码**：`UTF-8 with BOM`（首字节包含 `\uFEFF`，防止 Windows 系统下 Microsoft Excel 打开乱码）
- **行换行符**：`\r\n` (CRLF)
- **元数据注释块**：文件首部以 `# ` 开头输出歌单元信息与导出工具平台标识，常规表格解析器若仅需解析歌曲，忽略以 `#` 开头的注释行即可；
- **防公式注入保护**：单元格若以 `=`, `+`, `-`, `@`, `\t`, `\r` 开头，自动添加 `'` 前缀进行安全转义，阻断电子表格宏代码执行风险；
- **字段引用规则**：遵循 RFC 4180 规范，包含逗号或双引号的内容使用双引号包裹，内部双引号使用双重转义 `""`。

#### CSV 文件示例

```csv
# 创建时间: 2021-06-18 14:30:00
# 导出时间: 2026-09-14 23:30:00
# 导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)
# 歌单名称: 华语经典流行精选集
# 歌单作者: 音乐咖啡馆
# 歌曲总数: 2 首 (8 分钟)
# 风格标签: 流行, 经典, 华语
# 总播放量: 128,500 次
# 歌单链接: https://y.qq.com/n/ryqq/playlist/773829104
序号,歌曲标题,歌手,专辑,时长
1,晴天,周杰伦,叶惠美,04:29
2,说好不哭,"周杰伦, 阿信",说好不哭,03:42
```

---

### 3. Excel 格式 (`.xlsx`)

- **文件规格**：原生 Microsoft Excel OpenXML 工作簿 (`.xlsx`)
- **工作表名称**：`歌单歌曲`
- **布局结构**：
  1. **元数据卡片区（第 1-6/7 行，双列键值对布局）**：
     - 行 1：`['歌单名称', playlist.name, '', '']`
     - 行 2：`['创建时间', createTime, '导出时间', exportedAt]`（*创建时间第 1 位，导出时间第 2 位并列紧邻*）
     - 行 3：`['导出工具', 'PlaylistOut', '平台网址', 'https://playlistout.lengxiqwq.com']`
     - 行 4：`['歌单作者', creator, '歌曲总数', trackCountStr]`
     - 行 5：`['最后更新', updateTime, '总播放量', playCountStr]`
     - 行 6：`['风格标签', tagsStr, '歌单链接', sourceUrl]`
     - 行 7（可选）：`['歌单简介', description, '', '']`（仅在有简介时生成）
  2. **空行分隔区（第 8 行）**：空白行作为卡片区与数据表格的天然分界线。
  3. **表格列头（第 9 行）**：`序号`、`歌曲标题`、`歌手`、`专辑`、`时长`。
  4. **歌曲数据行（第 10 行起）**：按序填入曲目数据，内置防公式注入防护，并预设自适应列宽（10 / 32 / 22 / 25 / 10）。

---

### 4. TXT 纯文本格式 (`.txt`)

- **文件编码**：`UTF-8`
- **排版风格**：信纸手账式排版（Stationery Format），兼顾人眼直观阅读与简单脚本行读取；
- **排版结构**：
  - 顶部以 `==================================================` 分界线封装元数据卡片；
  - 头部首行固定为 `创建时间:`，次行固定为 `导出时间:`，第三行为 `导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)`；
  - 依次展示歌单名、作者、最后更新、曲目数与总时长、标签、播放量、链接及歌单简介；
  - 分界线下方为曲目清单，逐行输出：`${歌曲标题} - ${歌手} - ${专辑}`（若无专辑则输出 `${歌曲标题} - ${歌手}`）；
  - 保留纯净原始文本，不添加表格转义符号。

#### TXT 文件示例

```text
==================================================
  创建时间: 2021-06-18 14:30:00
  导出时间: 2026-09-14 23:30:00
  导出工具: PlaylistOut (https://playlistout.lengxiqwq.com)
  歌单名称: 华语经典流行精选集
  歌单作者: 音乐咖啡馆
  最后更新: 2024-03-01 09:15:20
  歌曲总数: 2 首 (总时长 8 分钟)
  风格标签: 流行 · 经典 · 华语
  总播放量: 128,500 次
  歌单链接: https://y.qq.com/n/ryqq/playlist/773829104
--------------------------------------------------
  歌单简介:
  收录那些触动心灵的华语旋律，陪你度过安静时光。
==================================================

晴天 - 周杰伦 - 叶惠美
说好不哭 - 周杰伦, 阿信 - 说好不哭
```

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

<!-- WEBSITE_STATS:START -->
### 🌐 网站运营与活跃数据看板

> 📊 数据由 [Cloudflare D1 边缘节点](https://playlistout-api.lengxiqwq.com/api/stats) 实时聚合计算，每日自动化同步存档。

#### 📌 核心流量与使用规模

| 👥 独立访客 (UV) | 📄 页面浏览 (PV) | 🎵 解析歌单数 | 💿 处理歌曲数 | 📦 文件导出数 | ⏱️ 稳定运行 |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **99**<br><sub>今日 +63</sub> | **626**<br><sub>今日 +445</sub> | **92**<br><sub>今日 +33</sub> | **26,685**<br><sub>今日 +9,102</sub> | **183**<br><sub>今日 +100</sub> | **4 天**<br><sub>上线于 2026-09-12</sub> |

#### 🗺️ 访客地理归属与设备分布
- **🌍 主要地区来源：** 🇨🇳 中国大陆 **86%** ｜ 🇭🇰 中国香港 **6%** ｜ 🇺🇸 美国 **4%** ｜ 🇯🇵 日本 **2%** ｜ 🌐 其他国家/地区 **2%**
- **💻 访问设备类型：** 桌面电脑 **68%** ｜ 移动手机 **30%** ｜ 平板电脑 **2%**
- **🌐 主流浏览器：** Chrome **62%** ｜ Edge **21%** ｜ Safari **13%** ｜ 其他浏览器 **4%**

#### 🇨🇳 境内访客省份分布

| 省份 / 直辖市 | 访客占比 | 省份 / 直辖市 | 访客占比 |
| :---: | :---: | :---: | :---: |
| 广东省 | **28%** | 浙江省 | **18%** |
| 北京市 | **14%** | 江苏省 | **12%** |
| 上海市 | **10%** | 四川省 | **7%** |
| 山东省 | **6%** | 湖北省 | **5%** |

#### 📊 业务转化与平台偏好
- **🎵 平台解析份额：** QQ 音乐 **58%** (92 次) ｜ 网易云音乐 **42%** (66 次)
- **📦 导出格式偏好：** Excel 表格 (.xlsx) **66%** ｜ TXT 纯文本 **32%** ｜ JSON 数据 **2%**

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

访问次数：**402** ｜ 不重复访客：**111**（近 14 天） ｜ 仓库克隆：**763** ｜ 不重复克隆：**178**（近 14 天）

**热门来源（近 14 天）：** github.com · Google · Bing · Baidu · chatgpt.com · doubao.com  
**热门内容（近 14 天）：** LengxiQwQ/qqmusic-playlist-exporter · lengxiQwQ/qqmusic-playlist-exporter · releases · LengxiQwQ/music-playlist-exporter

> 数据开始：2026-08-31 · 最后更新：2026-09-16
<!-- INSIGHTS:END -->

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/LengxiQwQ">LengxiQwQ</a></sub>
</p>