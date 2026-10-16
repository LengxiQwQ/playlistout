# PlaylistOut 新厂商接入标准范式 (New Vendor Onboarding Guide)

本文档是为开发者和 AI Agent 准备的标准化厂商接入指南。  
在完成 P1（Provider 注册中枢）与 P3（功能管道）重构后，PlaylistOut 已彻底消除了中心化 if-else 瀑布与上帝分发逻辑。接入一个新音乐平台，遵循以下标准化流水线。

---

## 0. 核心宪法红线 (Constitutional Invariants)

接入任何新厂商前，必须严格遵守 [`PROJECT-CONSTITUTION.md`](./PROJECT-CONSTITUTION.md)：
1. **严禁服务端抓取音频流或歌词**（§1 非目标）：仅做歌单/歌曲元数据标准化。
2. **严禁任意 URL 代理**（§8 安全策略）：上游网络请求必须走严格白名单域名，严禁开放通用 `/proxy?url=...`。
3. **导出留在端侧**（§5 客户端导出）：Worker 绝对不生成和托管导出二进制或文本，全部导出计算由浏览器插件管道或 CLI 本地完成。
4. **状态标定使用元数据管道**（§6 数据契约）：失效、VIP、重复歌曲交由 Worker 管道 `defaultPlaylistPipeline` 自动标准化标定。

---

## 1. 接入 5 步走流程 (Step-by-Step)

```
worker/src/providers/<vendor-id>/
├── provider.ts      # 实现 MusicProvider 接口（含 meta + capabilities）
├── client.ts        # 上游 HTTP 请求封装（请求头、防盗链、重试）
├── input.ts         # 正则与 URL 匹配器
├── normalize.ts     # 上游 JSON → PlaylistOut 标准 Playlist / Track 转换
├── index.ts         # 统一导出 provider 实例
└── <vendor>.test.ts # 单元测试与 mock 验证
```

### 步骤 1：定义平台标识与元数据 (`provider.ts`)

实现 `MusicProvider` 接口：

```typescript
import type { MusicProvider, ProviderMeta, ProviderCapabilities } from '../types';
import type { Playlist, PlaylistRetrievalOptions } from '../../models/playlist';
import { matchesVendorInput, extractVendorId } from './input';
import { fetchVendorPlaylistRaw } from './client';
import { normalizeVendorPlaylist } from './normalize';

export const vendorMeta: ProviderMeta = {
  id: 'vendor_id',
  name: '厂商中文名',
  enName: 'Vendor Name',
  color: '#FF6600',
  homepage: 'https://music.vendor.com',
  isSelfPlatform: false,
};

export const vendorCapabilities: ProviderCapabilities = {
  singlePlaylist: true,
  userProfile: false,       // 若支持用户主页抓取则为 true
  numericIdDisambiguation: false, // 若存在纯数字 ID 冲突则为 true
  shortLinkResolution: true, // 若存在短链格式则为 true
};

export const vendorProvider: MusicProvider = {
  meta: vendorMeta,
  capabilities: vendorCapabilities,

  matchesInput(input: string): boolean {
    return matchesVendorInput(input);
  },

  async fetchPlaylist(input: string, options?: PlaylistRetrievalOptions): Promise<Playlist> {
    const rawData = await fetchVendorPlaylistRaw(input, options);
    return normalizeVendorPlaylist(rawData);
  },
};
```

### 步骤 2：注册到注册中枢 (`worker/src/providers/index.ts`)

在 `worker/src/providers/index.ts` 中注册新厂商实例：

```typescript
import { vendorProvider } from './<vendor-id>';

providerRegistry.register(vendorProvider);
```

### 步骤 3：在 platforms.ts 声明标识 (`worker/src/providers/platforms.ts`)

将新厂商 ID 追加到联合类型与列表：

```typescript
export const SUPPORTED_PLATFORMS = [
  'qqmusic',
  'netease',
  'kugou',
  'qishui',
  'kuwo',
  'migu',
  '<vendor-id>',
] as const;
```

**此时：**
- `GET /api/providers` 自动暴露新厂商元数据。
- `/api/playlist` 自动支持该厂商输入解析与分发。
- Worker 元数据管道 `defaultPlaylistPipeline` 自动为该厂商歌曲标定失效与 VIP 状态。
- `resolve-service.ts`、`playlist-service.ts`、`router.ts` **完全零改动**！

### 步骤 4：(可选) 接入 CLI 独立脚本 (`cli/<vendor-id>/`)

遵循 §11 CLI 独立性规范，脚本顶部引入自适应路径：

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.terminal import print_banner
from core.exporters import perform_export
from core.cli_runner import build_base_parser
```

---

## 2. 自动化验证与质量门禁

新增厂商后，运行以下门禁：
```bash
# 1. 验证 Provider 单元测试
npm test --workspace=worker

# 2. 运行项目全量 8 步 CI 门禁
npm run gate
```
门禁全部 100% 绿灯即表示接入成功！
