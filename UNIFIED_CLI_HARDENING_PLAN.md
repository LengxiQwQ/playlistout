# Playlist Out Unified CLI 完善与收口计划

> 适用范围：Playlist Out 当前统一 CLI  
> 目标：把现有“统一入口 + 平台 Adapter + 特殊交互”收口成真正统一、可脚本化、可测试、可跨平台发布的 CLI 架构。  
> 原则：不推倒重写、不重写历史、不 force push、不破坏现有单歌单能力与 Release 构建链。

---

## 0. 范围与边界

### 本计划主要修改范围

- `cli/main.py`
- `cli/__main__.py`
- `cli/core/*`
- `cli/platforms/*`
- `cli/tests/*`
- 必要时更新：
  - `cli/README.md`
  - `cli/core/self_test.py`
  - `cli/packaging/*`
  - `.github/workflows/release-cli.yml`

### 非目标

- 不重做 QQ / 网易云 / 酷狗 / 酷我 / 汽水五个独立旧 CLI 的交互体验。
- 不以旧独立脚本的功能完成度替统一 CLI“算支持”。
- 不改 Web 端业务。
- 不改变现有五种导出格式的公开结构，除非为修复明确错误且有测试保护。
- 不重写 Git 历史，不 rebase，不 force push。

### 允许的依赖方式

统一 Adapter 可以继续复用仓库中已经验证过的底层抓取函数。优先只改统一层；如果确实必须暴露一个已存在的底层能力，必须做到最小改动、行为保持兼容，并为其补测试。

---

# 1. 最终目标架构

统一 CLI 不应该只知道“这是哪个平台”，还必须知道“这是一个歌单，还是一个用户”。

目标数据流：

```text
用户输入
  ↓
统一 Target Resolver
  ↓
DetectedTarget
  ├─ platform: qqmusic / netease / kugou / kuwo / qishui
  ├─ kind: playlist / user / ambiguous / unknown
  └─ value: playlist_id / user_id / cleaned_url
  ↓
统一 Dispatcher
  ├─ playlist → fetch_playlist()
  └─ user     → fetch_user_playlists()
                  ↓
              统一 Batch Flow
                  ↓
              统一 Exporter
```

最终平台能力目标：

| 平台 | 单歌单 | 用户歌单 | 批量导出 |
|---|:---:|:---:|:---:|
| QQ 音乐 | ✅ | ✅ QQ号 / 用户主页 | ✅ |
| 网易云音乐 | ✅ | ✅ UID / 用户主页 | ✅ |
| 酷狗音乐 | ✅ | ✅ 登录账号 | ✅ |
| 酷我音乐 | ✅ | — | — |
| 汽水音乐 | ✅ | — | — |

---

# 2. 执行纪律

每一阶段必须独立完成以下循环：

1. 同步最新 `main`，只允许 fast-forward。
2. 先运行当前阶段相关测试，确认基线。
3. 优先补能暴露问题的测试，再修改实现。
4. 完成代码修改。
5. 跑阶段级测试。
6. 跑完整 `cli/tests/`。
7. 运行 `python cli/main.py --self-test`。
8. 如涉及打包/入口/依赖，再运行对应 release smoke test。
9. 检查 diff，只允许本阶段相关文件。
10. 一个阶段使用一个 multi-file atomic commit。
11. 直接 push 最新 `main`，`force=false`。
12. 验证 commit、changed files、CI / Release CLI workflow 状态。
13. 通过后再进入下一阶段。

如果阶段失败，不允许带着红灯继续下一个阶段。

---

# 3. Phase 0 — 建立基线与回归保护

## 目标

在正式改架构前，锁住当前已经工作的能力，防止后续重构把正常功能改坏。

## 任务

### 0.1 建立当前行为基线

至少确认：

- 五个平台 Adapter 均正常注册。
- 五个平台单歌单分发入口没有被破坏。
- `--version`
- `--help`
- `--self-test`
- `python cli/main.py`
- `python -m cli`
- 五种导出格式。
- `-p/--platform`
- `-f/--format`
- 酷狗 login/logout。
- 汽水 `--channel`。

### 0.2 补“当前缺口”测试

新增测试，明确记录当前预期：

- QQ 用户主页属于 `user` target。
- 网易云用户主页属于 `user` target。
- 酷狗用户主页属于 `user` target。
- 普通歌单 URL 不得被误判成用户。
- 纯数字必须进入可控的歧义处理，而不是靠长度强行猜平台。
- 非音乐 QQ URL 不得被识别为 QQ Music。
- 普通 Douyin 视频 URL 不得被当汽水歌单。

