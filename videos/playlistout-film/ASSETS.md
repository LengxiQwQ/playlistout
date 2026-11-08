# 素材、字体与音频资产清单 (ASSETS.md)

本目录（`videos/playlistout-film/`）包含独立渲染 **Playlist Out — 把你的歌单带走** 宣传片所需的全部静态资源、字体、纹理与生成脚本。不依赖任何外部 CDN 或在线字体服务，支持 100% 离线确定性构建。

---

## 一、主角设定与手绘组件 (`src/components/PinkNoteMascot.tsx`)

- **角色名称**：音符小助手 ♫（粉色八分音符吉祥物）
- **实现方式**：纯 React + SVG 矢量骨骼与蜡笔滤镜（`feTurbulence` + `feDisplacementMap` 手绘边缘纹理、奶油白模切贴纸外框、猫耳头梁、猫爪印耳罩、右上角八分音符符干与符尾、白手套、运动鞋及多种表情/道具姿态）。
- **物理与动画驱动**：由 `src/components/MascotDirector.tsx` 统一调度全片 1,740 帧（58.0 秒）的连续抛物线跳跃、起跳/落地挤压拉伸（Squash & Stretch）、120 BPM 节拍律动、持指挥棒引导、按键按压回弹、拉动拉链、使用小电脑输入及片尾抱星收束。
- **参考设定图备份**：`references/mascot-design-sheet.jpg`、`references/web-fullpage-reference.jpg`、`references/cli-reference.jpg`（仅作为视觉与交互设计参考，成片画面全部由 Remotion 实时矢量与手账组件渲染）。

---

## 二、品牌图片与纸张材质 (`public/brand/` & `public/textures/`)

| 路径 | 来源 | 用途 | 许可 |
|---|---|---|---|
| `public/brand/logo-512.png` | 主仓库 `web/public/logo-512.png` | 开场与片尾品牌主标识 | MIT（项目自有） |
| `public/brand/logo-128.png` | 主仓库 `web/public/logo-128.png` | 界面卡片品牌角标 | MIT（项目自有） |
| `public/textures/paper-grain.png` | 主仓库 `web/public/paper-grain.png` | 手账纸面细颗粒纹理叠加 | MIT（项目自有） |
| `public/textures/paper-creases.png` | 主仓库 `web/public/paper-creases.png` | 纸张自然折痕与压痕纹理 | MIT（项目自有） |
| `public/textures/paper-fibre-page.png` | 程序化生成 | 1920×1080 全画幅米白纸浆纤维底纹 | CC0 / MIT |
| `public/textures/paper-fibre-tile.png` | 程序化生成 | 1024×1024 卡片与便利贴纸纤维平铺纹理 | CC0 / MIT |

---

## 三、本地打包字体 (`public/fonts/`)

所有字体文件随本工程本地存放，渲染时通过 `FontFace` API 预加载，授权文件位于 `public/fonts/licenses/`：

| 字体文件 | 字体族名 | 用途 | 开源许可证 |
|---|---|---|---|
| `MaShanZheng-Regular.ttf` | `MaShan` | 中文手写大标题、章节手账标题 | SIL Open Font License 1.1 |
| `ZCOOLKuaiLe-Regular.ttf` | `ZCOOLKuaiLe` | 吉祥物气泡台词、趣味手账批注 | SIL Open Font License 1.1 |
| `NotoSansSC-VF.ttf` | `NotoSansSC` | 界面正文、曲目列表、平台与格式说明 | SIL Open Font License 1.1 |
| `SpaceMono-Regular.ttf` / `Bold.ttf` | `SpaceMono` | 歌单链接、CLI 终端、JSON 代码与编号 | SIL Open Font License 1.1 |
| `Caveat-Variable.ttf` | `Caveat` | 英文手写装饰与辅助批注 | SIL Open Font License 1.1 |
| `PermanentMarker-Regular.ttf` | `PermanentMarker` | `Playlist Out` 英文马克笔品牌标识 | Apache License 2.0 |

---

## 四、原创音乐与动作音效 (`public/audio/`)

| 文件 | 说明 | 生成方式 | 许可 |
|---|---|---|---|
| `public/audio/soundtrack.wav` | 58.0 秒完整混音音轨（配乐 + 动作音效，48 kHz / 16-bit 立体声） | `python tools/make_score.py` | CC0 1.0 / MIT |
| `public/audio/music-only.wav` | 58.0 秒纯音乐分轨（120 BPM Funky × Light Chiptune × Cozy Music） | `python tools/make_score.py` | CC0 1.0 / MIT |
| `public/audio/sfx-only.wav` | 58.0 秒纯动作拟音分轨（开锁、跳跃、按键、拉链、翻纸等） | `python tools/make_score.py` | CC0 1.0 / MIT |

详细授权说明见 [`public/audio/AUDIO_LICENSE.md`](public/audio/AUDIO_LICENSE.md)。
