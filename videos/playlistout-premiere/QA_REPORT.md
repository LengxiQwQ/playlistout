# Playlist Out 宣传片 v4 — 质量检查记录

成片：`output/playlistout-premiere.mp4`  
检查环境：Windows / Chrome 156 / Remotion 4.0.541 / ffmpeg 9.0.2  
检查日期：2026-11-08

## 1. 媒体检查

| 项目 | 实测结果 |
|---|---|
| 容器 / 编码 | MP4 / H.264 High |
| 画面 | 1920 × 1080，yuv420p，30 fps |
| 帧数 | 1740 帧（58.005 s 容器时长） |
| 视频码率 | 4,917,496 bit/s |
| 音频 | AAC-LC，48 kHz，双声道，317,376 bit/s |
| 文件大小 | 38,019,706 bytes（36.3 MiB） |
| 完整解码 | 通过 |
| 黑帧区间 | 0 |
| 静止检测（freezedetect，≥1.5 s） | 0 |
| 综合响度 | −15.3 LUFS |
| 响度范围 | 6.8 LU |
| True Peak | −1.2 dBFS |

检查命令：

```bash
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of json output/playlistout-premiere.mp4

ffmpeg -v error -i output/playlistout-premiere.mp4 -f null -

ffmpeg -hide_banner -i output/playlistout-premiere.mp4 \
  -vf "freezedetect=n=0.003:d=1.5" -an -f null -

ffmpeg -hide_banner -i output/playlistout-premiere.mp4 \
  -filter_complex "ebur128=peak=true" -f null -
```

## 2. 全片抽帧检查

截图：`qa/keyframes/`；Contact Sheet：`qa/contact-sheet.jpg`；手机宽度 844px：`qa/phone-sheet-v4.jpg`。

| 时间 | 检查点 | 结果 |
|---|---|---|
| 00.0–02.0 s | Cold Open：笼子线条慢画、左侧标题先读 | 通过 |
| 02.0–07.7 s | Intro：主标题保持 122；粉色音符在大锁/前景栏杆内 | 通过；装饰性平台标签仍偏小 |
| 07.7–20.9 s | 大版 Parse：搜索输入、6 行结果、平台标签、导出格式 | 通过；手机宽度可读 |
| 19.4–28.8 s | 大版 Export：Excel / JSON 双卡、五种格式、Markdown 说明 | 通过 |
| 27.2–36.8 s | 大版 Batch：3 个歌单、151 首、多 Sheet / ZIP、50 个上限 | 通过 |
| 35.4–49.1 s | 大版 CLI：24–25px 正文、平台列表、详情、格式、导出、跨平台 | 通过；22 行完整在框内 |
| 47.5–54.6 s | 大版 Ecosystem：三张播放器卡、Public API、BBPlayer/第三方迁移说明 | 通过 |
| 53.2–58.0 s | Finale：主标题不放大；网址/GitHub/MIT 放大 | 通过 |
| 全片 | 页码 / 页脚编号 / STEP / 翻页遮罩 | 0 处 |
| 全片 | 全局镜头推拉摇移 | 0 处 |
| 全片 | 主标题被放大 | 0 处 |
| 全片 | 音符消失 / 被裁切 | 0 处（纸张右缘 170–220px 可见） |
| 全片 | 静态 ≥1.5 s | 0 段；UI 卡以亚像素纸呼吸持续变化 |

## 3. 尺度验收

- `src/scale.ts`：`UI_SCALE = 1.75`。
- 主标题不进 `u()`；UI 字号、行高、按钮、卡片、终端走 1.75×。
- 1920 全尺寸下没有全局 zoom；页面、装订孔、红色页边线仍是原尺度。
- 844px 手机宽抽帧见 `qa/phone-sheet-v4.jpg`；693px 宽度也保留了对应样张。
- 大版 UI 比 v3 一屏内容更少：Parse 6 行、Batch 3 行、CLI 22 行；通过减少一屏信息量而不是压缩字号。

## 4. 声音检查

- 使用 `public/audio/soundtrack-v3.wav`：2 秒纸面/铅笔冷开场 + 原 56 秒配乐，58 秒。
- 音频与视频时长一致；AAC 48 kHz 双声道。
- 未做人耳听审；本环境只验证解码、声道、采样率、响度、True Peak 和时长。

## 5. 功能真实性

- 六平台单歌单解析；批量演示以 QQ 音乐为例；酷狗完整批量需登录。
- Web 主导出：Excel / JSON / CSV / TXT / M3U8；Markdown 只作源码内置导出器说明。
- MusicFree 官方插件；洛雪 / Listen 1 专用 JSON；BBPlayer 待上线；Soundiiz 等第三方迁移。
- 不下载音频、不抓歌词、不代理媒体。
- 演示数据，不是实际录屏。

## 6. 这一版没解决的

- 转场仍是硬切，没有恢复 v1 的连续过渡；第 2 轮处理。
- 角色仍是旧造型，手没有真正点击、没有 120 BPM 鼓点；第 3 轮处理。
- Intro / Cold Open 的装饰性小字没有全部进入 1.75×；细节轮统一。
- 大版 Export / Batch / CLI 为容纳大字减少了局部装饰细节，功能点保留。
- 没有竖屏版本，没有逐帧 OCR。

## 7. 结论

v4 已完成全片 1740 帧实际渲染、完整解码、0 黑帧、0 静态区间、手机宽度抽帧和响度检查。全片 UI 已按批准尺度重排，主标题保持原大小，字体恢复为 v3 的字体组合。叙事转场和角色表演按路线图继续。
