# 原创配乐与音效授权说明 (Audio License)

本目录下的全部音频文件：

- `soundtrack.wav`（58.0 秒完整混音配乐 + 动作音效，48 kHz / 16-bit 立体声）
- `music-only.wav`（58.0 秒纯音乐分轨）
- `sfx-only.wav`（58.0 秒角色跳跃、解锁、按键、拉链、纸张拟音分轨）

均由 `tools/make_score.py` 使用 Python + NumPy 纯数学波形合成生成，**不包含任何第三方录音、商业采样、循环素材或受版权保护的词曲作品**。

## 曲风与编制
- **风格**：Playful Electronic × Funky Bass × Light Chiptune × Cozy Music（电钢琴、马林巴木琴、8-bit 温暖方波/三角波主音、Funky 律动贝斯与轻鼓组）
- **速度与拍号**：120 BPM · 4/4 拍 · F 大调 · 共 29 小节（58.0 秒）
- **同步机制**：直接读取 `src/timeline.json` 的时间轴锚点（`cues`），使开场笼子解锁（`2.9s–3.5s`）、角色起跳、点击「解析」、文件展开、勾选歌单、拉上拉链、敲击 `Enter` 回车及片尾收束完全踩在音乐节拍上。

## 授权协议
本配乐与音效采用 **CC0 1.0 Universal (Public Domain Dedication) / MIT 双重宽松许可** 发布，可自由用于 GitHub、Bilibili、YouTube、个人网站及任何开源社区展示，无版权争议风险。
