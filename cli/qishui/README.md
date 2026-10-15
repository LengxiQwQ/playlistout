## 汽水音乐歌单导出工具

用于抓取 汽水音乐（Luna / Soda Music）歌单及抖音同步收藏音乐列表，支持全量 Cursor 分页抓取、双通道解析，并导出为常见格式（标记歌曲状态：正常、VIP专享、付费专辑、下架/无版权、视频）。

作者：`lengxiQwQ`

---

### 功能特性

- 支持通过汽水音乐分享链接、移动端短链 (`qishui.douyin.com/s/`、`qishui.com/s/`)、微信长分享文案或纯数字歌单 ID 输入；
- **全量分页获取**：基于官方 Luna API 游标分页（Cursor Pagination），突破单页截断，自动获取上千首完整歌单；
- **双通道智能解析**：
  - `qishui`（默认）：官方清洁正版通道，优先展示标准发行的正版歌曲名与完整专辑信息；
  - `douyin`：全量抖音收藏通道（针对“在抖音收藏的音乐”等同步歌单），包含 UGC 视频原声；
- **支持歌曲状态标记**：直观区分歌曲是正常可播、下架/无版权、VIP专享还是视频原声；
- **全格式导出支持**：`.xlsx`、`.json`、`.txt`、`.csv`、`.m3u8`；
- **统一遵循 Canonical JSON 规范**：导出的 JSON 采用 PlaylistOut 通用歌单结构，包含封面直链 (`coverUrl`)、单曲页面直链 (`sourceUrl`)、统一歌手字段 `artist`、毫秒时长 `durationMs`，便于第三方播放器与自动化脚本接入；
- 导出完成后（在 Windows）自动打开文件所在目录并选中文件；
- 同时支持命令行参数运行与控制台交互式循环操作。

---

### 依赖与运行

```bash
pip install -r requirements.txt
python qishui_playlist_export.py
```

或使用命令行参数静默导出：

```bash
python qishui_playlist_export.py --id 7087507348697186339 --output-dir ./output --format all
```
