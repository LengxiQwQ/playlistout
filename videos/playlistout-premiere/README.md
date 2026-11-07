# Playlist Out — 把你的歌单带走（v2）

> 56 秒音乐手账动画短片 · Remotion 4 / React / TypeScript  
> 网站：<https://playlistout.lengxiqwq.com/>  
> 仓库：<https://github.com/LengxiQwQ/playlistout>

本目录是 Playlist Out 的独立宣传片工程，不修改主项目的 `web/`、`worker/`、`cli/` 或 `plugins/`。

v2 保留 v1 的完整故事与功能信息，但把“电影灯光”退掉、改成真实纸张；把整页网页改成由镜头逐步带出的近景；将音符贴纸升级成有五官、会操作界面的角色；并在六个章节之间加入真实的翻页过场。

---

## 一、交付物

| 交付项 | 路径 |
|---|---|
| 成片 MP4（H.264） | `output/playlistout-premiere.mp4` |
| Remotion 源码 | `src/` |
| 原创配乐 / 音效 | `public/audio/soundtrack.wav` |
| 纯音乐分轨 / 音效分轨 | `public/audio/music-only.wav`、`public/audio/sfx-only.wav` |
| 翻页拟音（v2 新增，渲染时叠加） | `public/audio/page-turn-a.wav`、`page-turn-b.wav` |
| 音频生成器 | `tools/make_score.py`、`tools/make_page_turn.py` |
| 字体与授权 | `public/fonts/`、`public/fonts/licenses/` |
| Logo 与纸张纹理 | `public/brand/`、`public/textures/` |
| 配乐与素材授权说明 | `public/audio/AUDIO_LICENSE.md`、`ASSETS.md` |
| Contact Sheet | `qa/contact-sheet.jpg` |
| 关键帧截图 | `qa/keyframes/` |
| 质量检查记录 | `QA_REPORT.md` |
| 视频工程许可 | `LICENSE-VIDEO.txt` |

**视频规格**：1920 × 1080 / 30 fps / 56.000 s / 1680 帧 / H.264 yuv420p / AAC 48 kHz 立体声。

上一版保留在 `archive-v1/`，仅作对照，不参与 v2 渲染。

---

## 二、v2 的视觉与叙事

全片发生在一张持续存在的米色手账纸上。纸张是固定的，镜头在纸面上移动：先看整页，再推近到一个输入框、一份文件、一台终端；一页只承担一个动作。

| 时间 | 页面 | 内容 |
|---|---|---|
| 00–05.7 s | 扉页 | 纸笼、六平台贴纸、被关住的音符与“把它带走” |
| 05.7–17.4 s | 01 | 音符钻进输入框；粘贴、解析、歌单摘要、曲目表、导出格式 |
| 17.4–25.2 s | 02 | Excel 双工作表、Canonical JSON、CSV / TXT / M3U8；Markdown 仅以源码内置导出器的小字注明 |
| 25.2–33.4 s | 03 | 三个公开歌单的勾选、多 Sheet 工作簿、ZIP 打包 |
| 33.4–45.5 s | 04 | PowerShell CLI：识别平台、详情、格式选择、导出、跨平台说明 |
| 45.5–51.2 s | 05 | MusicFree 官方插件、洛雪 / Listen 1 的专用 JSON、Public API |
| 51.2–56.0 s | 07 | 品牌收尾、官网、GitHub、MIT |

**角色**：小音符是一个纸剪的黑墨音符，长着奶白色眼睛、鼻子、腮红和一条歪嘴，围着黄色围巾。它从纸笼里逃出，钻进输入框，再从“解析”按钮后钻出来按下按钮；之后在导出、打包、终端、生态卡片之间继续充当唯一的“操作者”。它不是鼠标箭头，也没有旁白。

**翻页**：在第 05.7、17.4、25.2、33.4、45.5、51.2 秒附近，一张带纸纤维纹理的手账页从画面一侧翻过，页面上只印着页码和“下一页”。它遮住上下页的交界，也把“换一页继续”变成可见的动作。翻页拟音由 `tools/make_page_turn.py` 程序化生成。

