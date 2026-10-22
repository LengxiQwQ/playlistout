# Playlist Out CLI · 把你的歌单带走

Playlist Out 本地命令行版本，支持在 Windows、macOS 与 Linux 本地解析并导出网易云音乐、QQ 音乐、酷狗音乐、酷我音乐、汽水音乐与咪咕音乐六大平台的公开歌单。

提供两种使用方式：
- **交互式模式**：双击即可使用，跟随屏幕提示粘贴链接并回车，无需记忆任何命令；
- **命令行参数模式**：支持丰富的传参和批量调度，适合脚本调用与自动化任务。

---

## 👤 快速上手

### 1. 包管理器一键安装（推荐终端玩家 ⭐）

| 平台 | 安装与使用命令 | 状态 | 特性 |
| :--- | :--- | :--- | :--- |
| **📦 NPM** | `npm install -g playlistout`<br>*(安装后终端直接输入 `playlistout`)* | 🟢 **已上线** | 跨平台全生态支持，一次安装全局永久可用 |
| **🪟 WinGet** | `winget install LengxiQwQ.PlaylistOut` | ⏳ *审核中* | Windows 官方商店包管理器，支持静默升级 |
| **🍨 Scoop** | `scoop install playlistout` | ⏳ *审核中* | 极客友好，自动配置系统环境变量与开始菜单快捷方式 |

---

### 2. 下载即用（免安装 Python，双击运行）

