# Playlist Out 宣传片 v3 — 质量检查记录

成片：`output/playlistout-premiere.mp4`  
检查环境：Windows / Chrome 156 / Remotion 4.0.541 / ffmpeg 9.0.2  
检查日期：2026-11-08

## 1. 媒体检查

| 项目 | 实测结果 |
|---|---|
| 容器 / 编码 | MP4 / H.264 High |
| 画面 | 1920 × 1080，yuv420p，30 fps |
| 帧数 | 1740 帧（58.005 s 容器时长） |
| 视频码率 | 4,831,459 bit/s |
| 音频 | AAC-LC，48 kHz，双声道，317,376 bit/s |
| 文件大小 | 37,383,364 bytes（35.7 MiB） |
| 完整解码 | 通过 |
| 黑帧区间 | 0 |
| 静止检测（freezedetect，≥1.5 s） | 1 段：28.633–30.267 s（1.63 s，批量选择停顿） |
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

**关于 28.633–30.267 s 的停顿**：这是批量页三个歌单勾选完成后的阅读停顿。粉色音符仍在做呼吸/重心摆动，纸张纹理也在轻微游移；它不是黑帧、不是冻结帧、也不是页码页。保留这 1.6 秒是为了让观众读完三个歌单；如果后续要彻底消除 freezedetect 的静态标记，可以把批量“准备进度条”延长到点击前，但会增加一次完整重渲。

## 2. 全片人工抽帧检查

截图目录：`qa/keyframes/`；Contact Sheet：`qa/contact-sheet.jpg`（8 × 8 格，58 个成片采样，余下 6 格用纸色填充）。

| 时间 | 检查点 | 结果 |
|---|---|---|
| 00.0–02.0 s | 冷开场：笼子线条慢画、左侧标题先读 | 通过；无页码/STEP |
| 02.0 s | 同一标题/笼子卡切入正片，粉色音符和前景栏杆出现 | 通过；匹配剪辑 |
| 02.0–07.7 s | 大锁、前景栏杆、开门和音符逃出 | 通过；锁和门在画 |
| 07.7–19.4 s | 网页粘贴、解析、摘要、曲目表、导出格式 | 通过；小字已抬高 |
| 19.4–27.2 s | Excel / JSON / CSV / TXT / M3U8 文件页 | 通过；Markdown 只作源码内置小字 |
| 27.2–35.4 s | 批量列表、勾选、工作簿、ZIP | 通过；批量页在切点即有形，结果页保留笔记本纸底，不再出现整屏平涂 |
| 35.4–47.5 s | CLI 启动、识别、详情、格式、导出、跨平台 | 通过；终端全程在同一纸页上 |
| 47.5–53.2 s | MusicFree、洛雪、Listen 1、Public API | 通过 |
| 53.2–58.0 s | 品牌结尾、网址、GitHub、MIT | 通过 |
| 全片 | 页码/页脚编号/STEP/翻页遮罩 | 0 处；章节圆框内的数字已改成音符符号 |
| 全片 | 全局推拉摇移/镜头推进 | 0 处；固定镜头 |
| 全片 | 黑色音符旧角色 | 0 处；已替换为粉色猫耳耳机音符 |
| 全片 | 音符消失/淡出/重新出现 | 0 处（除 0–2 s 冷开场尚未入场） |
| 全片 | 大规模双层页面叠化 | 批量结果层已改为“列表卡退场 + 笔记本纸保留”；无整页平涂 |

## 3. 声音检查

- v3 音轨为 `public/audio/soundtrack-v3.wav`：2 秒纸面/铅笔冷开场前奏 + 原 56 秒配乐，共 58 秒。
- 前奏与主配乐在 2.0 s 对齐；所有视觉 cue 与场景窗口整体后移 2 秒。
- 旧 `soundtrack.wav` 和 `music-only.wav` / `sfx-only.wav` 是 v1/v2 的 56 秒素材，保留在目录中作为分轨参考。
- 未做耳机人耳试听；本环境只验证了解码、声道、采样率、综合响度、True Peak 和时长。发布前建议完整听一遍前奏到主配乐的衔接。

## 4. 功能真实性检查

- 六个平台：单歌单解析；批量演示以 QQ 音乐为例。酷狗完整批量需要登录，成片未把免登录批量说成通用能力。
- Web 主导出格式：Excel / JSON / CSV / TXT / M3U8；Markdown 只以“源码内置 Markdown 导出器”的小字出现，不是主工具栏按钮。
- 洛雪 / Listen 1：专用 JSON 导出与导入；MusicFree：官方插件；BBPlayer 待上线；Soundiiz 等是第三方服务。
- 没有音频下载、歌词抓取或媒体代理承诺。
- 歌单名、曲目、3 个歌单 / 151 首均为演示数据；UI 为动画重绘，不是屏幕录制。

## 5. 已知限制

- 没有进行人耳听审。
- 转场是“音符跳跃中的动作切”，不是完整的 3D 物体变形；没有页码、没有全屏翻页、没有全局镜头推进。
- 导出页的电子表格网格仍是全片信息密度最高的区域；通过文件标题、说明文字和留白阅读，而不是逐格放大。
- 没有竖屏版本；横屏中细小的表格、路由和终端小字属于纹理层。
- 没有对每一帧做 OCR/包围盒证明；抽帧、Contact Sheet 与完整解码是本次检查边界。

## 6. 结论

v3 已完成实际 1740 帧渲染、完整解码、音频时长/响度和关键帧检查。页码、STEP、翻页遮罩和全局镜头推进均已移除；粉色猫耳音符、2 秒笼子冷开场、固定镜头、纸纤维和新小字均已进入成片。批量结果页的整屏平涂问题已修复，成片可在 `output/playlistout-premiere.mp4` 查看。
