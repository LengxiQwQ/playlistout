## 咪咕音乐歌单导出工具

用于抓取 咪咕音乐（Migu Music）歌单信息，支持短链识别、全量多页并发抓取，并导出为常见文件格式（标记歌曲状态：正常、下架/无版权、VIP专享）。

作者：`lengxiQwQ`

---

### 功能特性

- 支持通过咪咕音乐歌单链接、`c.migu.cn` 移动端分享短链（自动跟随 302 重定向）、H5 分享链接或歌单纯数字 ID 输入；
- **全量多页并发抓取**：上游接口限制单页上限 50 首，工具自动计算总页数并采用受控线程池并发分页抓取全部曲目，千首大歌单秒级完整获取；
- **支持歌曲状态与音质标定**：直观区分歌曲是正常可播、下架/无版权变灰、还是 VIP专享；提取 Hi-Res、FLAC、320kbps 等最高可用音质；
- **规范封面图片直链**：自动清洗并拼接高清封面直链 (`https://d.musicapp.migu.cn/...`)；
- **全格式导出支持**：`.xlsx`、`.json`、`.txt`、`.csv`、`.m3u8`；
- **统一遵循 Canonical JSON 规范**：导出的 JSON 采用 Playlist Out 通用歌单结构，包含歌单封面直链 (`coverUrl`) 及每首歌曲/专辑封面直链 (`coverUrl`)、单曲页面直链 (`sourceUrl`)、统一歌手字段 `artist`、毫秒时长 `durationMs`，便于第三方播放器与自动化脚本接入；
- 导出完成后（在 Windows）自动打开文件所在目录并选中文件；
- 同时支持命令行参数运行与交互式循环操作。

---

### 依赖与运行

```bash
pip install -r cli/requirements.txt
python cli/migu/migu_playlist_export.py
```

或使用命令行参数静默导出：

```bash
python cli/migu/migu_playlist_export.py --id 236858196 --output-dir ./output --format all
```
