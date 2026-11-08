# Playlist Out — 把你的歌单带走（v3）

> 58 秒音乐手账动画短片 · Remotion 4 / React / TypeScript  
> 网站：<https://playlistout.lengxiqwq.com/>  
> 仓库：<https://github.com/LengxiQwQ/playlistout>

本目录是 Playlist Out 的独立宣传片工程，不修改主项目的 `web/`、`worker/`、`cli/` 或 `plugins/`。

v3 的结构变化：

- 取消全局镜头推进，改为固定镜头和稳定的页面构图。
- 取消翻页遮罩、页码、页脚编号和 STEP 标签；章节圆框里的数字改成音符符号。
- 新增 2 秒冷开场：笼子线条慢慢画出，左侧标题先被读到；随后在同一个标题/同一张笼子卡上切入正片。
- 黑色音符替换成粉色猫耳耳机音符：猫耳、耳机、音符符干、白色手套和鞋子，带表情和动作。
- 音符全程不消失，在窗口、按钮和纸张之间用抛物线跳跃；点击时有手套接触、按压和回弹。
- 强化纸张：新的纸纤维页面纹理和卡片纹理，背景不再使用电影聚光灯/暗角。
- 所有小字统一抬高 1–2 个字号，主标题保持原有尺寸。
- 转场不再使用页码式翻页；音符是贯穿全片的连续元素，场景切换时间落在它跃起/落下的过程中。没有全屏翻页、没有页码、没有透明双层页面叠放。

---

## 一、交付物

| 交付项 | 路径 |
|---|---|
| 成片 MP4（H.264） | `output/playlistout-premiere.mp4` |
| Remotion 源码 | `src/` |
| 原创配乐 / 音效 | `public/audio/soundtrack-v3.wav` |
| 旧版 56 秒配乐 / 分轨 | `public/audio/soundtrack.wav`、`music-only.wav`、`sfx-only.wav` |
| 冷开场 2 秒环境声 / 前奏生成 | `public/audio/soundtrack-v3.wav`、`tools/make_intro_prelude.py` |
| 纸张纹理 | `public/textures/paper-fibre-page.png`、`paper-fibre-tile.png` |
| 纹理生成 | `tools/make_paper.py` |
| 字体与授权 | `public/fonts/`、`public/fonts/licenses/` |
| Logo / 纸张旧纹理 | `public/brand/`、`public/textures/` |
| 素材与授权说明 | `ASSETS.md`、`public/audio/AUDIO_LICENSE.md` |
| Contact Sheet | `qa/contact-sheet.jpg` |
| 关键帧截图 | `qa/keyframes/` |
| 质量检查记录 | `QA_REPORT.md` |
| 视频工程许可 | `LICENSE-VIDEO.txt` |

**视频规格**：1920 × 1080 / 30 fps / 58.000 s / 1740 帧 / H.264 yuv420p / AAC 48 kHz 立体声。

`archive-v1/` 和 `archive-v2/` 是之前的两个版本，仅作对照，不参与 v3 渲染。

---

## 二、故事节奏

| 时间 | 内容 |
|---|---|
| 00–02 s | 冷开场：铅笔线条缓慢画出笼子，左侧标题先出现 |
| 02–07.7 s | 正片扉页：粉色音符在笼中，大锁关闭；解锁、门开、音符逃出 |
| 07.7–19.4 s | 网页：粘贴、解析、歌单摘要、曲目表、导出格式 |
| 19.4–27.2 s | 文件：Excel 双工作表、Canonical JSON、CSV / TXT / M3U8；Markdown 仅以源码内置导出器的小字注明 |
| 27.2–35.4 s | 批量：三个公开歌单、多 Sheet 工作簿、ZIP |
| 35.4–47.5 s | CLI：PowerShell、平台识别、详情、格式选择、导出、跨平台 |
| 47.5–53.2 s | 生态：MusicFree 官方插件、洛雪 / Listen 1 专用 JSON、Public API |
| 53.2–58 s | 品牌结尾：官网、GitHub、MIT |

**角色**：粉色猫耳耳机音符，音符头是身体，猫耳、耳机、音符符干/符尾组成轮廓；白色手套和鞋子。它从笼子里出来后不消失，全程在窗口中跳跃、站立、伸手点击。右手不是装饰，点击时会伸出并接触按钮。

