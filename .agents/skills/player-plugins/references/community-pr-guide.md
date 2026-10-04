# Community Aggregator PR Submission Guide

This reference outlines the required format, tone, and verification steps when proposing or submitting PRs to external music player plugin repositories (e.g. `qwerwhr/musicfree-plugins`, `meerl/MusicFreePlugins`, `Huibq/keep-alive`).

## Core Principles

1. **Be Honest and Factual**:
   - Focus on what the plugin actually does: universal playlist parsing and cross-platform playlist migration into the player.
   - Do NOT boast with exaggerated marketing terms, sensationalist hype, or flame emojis.
   - NEVER make claims like "零版权风险" (Zero Copyright Risk). Developers know that playlist parsing interacts with public streaming platforms.
2. **Highlight Genuine Technical Strengths**:
   - **酷狗音乐 (Kugou)**: 攻克了免登录解析公开歌单的技术壁垒，解决了酷狗音乐歌单抓取通常需要登录和鉴权的痛点。
   - **网易云音乐 (NetEase)**: 支持免登录完整分页提取超过 1000+ 首超大歌单。
   - **QQ音乐 & 汽水音乐 (Qishui)**: 支持官方短链识别、APP 分享口令自动清洗与标准音轨提取。
   - **双模解析**: 支持在线 URL 解析，以及离线标准 PlaylistOut JSON 数据源直接转换为播放列表。
3. **Mobile Clipboard Invariant**:
   - Mobile React Native environments have a clipboard limit of ~2000 characters. Large playlist JSONs cannot be reliably pasted on mobile devices.
   - Recommend online URL parsing or `plugins.json` subscription for mobile devices.
   - Reserve direct JSON string pasting guidance strictly for Desktop environments.

---

## PR Description Template (Bilingual / Chinese)

```markdown
### 插件名称
把你的歌单带走 (PlaylistOut)

### 插件功能说明
- **多平台歌单直接解析**：支持直接粘贴 网易云音乐、QQ音乐、酷狗音乐、汽水音乐 等主流平台歌单链接或分享文本；
- **免登录特性攻克**：
  - 酷狗音乐：已攻克免登录解析机制，支持无需账号登录即可完整解析公开歌单；
  - 网易云音乐：支持超千首大歌单免登录分页完整获取；
  - 汽水音乐 / QQ音乐：支持客户端短链接与复杂分享文本自动提取；
- **支持导入模式**：
  - 在线导入：直接输入各平台歌单链接/分享文本（移动端与桌面端推荐）；
  - 离线导入：支持粘贴 PlaylistOut 导出的标准 JSON 数据直接转换为歌单（适合桌面端环境）；
- **音源匹配**：本插件专精于歌单数据解析与音轨元数据提取，音频播放交由播放器内置换源机制。

### 插件源与安装
- 插件安装直链：
  `https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js`
- 专属订阅源：
  `https://playlistout.lengxiqwq.com/plugins/musicfree/plugins.json`
- 开源仓库：
  https://github.com/LengxiQwQ/playlistout
```
