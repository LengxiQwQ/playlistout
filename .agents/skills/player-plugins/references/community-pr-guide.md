# Community PR Submission Template

Use this template when submitting PRs to aggregator repositories (e.g. `qwerwhr/musicfree-plugins`, `meerl/MusicFreePlugins`):

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