**固定镜头**：没有全片推拉摇移。若需要强调，只通过纸张/卡片本身的位移和遮挡完成。场景之间不出现全屏翻页、页码或分页标题。

---

## 三、功能真实性边界

制作时已对照项目源码、README 与 CLI 文档。以下限制同样写在成片或 QA 中：

- 六个平台支持**单歌单解析**。批量导出主要覆盖 QQ 音乐、网易云音乐与酷狗音乐；酷狗完整批量需要登录；成片批量演示使用 QQ 音乐示例。
- 酷狗普通歌单免登录只能预览前 10 首；扫码/登录后解锁完整歌单。
- Web 主导出工具栏当前提供 **Excel / JSON / CSV / TXT / M3U8** 五个常用格式。**Markdown 导出器存在于源码注册表中，但不是当前 Web 主工具栏按钮**；成片以“源码内置 Markdown 导出器”的小字注明。
- 洛雪音乐和 Listen 1 是**专用 JSON 导出 / 导入**能力，不是与 MusicFree 同类的官方插件；MusicFree 是官方插件；BBPlayer 为待上线。
- Soundiiz、TuneMyMusic、FreeYourMusic 是第三方服务；Soundiiz 一键迁移上限约 200 首，不属于 Playlist Out 内置能力。
- Playlist Out 只处理歌单数据：**不下载音频、不抓取歌词、不代理媒体**。导出文件在浏览器或本地 CLI 生成。
- 普通解析不在服务端持久化歌单；站点仍会进行匿名聚合统计，并使用第三方体验分析及“一键反馈”功能。
- 成片中的歌单名、作者、曲目、3 个歌单与 151 首等均为**演示数据**；UI 是按真实源码与设计规范重绘的动画示意，不是实际录屏。

---

## 四、重新渲染

环境：Node.js ≥ 20、Chrome（或 Remotion 自动下载的 headless shell）、Python ≥ 3.10（可选，用于重新配乐和 QA）。

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
python tools/make_score.py          # 56 秒原始配乐与分轨
python tools/make_intro_prelude.py  # 2 秒冷开场 + 58 秒成片音频
python tools/make_paper.py          # 纸纤维页面与卡片纹理
python tools/qa.py                  # 媒体检查、Contact Sheet 与关键帧
```

如果系统找不到 Chrome，可在渲染命令后追加：

```bash
--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

最终成片由 Remotion 实际渲染；`src/Main.tsx` 会先等待本地字体、Logo 和纸张纹理解码，再开始截图。

---

## 五、声音与授权

- 配乐与拟音由 `tools/make_score.py` 使用 NumPy 程序化合成，无任何第三方录音、采样或商业歌曲。
- v3 的 2 秒冷开场前奏由 `tools/make_intro_prelude.py` 生成，并拼接原有 56 秒配乐；`soundtrack-v3.wav` 为 58 秒最终音轨。
- 音乐与音效按 **CC0 1.0 / MIT** 提供，可用于 Bilibili、YouTube 和项目宣传；详见 `public/audio/AUDIO_LICENSE.md`。
- 图像与品牌素材来源、字体清单和授权路径见 `ASSETS.md`。

---

## 六、已知限制

- 没有进行人耳听审；本环境只能检查响度、峰值、声道、解码与音画时长。发布前建议戴耳机完整试听。
- 全片检查基于完整解码、抽帧与 Contact Sheet，不等同于对每一帧做 OCR / 包围盒证明。
- 固定镜头下，导出页的电子表格网格仍是信息密度最高的区域；成片通过加粗文件标题、放大说明和留白来读，而不是逐格放大。
- 手机横屏优先保证主标题、动作和结论可读；细小的表格、路由和终端小字属于纹理层。
- 转场采用音符跳起时的动作切换，不再是翻页；它不是完整的 3D 物体形变，而是动作匹配剪辑。
- 功能边界仍以第三节为准：Markdown 是源码内置导出器、批量以 QQ 为例、酷狗完整批量需要登录、数据是演示数据。

完整检查结果见 `QA_REPORT.md`。
