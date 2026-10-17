# playlistout

> **把你的歌单带走** — 全平台音乐歌单统一导出工具 (Cross-platform Music Playlist Exporter)

支持解析并导出 **网易云音乐、QQ 音乐、酷狗音乐、酷我音乐、汽水音乐（含抖音收藏）、咪咕音乐** 的公开歌单。

## 快速使用 (无需安装 Python)

你可以通过 `npx` 直接免安装运行：

```bash
# 1. 交互式模式（带菜单与引导）
npx playlistout

# 2. 命令行直接导出（支持 XLSX、CSV、JSON、TXT、M3U8）
npx playlistout "https://music.163.com/playlist?id=2756674066"
npx playlistout "https://y.qq.com/n/ryqq/playlist/9044196528" -f xlsx,csv
```

或者全局安装：

```bash
npm install -g playlistout
playlistout
```

## 支持平台与格式

- **支持平台**：网易云音乐、QQ 音乐、酷狗音乐、酷我音乐、汽水音乐、咪咕音乐
- **导出格式**：Excel (.xlsx)、CSV (.csv)、标准 JSON (.json)、纯文本 (.txt)、播放列表 (.m3u8)

## 开源协议

MIT License. 详见 GitHub 开源主页：[https://github.com/LengxiQwQ/playlistout](https://github.com/LengxiQwQ/playlistout)
