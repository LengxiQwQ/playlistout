# Playlist Out — 把你的歌单带走（v4 尺度版）

> 58 秒音乐手账动画短片 · Remotion 4 / React / TypeScript  
> 网站：<https://playlistout.lengxiqwq.com/>  
> 仓库：<https://github.com/LengxiQwQ/playlistout>

本目录是 Playlist Out 的独立宣传片工程，不修改主项目的 `web/`、`worker/`、`cli/` 或 `plugins/`。

v4 是一次**全片 UI 尺度重排**：

- 主标题保持原来的电影字号（122 / 59 等）。
- 其余 UI、表格、终端、卡片、按钮、标签按 **1.75× 逻辑尺度**重排，一屏内容减少，文字和触控元素一起变大。
- 不是把整张 1920 画面 `scale(1.75)`；页面、装订孔、主标题仍按 1920 排版。
- 之前 v3 使用的 Ma Shan Zheng、Caveat、Noto Sans SC、Space Mono、Permanent Marker 全部恢复；新建 composition 也等待字体加载完再截图。
- 全片场景：Cold Open → Intro → 大版 Parse → 大版 Export → 大版 Batch → 大版 CLI → 大版 Ecosystem → 大版 Finale。
- 纸纤维、固定镜头、无页码/STEP 的原则继续保留。

---

## 一、交付物

| 交付项 | 路径 |
|---|---|
| 成片 MP4（H.264） | `output/playlistout-premiere.mp4` |
| Remotion 源码 | `src/` |
| v4 全片入口 | `src/v4/V4Main.tsx` |
| 尺度 demo / 对照 | `ScaleLab` composition、`demo/scale-comparison-844.jpg` |
| 目标与轮次 | `V4_ROADMAP.md` |
| 手机宽度抽帧 | `qa/phone-sheet-v4.jpg` |
| Contact Sheet | `qa/contact-sheet.jpg` |
| 关键帧 | `qa/keyframes/` |
| QA 记录 | `QA_REPORT.md` |
| 旧版 v3 | `archive-v3/playlistout-premiere-v3.mp4` |

**视频规格**：1920 × 1080 / 30 fps / 58.005 s / 1740 帧 / H.264 yuv420p / AAC 48 kHz 立体声。

---

## 二、这一版实际做了什么

| 场景 | v4 处理 |
|---|---|
| Cold Open / Intro | 保留电影级主标题、笼子和冷开场；字体重新加载 |
| Parse | 大版搜索卡与 6 行结果表；全部平台标签；导出格式 |
| Export | 大版 Excel / JSON 双文件卡；CSV / TXT / M3U8；Markdown 仍只作源码内置导出器说明 |
| Batch | 大版三条歌单、多 Sheet / ZIP、151 首、50 个上限、酷狗登录说明 |
| CLI | 24–25px 终端正文、平台列表、歌单详情、五种格式、导出结果、跨平台 |
| Ecosystem | 大版 MusicFree / 洛雪 / Listen 1、Public API；BBPlayer 与第三方迁移说明 |
| Finale | 主标题不放大；网址、GitHub、MIT 和手写批注放大 |

粉色音符在画页右侧纸张边缘全程可见，尺寸约 170–220px。角色重画、手指点击和鼓点同步尚未进入这一版；当前只解决“看得见、不被挤没”。

---

## 三、功能真实性边界

- 六个平台支持**单歌单解析**；批量演示仍以 QQ 音乐为例，酷狗完整批量需要登录。
- Web 主导出格式：Excel / JSON / CSV / TXT / M3U8；Markdown 是源码内置导出器，不在主工具栏。
- 洛雪 / Listen 1 是专用 JSON 导出/导入；MusicFree 是官方插件；BBPlayer 待上线；Soundiiz 等是第三方迁移服务。
- 只处理歌单数据：不下载音频、不抓取歌词、不代理媒体。
- 成片中的歌单名、曲目、3 个歌单 / 151 首均为演示数据；UI 是动画重绘，不是屏幕录制。
- 没有竖屏版本。

---

## 四、重新渲染

```bash
cd videos/playlistout-premiere
npm install
npm run typecheck
npm run studio
npm run render
```

`npm run render` 现在指向 `PlaylistOutV4`，生成 `output/playlistout-premiere.mp4`。

可选：

```bash
python tools/make_intro_prelude.py  # 58 秒音轨
python tools/make_paper.py          # 纸纤维纹理
python tools/qa.py output/playlistout-premiere.mp4
```

---

## 五、声音与授权

- 配乐与拟音由 `tools/make_score.py` 程序化合成，无第三方录音、采样或商业歌曲。
- v3/v4 使用 `public/audio/soundtrack-v3.wav`：2 秒冷开场 + 原 56 秒配乐，58 秒。
- 音频按 CC0 1.0 / MIT 提供；详见 `public/audio/AUDIO_LICENSE.md`。
- 图片、字体和纹理来源见 `ASSETS.md`。

---

## 六、已知限制 / 下一轮

这一版是**尺度版**，不是最终叙事版：

- 转场仍是场景硬切；恢复接近 v1 的连续转场是第 2 轮。
- 粉色音符仍是旧造型，手没有真正点按钮，也没有踩 120 BPM 鼓点；这是第 3 轮。
- Intro / Cold Open 的部分装饰性小字仍比大版 UI 小；细节轮再统一。
- 导出页、批量页和 CLI 为适配 1.75× 重排，视觉细节比 v3 简化，但功能点保留。
- 未做人耳听审；发布前应完整听一遍 2 秒冷开场到主配乐的衔接。

完整检查见 `QA_REPORT.md`，轮次见 `V4_ROADMAP.md`。
