# PlaylistOut Unified CLI (全平台统一导出工具)

PlaylistOut 统一命令行工具，集成网易云音乐、QQ 音乐、酷狗音乐、酷我音乐、汽水音乐与咪咕音乐六大平台，支持单歌单解析与用户歌单批量导出，全本地运行与本地导出，不上传任何数据至服务器。

---

## 🌟 核心特性

- **⚡ 平台自动识别**：支持输入各平台歌单链接、短链（如 `163cn.tv`、`c6.y.qq.com`、`t.kugou.com`、`t.kuwo.cn`、`v.douyin.com`、`c.migu.cn`）或分享文案，自动识别所属平台。
- **👥 用户歌单批量导出**：
  - **QQ 音乐**：支持输入 QQ 号或用户主页链接，批量导出用户公开歌单。
  - **网易云音乐**：支持输入 UID 或用户主页链接，批量导出创建/收藏的全部歌单。
  - **酷狗音乐**：普通歌单免登录受官方接口限制仅解析前 10 首；支持通过 `--login` 扫码登录，解锁单歌单完整导出与个人云端歌单批量导出。
  - **酷狗概念版**：支持概念版集合歌单链接与分享短链，免登录全量抓取。
  - **统一批量导出**：共用同一套批量流程，支持全量（`all`）、单选、多选与进度统计；同名歌单自动按 ` (2)`、` (3)` 递增区分。
- **🛡️ 命令行无交互模式**：
  - 在指定 `--user`、`-f` 与 `--no-open` 时全程无交互静默运行，适合脚本与自动化任务调用。
  - 格式参数严格校验（如 `-f json,csv`），非法格式直接显式报错并返回非零退出码。
- **📦 多格式导出**：支持 `.xlsx`、`.csv`、`.json`、`.txt`、`.m3u8`；导出文件名统一为 `【平台】歌单名 - 作者.ext`，同目录重名时自动追加 ` (2)`、` (3)` 防覆盖。

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
| **咪咕音乐** | ✅ | — | 免登 (全量无截断) | — |

---

## 🚀 快速上手

### 方式 A：独立免安装运行 (免安装 Python)

解压或双击即可使用，**免安装 Python 环境**：

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

# 2. 交互式启动 (交互菜单与自动识别)
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
  --user                指定目标为用户 (用于纯数字 QQ号/UID 等脚本批量导出；歌单链接/歌单标签误加时会报错退出)
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
- `1`：运行时错误（网络请求失败、上游抓取失败、未成功导出任何文件、链接无法识别等）。
- `2`：使用方式错误（非法导出格式、平台专属参数混用、互斥参数冲突、纯数字未指定 `-p`、歌单目标误加 `--user` 等）。

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
│   ├── qishui.py               # 汽水音乐适配器 (单歌单 + 双通道)
│   └── migu.py                 # 咪咕音乐适配器 (单歌单 + 分页并发)
│
└── tests/                      # 统一 CLI 自动化测试 (85+ 单元与集成测试)
```

---

## 🛠️ 如何接入新平台 (扩展指南)

扩展接入新平台（如 `spotify`、`apple`、`bilibili`）只需以下步骤：

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

---

## 🚢 维护者发布手册（Draft 审核与回滚）

CLI 二进制通过 `.github/workflows/release-cli.yml` 构建发布，4 平台资产（Windows x64 / Linux x64 / macOS arm64 / macOS x64）+ `CLI-SHA256SUMS.txt` 由 CI 产出。

### 正常发布（Draft 审核流程）
1. 更新根 `package.json` 版本号（唯一版本源，保持 `web/`、`worker/` 同步），合入 `main`。
2. 触发发布，二选一：
   - **推送 Tag**：`git tag vX.Y.Z && git push origin vX.Y.Z`（自动强制 `draft=true`，且 Tag 与当前提交不一致时拒绝发布）；
   - **手动触发** `workflow_dispatch`：默认 `draft=true`；建议先以 `dry_run=true` 跑一遍，不产生任何 Release 资产（已发布版本上同样可跑 dry-run 演练：Tag 与 HEAD 不一致时仅告警继续，不触碰任何 Release 资产）。
3. 等 4 平台构建 + smoke test 全绿；资产只会写入/更新 **Draft** Release。
4. 人工复核 Draft 资产（至少下载本平台包跑一次单歌单导出）后手动发布：
   ```bash
   gh release edit vX.Y.Z --draft=false
   ```

### 安全护栏
- **禁止向已发布的 Release 追加或覆盖资产**：workflow 会检查已有 Release 的 `isDraft`，非 Draft 直接失败退出；线上二进制有问题时不要热修资产，改发补丁版本。
- Tag 与提交一致性由 preflight 校验：Tag 已指向其他提交时拒绝发布/覆盖。
- 构建失败不会产生面向用户的可见变更，修复后重跑即可。

### 回滚规范
- 已发布版本存在严重缺陷时：
  1. 在 `main` 上修复并通过 `npm run gate`，提升补丁版本（`X.Y.(Z+1)`）走完整 Draft 审核后发布；
  2. 如确需下线旧 Release：保留 Tag 与 CHANGELOG 记录，优先编辑 Release 说明标注问题（`gh release edit vX.Y.Z --notes "..."`）；必要时删除问题资产（`gh release delete-asset vX.Y.Z <asset>`），**不要删除历史 Tag**。
- 本地打包入口 `npm run build:publish`（`scripts/release/build-publish.py`）仅用于本机验证，不改变上述 CI 发布规则。
