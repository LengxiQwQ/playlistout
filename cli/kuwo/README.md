## 酷我音乐歌单导出工具

用于抓取 酷我音乐（Kuwo Music）歌单信息，支持全量多页分页抓取，并导出为常见文件格式（标记歌曲状态：正常、下架/无版权、VIP专享）。

作者：`lengxiQwQ`

---

### 功能特性

- 支持通过酷我音乐歌单链接、移动端分享链接或歌单 ID 输入；
- **全量多页分页获取**：突破单页数量限制，自动计算总页数并多线程分批抓取全部歌曲；
- **独家歌曲状态标记**：直观区分歌曲是正常可播、下架/无版权变灰、还是 VIP专享；
- **全格式导出支持**：`.xlsx`、`.json`、`.txt`、`.csv`、`.m3u8`；
- **统一遵循 Canonical JSON 规范**：导出的 JSON 采用 PlaylistOut 通用歌单结构，包含歌单封面直链 (`coverUrl`) 及每首歌曲/专辑封面直链 (`coverUrl`)、单曲页面直链 (`sourceUrl`)、统一歌手字段 `artist`、毫秒时长 `durationMs`，便于第三方播放器与自动化脚本接入；
- 导出完成后（在 Windows）自动打开文件所在目录并选中文件；
- 同时支持命令行参数运行与交互式循环操作。

---

### 依赖与运行

```bash
pip install -r requirements.txt
python kuwo_playlist_export.py
```

或使用命令行参数静默导出：

```bash
python kuwo_playlist_export.py --id 2311665489 --output-dir ./output --format all
```
