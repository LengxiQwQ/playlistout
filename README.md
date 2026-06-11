## QQ音乐歌单导出工具

一个简单的命令行脚本，用于抓取 QQ音乐 歌单信息并导出为常见格式。

作者：`lengxiQwQ`

[![Python](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-NonCommercial%20MIT-green)](./LICENSE)
[![Build](https://github.com/lengxiQwQ/qqmusic-playlist-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/lengxiQwQ/qqmusic-playlist-exporter/actions)
[![Issues](https://img.shields.io/github/issues/lengxiQwQ/qqmusic-playlist-exporter)](https://github.com/lengxiQwQ/qqmusic-playlist-exporter/issues)
[![Last Commit](https://img.shields.io/github/last-commit/lengxiQwQ/qqmusic-playlist-exporter)](https://github.com/lengxiQwQ/qqmusic-playlist-exporter/commits/main)

---

### 功能简述

- 支持通过歌单链接或歌单 ID 输入；
- **新增**：支持输入 QQ 号批量导出该用户所有自建歌单；
- 支持导出格式：`.xlsx`、`.csv`、`.json`、`.txt`；
- 文件名使用歌单名称，自动替换 Windows 不允许的字符；
- 导出完成后（在 Windows）会自动打开文件所在目录并选中文件；
- 交互式循环：导出完成后可继续输入新的歌单，输入 `0` / `q` / `quit` / `exit` 退出程序。

---

### 依赖

在终端中安装所有依赖：

```bash
pip install -r requirements.txt
```

或者只安装必要依赖：

```bash
# 必须
pip install requests

# 导出 xlsx 所需
pip install openpyxl
```

---

### 使用方法

下载或克隆本仓库到本地，在命令行或 Python 解释器中运行：
```bash
python qq_music_playlist_export.py
```

#### 输入类型
- **歌单链接**：`https://y.qq.com/n/ryqq/playlist/4177812546`
- **歌单ID**：`4177812546`
- **QQ号（批量导出）**：`1160951354`

粘贴 y.qq.com 的歌单链接或直接输入 歌单ID / QQ号 后按照提示操作。

##### 示例1：单歌单导出

```
============ QQ音乐歌单导出工具 ============
支持：歌单链接 / 歌单ID / QQ号（批量导出该用户所有自建歌单）
请输入歌单链接、歌单ID 或 QQ号（输入 0 退出）：9044196528

已获取到 琴心月满 的歌单：
名称：中文民谣、流行，共 632 首歌曲
==========================================
请选择导出格式：
 1) .xlsx  - (默认) Excel 文件
 2) .csv   - 标准 CSV utf-8-sig
 3) .json  - JSON 文件，数组
 4) .txt   - 纯文本格式
==========================================
选择 (1 - 4，输入 0 退出程序)：4

已保存为: 中文民谣、流行 - 琴心月满.txt
```

##### 示例2：批量导出用户所有歌单

```
============ QQ音乐歌单导出工具 ============
支持：歌单链接 / 歌单ID / QQ号（批量导出该用户所有自建歌单）
请输入歌单链接、歌单ID 或 QQ号（输入 0 退出）：1160951354

正在查询 1160951354 ...
用户: 1160951354，共 6 个歌单：
  1. 中文歌曲2 (38首) [ID: 9547521556]
  2. 周杰伦 (172首) [ID: 8079931214]
  3. 日韩歌曲 (215首) [ID: 7684752768]
  4. 纯音乐 (70首) [ID: 6294633517]
  5. 英文歌曲 (219首) [ID: 5879130725]
  6. 中文歌曲 (1000首) [ID: 4177812546]
==========================================
请选择导出格式：
 1) .xlsx  - (默认) Excel 文件
 2) .csv   - 标准 CSV utf-8-sig
 3) .json  - JSON 文件，数组
 4) .txt   - 纯文本格式
==========================================
选择 (1 - 4，输入 0 退出程序)：4

[1/6] 正在抓取: 中文歌曲2 (38首)... 已保存
[2/6] 正在抓取: 周杰伦 (172首)... 已保存
[3/6] 正在抓取: 日韩歌曲 (215首)... 已保存
[4/6] 正在抓取: 纯音乐 (70首)... 已保存
[5/6] 正在抓取: 英文歌曲 (219首)... 已保存
[6/6] 正在抓取: 中文歌曲 (1000首)... 已保存

========== 批量导出完成 ==========
成功: 6/6 个歌单
文件保存在: E:\path\to\1160951354\
```

### 常见问题（FAQ / 排错）

- **导出 xlsx 时报错 `ModuleNotFoundError: No module named 'openpyxl'`**
  → 终端运行 `pip install openpyxl`。
- **抓取歌单失败或返回空列表**
  → 可能是网络问题或 QQ 音乐接口变化。尝试稍后重试或检查输入的歌单链接/ID。
- **文件名包含特殊字符导致保存失败**
  → 脚本会自动替换 Windows 不允许的字符为空格；若仍出错请检查是否有权限或路径过长问题。
- **输入纯数字时被误判为歌单ID或QQ号**
  → 脚本采用**智能歧义消解**：先查歌单ID，命中则同时查QQ号；若两者都命中会提示用户选择（歌单导出 vs 批量导出）。

### 更新日志

#### v1.1.0 (2026-06-11)
- 新增：支持输入 QQ 号批量导出用户所有自建歌单
- 新增：歧义消解逻辑（数字同时是歌单ID和QQ号时提示选择）
- 修复：Windows 控制台中文乱码问题
- 修复：过滤系统生成的无 ID 歌单（如 QZone背景音乐）
- 优化：重构主循环，提取内部函数消除重复代码

#### v1.0.0
- 初始版本：支持歌单链接/ID，导出为 xlsx/csv/json/txt

---

### 贡献 & 许可

欢迎提交 issue 或 pull request。
本仓库采用 MIT 许可证，详见 `LICENSE` 文件。作者：`lengxiQwQ`。
*（内容由AI生成，仅供参考）*
