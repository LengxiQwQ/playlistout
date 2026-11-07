# 音乐、音效与字体授权说明 (Audio, SFX & Font Licensing)

本宣传片（`playlistout-storybook`）所使用的全部配乐、Foley 交互音效与手账字体均具备明确的开源/免费商用许可，可直接公开发布于 **Bilibili**、**YouTube**、**GitHub** 与项目官网，无任何第三方版权争议或 Content ID 静音风险。

---

## 1. 原创配乐与交互音效 (`public/assets/soundtrack.wav` / `.mp3`)

- **创作与生成方式**：由工程内置的 [`scripts/generate-audio.py`](./scripts/generate-audio.py) 基于 NumPy 数字信号合成引擎 100% 原创程序化作曲与混音。
- **音乐规格**：
  - **风格**：Playful Electronic × Funky Bass × Light Chiptune × Cozy Fender Rhodes / Marimba
  - **速度与拍号**：120 BPM，4/4 拍（每拍 0.5 秒 = 15 帧 @ 30fps，每小节 2.0 秒 = 60 帧）
  - **调性**：F 大调 / D 小调五声与爵士九和弦进行（`Fmaj9 – G13 – Em7 – Am7 – Dm9 – G7 – Cmaj9 – C7`），第 27–28 小节以温暖的 `Dm9 → G13 → Fmaj9` 音乐盒分解和弦完成收束。
  - **采样率与位深**：48,000 Hz，16-bit Stereo PCM（视频封装为 320 kbps AAC）。
- **逐帧同步音效 (Frame-Locked Foley & UI SFX)**：
  - **纸张翻折与滑入 (`sfx_paper_whoosh`)**：对应歌单便签展开、多格式折纸变形、歌单合集展开、终端登场与结尾收束。
  - **和纸胶带贴合 (`sfx_tape_slap`)**：对应四角和纸胶带按压贴合帧。
  - **鼠标点击与机械键盘敲击 (`sfx_click` / `sfx_key_tick`)**：对应「解析」「导出 ↓」「一键打包导出」点击帧以及 CLI 链接输入帧。
  - **贴纸弹出与弹簧回弹 (`sfx_pop` / `sfx_boing`)**：对应平台贴纸、格式卡片扇形展开、勾选框与音符碰撞。
  - **解析与导出完成风铃 (`sfx_chime`)**：对应歌单解析完成与文件导出成功提示。
- **许可协议**：**CC0 1.0 Universal (Public Domain) / MIT Dual License**，归属本仓库自由使用。

---

## 2. 字体授权 (`public/fonts/`)

| 字体文件 | 字体名称 | 用途 | 开源许可协议 |
|---|---|---|---|
| `MaShanZheng-Regular.ttf` | 马善政毛笔楷书 (`Ma Shan Zheng`) | 中文手账主标题、手写便签与批注（与官网 `zhnote` 预设一致） | **SIL Open Font License 1.1 (OFL-1.1)** |
| `ZCOOLKuaiLe-Regular.ttf` | 站酷快乐体 (`ZCOOL KuaiLe`) | 手账趣味徽章与辅助装饰标题 | **SIL Open Font License 1.1 (OFL-1.1)** |
| `PermanentMarker-Regular.ttf` | `Permanent Marker` | 英文主标题 `Playlist Out` 与记号笔标签 | **Apache License 2.0** |
| `Caveat-Bold.ttf` | `Caveat` | 英文手写注释与副标题 | **SIL Open Font License 1.1 (OFL-1.1)** |
| `SpaceMono-Regular.ttf` / `Bold.ttf` | `Space Mono` | 歌单 URL、CLI 终端界面、JSON 代码与技术参数 | **SIL Open Font License 1.1 (OFL-1.1)** |

---

## 3. 图像与图标素材 (`public/assets/`)

- `logo-512.png`、`logo-128.png`、`paper-grain.png`、`paper-creases.png`、`github.svg`、`cli-interactive.jpg` 均来自 `LengxiQwQ/playlistout` 仓库自有资产，遵循仓库 **MIT License**。