## 验收

- 所有现有测试仍通过。
- 新测试能清楚暴露后续需要修复的行为。
- 不改变用户可见行为。

## 建议提交

```text
test(cli): establish unified CLI behavior baseline
```

---

# 4. Phase 1 — 统一输入目标识别

## 目标

解决目前最大的根因：统一 CLI 只识别平台，不识别“歌单 / 用户”。

## 设计

新增统一目标模型，例如：

```python
class TargetKind(str, Enum):
    PLAYLIST = "playlist"
    USER = "user"
    AMBIGUOUS = "ambiguous"
    UNKNOWN = "unknown"

@dataclass
class DetectedTarget:
    platform: PlatformType
    kind: TargetKind
    value: str
    raw_input: str
```

建议保留现有 `SmartDetector.detect()` 的兼容行为，新增更高层的：

```python
SmartDetector.resolve_target(...)
```

不要为了重构把已有调用一次性全部打烂。

## 输入规则

### 明确歌单 URL

直接：

```text
kind = playlist
```

### 明确用户主页 URL

使用现有 `extract_user_profile_target()`：

```text
kind = user
```

### 带标签用户 ID

例如：

```text
QQ: 1160951354
QQ号: 1160951354
UID: 1825474783
用户: 1825474783
```

保留原始语义，不允许清洗后把标签信息完全丢失。

### 纯数字

纯数字本身不能可靠判断平台和对象类型。

规则：

- 没指定平台：`ambiguous`
- 交互模式：让用户选择平台；对于支持用户歌单的平台，再选择“歌单 / 用户”
- 非交互模式：
  - 保持明确、可脚本化
  - 使用显式参数强制用户模式，例如 `--user`
  - 默认继续兼容现有“`-p 平台 + 数字` 作为歌单 ID”的用法

### 汽水 18/19 位数字

不要再把 18/19 位纯数字无条件强制判定为汽水。

允许作为“提示/优先候选”，但不能覆盖用户明确指定的平台，也不能跳过歧义保护。

## 域名收紧

QQ Music 只接受明确音乐相关 QQ 域名/路径。

Douyin / 汽水也必须按音乐/歌单特征判断，普通抖音视频 URL 不应直接判成汽水歌单。

## 验收

必须覆盖：

- QQ 歌单 URL → playlist
- QQ 用户主页 → user
- `QQ号: xxx` → user
- 网易云歌单 URL → playlist
- 网易云用户主页 → user
- `UID: xxx` → user
- 酷狗用户主页 → user
- 普通 `qq.com` 页面 → unknown
- 普通 Douyin 视频 → unknown
- 纯数字 → ambiguous / 明确受 `-p`、`--user` 控制

## 建议提交

```text
refactor(cli): add unified playlist and user target resolution
```

---

# 5. Phase 2 — 把“用户歌单”提升为 Adapter 正式能力

## 目标

不再让 QQ / 网易云偷偷在 `handle_interactive()` 中各写一套用户逻辑。

## Base Adapter 新能力

建议增加能力声明和正式接口：

```python
supports_user_playlists: bool = False
requires_user_auth: bool = False

def fetch_user_playlists(
    self,
    user_target: str,
    **options
) -> Optional[NormalizedUserPlaylists]:
    ...
```

增加统一模型，例如：

```python
@dataclass
class UserPlaylistSummary:
    id: str
    name: str
    track_count: int | None = None
    source_url: str = ""
    is_created: bool = True

@dataclass
class NormalizedUserPlaylists:
    platform: str
    user_id: str
    nickname: str
    playlists: list[UserPlaylistSummary]
```

## 平台接入

### QQ

- QQ号
- QQ 用户主页
- 获取公开自建歌单
- 不再依靠 `handle_interactive()` 判定用户

### 网易云

- UID
- 用户主页
- 区分：
  - 自建歌单
  - 收藏歌单
- `all` 默认保持“全部自建歌单”的现有语义

### 酷狗

统一 CLI 正式接入：

```text
登录状态
  ↓
当前账号 UserID
  ↓
账号歌单列表
  ↓
统一批量流程
```

优先复用现有认证和已验证底层请求能力。

不要重做登录系统。

### 酷我 / 汽水

明确：

```python
supports_user_playlists = False
```

不要伪装成“未来也许可以”。

## `handle_interactive()` 收口

