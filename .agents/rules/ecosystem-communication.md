---
description: Communication standards, PR submission guidelines, and copy invariants
trigger: always_on
---
# Ecosystem Communication & Copywriting Rules

When drafting user-facing documentation, README files, or Pull Request descriptions for third-party plugin repositories (e.g. `qwerwhr/musicfree-plugins`, `meerl/MusicFreePlugins`), the agent MUST follow these strict rules:

## Mandatory Invariants:

1. **No "Zero Copyright Risk" Fluff**:
   - Open source developers understand how playlist metadata extraction works.
   - NEVER claim "零版权风险" (Zero Copyright Risk) or lecture upstream developers about copyright.
   - Focus strictly on technical capabilities: playlist parsing, metadata formatting, and export.

2. **Technical Honesty & Modest Tone**:
   - Avoid aggressive marketing gimmicks, excessive emojis (🔥, 🚀), buzzwords ("完美告别"), or exaggerated claims.
   - Do not demean the project, nor falsely elevate it. Present technical breakthroughs objectively.
   - Genuine technical points to highlight:
     - **酷狗音乐 (Kugou)**: 免登录解析公开歌单与全量歌曲（解决大部分工具必须登录才能解析歌单的痛点）。
     - **网易云音乐 (NetEase)**: 免登录完整分页获取超千首大歌单。
     - **汽水音乐 & QQ音乐**: 支持客户端短链接识别与分享口令清洗提取。
     - **双模解析**: 支持在线 URL 解析，以及离线标准 JSON 数据导入。

3. **Mobile Clipboard Limitation Invariant**:
   - **CRITICAL**: Mobile React Native and Webview clipboards have an operating system / framework truncation limit (~2000 characters). Large playlist JSON strings CANNOT be pasted on mobile devices.
   - **NEVER** instruct, suggest, or advertise that mobile users can paste raw JSON text into the player app.
   - In documentation and PRs, explicitly distinguish:
     - **移动端**: 推荐使用在线链接解析或订阅源导入 (`plugins.json`)；
     - **桌面端**: 支持直接粘贴 PlaylistOut 导出的离线 JSON 字符串。
