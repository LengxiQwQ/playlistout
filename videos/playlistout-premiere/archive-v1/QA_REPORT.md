# Playlist Out 宣传片 — 质量检查记录

成片：`output/playlistout-premiere.mp4`  
检查环境：Windows / Chrome 156 / Remotion 4.0.541 / ffmpeg 9.0.2

## 1. 媒体检查

| 项目 | 实测结果 |
|---|---|
| 容器 | MP4 |
| 视频 | H.264，1920 × 1080，30 fps，yuv420p |
| 帧数 | 1680 |
| 时长 | 56.000 s，视频轨与音频轨一致 |
| 音频 | AAC，48 kHz，2 声道 |
| 完整解码 | 通过，无错误输出 |
| 黑屏检测 | 0 段（blackdetect，阈值 0.3 s） |
| 静态区间检测 | 0 段（freezedetect，>= 1.5 s） |
| 响度 | Integrated -15.0 LUFS，LRA 3.8 LU，True Peak -1.2 dBFS |

完整解码命令：

```powershell
ffmpeg -v error -i output/playlistout-premiere.mp4 -f null -
```

## 2. 视觉抽检

- `qa/contact-sheet.jpg`：最终成片按 1 秒抽帧，56 格总览。
- `qa/keyframes/`：18 张按段落命名的关键帧，覆盖片头、解析、导出、批量、CLI、生态和结尾。
- 已逐张检查主体文字、URL、卡片边界、按钮、表格、终端行和结尾信息：关键内容在安全区内，未发现明显裁切或文字互相覆盖。
- 最终版加入全片约 0.0045 的极轻镜头呼吸，消除了旧版在 15.1–16.7、28.0–29.8、39.0–40.5、42.1–44.6 秒的长时间静止。
- 导出→批量场景的交叉淡化已提前，避免两个页面同时半透明地叠在一起；CLI 底部的越界文字也已移除。

## 3. 最终版相对旧渲染的修正

- 添加连续细微镜头运动，消除 four static intervals。
- 提前结束导出场景，处理 25 秒附近的页面重影。
- 移除 CLI 底部被状态栏裁切的旧文案。
- 重新生成最终 MP4；最终源文件和成片使用同一版本。
- 补齐 README、素材说明、音频授权、QA 脚本和最终抽帧。

## 4. 已知限制

- **未进行人耳听审**。本环境只能验证音频解码、响度、峰值、声道和音画时长；发布前建议戴耳机完整试听一次。
- **不是实际线上操作录屏**。网页、CLI 与数据均为按源码和设计规范重绘/演示，歌单与统计是示意数据。
- **Markdown** 在当前 Web 主工具栏没有独立按钮；源码有 Markdown 导出器，成片仅以“源码内置 Markdown 导出器”的小字呈现，主工具栏的五个格式为 XLSX / JSON / CSV / TXT / M3U8。
- **批量能力**主要在 QQ 音乐、网易云音乐与酷狗音乐；酷狗完整批量需要登录，成片批量演示使用 QQ 音乐。
- 洛雪音乐与 Listen 1 是专用 JSON 导入/导出，不是 MusicFree 同类的官方插件；BBPlayer 为待上线，Soundiiz 等为第三方服务（一键迁移上限约 200 首）。
- 视觉检查基于完整解码与抽帧/关键帧目视检查，不是逐帧 OCR、字形包围盒或自动布局证明。
- 25.2–25.6 秒是批量页面的“换页落纸”留白，页面只有标题和一句提示，随后卡纸进入；这是有意的静场，不是无内容空帧。
- 未在本环境中试听完整音轨并确认主观音乐审美；如需，可以在发布前按 README 用 `npm run studio` 预览或直接播放成片。

## 5. 可复现检查

```bash
cd videos/playlistout-premiere
npm install
npm run typecheck
python tools/qa.py
npm run render
```

`python tools/qa.py` 会重新输出媒体规格、解码结果、黑屏/静止区间、响度、Contact Sheet 和关键帧。
