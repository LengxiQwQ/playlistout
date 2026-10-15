## 酷狗音乐歌单导出工具

用于抓取 酷狗音乐（Kugou Music）公开专题歌单、概念版集合歌单、H5 分享页歌单以及个人云端自建歌单（Cloudlist / 我喜欢的音乐），并导出为常见格式（标记歌曲状态：正常、VIP专享、最高音质 FLAC/320kbps）。

作者：`lengxiQwQ`

---

### 功能特性

- **广泛支持酷狗各类歌单输入**：
  - 官方精选/专题歌单（如 `https://www.kugou.com/yy/special/single/546903.html` 或 ID `546903`）—— **100% 免登录**
  - 酷狗概念版 / 新版集合歌单（如 `global_specialid=collection_3_1504683618_2_0`）—— **100% 免登录**
  - 移动端分享页短链（`t1.kugou.com/xxx`）与 H5 分享页（`gcid_...` / `src_cid=...`）—— **100% 免登录**
  - 个人云端自建歌单 / 我喜欢的歌（`listid=4` 或纯数字歌单 ID）—— **支持本地凭证持久化保存**
- **双轨登录认证方案（针对个人云端歌单）**：
  - **方式一：终端扫码登录（无需访问网站）**
    - 运行 `python kugou_playlist_export.py --login` 选择 `[1]`；
    - 脚本直接申请官方二维码并自动调起图片查看器打开，手机酷狗 APP 扫码确认后自动获取 `token` 和 `userid`；
    - 凭证自动保存至本地 `~/.playlistout/kugou_auth.json`，下次导出个人歌单直接复用，免重复扫码。
  - **方式二：手动配置官网或抓包凭证**
    - 运行 `python kugou_playlist_export.py --login` 选择 `[2]`；
    - 输入在 PlaylistOut 官网（https://playlistout.lengxiqwq.com）扫码后显示的 UserID 与 Token，或通过命令行参数 `--token` 和 `--userid` 传入并自动保存。
- **支持高音质与 VIP 状态标记**：
  - 识别无损 FLAC、高品 320kbps 及标准音质；
  - 准确标注 VIP 专享与正常播放状态；
- **全格式导出支持**：`.xlsx`、`.json`、`.txt`、`.csv`、`.m3u8`；
- **统一遵循 Canonical JSON 规范**：导出的 JSON 采用 PlaylistOut 通用歌单结构，包含封面直链 (`coverUrl`)、单曲页面直链 (`sourceUrl`)、统一歌手字段 `artist`、毫秒时长 `durationMs`，便于第三方播放器与自动化脚本接入；
- 导出完成后自动打开文件所在目录并定位文件；
- 同时支持命令行参数运行与控制台交互式循环操作。

---

### 依赖与运行

```bash
pip install -r requirements.txt
python kugou_playlist_export.py
```

或使用命令行参数静默导出：

```bash
# 导出公开专题歌单 (免登录，默认保存至 ./output 目录)
python kugou_playlist_export.py --id https://www.kugou.com/yy/special/single/546903.html --output-dir ./output --format all

# 导出个人自建歌单 (自动使用已保存凭证，若首次运行会引导扫码或输入)
python kugou_playlist_export.py --id 4 --output-dir ./output --format xlsx

# 调出凭证配置菜单 (扫码登录或输入 Token)
python kugou_playlist_export.py --login

# 清除已保存的登录凭证
python kugou_playlist_export.py --logout
```
