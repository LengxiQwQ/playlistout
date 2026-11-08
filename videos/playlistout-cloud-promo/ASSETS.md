# Playlist Out 电影级手账宣传片资产与授权清单 (Assets & Licenses)

本项目为开源项目 **Playlist Out — 把你的歌单带走** 的电影级音乐手账 Motion Graphics 宣传片工程。  
所有视觉资产、字体、音效及程序化代码均具备清晰合法的开源或公有领域许可。

---

## 1. 角色与吉祥物资产

| 资产名称 | 文件位置 | 格式与来源 | 授权协议 |
|---|---|---|---|
| **小困云 (CloudNoteMascot)** | `src/components/CloudNoteMascot.tsx` | 纯 React 18 + TSX + 内联矢量 SVG 程序化绘制（无外链图） | MIT / Playlist Out 官方设计 |
| **形象特征** | 晴空困困蓝（#BDE6FA）、猫耳奶油白立体耳机（带樱花粉耳垫与微光星芒）、倾斜双层手撕和纸胶带符尾 | 100% 矢量路径重构 | 官方专有形象 |
| **动作姿态与表情** | 8 大表情（panic, rescued, focus, happy, wink, pull, chill, proud）<br/>7 大姿态（trapped, run, jump, press, guide, laptop, star, pull） | 动作关键帧逐帧动力学 | MIT License |

---

## 2. 字体与开源授权

所有字体均位于 `public/fonts/`，并随 Remotion 离线打包分发：

| 字体名称 | 文件名 | 风格定位 | 授权协议 |
|---|---|---|---|
| **马善政毛笔楷书** | `MaShanZheng-Regular.ttf` | 场景大标题、毛笔手账质感 | SIL Open Font License 1.1 |
| **站酷快乐体** | `ZCOOLKuaiLe-Regular.ttf` | 活泼手账贴纸、次级标题与标签 | SIL Open Font License 1.1 |
| **思源黑体 (Noto Sans SC)** | `NotoSansSC-VF.ttf` | 歌曲表格、说明正文、清晰易读 | SIL Open Font License 1.1 |
| **Space Mono** | `SpaceMono-Regular.ttf` / `SpaceMono-Bold.ttf` | CLI 终端、JSON 代码、歌单 URL | SIL Open Font License 1.1 |
| **Caveat** | `Caveat-Variable.ttf` | 英文与手写体小注释 | SIL Open Font License 1.1 |
| **Permanent Marker** | `PermanentMarker-Regular.ttf` | 粗马克笔盖章与边框标签 | Apache 2.0 |

---

## 3. 音乐与拟音音效 (100% 原创程序化生成)

| 资产名称 | 路径 | 生成脚本与技术规格 | 授权协议 |
|---|---|---|---|
| **全片原创配乐与拟音** | `public/audio/soundtrack.wav` | `tools/make_score.py` (NumPy 程序化合成)<br/>48 kHz / 16-bit / 立体声 / 120 BPM | CC0 1.0 Universal / MIT |
| **纯音乐分轨** | `public/audio/music-only.wav` | 电钢琴 (Rhodes)、芬克贝斯 (Slap Bass)、马林巴木琴、轻 Chiptune 琶音与鼓组 | CC0 1.0 Universal / MIT |
| **拟音音效分轨** | `public/audio/sfx-only.wav` | 笼锁开启、金属弹开、果冻跺按、纸张翻卷、拉链齿音、机械键盘回车重击 | CC0 1.0 Universal / MIT |

---

## 4. 纸张材质与品牌标识

| 资产名称 | 路径 | 说明 | 授权协议 |
|---|---|---|---|
| **纸张纤维颗粒** | `public/textures/paper-grain.png` | 高精度纸浆纹理颗粒层 | CC0 1.0 Universal |
| **纸张光影折痕** | `public/textures/paper-creases.png` | 手账本立体轻微折痕与光影 | CC0 1.0 Universal |
| **Playlist Out 品牌图标** | `public/brand/logo-512.png` | 官方高清品牌矢量印章 Logo | MIT / Playlist Out 官方 |
