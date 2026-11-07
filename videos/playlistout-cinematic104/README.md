# Playlist Out — 一张歌单的电影旅程 / Cinematic Journey V2

**104s · 1920×1080 · 30fps · Original 120 BPM soundtrack · React + TypeScript + Remotion composition**

这是独立的视频工程，**没有修改 Playlist Out 产品仓库**。基于上一版 104 秒宣传片重新导演：重点解决逐页 PPT 感、镜头之间缺少连续关系、互动细节不足、转场一模一样等问题。

## 文件清单

- `out/PlaylistOut_Cinematic_Journey104_1080p.mp4`：完整版视频，带原创合成器配乐和同步音效。
- `src/scene.ts`：**唯一的动画事实源**。3120 帧按时间确定性生成 SVG；镜头、书签、UI、轨迹均采用精确数值计算。
- `src/video.tsx`, `src/root.tsx`, `src/index.ts`：引用同一个场景函数的 Remotion / React 入口。
- `public/audio/playlistout-new-original-mix.wav`：104 秒配乐 + 转场 SFX 完整混音。
- `public/audio/music-stem.wav`、`sfx-stem.wav`：独立音乐 / 音效分轨。
- `scripts/generate_music.py`：原创 120 BPM 电子 Funk / Chiptune 音乐生成脚本。无商业歌曲采样。
- `scripts/render_full.py`：**已测试**的离线渲染路线（TypeScript SVG → CairoSVG → FFmpeg）。
- `scripts/quality_check.py`：3120 帧 SVG 结构检查、90 张关键帧抽检。
- `scripts/verify_video.py`：编码格式与视频规格验证。
- `previews/QA_contact_*.jpg`：交付截图； `docs/CINEMATIC_REVISION.md`：新版分镜与运动设计记录。

## 重要：真实产品功能边界

- 支持：QQ 音乐、网易云、酷狗、酷我、汽水、咪咕。酷狗普通歌单的免登录限制须按仓库说明理解。
- 已提供 MusicFree 可安装插件；已实现洛雪 / Listen 1 专用 JSON 文件导出，**不应等同于两款播放器内置原生集成**。
- Excel、JSON、CSV、TXT、M3U8、Markdown 已在 Web 导出代码中出现。
- Soundiiz 仅以**手动文件交接思路**展示，不保证目标工具直接兼容或自动匹配。
- 浏览器画面为参照源码绘制的 UI 动效，**并非真实在线解析与成功导入的录屏**。

## 如何继续编辑

安装 Node.js 20+ 和项目依赖，在正常可以访问 npm 的设备上执行：

```bash
npm install
npm run studio
npm run render
```

Remotion composition ID：`PlaylistOutFull104`。`src/scene.ts` 为共享场景源，时间轴按帧计算。**本次环境中 Remotion CLI 尚未得到原生运行验证**；所提供 MP4 使用相同 SVG 场景的已验证离线渲染路径生成，不伪称它由 Remotion CLI 编码。

用离线路线复现（机器需安装 TypeScript 编译器、FFmpeg、Python、cairosvg、numpy、Pillow、lxml）：

```bash
npm run make:audio
npm run compile:scene
node scripts/export_svg.cjs
python scripts/quality_check.py
python scripts/render_full.py
python scripts/verify_video.py
```

运行会创建 `.frames-svg/` 作为临时中间文件。全片共 3120 帧，CPU 计算量较高。打包时不包含这些临时文件，因为它们可从源码重建。

## 许可证与鸣谢

视频视觉代码按随附 `LICENSE`，原创合成器音乐使用 `public/audio/MUSIC_LICENSE.txt` 的宽松授权。Playlist Out 项目资料：

- https://github.com/LengxiQwQ/playlistout
- https://playlistout.lengxiqwq.com
