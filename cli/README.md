# PlaylistOut Unified CLI (全平台统一导出工具)

PlaylistOut 统一命令行工具，集成网易云音乐、QQ 音乐、酷狗音乐、酷我音乐与汽水音乐五大平台，支持链接智能识别与手动选择双轨模式，100% 本地隐私安全，无惧网络泄露。

---

## 🌟 核心特性

- **⚡ 智能自动识别**：直接粘贴任意平台的链接、短链（如 `163cn.tv`、`c6.y.qq.com`、`t1.kugou.com`、`t.kuwo.cn`）或带表情符号的微信/抖音长分享文案，系统秒级自动识别所属平台并抓取。
- **🎯 平台预选锁定**：在主菜单输入 `1~5` 即可预选锁定特定平台，方便直接输入纯数字歌单 ID。
- **🛡️ 纯数字歧义防呆**：直接粘贴无域名特征的纯数字 ID 时，系统主动弹出平台选择确认，防止混淆。
- **📦 导出格式一网打尽**：支持 `.xlsx` (表格美化自适应列宽)、`.csv` (带 UTF-8 BOM，Excel 双击不乱码)、`.json` (官方 Canonical 规范)、`.txt` (纯文本歌曲清单)、`.m3u8` (播放列表)。
- **🧩 极简架构 (反屎山)**：采用严格的分层与适配器模式（`cli/core/` 通用核心 + `cli/platforms/` 独立适配器），彼此物理隔离。未来扩展第 6、第 7 个新平台只需单文件接入，绝不相互污染。

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r cli/requirements.txt
```

### 2. 交互式启动 (推荐)

直接运行统一入口，进入双轨线框交互界面：

```bash
python cli/main.py
# 或以模块方式启动：
python -m cli
```

**交互示例：**
- 直接粘贴网易云链接：`https://music.163.com/playlist?id=2756674066`（自动识别为网易云并导出）
- 直接粘贴汽水音乐抖音分享文案（自动提取 URL 并识别）
- 输入 `2` 锁定 QQ 音乐，再输入纯数字歌单 ID 或 QQ 号
- 输入 `login` 调出酷狗音乐终端扫码/凭证登录

### 3. 命令行静默/自动化调用

支持单行命令直接执行导出，适合脚本批处理：

```bash
# 智能自动识别链接并导出全部格式
python cli/main.py "https://music.163.com/playlist?id=2756674066"

# 显式指定平台并指定纯数字 ID 与输出目录
python cli/main.py "9044196528" -p qqmusic -o ./my_exports -f xlsx,csv --no-open

# 汽水音乐切换到全量原声双通道
python cli/main.py "https://qishui.douyin.com/s/xxx" --channel douyin

# 酷狗音乐登录配置
python cli/main.py -p kugou --login
```

---

## 📁 模块架构设计

```text
cli/
├── main.py                     # 统一 CLI 轻量入口 (~200 行)
├── __main__.py                 # 支持 python -m cli
├── requirements.txt            # 统一依赖
│
├── core/                       # 通用核心层 (零平台耦合)
│   ├── detector.py             # 智能链接/短链/文案分析与平台识别
│   ├── exporter.py             # 统一全格式导出器 (XLSX, CSV, JSON, TXT, M3U8)
│   ├── models.py               # 标准化数据模型 (NormalizedPlaylist, NormalizedTrack)
│   ├── ui.py                   # 终端 Banner, ANSI 菜单, 格式选择与跨平台目录唤起
│   └── http.py                 # 安全网络请求、短链 302 追踪与 IPv4 偏好
│
├── platforms/                  # 平台适配器层 (独立实现、严格隔离)
│   ├── base.py                 # BasePlatformAdapter 抽象基类
│   ├── registry.py             # PlatformRegistry 注册工厂与动态注册装饰器
│   ├── netease.py              # 网易云音乐适配器
│   ├── qqmusic.py              # QQ 音乐适配器
│   ├── kugou.py                # 酷狗音乐适配器
│   ├── kuwo.py                 # 酷我音乐适配器
│   └── qishui.py               # 汽水音乐适配器
│
├── tests/                      # 统一 CLI 自动化测试
│   ├── test_detector.py        # 链接识别覆盖测试
│   ├── test_unified_exporter.py# 全格式导出合规测试
│   └── test_unified_cli.py     # 命令行调用与参数测试
│
└── [旧版独立工具完整保留]
    ├── qqmusic/
    ├── netease/
    ├── kugou/
    ├── kuwo/
    └── qishui/
```

---

## 🛠️ 如何接入新平台 (扩展指南)

想要扩展接入新平台（如 `spotify`、`apple`、`bilibili`）？非常简单且不会产生任何屎山：

1. 在 `cli/platforms/` 下新建 `my_platform.py`。
2. 继承 `BasePlatformAdapter` 并使用 `@register_platform` 装饰器：
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

       def can_handle(self, text: str) -> bool:
           return "myplatform.com" in text.lower()

       def fetch_playlist(self, raw_input: str, **options) -> NormalizedPlaylist:
           # 实现你的抓取与转换逻辑
           ...
   ```
3. 在 `cli/core/detector.py` 补充一行对应的域名判定规则。
4. 在 `cli/platforms/__init__.py` 导入该模块即可！系统主菜单、参数识别均会自动生效，无需修改已有平台的任何代码。
