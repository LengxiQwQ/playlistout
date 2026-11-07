# Playlist Out — 电影级音乐手账 Motion Graphics 宣传片 (`promo-film`)

> **Playlist Out — 把你的歌单带走**  
> 官方网站：<https://playlistout.lengxiqwq.com/>  
> 开源仓库：<https://github.com/LengxiQwQ/playlistout>

本目录是 **Playlist Out** 的独立宣传片工程，基于 **Remotion 4 + React 18 + TypeScript + Python DSP 原创配乐与音效合成器** 构建，与主仓库代码（`web/`、`worker/`、`cli/`、`plugins/`）完全隔离，互不干扰。

---

## 一、核心成片与交付物路径

| 交付项 | 路径 | 说明 |
|---|---|---|
| **1080p 完整成片 (MP4)** | `out/PlaylistOut_MusicJournal_Film_1080p.mp4` | `1920 × 1080` · `30fps` · `56.0s (1680 帧)` · H.264 (`yuv420p`) + AAC 48kHz 立体声 |
| **Remotion 源代码** | `src/` | 全片连续手账世界 (`JournalWorld`)、七幕连续叙事场景与物理折纸/飞行转场组件 |
| **原创配乐与拟音母带** | `public/audio/soundtrack-mix.wav` | 120 BPM (28 小节) 温暖放克电钢琴 × 轻快 Chiptune × 马林巴木琴配乐 + 逐帧同步拟音 |
| **分轨音频文件** | `public/audio/music-stem.wav`、`public/audio/sfx-stem.wav` | 纯音乐分轨与纸张/胶带/印章/按键拟音分轨 |
| **音乐授权与商用说明** | `public/audio/AUDIO_LICENSE.md` | 100% 程序化原创合成音频（CC0 1.0 / MIT 双重授权，Bilibili / YouTube 无版权争议） |
| **离线中英文字体包** | `public/fonts/` + `public/fonts/FONTS_LICENSE.md` | 内置 `Ma Shan Zheng`、`ZCOOL KuaiLe`、`Permanent Marker`、`Caveat`、`Space Mono` |
| **真实项目图片与纹理素材** | `public/images/` | `logo-512.png`、`logo-128.png`、`paper-grain.png`、`paper-creases.png`、`cli-interactive.jpg` |
| **关键帧截图与分镜检视表** | `previews/keyframes/`、`previews/contact_sheet_part1.jpg`、`previews/contact_sheet_part2.jpg` | 覆盖全部七幕与所有转场桥接帧的高清抽帧及拼图 |

---

## 二、视频规格与音乐节拍架构

- **分辨率与画幅**：`1920 × 1080`（横屏 16:9）
- **帧率**：`30 fps`
- **总时长**：`56.0 秒`（共 `1680 帧`）
- **音乐速度**：`120 BPM`（4/4 拍，每拍 `0.5s = 15 帧`，每小节 `2.0s = 60 帧`，全片共 `28 小节`）
- **编码参数**：H.264 (`--pixel-format=yuv420p`, `--crf=18`) + AAC (`192 kbps`, `48 kHz` 立体声)

---

## 三、视觉风格与叙事连续性设计

### 1. 音乐手账拼贴风 × UI Motion Graphics × 温暖轻电影感
严格还原并升华 `playlistout.lengxiqwq.com` 的真实视觉语言：
- **纸张与装订系统**：米白横线笔记本纸张（`#f6f1e5`，`38px` 行距横线 `#e2dacd`）、真实纸张纤维与折痕纹理叠加、左侧活页装订孔、珊瑚红页边线（`#ff8a80`）与温暖桌面阳光暗角。
- **手绘纸品与胶带细节**：手绘不规则双曲率边框（`255px 15px 225px 15px / 15px 225px 15px 255px`）、撕边半透明和纸胶带（带高光斜向光泽）、奶油黄/薄荷绿/樱花粉/天空蓝便利贴与硬边剪贴阴影。
- **字体层次**：
  - 中文手账主标题：`Ma Shan Zheng`（马善政毛笔手写体）
  - 中文手写贴纸/批注/按钮：`ZCOOL KuaiLe`（站酷快乐体）
  - 英文品牌标志与手写批注：`Permanent Marker` + `Caveat`
  - 链接、CLI 终端、JSON 与编号数据：`Space Mono`

### 2. 全片单页连续叙事（零硬切、零 PPT 翻页）
全片始终发生在同一张持续呼吸、自然纵向滑移的音乐手账内页（`JournalWorld`）上，并以一枚贯穿全片的金色音符车票（`TravellingMotifOverlay`）串联七幕：