它可以继续保留给真正特殊的动作，例如：

- 酷狗 login
- 酷狗 logout

但不能再承担“用户歌单核心业务分发”。

## 验收

- QQ / 网易云 / 酷狗都有正式 `fetch_user_playlists()`。
- `main.py` 能根据 `DetectedTarget.kind` 统一分发。
- 酷我/汽水明确不支持用户模式。
- 用户主页识别 helper 不再是死代码。

## 建议提交

```text
feat(cli): unify user playlist capabilities across adapters
```

---

# 6. Phase 3 — 建立真正统一的 Batch Flow

## 目标

QQ、网易云、酷狗批量全部走同一套选择、导出、结果统计逻辑。

## 新增统一批量模块

建议：

```text
cli/core/batch.py
```

负责：

- 打印用户歌单列表。
- 选择解析：
  - `all`
  - 单个：`3`
  - 多选：`1,3,5`
  - 范围可选：`1-5`
  - `0` 返回
- 批量进度。
- 每个歌单抓取。
- 统一预处理。
- 统一导出。
- 成功/失败统计。
- 最终 exit/result。

## 统一预处理

无论单歌单还是批量，都必须进入同一套：

```text
normalize
→ mark_duplicates
→ validate metadata
→ export
```

不能再让批量直接绕过 `run_export_flow()` 的数据预处理。

建议把“预处理”和“UI 展示”拆开，不要为了复用强行让 batch 调一个会重复打印 UI 的函数。

## 非交互批量

必须真正支持脚本使用。

建议：

```text
PlaylistOut "QQ号: 1160951354" -p qqmusic --user -f json --no-open
```

非交互用户模式默认：

- QQ：导出该用户公开自建歌单
- 网易云：导出自建歌单
- 酷狗：导出当前登录账号自己的歌单

不要在 headless 模式中再调用 `input()`。

## 格式参数

`-f/--format` 必须统一传到 batch flow。

交互模式可以问格式。

非交互模式严格使用命令行指定格式。

## 文件名冲突

增加 collision-safe 命名。

原则：

- 正常情况保持 `歌单名.ext`
- 同目录出现同名时，使用稳定后缀，例如：
  - `歌单名 [123456].json`
- 不允许静默覆盖另一个歌单。

## Batch Result

建议返回结构化结果：

```python
@dataclass
class BatchResult:
    total: int
    success: int
    failed: int
    exported_files: list[str]
    failures: list[...]
```

## 验收

- QQ / 网易云 / 酷狗使用同一批量模块。
- 支持 all / 单选 / 多选。
- 非交互批量不出现任何 `input()`。
- `-f json` 只导出 JSON。
- duplicate 标记单歌单与批量一致。
- 同名歌单不覆盖。
- 单个失败不会让整个 batch 崩溃。
- 最后有明确成功/失败汇总。

## 建议提交

```text
feat(cli): add unified batch playlist export flow
```

---

# 7. Phase 4 — 修正 CLI 参数、退出码与入口语义

## 目标

让统一 CLI 真正适合 Shell、CI、定时任务和第三方调用。

## 4.1 格式参数严格校验

当前非法：

```text
-f jsno
```

不能静默变成全部导出。

规则：

- 交互输入无效：提示并重新选择或返回
- CLI 参数无效：stderr + 非 0 退出码

## 4.2 退出码

建议语义：

```text
0 = 成功
1 = 运行/网络/抓取/导出失败
2 = 参数或使用方式错误
```

至少保证：

- 0 个文件成功导出 → 非 0
- 无法识别目标 → 非 0
- 非法 format → 非 0
- 不支持 user capability → 非 0

## 4.3 `--login` / `--logout`

使用 argparse mutually exclusive group。

不允许：

```text
--login --logout
```

同时成立。

## 4.4 平台专属参数验证

例如：

```text
--channel
--token
--userid
--login
--logout
```

必须验证目标平台。

不要接受：

```text
-p netease --channel douyin
```

然后静默忽略。

## 4.5 `--user`

增加清晰的用户目标强制参数，用于纯数字脚本调用。

例如：

```text
PlaylistOut 1160951354 -p qqmusic --user
PlaylistOut 1825474783 -p netease --user
```

用户主页 URL 不需要 `--user`。

## 4.6 统一入口异常处理

让：

```text
python cli/main.py
python -m cli
Frozen PlaylistOut
```

共享同一个最外层入口 wrapper。

保证错误输出、exit code、Windows 双击暂停逻辑一致。

