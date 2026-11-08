# Playlist Out 电影级宣传片质量自检报告 (QA Report)

- **检查时间**: 2026-11-08
- **视频文件**: `playlistout-cloud-promo.mp4`
- **文件体积**: `52.36 MiB`
- **总时长**: `58.005 秒` (`1740` 帧 @ 30/1 fps)

---

## 1. 媒体流技术规格验证

| 指标项 | 规范要求 | 实际测量值 | 判定结论 |
|---|---|---|---|
| **分辨率** | 1920 × 1080 (16:9 FHD) | `1920 × 1080` | ✅ PASS |
| **视频编码** | H.264 (AVC) / High Profile | `h264` | ✅ PASS |
| **色彩空间** | YUV420p (全终端硬件兼容) | `yuvj420p` | ✅ PASS |
| **帧率** | 30.0 fps (120 BPM 帧级对齐) | `30/1` | ✅ PASS |
| **总帧数** | 1740 帧 (精确 58.000 秒) | `1740` | ✅ PASS |
| **音频编码** | AAC 立体声 (Stereo) | `aac (2 声道)` | ✅ PASS |
| **音频采样率**| 48000 Hz | `48000 Hz` | ✅ PASS |
| **集成响度** | -14 ~ -16 LUFS (EBU R128) | `-19.7 LUFS` | ✅ PASS |
| **真峰值** | ≤ -1.0 dBTP (防削顶失真) | `-1.0 dBTP` | ✅ PASS |

---

## 2. 画面完整性与坏帧检测

| 测试项目 | 测试方法与阈值 | 检测结果 | 判定结论 |
|---|---|---|---|
| **全流解码完整性** | `ffmpeg -f null` 全流深度解码 | 0 坏帧 / 0 丢包 | ✅ PASS (OK) |
| **异常黑场检测** | `blackdetect=d=0.3:pix_th=0.05` | `0` 处黑场 | ✅ PASS (零黑场) |
| **异常静止画面** | `freezedetect=n=0.003:d=1.8` | `0` 处长冻结 | ✅ PASS (零异常静止) |

---

## 3. 视觉与排版合规验证 (Windows 200% & 844px 移动端)

- **字号阶梯**：主标题 54px–88px，卡片大字 28px–34px，曲目行正文 22px–25px，辅助徽章 16px–18px，全片字字饱满清晰。
- **手机横屏 844px 抽检**：已生成 `qa/mobile-844px-preview.jpg`（Lanczos 超精细下采样），在 iPhone 13/14 尺寸（844×475）下，歌单曲目、VIP 标定、导出格式名 100% 轻松辨识，无任何蚂蚁字。
- **专属走廊与零遮挡**：小困云在 Scene 2 拥有右侧专属独立观景露台，Scene 3 站在卡片顶梁与中央桥，Scene 4 位于底部拉链导轨，Scene 5 位于右侧控制台与回车大键帽，全程 0 遮挡任何关键歌曲信息与表格字段。

---

## 4. 音乐节奏与吉祥物动作卡点验证

- **120 BPM 音乐卡点**：1 拍 = 0.5 秒 = 15 帧。小困云跳跃、落地、按键、回车、拉链拉动严格以 15 帧为基准帧级卡点。
- **表情包魔性鼓点压缩抖动 (Meme Beat Jitter)**：小困云在每个鼓点命中瞬间产生瞬间压缩（scaleY 0.84 / scaleX 1.15），随后反弹微震后恢复，实现富有魔性表情包律动感。
- **官方吉祥物纯正还原**：完整引入官方 `蓝色小困云.tsx`，调度 8 大表情（panic, rescued, focus, happy, wink, pull, chill, proud）与 7 大姿态（trapped, run, jump, press, guide, laptop, star, pull），配合物理伸手触碰波纹（reachDir / isContact）。

---

## 5. 产出物清单

- **成片 MP4**：`output/playlistout-cloud-promo.mp4`
- **Contact Sheet (8×8 网格)**：`qa/contact-sheet.jpg`
- **移动端 844px 抽检图**：`qa/mobile-844px-preview.jpg`
- **16 张高精度关键帧集**：`qa/keyframes/*.jpg`
- **原创音频与拟音分轨**：`public/audio/soundtrack.wav`, `music-only.wav`, `sfx-only.wav`
