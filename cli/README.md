# PlaylistOut Unified CLI (全平台统一导出工具)

PlaylistOut 统一命令行工具，集成网易云音乐、QQ 音乐、酷狗音乐、酷我音乐与汽水音乐五大平台，支持链接智能识别与手动选择双轨模式，将**单歌单解析**与**用户批量导出**作为一等公民能力，全本地运行与本地导出，不上传任何数据至服务器。

---

## 🌟 核心特性

- **⚡ 智能自动识别**：直接粘贴任意平台的歌单链接、短链（如 `163cn.tv`、`c6.y.qq.com`、`t.kugou.com`、`t.kuwo.cn`、`v.douyin.com`）或带表情符号的微信/抖音长分享文案，系统秒级自动识别所属平台并抓取。
- **👥 用户歌单批量导出 (一等公民)**：
  - **QQ 音乐**：支持直接输入 QQ 号或用户主页链接，一键抓取用户公开歌单并统一批量导出。
  - **网易云音乐**：支持直接输入 UID 或用户主页链接，批量导出创建/收藏的全部歌单。
  - **酷狗音乐**：普通歌单免登录受官方接口限制仅解析前 10 首；支持通过 `--login` 扫码登录，解锁单歌单完整导出与个人云端歌单批量导出。
  - **酷狗概念版**：支持概念版集合歌单链接与分享短链，完全免登录全量抓取。
  - **统一批量管道**：共用同一套 Batch Flow，支持全量（`all`）、单选、多选与进度统计；同名歌单自动按 `[ID]` 消歧避让，杜绝覆盖。
- **🛡️ 确定性参数与无交互 Headless 模式**：
  - 在指定 `--user`、`-f` 与 `--no-open` 时全程无交互静默运行，杜绝 `input()` 挂起，完美适配 CI、定时任务与自动化脚本。
  - 格式参数严格校验（如 `-f json,csv`），非法格式直接显式报错并返回非零退出码。
- **📦 导出格式一网打尽**：支持 `.xlsx` (表格美化自适应列宽)、`.csv` (带 UTF-8 BOM，Excel 双击不乱码)、`.json` (官方 Canonical 规范)、`.txt` (纯文本歌曲清单)、`.m3u8` (播放列表)。
- **🧩 架构收口与单一事实源**：统一采用适配器能力矩阵（`BasePlatformAdapter`）与统一目标解析器（`SmartDetector`），零死接口，零规则漂移。

---

## 🎵 平台能力支持矩阵

| 平台 | 单歌单导出 | 用户批量导出 | 凭证要求 | 专属参数 |
|---|:---:|:---:|---|---|
| **QQ 音乐** | ✅ | ✅ (QQ号 / 用户主页) | 免登 | — |
| **网易云音乐** | ✅ | ✅ (UID / 用户主页) | 免登 | — |
| **酷狗音乐** | ⚠️ 仅前10首预览 (登录后完整) | ✅ (个人云端歌单) | 终端扫码/凭证登录 (免登录仅限前10首，完整导出必须登录) | `--login`, `--logout`, `--token`, `--userid` |
| **酷狗概念版** | ✅ | — | 免登 (全量无截断) | — |
| **酷我音乐** | ✅ | — | 免登 | — |
| **汽水音乐** | ✅ | — | 免登 | `--channel {qishui,douyin}` |

---

## 🚀 快速上手

### 方式 A：独立免安装运行 (免安装 Python)

解压/双击即可使用，**无需安装 Python 或 pip**：

- **Windows x64**：下载 `PlaylistOut-v{version}-windows-x64.exe`，直接双击运行进入交互界面，或在终端传入参数调用。
- **macOS Apple Silicon (M1/M2/M3/M4)**：下载 `PlaylistOut-v{version}-macos-arm64.tar.gz`，解压后双击 `PlaylistOut.command` 或在终端运行 `./PlaylistOut`。
- **macOS Intel (x86_64)**：下载 `PlaylistOut-v{version}-macos-x64.tar.gz`，解压后双击 `PlaylistOut.command` 或在终端运行 `./PlaylistOut`。
- **Linux x64**：下载 `PlaylistOut-v{version}-linux-x64.tar.gz`，在终端运行 `tar -xzf PlaylistOut-*.tar.gz && ./PlaylistOut`。

> 每个正式发布均提供 `CLI-SHA256SUMS.txt` 与 `cli-release-manifest.json` 供完整性校验。

---

### 方式 B：Python 源码运行 (开发者模式)

如果你已具备 Python 3.14 环境，可以克隆仓库并直接从源码运行：

```bash
# 1. 安装核心运行时依赖
pip install -r cli/requirements.txt

# 2. 交互式启动 (双轨菜单 + 智能识别)
python cli/main.py
# 或以模块形式启动
python -m cli

# 3. 命令行静默/自动化调用示例 (单歌单)
python cli/main.py "https://music.163.com/playlist?id=2756674066" -f json,xlsx
python cli/main.py "9044196528" -p qqmusic -o ./my_exports -f xlsx,csv --no-open
python cli/main.py "https://qishui.douyin.com/s/xxx" --channel douyin

# 4. 命令行用户批量导出示例 (Headless 完全无交互)
python cli/main.py "1160951354" -p qqmusic --user -f json --no-open
python cli/main.py "1825474783" -p netease --user -f json,csv --no-open
python cli/main.py -p kugou --user -f json --no-open

# 5. 平台专属认证快捷操作
python cli/main.py -p kugou --login
python cli/main.py -p kugou --logout
```