## 验收

新增参数级测试，覆盖所有上述组合。

## 建议提交

```text
fix(cli): enforce deterministic arguments and exit semantics
```

---

# 8. Phase 5 — 完善统一数据模型与导出边界

## 目标

让 `NormalizedPlaylist` 不只是“定义得完整”，而是真正被 Adapter 填起来。

## 5.1 Metadata

各 Adapter 在底层数据存在时补：

- `track_count`
- `is_partial`
- `create_time`
- `update_time`
- `play_count`
- `tags`
- `description`

原则：

- 有就填
- 没有就留空
- 不为了“字段完整”去发额外高成本请求

## 5.2 Partial 判断

统一规则：

```text
loaded_count < track_count
→ is_partial = True
```

摘要、JSON、Excel Info 必须一致。

## 5.3 Windows 文件名

增强：

- Windows reserved names：
  - `CON`
  - `PRN`
  - `AUX`
  - `NUL`
  - `COM1...`
  - `LPT1...`
- 尾部点/空格
- 过长文件名
- 空标题

## 5.4 M3U8

当前写的是：

```text
歌手 - 歌名.mp3
```

改为：

1. 有真实 `playback_url` → 写播放 URL
2. 没有 `playback_url` → 保留本地文件模板，但文档和输出说明必须明确它是“本地媒体匹配型 M3U8”，不是在线直播放列表

不要为了 M3U8 强行新增绕版权/鉴权的播放地址抓取。

## 5.5 IPv4

不要全局永久强制 requests 只走 IPv4。

目标：

```text
正常网络栈
→ 请求失败/特定连接问题
→ 可控 IPv4 fallback
```

避免 IPv6-only 环境直接失效。

## 验收

- Metadata 有测试。
- partial 有测试。
- Windows reserved filename 有测试。
- M3U8 两种行为有测试。
- 网络 fallback 不影响现有短链解析测试。

## 建议提交

```text
fix(cli): harden metadata exports filenames and network fallback
```

---

# 9. Phase 6 — 收口重复架构

## 目标

清理现在“看起来可扩展，但实际上没有接通”的接口。

## 6.1 `can_handle()`

目前：

```text
SmartDetector 一套平台识别
Adapter.can_handle() 又一套
```

必须选一个事实源。

推荐：

- SmartDetector 负责通用清洗、target kind
- 平台域名/特征尽量由 Registry / Adapter 提供
- Detector 不再硬编码所有平台细节

或者删除 `can_handle()`。

不能继续保留两套都需要人工同步。

## 6.2 `get_supported_args()`

两种选择只能选一种：

### A. 真正启用

由 Adapter 声明平台参数，统一 CLI 动态注册/校验。

### B. 删除

如果五个平台数量固定，明确在 `main.py` 注册并集中验证。

不允许继续保留一个“供动态注册”但从未使用的 API。

## 6.3 Adapter Capability

建议统一能力字段：

```python
supports_playlist = True
supports_user_playlists = False
requires_user_auth = False
supported_channels = ()
```

UI、help、dispatcher 都从 capability 获取，不再散落硬编码。

## 验收

- 新增第六个平台时不需要同时修改多套识别事实源。
- help / menu / dispatch 能从 capability 得到一致结果。
- 删除死接口和死分支。
- 不做无必要抽象。

## 建议提交

```text
refactor(cli): consolidate adapter capabilities and detection sources
```

---

# 10. Phase 7 — 测试、Self-test、Release 与文档最终收口

## 目标

让 CI 的“绿色”真正代表 Unified CLI 的关键链路可用。

## 必补测试

### Target Resolver

- playlist/user/ambiguous/unknown
- QQ
- 网易云
- 酷狗
- 纯数字
- 标签输入
- 非音乐域名误判

### User Capability

Mock 网络层测试：

- QQ user → playlist collection
- NetEase user → created/subscribed
- Kugou authenticated user → playlist collection
- unsupported platform user → deterministic error

### Batch

- all
- one
- multiple
- partial failure
- duplicate marking
- format propagation
- collision-safe filename
- no interactive prompt in headless mode

### CLI

- `--user`
- illegal format
- illegal platform-specific arguments
- login/logout mutual exclusion
- exit code

### Frozen Self-test

继续保持完全离线。

增加合成的：

```text
synthetic user collection
→ batch flow
→ two playlists
→ export
```

不要让 self-test 调公网。

## Release

现有四平台 matrix 架构保持：

