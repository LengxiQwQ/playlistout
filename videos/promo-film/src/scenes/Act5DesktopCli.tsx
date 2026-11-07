import React from 'react';
import { WashiTape, JournalSticker } from '../components/Stationery';
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  rangeProgress,
  springPop,
  typewriterText,
} from '../utils/motion';

export const Act5DesktopCli: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1132 || frame > 1475) return null;

  const enterFade = easeInOutCubic(rangeProgress(frame, 1132, 1158));
  const exitProg = easeInOutCubic(rangeProgress(frame, 1445, 1472));
  const exitFade = 1 - exitProg;

  const termPop = springPop(frame, 1138, { damping: 14, stiffness: 130 });
  const leftCard1Pop = springPop(frame, 1146, { damping: 14, stiffness: 135 });
  const leftCard2Pop = springPop(frame, 1175, { damping: 14, stiffness: 135 });
  const outputFilesPop = springPop(frame, 1378, { damping: 13, stiffness: 145 });

  // Interactive CLI timeline:
  // 1165..1190: Type 'playlistout' -> show banner & 6 platforms
  // 1200..1245: Type/paste URL 'https://y.qq.com/n/ryqq/playlist/9140654872'
  // 1250..1310: Show recognition + playlist details + format menu
  // 1320..1355: Type '1, 2' at format prompt
  // 1360..1455: Show '正在导出...' + ✅ Excel & ✅ JSON
  const cmdTyped = typewriterText('playlistout', frame, 1155, 18);
  const showBanner = frame >= 1176;
  const urlTyped = typewriterText('https://y.qq.com/n/ryqq/playlist/9140654872', frame, 1200, 32);
  const showParsedDetails = frame >= 1242;
  const showFormatMenu = frame >= 1278;
  const fmtTyped = typewriterText('1, 2', frame, 1322, 18);
  const showExportSuccess = frame >= 1355;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: Math.min(enterFade, exitFade),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 132,
          right: 52,
          top: 92,
          display: 'grid',
          gridTemplateColumns: '550px 1fr',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Music Journal Stationery Cards for Cross-Platform CLI & Headless Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Card 1: Cross-Platform Standalone CLI */}
          <div
            className="hand-border paper-textured shadow-sticky"
            style={{
              backgroundColor: '#fff8bd',
              padding: '20px 24px',
              position: 'relative',
              transform: `translateY(${(1 - leftCard1Pop) * 35}px) scale(${0.92 + 0.08 * leftCard1Pop}) rotate(-1.1deg)`,
            }}
          >
            <WashiTape
              color="pink"
              rotateDeg={-10}
              width={105}
              height={24}
              style={{ position: 'absolute', top: -12, left: 20 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="font-playful" style={{ fontSize: 28, fontWeight: 700, color: '#2d3436' }}>
                💻 桌面 CLI 独立版
              </span>
              <JournalSticker color="blue" rotateDeg={1.5} className="font-mono" style={{ fontSize: 12, padding: '3px 9px' }}>
                OFFLINE CLI · v3.0.0
              </JournalSticker>
            </div>

            <div className="font-sans" style={{ fontSize: 14, color: '#374151', fontWeight: 600, lineHeight: 1.5, marginBottom: 12 }}>
              不依赖浏览器与线上 API，本地直接解析并导出六大平台歌单。支持<strong>双击零门槛交互向导</strong>与<strong>命令行批处理</strong>。
            </div>

            {/* OS Support Stickers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <JournalSticker color="green" rotateDeg={-0.8} className="font-sans" style={{ fontSize: 13, padding: '5px 11px' }}>
                  🪟 Windows x64 (.exe 单文件免安装)
                </JournalSticker>
                <JournalSticker color="white" rotateDeg={0.9} className="font-sans" style={{ fontSize: 13, padding: '5px 11px' }}>
                  🍎 macOS (Apple Silicon / Intel)
                </JournalSticker>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <JournalSticker color="yellow" rotateDeg={0.6} className="font-sans" style={{ fontSize: 13, padding: '5px 11px' }}>
                  🐧 Linux x64 (.tar.gz 独立包)
                </JournalSticker>
                <JournalSticker color="cyan" rotateDeg={-0.7} className="font-mono" style={{ fontSize: 12.5, padding: '5px 11px' }}>
                  📦 npm i -g playlistout
                </JournalSticker>
              </div>
            </div>
          </div>

          {/* Card 2: Command-Line Parameter Mode (Headless Automation) */}
          <div
            className="hand-border-alt paper-textured shadow-sticky"
            style={{
              backgroundColor: '#dff7ef',
              padding: '18px 22px',
              position: 'relative',
              transform: `translateY(${(1 - leftCard2Pop) * 35}px) scale(${0.92 + 0.08 * leftCard2Pop}) rotate(0.9deg)`,
            }}
          >
            <WashiTape
              color="green"
              rotateDeg={6}
              width={96}
              height={22}
              style={{ position: 'absolute', top: -11, right: 24 }}
            />
            <div className="font-playful" style={{ fontSize: 22, fontWeight: 700, color: '#115e59', marginBottom: 8 }}>
              ⚡ 命令行参数模式（脚本与自动化）
            </div>
            <div
              className="font-mono"
              style={{
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 8,
                border: '2px solid #2d3436',
                padding: '10px 12px',
                fontSize: 11.8,
                lineHeight: 1.55,
              }}
            >
              <div style={{ color: '#94a3b8' }}># 单歌单多格式静默导出</div>
              <div style={{ color: '#86efac', marginBottom: 6 }}>
                $ playlistout "https://music.163.com/..." -f xlsx,json
              </div>
              <div style={{ color: '#94a3b8' }}># 用户公开歌单全量批量导出</div>
              <div style={{ color: '#7dd3fc', marginBottom: 6 }}>
                $ playlistout "1160951354" -p qqmusic --user -f json
              </div>
              <div style={{ color: '#94a3b8' }}># 汽水音乐切换抖音原声通道</div>
              <div style={{ color: '#fde047' }}>
                $ playlistout "https://qishui..." --channel douyin
              </div>
            </div>
          </div>

          {/* Card 3: Popped-out Local Output Files (Frames 1378+, bridges into Act 6!) */}
          {frame >= 1375 && (
            <div
              className="hand-border paper-textured shadow-cutout"
              style={{
                backgroundColor: '#ffffff',
                padding: '14px 18px',
                transform: `scale(${outputFilesPop}) rotate(-0.8deg)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-playful" style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
                  📂 已自动保存至本地 output/ 目录：
                </span>
                <JournalSticker color="green" rotateDeg={-1} className="font-mono" style={{ fontSize: 11.5, padding: '2px 8px' }}>
                  Exit Code: 0
                </JournalSticker>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div
                  className="font-mono"
                  style={{
                    flex: 1,
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #15803d',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#14532d',
                  }}
                >
                  📊 【QQ 音乐】花谱、鎖那...xlsx
                </div>
                <div
                  className="font-mono"
                  style={{
                    flex: 1,
                    backgroundColor: '#eff6ff',
                    border: '2px solid #1d4ed8',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#1e3a8a',
                    boxShadow: '2px 2px 0 #1e3a8a',
                  }}
                >
                  🧩 【QQ 音乐】花谱、鎖那...json ↗
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Authentic Windows PowerShell Terminal (Matches Screenshot 1 / cli-interactive.jpg) */}
        <div
          className="hand-border"
          style={{
            backgroundColor: '#0c0c0c',
            borderRadius: '14px 120px 14px 120px / 120px 14px 120px 14px',
            border: '3.5px solid #2d3436',
            boxShadow: '9px 11px 0 rgba(45, 52, 54, 0.88)',
            overflow: 'hidden',
            position: 'relative',
            transform: `translateY(${(1 - termPop) * 40}px) scale(${0.94 + 0.06 * termPop}) rotate(0.4deg)`,
          }}
        >
          {/* Washi Tapes pinning the terminal window onto the notebook paper */}
          <WashiTape
            color="yellow"
            rotateDeg={-12}
            width={118}
            height={26}
            style={{ position: 'absolute', top: 6, right: 16, zIndex: 30 }}
          />

          {/* Windows Terminal Title Bar (from Screenshot 1) */}
          <div
            style={{
              backgroundColor: '#1f2428',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid #30363d',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  backgroundColor: '#0c0c0c',
                  padding: '6px 16px',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#f0f6fc',
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 6,
                }}
              >
                <span className="font-mono" style={{ color: '#38bdf8', fontWeight: 700 }}>{'>_'}</span>
                <span>Windows PowerShell</span>
                <span style={{ color: '#8b949e', marginLeft: 10 }}>×</span>
              </div>
              <span style={{ color: '#8b949e', fontSize: 16 }}>+ &nbsp;⌄</span>
            </div>
            <div style={{ display: 'flex', gap: 18, color: '#8b949e', fontSize: 13 }}>
              <span>─</span>
              <span>□</span>
              <span>✕</span>
            </div>
          </div>

          {/* Terminal Body (Exact replica of Screenshot 1 / cli/core/ui.py) */}
          <div
            className="font-mono"
            style={{
              padding: '18px 24px 20px',
              color: '#e6edf3',
              fontSize: 13.8,
              lineHeight: 1.48,
              minHeight: 790,
            }}
          >
            <div style={{ color: '#9ca3af' }}>Windows PowerShell</div>
            <div style={{ color: '#9ca3af', marginBottom: 10 }}>
              Copyright (C) Microsoft Corporation. All rights reserved.
            </div>

            {/* Command invocation */}
            <div>
              <span>PS C:\Users\LengxiQwQ&gt; </span>
              <span style={{ color: '#fde047', fontWeight: 700 }}>{cmdTyped}</span>
            </div>

            {showBanner && (
              <>
                <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  Playlist Out CLI v3.0.0
                </div>
                <div style={{ color: '#e6edf3' }}>把你的歌单带走 - 命令行版</div>
                <div style={{ marginTop: 8, color: '#d1d5db' }}>
                  你的歌单，不应该只困在一个音乐平台里。
                </div>
                <div style={{ color: '#d1d5db' }}>
                  解析、导出，并把歌单继续带进支持的开源播放器。
                </div>
                <div style={{ marginTop: 8, color: '#9ca3af', textDecoration: 'underline' }}>
                  作者：LengxiQwQ · GitHub 开源仓库 · 在线网页版
                </div>

                <div style={{ color: '#4b5563', margin: '8px 0' }}>
                  ────────────────────────────────────────────────────────────────
                </div>

                {/* 6 Numbered Platforms with exact ANSI colors from ui.py & Screenshot 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;1&nbsp;&nbsp;</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>网易云音乐&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>歌单链接 / 分享短链 / 歌单 ID / 用户 UID</span>
                  </div>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;2&nbsp;&nbsp;</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>QQ 音乐&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>歌单链接 / 分享短链 / 歌单 ID / 用户 QQ号</span>
                  </div>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;3&nbsp;&nbsp;</span>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>酷狗音乐&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>
                      歌单链接 / 分享短链 / 歌单 ID (普通版需登录，概念版免登全量)
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;4&nbsp;&nbsp;</span>
                    <span style={{ color: '#eab308', fontWeight: 700 }}>酷我音乐&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>歌单链接 / 分享短链 / 歌单 ID</span>
                  </div>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;5&nbsp;&nbsp;</span>
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>汽水音乐&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>歌单链接 / 抖音分享文案 / 歌单 ID</span>
                  </div>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;6&nbsp;&nbsp;</span>
                    <span style={{ color: '#ec4899', fontWeight: 700 }}>咪咕音乐&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span style={{ color: '#d1d5db' }}>歌单链接 / 分享短链 / 歌单 ID</span>
                  </div>
                </div>

                <div style={{ marginTop: 8, color: '#d1d5db' }}>
                  💡 直接粘贴链接或分享文案即可自动识别平台。
                </div>
                <div style={{ color: '#d1d5db', marginBottom: 8 }}>
                  💡 只有歌单 ID？先输入平台编号。
                </div>

                <div style={{ color: '#e6edf3' }}>粘贴歌单链接，或输入平台编号：</div>
                <div>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>&gt; </span>
                  <span style={{ color: '#f8fafc' }}>{urlTyped}</span>
                </div>
              </>
            )}

            {showParsedDetails && (
              <>
                <div style={{ color: '#4b5563', margin: '6px 0' }}>
                  ────────────────────────────────────────────────────────────────
                </div>
                <div>
                  <span>✅ </span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>已识别: QQ 音乐</span>
                </div>
                <div>
                  <span>🚀 </span>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>正在获取歌单...</span>
                </div>

                <div style={{ marginTop: 6 }}>
                  <span>🎵 </span>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>歌单详情</span>
                </div>
                <div style={{ color: '#e6edf3' }}>
                  &nbsp;&nbsp;歌单: 花谱、鎖那、鹿乃 ˗ˋˏ♡ˎˊ˗ &nbsp;·&nbsp; 作者: 琴心月满
                </div>
                <div style={{ color: '#e6edf3' }}>
                  &nbsp;&nbsp;歌曲: <span style={{ color: '#4ade80', fontWeight: 700 }}>104 首</span>
                  &nbsp;&nbsp;·&nbsp;&nbsp;时长: 7 小时 6 分钟 &nbsp;&nbsp;·&nbsp;&nbsp;状态:{' '}
                  <span style={{ color: '#facc15', fontWeight: 700 }}>VIP 2</span>
                </div>
              </>
            )}

            {showFormatMenu && (
              <>
                <div style={{ marginTop: 8 }}>
                  <span>📦 </span>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>导出格式</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, color: '#d1d5db' }}>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;1&nbsp;&nbsp;</strong>Excel (.xlsx) &nbsp;适合查看、整理和备份
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;2&nbsp;&nbsp;</strong>JSON &nbsp;(.json) &nbsp;适合第三方工具和程序导入
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;3&nbsp;&nbsp;</strong>CSV &nbsp;&nbsp;(.csv) &nbsp;&nbsp;适合表格软件和迁移工具
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;4&nbsp;&nbsp;</strong>TXT &nbsp;&nbsp;(.txt) &nbsp;&nbsp;简单的歌曲清单
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;5&nbsp;&nbsp;</strong>M3U8 &nbsp;(.m3u8) &nbsp;通用播放列表
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>&nbsp;&nbsp;Enter</strong> 全部导出 &nbsp;&nbsp;
                    <strong style={{ color: '#fff' }}>0</strong> 返回
                  </div>
                </div>

                <div style={{ marginTop: 6, color: '#e6edf3' }}>选择格式，可多选，例如 (1, 2)：</div>
                <div>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>&gt; </span>
                  <span style={{ color: '#fde047', fontWeight: 700 }}>{fmtTyped}</span>
                </div>
              </>
            )}

            {showExportSuccess && (
              <>
                <div style={{ color: '#4b5563', margin: '6px 0' }}>
                  ────────────────────────────────────────────────────────────────
                </div>
                <div>
                  <span>🚀 </span>
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>正在导出...</span>
                </div>
                <div style={{ color: '#4ade80', fontWeight: 700 }}>
                  &nbsp;&nbsp;✅ Excel &nbsp;【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx
                </div>
                <div style={{ color: '#60a5fa', fontWeight: 700 }}>
                  &nbsp;&nbsp;✅ JSON &nbsp;&nbsp;【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.json
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
