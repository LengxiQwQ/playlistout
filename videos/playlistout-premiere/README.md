# Playlist Out — 把你的歌单带走

> 独立 56 秒音乐手账动画短片 · Remotion 4 / React / TypeScript  
> 网站：<https://playlistout.lengxiqwq.com/>  
> 仓库：<https://github.com/LengxiQwQ/playlistout>

本目录是 Playlist Out 的独立宣传片工程，不修改主项目的 `web/`、`worker/`、`cli/` 或 `plugins/`。

---

## 一、交付物

| 交付项 | 路径 |
|---|---|
| 成片 MP4（H.264） | `output/playlistout-premiere.mp4` |
| Remotion 源码 | `src/` |
| 原创配乐 / 音效 | `public/audio/soundtrack.wav` |
| 纯音乐分轨 / 音效分轨 | `public/audio/music-only.wav`、`public/audio/sfx-only.wav` |
| 音频生成器 | `tools/make_score.py` |
| 字体与授权 | `public/fonts/`、`public/fonts/licenses/` |
| Logo 与纸张纹理 | `public/brand/`、`public/textures/` |
| 配乐与素材授权说明 | `public/audio/AUDIO_LICENSE.md`、`ASSETS.md` |
| Contact Sheet | `qa/contact-sheet.jpg` |
| 关键帧截图 | `qa/keyframes/` |
| 质量检查记录 | `QA_REPORT.md` |
| 视频工程许可 | `LICENSE-VIDEO.txt` |

**视频规格**：1920 × 1080 / 30 fps / 56.000 s / 1680 帧 / H.264 yuv420p / AAC 48 kHz 立体声。

---

## 二、故事与节拍

全片在一张持续存在的音乐手账页上完成，以一枚金色音符贴纸作为贯穿线索。

| 时间 | 段落 | 内容 |
|---|---|---|
| 00–07 s | 被困住的歌单 | 六平台卡纸、纸笼、主标题与“把它带走” |
| 06–19 s | 网页解析 | 粘贴链接、解析、歌单摘要、曲目表与导出格式 |
| 17–27 s | 多格式导出 | 曲目表折成 Excel 双工作表与 Canonical JSON，带出 CSV / TXT / M3U8，并注明 Markdown 为源码内置导出器 |
| 25–34.5 s | 批量导出 | 三个公开歌单的勾选、多 Sheet Excel 与 ZIP 打包 |
| 33.4–46.7 s | 桌面 CLI | Windows PowerShell 交互、歌单识别、格式选择、导出完成与跨平台说明 |
| 45.5–52.6 s | 生态与 API | MusicFree 官方插件、洛雪 / Listen 1 JSON 导入、第三方迁移与 Public API |
| 51.2–56 s | 品牌结尾 | 官网、GitHub、MIT 与手账式收束 |

配乐为 120 BPM、28 小节，与画面关键节点共用同一份 `src/timeline.json` 时间表。

---

## 三、功能真实性边界

制作时已对照项目源码、README 与 CLI 文档。以下限制同样写在成片或 QA 中：

- 六个平台支持**单歌单解析**。批量导出能力主要覆盖 QQ 音乐、网易云音乐与酷狗音乐，酷狗完整批量需要登录；成片批量演示使用 QQ 音乐示例。
- 酷狗普通歌单免登录只能预览前 10 首；扫码/登录后解锁完整歌单。
- Web 主导出工具栏当前提供 **Excel / JSON / CSV / TXT / M3U8** 五个常用格式。**Markdown 导出器存在于源码注册表中，但不是当前 Web 主工具栏按钮**；成片以“源码内置导出器”的小字注明，没有把它当作主格式宣传。
- 洛雪音乐和 Listen 1 是**专用 JSON 导出 / 导入**能力，不是与 MusicFree 同类的官方插件；MusicFree 是官方插件；BBPlayer 为待上线。
- Soundiiz、TuneMyMusic、FreeYourMusic 是第三方服务；Soundiiz 一键迁移上限约 200 首，不属于 Playlist Out 内置能力。
- Playlist Out 只处理歌单数据：**不下载音频、不抓取歌词、不代理媒体**。页面及 CLI 的导出文件在本地生成。
- 普通解析不在服务端持久化歌单；站点仍会进行匿名聚合统计，并使用第三方体验分析及“一键反馈”功能。
- 成片中的歌单名、作者、曲目、3 个歌单与 151 首等均为**演示数据**；UI 是按真实源码与设计规范重绘的动画示意，不是实际录屏。

---

## 四、重新渲染

环境：Node.js ≥ 20、Chrome（或由 Remotion 自动下载的 headless shell）、Python ≥ 3.10（可选，用于重新配乐和 QA）。

```bash
cd videos/playlistout-premiere
npm install
npm run typecheck
npm run studio
npm run render
```

`npm run render` 会生成 `output/playlistout-premiere.mp4`。

可选步骤：

```bash
python tools/make_score.py   # 重新生成原创配乐与音效
python tools/qa.py           # 输出媒体检查与抽帧
```

如果系统找不到 Chrome，可在渲染命令后追加：

```bash
--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

最终成片由 Remotion 实际渲染（非离线替代渲染）；`src/Main.tsx` 会先等待本地字体、Logo 与纸张纹理解码，再开始截图。

---

## 五、声音与授权

- 配乐与拟音由 `tools/make_score.py` 使用 NumPy 程序化合成，无任何第三方录音、采样或商业歌曲。
- 声音包含 felt piano / 电钢琴、马林巴、轻 Chiptune、轻鼓组、纸张、胶带、按键、印章与拉链拟音。
- 音乐与音效按 **CC0 1.0 / MIT** 提供，可用于 Bilibili、YouTube 和项目宣传；详见 `public/audio/AUDIO_LICENSE.md`。
- 图像与品牌素材来源、字体清单和授权路径见 `ASSETS.md`。

---

## 六、已知限制

- 没有进行人耳听审；本环境只能检查响度、峰值、声道、解码与音画时长。发布前建议戴耳机完整试听。
- 全片检查基于完整解码、抽帧与 Contact Sheet，不等同于对每一帧做 OCR / 包围盒证明；`QA_REPORT.md` 记录了实际检查范围与未覆盖项。
- 片中不展示酷狗“普通歌单免登录仅前 10 首”的具体操作过程，只在平台芯片及侧注中说明；完整批量流程以 QQ 音乐为示例。

完整检查结果见 `QA_REPORT.md`。