---

## 💻 命令行完整参数一览

```text
用法: PlaylistOut [input] [选项]

位置参数:
  input                 歌单链接、短链、分享文案或纯数字 ID

通用选项:
  -h, --help            显示帮助信息并退出
  -v, --version         显示版本号并退出
  -p, --platform        显式指定目标平台 (netease, qqmusic, kugou, kuwo, qishui 等)
  -i, --id              歌单链接、短链或 ID
  -f, --format          导出格式: 1~5 或 all, xlsx, csv, json, txt, m3u8 (默认: all)
  -o, --output-dir      导出文件保存目录 (默认: output)
  --user                指定目标为用户 (用于纯数字 QQ号/UID 等脚本批量导出)
  --no-open             导出完成后不自动打开文件管理器
  --debug               输出详细异常堆栈跟踪

平台专属选项:
  --channel {qishui,douyin}
                        [汽水] 解析通道: qishui 官方正版 / douyin 全量原声
  --login               [酷狗] 调出终端扫码或凭证登录
  --logout              [酷狗] 清除本地保存的登录凭证
  --token TOKEN         [酷狗] 手动传入 Token
  --userid USERID       [酷狗] 手动传入 UserID
```

### 退出状态码 (Exit Codes)
- `0`：执行成功并至少成功导出一个文件。
- `1`：运行时错误（网络请求失败、未成功导出任何文件、目标解析失败等）。
- `2`：命令行参数错误（非法导出格式、平台专属参数混用、互斥参数冲突等）。

---

## 📁 模块架构设计

```text
cli/
├── main.py                     # 统一 CLI 轻量入口与参数解析
├── __main__.py                 # 支持 python -m cli 入口
├── playlistout.py              # PyInstaller 编译专用入口
├── requirements.txt            # 运行时最小依赖 (requests, openpyxl)
├── requirements-dev.txt        # 开发与测试依赖 (pytest, pyinstaller)
├── requirements-release.txt    # 生产构建严格锁版本依赖
│
├── core/                       # 通用核心层 (零平台耦合)
│   ├── detector.py             # 智能链接/短链/文案分析、平台识别与 Target Resolver
│   ├── batch.py                # 统一用户歌单批量调度、预处理、去重标记与导出管道
│   ├── exporter.py             # 统一全格式导出器 (XLSX, CSV, JSON, TXT, M3U8)
│   ├── models.py               # 标准化数据模型 (NormalizedPlaylist, NormalizedTrack 等)
│   ├── ui.py                   # 终端 ANSI Banner、安全文件名清洗、超链接与跨平台目录打开
│   ├── http.py                 # 安全网络请求、短链 302 追踪与受控 IPv4 Fallback
│   ├── version.py              # 单一真实源版本读取 (Fail-closed)
│   └── self_test.py            # 离线确定性自检套件 (全格式导出 + 批量流程离线合成测试)
│
├── platforms/                  # 平台适配器层 (独立实现、统一能力矩阵)
│   ├── base.py                 # BasePlatformAdapter 抽象基类 (声明能力矩阵与统一 can_handle)
│   ├── registry.py             # PlatformRegistry 注册工厂与动态注册装饰器
│   ├── netease.py              # 网易云音乐适配器 (单歌单 + UID/主页批量)
│   ├── qqmusic.py              # QQ 音乐适配器 (单歌单 + QQ号/主页批量)
│   ├── kugou.py                # 酷狗音乐适配器 (单歌单 + 登录账号歌单批量)
│   ├── kuwo.py                 # 酷我音乐适配器 (单歌单)
│   └── qishui.py               # 汽水音乐适配器 (单歌单 + 双通道)
│
└── tests/                      # 统一 CLI 自动化测试 (85+ 单元与集成测试)
```

---

## 🛠️ 如何接入新平台 (扩展指南)

扩展接入新平台（如 `spotify`、`apple`、`bilibili`）只需 3 步，零架构入侵：

1. 在 `cli/platforms/` 下新建 `my_platform.py`。
2. 继承 `BasePlatformAdapter` 并声明能力：
   ```python
   from .base import BasePlatformAdapter
   from .registry import register_platform
   from ..core.models import NormalizedPlaylist

   @register_platform
   class MyPlatformAdapter(BasePlatformAdapter):
       platform_id = "my_platform"
       display_name = "我的平台"
       description = "新平台特性说明"
       aliases = ["mp"]
       supports_playlist = True
       supports_user_playlists = False
       requires_user_auth = False

       def fetch_playlist(self, raw_input: str, **options) -> NormalizedPlaylist:
           # 实现你的抓取与转换逻辑
           ...
   ```
3. 在 `cli/core/detector.py` 的 `SmartDetector.detect()` 中添加域名特征规则。
4. 在 `cli/platforms/__init__.py` 导入该模块即可！系统主菜单、参数识别、统一导出与批量均会自动生效。
