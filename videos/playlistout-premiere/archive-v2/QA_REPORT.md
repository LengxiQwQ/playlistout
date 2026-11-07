# Playlist Out 宣传片 v2 — 质量检查记录

成片：`output/playlistout-premiere.mp4`  
检查环境：Windows / Chrome 156 / Remotion 4.0.541 / ffmpeg 9.0.2  
检查日期：2026-11-07

## 1. 媒体检查

| 项目 | 实测结果 |
|---|---|
| 容器 | MP4 |
| 视频 | H.264，1920 × 1080，30 fps，yuv420p |
| 帧数 | 1680 |
| 时长 | 56.000 s，视频轨与音频轨一致 |
| 视频码率 | 6,140,934 bps |
| 音频 | AAC，48 kHz，2 声道，317,375 bps |
| 文件 | 45,272,428 bytes（43.2 MiB） |
| 完整解码 | 通过，无错误输出 |
| 黑屏检测 | 0 段（blackdetect，阈值 0.3 s） |
| 静态区间检测 | 0 段（freezedetect，>= 1.5 s） |
| 响度 | Integrated -14.9 LUFS，LRA 3.5 LU，True Peak -1.2 dBFS |

完整解码命令：

```powershell
ffmpeg -v error -i output/playlistout-premiere.mp4 -f null -
```

## 2. 视觉抽检

- `qa/contact-sheet.jpg`：最终成片按 1 秒抽帧，56 格总览。
- `qa/keyframes/`：18 张按段落命名的关键帧，覆盖片头、解析、导出、批量、CLI、生态和结尾。
- 已逐张检查主体文字、URL、卡片边界、按钮、表格、终端行和结尾信息：关键内容在安全区内，未发现明显裁切或文字互相覆盖。
- v2 的纸张层使用纤维、短纤维、纸屑、折痕和接触阴影；已去掉旧版的大面积暖色聚光灯、暗角和曝光呼吸。`Atmosphere` 只保留约 4.5% 的纸纹叠加。
- 镜头按动作用近景重新取景：解析的输入框/结果、导出的 Excel/JSON、批量的控制面板、CLI 的终端正文、生态卡片和结尾均有独立可读的构图。
- 左下方新增 46px 的手账步骤标签，按“交给它 / 落到纸上 / 挑方式 / 一起打包 / 终端 / 下一站”推进；标签不随镜头缩放，作为手机和窗口化观看时的主叙事线。
- 小音符角色在片头、输入框、解析按钮、导出文件、批量按钮、终端和生态段落出现；黑色纸偶在深色终端上使用奶白纸贴背板，避免与终端背景混在一起。
- 六个章节边界新增完整纸页翻页；翻页页上只保留页码和“下一页”，没有把两页内容半透明叠在一起。

## 3. v2 的主要修正

- 纸张：移除电影化灯光/暗角，增加纸纤维与接触阴影。
- 可读性：用镜头近景与分步骤构图替代整页缩小；关键 UI 与说明适当放大；新增 46px 的常驻步骤标签，保证手机横屏也能先读到动作。
- 角色：新增有眼睛、鼻子、嘴、手和脚的纸剪音符；从纸笼逃出、钻进输入框、从解析按钮后出现，并继续作为操作者。
- 转场：添加六个纸页翻页过场，遮住场景交界，不再使用长时全屏交叉淡入。
- 声音：新增由代码合成的翻页拟音，按转场时间叠加进最终 AVC/AAC 渲染。
- 工程：补充 `tools/make_page_turn.py`、v2 说明与最终抽帧。

## 4. 已知限制

- **未进行人耳听审**。本环境只能验证音频解码、响度、峰值、声道和音画时长；发布前建议戴耳机完整试听一次。
- **不是实际线上操作录屏**。网页、CLI 与数据均为按源码和设计规范重绘/演示，歌单与统计是示意数据。
- **Markdown** 在当前 Web 主工具栏没有独立按钮；源码有 Markdown 导出器，成片仅以“源码内置 Markdown 导出器”的小字呈现，主工具栏的五个格式为 XLSX / JSON / CSV / TXT / M3U8。
- **批量能力**主要在 QQ 音乐、网易云音乐与酷狗音乐；酷狗完整批量需要登录，成片批量演示使用 QQ 音乐。
- 洛雪音乐与 Listen 1 是专用 JSON 导入/导出，不是 MusicFree 同类的官方插件；BBPlayer 为待上线，Soundiiz 等为第三方服务（一键迁移上限约 200 首）。
- 视觉检查基于完整解码与抽帧/关键帧目视检查，不是逐帧 OCR、字形包围盒或自动布局证明。
- 手机横屏不保证所有 UI 小字逐字可读；v2 优先保证主标题、步骤标签、动词与结论可读。若要求手机读清全部细节，需要另做竖屏或重新排版的手机版。
- 六个翻页过场是有意的章节页，不是内容缺失；其中翻页全遮罩约 0.2 秒，画面只保留页码与“下一页”。

## 5. 可复现检查

```bash
cd videos/playlistout-premiere
npm install
npm run typecheck
python tools/qa.py
npm run render
```

`python tools/qa.py` 会重新输出媒体规格、解码结果、黑屏/静止区间、响度、Contact Sheet 和关键帧。v2 最终渲染使用：

```powershell
npx remotion render src/index.tsx PlaylistOutPremiere output/playlistout-premiere.mp4 `
  --codec=h264 --crf=16 --pixel-format=yuv420p `
  --audio-codec=aac --audio-bitrate=320k --concurrency=4 --overwrite
```