**纸张**：背景、卡片与翻页页都使用纸纤维、短纤维、少量纸屑和折痕；镜头不再制造大面积暖光、暗角或泛光，卡片使用贴近桌面的接触阴影。纹理控制在“近看有纸、远看不脏字”的程度。

**步骤标签**：在左下方常驻一张手账标签，写着“把链接交给它”“歌单，落到纸上”“挑一种方式带走”等本页动作。它不随镜头推近而缩小，因此在电脑非全屏和手机横屏上仍然先读到故事线；细小的 UI 仍然只承担氛围与证据。

**字号**：没有把整页等比例硬放大。主标题约 100–150px，正文说明约 40–60px，步骤标签约 46px，关键 UI 标签约 26–40px；镜头会推近到目标元素，避免一屏塞满后才把字缩小。

---

## 三、功能真实性边界

制作时已对照项目源码、README 与 CLI 文档。以下限制同样写在成片或 QA 中：

- 六个平台支持**单歌单解析**。批量导出主要覆盖 QQ 音乐、网易云音乐与酷狗音乐；酷狗完整批量需要登录；成片批量演示使用 QQ 音乐示例。
- 酷狗普通歌单免登录只能预览前 10 首；扫码/登录后解锁完整歌单。
- Web 主导出工具栏当前提供 **Excel / JSON / CSV / TXT / M3U8** 五个常用格式。**Markdown 导出器存在于源码注册表中，但不是当前 Web 主工具栏按钮**；成片以“源码内置 Markdown 导出器”的小字注明，没有把它当作主格式宣传。
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
python tools/make_score.py       # 重新生成原创配乐与音效
python tools/make_page_turn.py   # 重新生成翻页拟音
python tools/qa.py               # 输出媒体检查与抽帧
```

如果系统找不到 Chrome，可在渲染命令后追加：

```bash
--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

最终成片由 Remotion 实际渲染；`src/Main.tsx` 会先等待本地字体、Logo 与纸张纹理解码，再开始截图。

---

## 五、声音与授权

- 配乐与拟音由 `tools/make_score.py` 使用 NumPy 程序化合成，无任何第三方录音、采样或商业歌曲。
- v2 的翻页拟音由 `tools/make_page_turn.py` 合成（滤波噪声、纸边碎响与低频纸张抬起声），不包含采样；它在 Remotion 中按翻页时间叠加，因此未混入 `music-only` / `sfx-only` 两条旧分轨，最终成片包含该层。
- 声音包含 felt piano / 电钢琴、马林巴、轻 Chiptune、轻鼓组、纸张、胶带、按键、印章与拉链拟音。
- 音乐与音效按 **CC0 1.0 / MIT** 提供，可用于 Bilibili、YouTube 和项目宣传；详见 `public/audio/AUDIO_LICENSE.md`。
- 图像与品牌素材来源、字体清单和授权路径见 `ASSETS.md`。

---

## 六、已知限制

- 没有进行人耳听审；本环境只能检查响度、峰值、声道、解码与音画时长。发布前建议戴耳机完整试听。
- 全片检查基于完整解码、抽帧与 Contact Sheet，不等同于对每一帧做 OCR / 包围盒证明；`QA_REPORT.md` 记录了实际检查范围与未覆盖项。
- 片中不展示酷狗“普通歌单免登录仅前 10 首”的具体操作过程，只在平台芯片及侧注中说明；完整批量流程以 QQ 音乐为示例。
- 翻页是一种有意的物理转场，不是透明的淡入淡出；如果你不喜欢章节页，只需调整 `src/components/PageTurn.tsx` 的 `TURNS` 和 `src/Main.tsx` 的音频层即可。
- 手机横屏不以“所有小字都清晰”为目标：主标题、步骤标签、操作词与结论可读，细小的表格和路由信息属于纹理层。若要求手机上读清全部表格细节，需要另做竖屏或重新排版的手机版。
- 步骤标签是一个常驻的低位章节条，不是旁白字幕；它会覆盖页脚的水印/页码，这是为了让动作先于装饰被看到。

完整检查结果见 `QA_REPORT.md`。
