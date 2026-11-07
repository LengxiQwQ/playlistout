# 素材与字体使用说明

## 产品图片与纹理

| 文件 | 来源 | 用途 |
|---|---|---|
| `public/brand/logo-512.png` | 主项目 `web/public/logo-512.png` | 片头/片尾品牌音符、贴纸 |
| `public/brand/logo-128.png` | 主项目 `web/public/logo-128.png` | 网页与片尾小 Logo |
| `public/textures/paper-grain.png` | 主项目 `web/public/paper-grain.png` | 纸张纤维叠加 |
| `public/textures/paper-creases.png` | 主项目 `web/public/paper-creases.png` | 纸张折痕 |

产品标识与纹理属于 Playlist Out 项目（MIT），用于本项目的品牌宣传。

## 字体

| 字体 | 实际用途 | 授权 |
|---|---|---|
| Ma Shan Zheng（马善政毛笔体） | 中文主标题、章节标题、正文手写 | SIL Open Font License 1.1 |
| ZCOOL KuaiLe（站酷快乐体） | 手账贴纸、辅助标题 | SIL Open Font License 1.1 |
| Caveat | 英文手写批注、日期 | SIL Open Font License 1.1 |
| Space Mono | 网址、CLI、JSON、编号 | SIL Open Font License 1.1 |
| Permanent Marker | 英文品牌字、结尾标牌 | Apache License 2.0 |

字体文件在 `public/fonts/`，通过 `src/global.css` 中的 `@font-face` 加载。完整授权文本在 `public/fonts/licenses/`。这些字体随工程分发，离线渲染不依赖 Google Fonts。

## 配乐与音效

- `public/audio/soundtrack.wav`：56 秒最终混音，48 kHz / 16-bit / 双声道。
- `public/audio/music-only.wav`：纯音乐分轨。
- `public/audio/sfx-only.wav`：纸张、胶带、按键、印章、拉链等拟音分轨。
- 生成源码：`tools/make_score.py`；所有波形、鼓组、旋律与拟音均由代码合成。
- 授权：CC0 1.0 / MIT；详见 `public/audio/AUDIO_LICENSE.md`。
- 不包含任何第三方音乐、录音、采样或歌词。

## 成片与截图

`output/playlistout-premiere.mp4`、`qa/contact-sheet.jpg` 与 `qa/keyframes/` 均来自同一次 1680 帧渲染或该成片。截图不包含额外外部素材。

## 参考图

网站长截图与 `docs/images/cli-interactive.jpg` 仅作为 UI 设计、文案与布局核对参考，不作为成片画面直接使用。所有网页 UI 均为动画重绘。
