# Playlist Out — 电影级音乐手账 Motion Graphics 宣传片 (`playlistout-storybook`)

本目录为 **Playlist Out（把你的歌单带走）** 独立宣传片制作工程，基于 **Remotion 4 + React 18 + TypeScript** 构建，完全独立于主仓库产品代码。

---

## 🎬 成片与验收资产概览

| 交付项 | 路径 | 说明 |
|---|---|---|
| **完整 1080p MP4 成片** | [`out/playlistout-storybook.mp4`](./out/playlistout-storybook.mp4) | 56.0 秒（1680 帧 @ 30fps），1920×1080，H.264 (`yuv420p`, CRF 16) + 320kbps AAC 立体声 |
| **全片 28 小节 Contact Sheet** | [`out/qa/contact-sheet.jpg`](./out/qa/contact-sheet.jpg) | 每 2 秒（1 小节 @ 120 BPM）抽帧拼合的 4×7 全片连续性总览图 |
| **关键转场加密抽帧总览** | [`out/qa/transitions-sheet.jpg`](./out/qa/transitions-sheet.jpg) | 覆盖全片 7 处核心转场的前/中/后连续抽帧拼图（共 21 帧） |
| **13 张高清关键帧截图** | [`out/qa/keyframes/`](./out/qa/keyframes/) | 覆盖七大叙事章节的 1920×1080 单帧截图 |
| **原创配乐与音效母带** | [`public/assets/soundtrack.wav`](./public/assets/soundtrack.wav) | 120 BPM 原创手账电子 Funk 配乐 + 逐帧同步交互音效 |
| **音乐与字体授权说明** | [`AUDIO-CREDITS.md`](./AUDIO-CREDITS.md) | Bilibili / YouTube 公开发布授权说明（CC0 / MIT / OFL-1.1） |

---

## 📖 七幕连续叙事结构（56.0 秒 / 1680 帧 @ 30fps，120 BPM）

全片以一枚**金色八分音符（`♫`）**与**音乐手账纸张**作为贯穿始终的视觉线索，在同一本活页音乐手账中完成连续变形与空间调度：

1. **Act 1（00.0s – 07.5s | Frames 0–225）：歌单困境与手账登场**
   - 展示歌单被困在 **QQ 音乐、网易云音乐、酷狗音乐、酷我音乐、汽水音乐、咪咕音乐** 六大平台孤岛中的痛点。
   - 金色音符冲破平台藩篱，六大平台卡片沿曲线连续变形并飞入黄色便利贴（`SearchNote`），化作六枚真实手账贴纸，引出 `Playlist Out · 把你的歌单带走`。
2. **Act 2（07.5s – 19.0s | Frames 225–570）：网页解析歌单（四步真实交互）**
   - 完整呈现普通用户核心流程：**① 复制歌单链接 → ② 粘贴到输入框 → ③ 点击「解析」 → ④ 展开完整歌曲列表（`ResultPaper`）**。
   - 真实还原歌单封面、104 首曲目表格、`VIP` 与 `下架/无版权` 自动标定徽章，以及底部可多选的 `ExportToolbar`。
3. **Act 3（19.0s – 28.5s | Frames 570–855）：多格式本地导出（折纸变形）**
   - 点击「导出 ↓」后，曲目行从纸面跃起并折纸重组为两大主角卡片：
     - **Excel (`.xlsx`) 双工作表卡片**：直观演示 `Sheet 1: Tracks`（纯净歌曲表）与 `Sheet 2: Playlist Info`（元数据分表）的设计价值。
     - **Canonical JSON (`.json`) 统一协议卡片**：展示跨平台标准字段结构。
   - 下方扇形展开 **CSV、TXT、M3U8、Markdown (`.md`)** 四张手账卡片与剪贴板快捷复制提示。
4. **Act 4（28.5s – 38.0s | Frames 855–1140）：用户歌单合集批量导出**
   - 展开 `琴心月满 的音乐手账（共 18 个公开歌单 · 累计 1,420 首歌曲）`，支持 QQ 号、网易云 UID 与酷狗个人云端歌单批量获取。
   - 演示多歌单勾选与一键打包导出，右侧同步折纸生成 **多工作表 Excel 工作簿（`multi_sheet_xlsx`）** 与 **ZIP 歌单合集压缩包（`.zip`）**。
5. **Act 5（38.0s – 48.5s | Frames 1140–1455）：跨平台桌面 CLI 工具**
   - 严格参考 `cli/README.md` 与真实终端界面，在保持稳定的终端窗口内演示：**启动六大平台彩色菜单 → 粘贴链接自动识别 → 歌单详情展示 → 选择格式 `(1, 2)` → 完成导出**。
   - 右侧手账卡片同步展示 **Windows (`.exe`) / macOS / Linux** 跨平台免安装单文件、`npm install -g playlistout` 以及纯命令行批处理模式。
6. **Act 6（48.5s – 53.5s | Frames 1455–1605）：第三方播放器生态与扩展能力**
   - 清晰区分三类能力：
     - **已支持开源播放器**：**MusicFree**（官方插件在线安装 / 粘贴链接或导入本地 JSON）、**洛雪音乐 LX Music**（网页导出专用 `.json` 一键导入列表）、**Listen 1**（网页导出专用备份 `.json` 本地恢复）。
     - **即将上线**：**BBPlayer**（下一正式版本原生内置）。
     - **第三方迁移与开发者接入**：**Soundiiz**（200 首内一键迁移）、TuneMyMusic / FreeYourMusic，以及免注册的 **Public API (`/api/v1/resolve`)** 与 **Canonical JSON**。
7. **Act 7（53.5s – 56.0s | Frames 1605–1680）：温暖品牌收束**
   - 金色音符落回品牌徽章，定格展示 `Playlist Out`、`把你的歌单带走`、`playlistout.lengxiqwq.com`、GitHub 开源仓库与 MIT 许可标识，并以手账标志性的红色页尾线 `✦ END OF PAGE ✦` 与 Fmaj9 音乐盒和弦温暖收束。

---

## 🛠️ 可重复执行的构建、渲染与验收命令

```bash
# 1. 进入宣传片工程目录
cd videos/playlistout-storybook

# 2. 安装依赖
npm install

# 3. 下载本地手账字体 (Ma Shan Zheng / ZCOOL KuaiLe / Permanent Marker / Caveat / Space Mono)
python scripts/fetch-fonts.py

# 4. 重新合成 56.0 秒 120 BPM 原创配乐与逐帧音效
npm run build:audio

# 5. TypeScript 类型检查
npm run typecheck

# 6. 渲染完整 1920x1080 30fps H.264 MP4 成片
npm run render

# 7. 运行完整质量检查（生成 ffprobe 报告、13 张关键帧、21 张转场加密抽帧及 2 张 Contact Sheet）
npm run qa

# 8. 启动 Remotion Studio 交互式时间轴预览（可选）
npm run studio
```