| 章节 | 时间 (`帧范围`) | 音乐小节 | 核心内容与连续转场设计 |
|---|---|---|---|
| **Act 1 · 歌单困境与项目登场** | `00.0s – 07.5s` (`0–225f`) | Bars 1–4 | 六大平台（QQ 音乐、网易云音乐、汽水音乐、酷我音乐、咪咕音乐、酷狗音乐）歌单卡片被困 → 金色马克笔划破枷锁，`把你的歌单带走` 毛笔主标题登场 → 六张大卡片沿二次贝塞尔曲线直接飞入并缩小变形为黄色搜索便利贴（`SearchNote`）底部的 6 枚平台贴纸 |
| **Act 2 · 网页一键解析歌单** | `07.2s – 19.6s` (`215–588f`) | Bars 4–10 | 在同一张黄色 `SearchNote` 中粘贴真实歌单链接 `https://y.qq.com/n/ryqq/playlist/9140654872` → 点击 `解析` → 下方展开白色 `ResultPaper`，完整展示封面、作者 `琴心月满`、`104 首`、`7 小时 6 分钟` 及歌曲表格（含 `正常`、`VIP 专享`、`付费专辑`、`下架/无版权`、`视频原声` 真实状态徽章），右侧贴出汽水双通道与酷狗扫码解锁便利贴 |
| **Act 3 · 多格式导出与纸张折纸** | `18.6s – 28.7s` (`558–862f`) | Bars 10–14 | 镜头聚焦 `ExportToolbar` 多选导出栏 → 歌曲表格行化作彩色数据流，通过纸张折纸（Origami Fold）变形为双工作表 **Excel (`.xlsx`：`Tracks` + `Playlist Info`)** 与 **Canonical JSON (`.json`)** 档案卡，并依次弹出 `.csv`、`.txt`、`.m3u8`、`.md` 与剪贴板复制提示 |
| **Act 4 · 用户歌单批量导出** | `27.8s – 38.7s` (`835–1160f`) | Bars 14–19 | 单张歌单卡片滑入 `琴心月满 的音乐手账` 批量工作台（`12 个公开歌单 · 共 1,420 首`）→ 12 张歌单卡片随 120 BPM 节拍掀起波浪全选 → 汇聚折叠为 **多工作表合一 Excel (`.xlsx`)** 与 **牛皮纸档案袋 ZIP (`.zip`)** |
| **Act 5 · 桌面 CLI 跨平台工具** | `37.7s – 49.2s` (`1132–1475f`) | Bars 19–24 | 批量归档包裹翻转落地为贴在手账页上的 **Windows PowerShell** 终端窗口（严格还原 `docs/images/cli-interactive.jpg` 与 `cli/core/ui.py`）：`playlistout` 启动、`1-6` 平台彩色菜单、粘贴链接自动识别、打印歌单详情、交互选择格式并导出 `.xlsx`，右侧贴出 `Windows .exe`、`macOS`、`Linux` 跨平台支持与命令行批处理示例 |
| **Act 6 · 第三方生态与开放接口** | `48.2s – 53.8s` (`1445–1615f`) | Bars 24–27 | 导出的 JSON/Excel 汇入 `把歌单带进更多地方 ♪` 面板：清晰区分 **已支持开源播放器**（`MusicFree` 官方插件、`洛雪音乐` 专用 JSON 导入、`Listen 1` 备份 JSON 恢复）、**计划中功能**（`BBPlayer` ⏳ 待上线）、**第三方迁移服务**（`Soundiiz`、`TuneMyMusic`、`FreeYourMusic`）以及 **开发者生态**（`Public API v1` 与 `Canonical JSON`） |
| **Act 7 · 品牌收束与温暖结尾** | `53.0s – 56.0s` (`1590–1680f`) | Bars 27–28 | 四周贴满旅程纪念便利贴，中央展开 **Playlist Out · 把你的歌单带走** 主手账卡，突出展示 `playlistout.lengxiqwq.com`、`github.com/LengxiQwQ/playlistout` 与 `MIT 开源协议`，伴随第 28 小节 Cmaj9 和弦余韵定格在底部红线 `✦ END OF PAGE ✦` |

---

## 四、本地运行、预览与重新渲染指南

### 1. 环境准备
本项目依赖 Node.js (≥ 20) 与 Python (≥ 3.10，用于音频合成与 QA 抽帧脚本)。

```bash
cd promo-film
npm install
```

### 2. 启动 Remotion Studio 交互预览
```bash
npm run studio
```

### 3. TypeScript 类型检查
```bash
npm run typecheck
```

### 4. 重新生成原创配乐与拟音音效（可选）
```bash
python scripts/generate_soundtrack.py
```

### 5. 渲染 1080p 最终成片 (MP4)
```bash
npm run render
```
渲染完成后，输出视频位于：
`promo-film/out/PlaylistOut_MusicJournal_Film_1080p.mp4`

### 6. 运行自动化视觉抽帧与分镜表生成
```bash
python scripts/qa_inspect.py
```
抽帧图片与高清分镜检视表将输出至 `promo-film/previews/`。