在 [GitHub Releases](https://github.com/LengxiQwQ/playlistout/releases) 页面下载对应系统的压缩包或执行文件：

| 操作系统 | 下载文件 | 运行方式 |
|---|---|---|
| **Windows x64** | `PlaylistOut-CLI-v{version}-windows-x64.exe` | 直接双击运行，或在终端中运行 |
| **macOS Apple Silicon (M系列)** | `PlaylistOut-CLI-v{version}-macos-arm64.tar.gz` | 解压后双击 `PlaylistOut.command`，或在终端执行 `./PlaylistOut` |
| **macOS Intel (x86_64)** | `PlaylistOut-CLI-v{version}-macos-x64.tar.gz` | 解压后双击 `PlaylistOut.command`，或在终端执行 `./PlaylistOut` |
| **Linux x64** | `PlaylistOut-CLI-v{version}-linux-x64.tar.gz` | 终端执行 `tar -xzf PlaylistOut-CLI-*.tar.gz && ./PlaylistOut` |

> 💡 **macOS 首次运行提示**：由于发行包由开源社区构建、未向 Apple 购买开发者证书，首次打开如遇系统提示「无法打开，因为无法验证开发者」或「已损坏」，可通过以下任一方式解决：
> 1. 打开系统的「系统设置 → 隐私与安全性」，滑到底部安全性区域，点击「仍要打开」；
> 2. 或在解压目录打开终端，执行以下命令移除系统的隔离标记：
>    ```bash
>    xattr -d com.apple.quarantine PlaylistOut PlaylistOut.command
>    ```

---

### 3. 模式一：交互式模式（零门槛，推荐）

无需敲复杂命令，直接启动程序：
- Windows 双击 `PlaylistOut.exe`；
- macOS 双击 `PlaylistOut.command`；
- 或在终端输入 `./PlaylistOut`（源码方式输入 `python cli/main.py`）。

进入程序后，主菜单会清晰引导你完成操作：

```text
============================================================
            Playlist Out CLI 歌单导出工具 v3.0.0
============================================================
  支持平台：网易云音乐 · QQ音乐 · 酷狗音乐 · 酷我音乐 · 汽水音乐 · 咪咕音乐
------------------------------------------------------------
  [1] 网易云音乐   [2] QQ 音乐     [3] 酷狗音乐
  [4] 酷我音乐     [5] 汽水音乐    [6] 咪咕音乐
------------------------------------------------------------
粘贴歌单链接、短链、分享文案或纯数字 ID（输入 0 或 q 退出）:
```

#### 常见操作流程：
1. **单歌单导出**：直接把手机或电脑上复制的歌单链接/分享文本粘贴进去，程序会自动识别平台；接着按提示输入格式编号（支持多选，默认全部导出），导出完成后自动打开保存目录。
2. **用户歌单批量导出**：
   - **QQ 音乐**：直接粘贴用户的 QQ 号或用户主页链接，程序会自动列出该用户所有公开自建歌单，支持输入 `all` 全部导出，输入 `user` 仅自建，或输入 `1,3,5`、`1-3` 导出选定歌单。
   - **网易云音乐**：直接粘贴网易云用户 UID 或主页链接，程序会自动列出该用户自建与收藏的全部歌单，支持输入 `all` 导出全部歌单，输入 `user` 仅自建歌单，或按序号/范围多选导出。
   - **酷狗音乐**：普通公开歌单可直接导出前 10 首；在提示符输入 `login`，会调出二维码供手机酷狗 APP 扫码登录，登录后即可导出完整歌单和个人云端歌单。若不希望在终端扫码，也可以在网页端登录后直接复制 UserID 和 Token，通过命令行参数 `--token` 与 `--userid` 免交互完成凭证配置。

---

### 4. 模式二：命令行参数模式（适合脚本与批处理）

如果你需要编写批处理脚本、集成到自己的工作流中，可以直接传入参数，全程静默无交互运行：

```bash
# 1. 解析单个歌单并导出指定格式
PlaylistOut "https://music.163.com/playlist?id=2756674066" -f xlsx,json

# 2. 纯数字 ID 解析（需指定平台），自定义保存目录且导出后不自动弹窗
PlaylistOut "9044196528" -p qqmusic -o ./my_exports -f csv,xlsx --no-open

# 3. 批量导出 QQ 用户的全部公开歌单 (Headless 无交互)
PlaylistOut "1160951354" -p qqmusic --user -f json --no-open

# 4. 批量导出网易云用户的指定序号歌单 (例如只导出第 1 和第 2 个歌单)
PlaylistOut "1825474783" -p netease --user --select 1,2 -f json,csv --no-open

# 5. 酷狗音乐：免交互验证并保存登录凭据（可使用在网页版登录后获取的 UserID 与 Token）
PlaylistOut -p kugou --token <TOKEN> --userid <USERID> --save-auth

# 6. 酷狗音乐：单次带凭证直接批量导出（免交互，不覆盖全局凭据）
PlaylistOut -p kugou --token <TOKEN> --userid <USERID> --user -f xlsx,csv -o ./output --no-open

# 7. 酷狗音乐：导出已登录账号的全部个人歌单（自建 + 收藏）
PlaylistOut -p kugou --user -f json --no-open

# 8. 汽水音乐：切换解析通道为抖音原声
PlaylistOut "https://qishui.douyin.com/s/xxx" --channel douyin
```

#### 完整命令行参数速查表

```text
用法: PlaylistOut [input] [选项]

位置参数:
  input                 歌单链接、短链、分享文本或纯数字 ID

通用选项:
  -h, --help            显示帮助信息并退出
  -v, --version         显示版本号并退出
  -p, --platform        指定平台 (netease, qqmusic, kugou, kuwo, qishui, migu 等)
  -i, --id              通过选项传入歌单链接、短链或 ID
  -f, --format          导出格式，多个用逗号隔开: xlsx, csv, json, txt, m3u8 或 all (默认: all)
  -o, --output-dir      导出目录 (默认: output)
  -u, --user            指定目标为用户（用于纯数字 QQ号/UID 批量导出；与单歌单链接互斥）
  -s, --select          批量模式下选择歌单序号，如 all (全部)、user (仅自建) 或 1,3,5、1-3
  --no-open             导出完成后不自动打开文件夹
  --no-telemetry        禁用匿名聚合使用统计上报
  --debug               输出详细异常堆栈跟踪

平台专属选项:
  --channel {qishui,douyin}
                        [汽水音乐] 解析通道: qishui 官方正版 / douyin 全量原声
  --login               [酷狗音乐] 调出终端扫码登录获取凭据并退出
  --logout              [酷狗音乐] 清除本地保存的登录凭据并退出
  --token TOKEN         [酷狗音乐] 手动传入认证 Token（可直接导出或保存）
  --userid USERID       [酷狗音乐] 手动传入数字 UserID
  --save-auth           [酷狗音乐] 在线验活 --token 与 --userid 凭据并持久化到本地后退出
```

#### 退出状态码 (Exit Codes)
- `0`：执行成功，且至少成功导出了一个文件；
- `1`：运行时错误（网络请求失败、上游接口异常、未成功导出任何文件等）；
- `2`：参数使用错误（非法导出格式、平台与参数冲突、纯数字 ID 未指定平台等）。

---

### 4. 支持平台与导出格式

#### 平台能力矩阵

| 平台 | 单歌单导出 | 用户批量导出 | 凭证要求 | 专属参数 |
|---|:---:|:---:|---|---|
| **网易云音乐** | ✅ | ✅ (UID / 主页链接) | 免登 | — |
| **QQ 音乐** | ✅ | ✅ (QQ号 / 主页链接) | 免登 | — |
| **酷狗音乐** | ⚠️ 免登录前 10 首 (登录后完整) | ✅ (个人云端歌单) | 终端扫码登录 / Web 凭据导入 | `--login`, `--logout`, `--token`, `--userid`, `--save-auth` |
| **酷狗概念版** | ✅ | — | 免登 (全量无截断) | — |
| **酷我音乐** | ✅ | — | 免登 (多页自动合并) | — |
| **汽水音乐** | ✅ | — | 免登 (双通道支持) | `--channel {qishui,douyin}` |
| **咪咕音乐** | ✅ | — | 免登 (并发分页获取) | — |

> 💡 **酷狗音乐凭据获取技巧（免终端扫码）**：  
> 若在无显示界面的远程服务器、容器或 CI 流水线中运行，或希望直接复用网页端已登录会话：  
> 1. 打开 [Playlist Out 网页版](https://playlistout.lengxiqwq.com/) 并完成酷狗账号登录；  
> 2. 按 F12 打开浏览器开发者工具，在「应用程序 (Application)」→「本地存储 (Local Storage)」中复制 `kugou_userid` 与 `kugou_token`；  
> 3. 在终端执行 `PlaylistOut -p kugou --token <TOKEN> --userid <USERID> --save-auth`。CLI 会自动请求官方接口在线验活并换取用户昵称，验证通过后安全写入本地配置文件（`~/.playlistout/kugou_auth.json`），后续直接运行无需重复登录。

#### 导出格式与命名规范

单歌单导出文件统一保存在 `output/` 目录下，文件命名遵循：
```text
【平台】歌单名 - 作者.ext
```
同名文件自动追加 ` (2)`、` (3)` 递增编号，绝不静默覆盖已有文件。批量导出的歌单按用户归类在 `output/<用户标识>/` 子目录中。

| 格式 | 文件扩展名 | 适用场景 |
|---|---|---|
| **Excel** | `.xlsx` | 包含 `Tracks`（歌曲纯净列表）与 `Playlist Info`（歌单元数据）两个工作表，适合归档与表格分析 |
| **CSV** | `.csv` | UTF-8 带 BOM 编码（Excel 打开不乱码），适合跨软件迁移与数据处理 |
| **JSON** | `.json` | 遵循 Playlist Out Canonical JSON 统一数据标准，适合程序脚本与开源播放器解析 |
| **纯文本** | `.txt` | 每行格式为 `歌名 - 歌手 - 专辑`，适合快速查看和文本分享 |
| **M3U8** | `.m3u8` | 标准 Extended M3U 播放列表格式，适合兼容本地音乐播放器导入 |

---

## 🛠️ 开发者指南

### 1. 本地开发环境准备

项目推荐使用 Python 3.14 环境进行开发。

```bash
# 1. 克隆代码仓库
git clone https://github.com/LengxiQwQ/playlistout.git
cd playlistout

# 2. 安装开发与测试依赖
pip install -r cli/requirements-dev.txt

# 3. 从源码运行 CLI
python cli/main.py
# 或以 Python 模块形式运行
python -m cli

# 4. 运行全套单元测试 (230+ 自动化测试)
pytest cli/tests/

# 5. 运行确定性离线自检（包含合成数据全格式导出与批量验证）
python cli/main.py --self-test
```

依赖文件说明：
- `cli/requirements.txt`：运行时最小依赖（仅 `requests` 与 `openpyxl`）；
- `cli/requirements-dev.txt`：包含开发、测试（`pytest`）及打包工具（`pyinstaller`）；
- `cli/requirements-release.txt`：严格锁定补丁版本的生产构建依赖清单。

---

### 2. 代码架构与目录职责

CLI 采用分层解耦架构，核心调度与平台抓取彻底分离：

```text
cli/
├── main.py                     # CLI 主入口，处理参数解析与交互流程
├── __main__.py                 # 支持 python -m cli 入口
├── playlistout.py              # PyInstaller 打包构建入口
│
├── core/                       # 核心业务层 (与平台无关)
│   ├── detector.py             # 链接分析、平台识别与目标分类 (Target Resolver)
│   ├── exporter.py             # 统一全格式导出引擎 (XLSX, CSV, JSON, TXT, M3U8)
│   ├── batch.py                # 用户歌单批量获取、过滤、重名递增与导出调度
│   ├── models.py               # Canonical 统一数据模型 (NormalizedPlaylist, NormalizedTrack)
│   ├── http.py                 # 安全 HTTP 请求、短链 302 追踪与重试
│   ├── ui.py                   # 终端彩色输出、Banner、文件名安全清洗
│   ├── version.py              # 单一真理源动态版本解析 (Fail-closed 机制)
│   └── self_test.py            # 零网络离线确定性自检套件
│
├── platforms/                  # 平台适配器层 (独立实现、统一接口)
│   ├── base.py                 # BasePlatformAdapter 抽象基类
│   ├── registry.py             # PlatformRegistry 注册工厂与 @register_platform 装饰器
│   ├── netease.py              # 网易云音乐适配器
│   ├── qqmusic.py              # QQ 音乐适配器
│   ├── kugou.py                # 酷狗音乐适配器
│   ├── kuwo.py                 # 酷我音乐适配器
│   ├── qishui.py               # 汽水音乐适配器
│   └── migu.py                 # 咪咕音乐适配器
│
├── packaging/                  # 打包资源 (图标与 PyInstaller spec 文件)
└── tests/                      # 单元测试与集成测试套件
```

---

### 3. 如何接入新平台

新增一个音乐平台只需 4 步：

1. **新建适配器文件**：在 `cli/platforms/` 下新建 `my_platform.py`；
2. **实现适配器**：继承 `BasePlatformAdapter` 并使用 `@register_platform` 注册：
   ```python
   from .base import BasePlatformAdapter
   from .registry import register_platform
   from ..core.models import NormalizedPlaylist

   @register_platform
   class MyPlatformAdapter(BasePlatformAdapter):
       platform_id = "my_platform"
       display_name = "我的音乐平台"
       description = "新平台简述"
       aliases = ["my", "mp"]
       supports_playlist = True
       supports_user_playlists = False

       def can_handle(self, text: str) -> bool:
           return "myplatform.com" in text.lower()

       def fetch_playlist(self, raw_input: str, **options) -> NormalizedPlaylist:
           # 实现歌曲抓取并返回标准 NormalizedPlaylist
           ...
   ```
3. **添加域名特征**：在 `cli/core/detector.py` 的 `SmartDetector` 中加入该平台的域名特征匹配；
4. **显式导出**：在 `cli/platforms/__init__.py` 中 `import` 该适配器模块，并在 `cli/core/self_test.py` 补充注册校验。

完成后，主菜单识别、参数路由、全格式导出与批量流程均会自动支持该平台。

---

### 4. 打包与构建

- **单平台本地构建**：
  ```bash
  python scripts/release/build-cli.py
  ```
  产物将输出在 `dist/cli/artifacts/` 目录下，临时构建文件限制在 `.build/cli/` 中，不会污染根目录。
- **CI 自动化全平台发行**：
  推送版本标签（如 `git tag v3.0.0 && git push origin v3.0.0`）会自动触发 `.github/workflows/release-cli.yml`，在 4 种系统 Runner（Windows x64、Linux x64、macOS Apple Silicon、macOS Intel）上执行全套测试、打包可执行文件、计算 SHA-256 校验和并创建 Draft Release。