- Windows x64
- Linux x64
- macOS arm64
- macOS x64

继续验证：

- `--version`
- `--help`
- `--self-test`

如 Phase 4 改了 CLI 参数解析，再增加一个纯离线 parser smoke test。

## 文档

最后再更新：

- `cli/README.md`
- 根 README 中 CLI 能力表

文档必须以真实实现为准。

不要在功能完成前先把 README 写成“已经支持”。

## 最终全量验收

```bash
python -m compileall cli/
pytest -v cli/
python cli/main.py --self-test
python cli/main.py --help
python cli/main.py --version
```

如果有条件，执行 Release CLI dry-run：

```text
4 平台 build
→ frozen --version
→ frozen --self-test
→ frozen --help
→ artifacts
→ SHA256
→ manifest
```

## 建议提交

```text
test(cli): complete unified CLI regression and release coverage
```

---

# 11. 已确认问题 → Phase 映射

| 问题 | 处理阶段 |
|---|---|
| QQ 纯 QQ号识别 | Phase 1 / 2 |
| 网易云纯 UID 识别 | Phase 1 / 2 |
| 酷狗无统一用户批量 | Phase 2 |
| 无统一 user target | Phase 1 |
| `extract_user_profile_target()` 未接主流程 | Phase 1 |
| headless batch 仍 `input()` | Phase 3 |
| `-f` 不传 batch | Phase 3 |
| QQ/网易云 batch UX 不一致 | Phase 3 |
| batch 绕过 duplicate 预处理 | Phase 3 |
| 同名覆盖 | Phase 3 / 5 |
| `track_count/is_partial` 未填 | Phase 5 |
| `get_supported_args()` 未使用 | Phase 6 |
| `can_handle()` 未使用 | Phase 6 |
| 平台识别双事实源 | Phase 6 |
| 非法 `-f` 静默 all | Phase 4 |
| 全部导出失败仍 exit 0 | Phase 4 |
| `-f 0` headless 语义异常 | Phase 4 |
| 18/19 位数字强判汽水 | Phase 1 |
| QQ 域名过宽 | Phase 1 |
| Douyin 域名过宽 | Phase 1 |
| M3U8 虚构本地 mp3 | Phase 5 |
| Windows 保留文件名 | Phase 5 |
| login/logout 可同时输入 | Phase 4 |
| 全局强制 IPv4 | Phase 5 |
| 两种 Python 入口异常行为不同 | Phase 4 |
| 用户 batch 测试缺失 | Phase 0 / 7 |
| Frozen self-test 不覆盖 batch | Phase 7 |
| README 扩展描述超前 | Phase 7 |

---

# 12. 不应顺手做的事情

执行过程中禁止借机：

- 重写五个平台抓取器。
- 改 Web UI。
- 改导出 JSON 大版本 Schema。
- 更换构建系统。
- 把 PyInstaller 换成其他打包器。
- 重构所有目录结构。
- 引入重量级 CLI 框架。
- 重写 Git 历史。
- 用 force push。
- 为“未来可能有用”加入当前无需求的抽象。

目标是：

**修好统一 CLI，而不是再造一个新项目。**

---

# 13. 完成定义（Definition of Done）

只有同时满足以下条件，才能宣布 Unified CLI 收口完成：

- [ ] 五个平台单歌单功能无回归
- [ ] QQ QQ号 / 用户主页可进入统一 user flow
- [ ] 网易云 UID / 用户主页可进入统一 user flow
- [ ] 酷狗登录后可进入统一 user flow
- [ ] QQ / 网易云 / 酷狗共用统一 batch flow
- [ ] headless 用户批量完全无 `input()`
- [ ] `-f` 对单歌单和 batch 语义一致
- [ ] all / 单选 / 多选正常
- [ ] duplicate 处理单歌单/batch 一致
- [ ] 同名歌单不覆盖
- [ ] 无效参数返回明确错误
- [ ] 失败退出码可靠
- [ ] metadata/partial 状态一致
- [ ] Windows 文件名边界安全
- [ ] M3U8 语义明确
- [ ] 平台识别只有一个事实源
- [ ] Adapter capability 不存在死接口
- [ ] 用户/batch 核心路径有自动测试
- [ ] Frozen self-test 覆盖离线 batch 核心
- [ ] Windows/Linux/macOS 四平台 Release smoke test 通过
- [ ] README 与实际能力一致
- [ ] 每阶段 commit 可独立回退
- [ ] 无 rebase / force push
