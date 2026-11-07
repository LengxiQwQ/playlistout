import React from 'react';
import { interpolate } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  MarkerHighlight,
  PaperCard,
  StickerBadge,
  WashiTape,
} from '../components/JournalPrimitives';

export const Act5DesktopCli: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1130 || frame > 1470) return null;

  const enterProg = smoothStep(frame, 1130, 1156, 0, 1);
  const exitProg = smoothStep(frame, 1445, 1468, 0, 1);
  const sceneOpacity = enterProg * (1 - exitProg);

  // Typing URL in CLI (Frames 1215..1255)
  const fullUrl = 'https://y.qq.com/n/ryqq/playlist/9140654872';
  const typedUrlLen = Math.round(
    interpolate(frame, [1215, 1255], [0, fullUrl.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const shownUrl = fullUrl.slice(0, typedUrlLen);

  // Typing format selection "1, 2" (Frames 1320..1338)
  const fullFmt = '1, 2';
  const typedFmtLen = Math.round(
    interpolate(frame, [1320, 1338], [0, fullFmt.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const shownFmt = fullFmt.slice(0, typedFmtLen);

  // Keep the terminal viewport completely steady so the entire CLI session stays visible without top-clipping
  const terminalInnerScrollY = 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        transform: `translateY(${(1 - enterProg) * 40 - exitProg * 45}px)`,
      }}
    >
      {/* Top Section Headline */}
      <div
        style={{
          position: 'absolute',
          left: 145,
          right: 60,
          top: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          opacity: smoothStep(frame, 1142, 1156, 0, 1) * (1 - smoothStep(frame, 1440, 1454, 0, 1)),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, whiteSpace: 'nowrap' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: FONTS.handwriting,
              fontSize: 42,
              fontWeight: 700,
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            不依赖浏览器：{' '}
            <MarkerHighlight frame={frame} startFrame={1148} color={COLORS.highlightYellow}>
              桌面 CLI 独立版
            </MarkerHighlight>{' '}
            本地直接运行
          </h2>
        </div>

        {/* Cross-Platform OS Stickers */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap' }}>
          <StickerBadge
            color="blue"
            rotateDeg={-1.2}
            style={{
              fontSize: 15,
              transform: `scale(${snappySpring(frame, 1165)}) rotate(-1.2deg)`,
            }}
          >
            🪟 Windows (.exe 单文件双击即用)
          </StickerBadge>
          <StickerBadge
            color="yellow"
            rotateDeg={1}
            style={{
              fontSize: 15,
              transform: `scale(${snappySpring(frame, 1175)}) rotate(1deg)`,
            }}
          >
            🍎 macOS (Apple Silicon & Intel)
          </StickerBadge>
          <StickerBadge
            color="green"
            rotateDeg={-0.8}
            style={{
              fontSize: 15,
              transform: `scale(${snappySpring(frame, 1185)}) rotate(-0.8deg)`,
            }}
          >
            🐧 Linux (x64)
          </StickerBadge>
        </div>
      </div>

      {/* Main Split Layout: Left = Steady Paper-Framed Terminal Window, Right = CLI Features & Automation Notes */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 60,
          top: 156,
          display: 'grid',
          gridTemplateColumns: '1.32fr 0.78fr',
          gap: 30,
          alignItems: 'stretch',
        }}
      >
        {/* ==================== LEFT: STEADY WINDOWS POWERSHELL / TERMINAL WINDOW ==================== */}
        <div
          style={{
            position: 'relative',
            transform: `scale(${0.94 + 0.06 * journalSpring(frame, 1140)})`,
          }}
        >
          {/* Yellow Washi Tape on Top Corners */}
          <WashiTape
            color="yellow"
            width={150}
            height={30}
            rotateDeg={-6}
            frame={frame}
            appearFrame={1152}
            style={{ position: 'absolute', top: -13, left: 36, zIndex: 30 }}
          />
          <WashiTape
            color="cyan"
            width={150}
            height={30}
            rotateDeg={5}
            frame={frame}
            appearFrame={1160}
            style={{ position: 'absolute', top: -13, right: 42, zIndex: 30 }}
          />

          <div
            style={{
              backgroundColor: COLORS.terminalBg,
              border: `3.5px solid ${COLORS.ink}`,
              borderRadius: 16,
              boxShadow: '8px 10px 0 #2d3436',
              overflow: 'hidden',
              height: 825,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Terminal Window Title Bar (Matches user's Windows PowerShell screenshot) */}
            <div
              style={{
                height: 50,
                backgroundColor: COLORS.terminalHeader,
                borderBottom: '2px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: '#1d4ed8',
                    color: '#fff',
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  &gt;_
                </span>
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  Windows PowerShell — Playlist Out CLI v3.0.0
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    color: '#94a3b8',
                  }}
                >
                  OFFLINE · LOCAL RUNTIME
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                </div>
              </div>
            </div>

            {/* Terminal Body (Steady outer frame, complete interactive flow) */}
            <div
              style={{
                padding: '18px 28px',
                fontFamily: FONTS.mono,
                fontSize: 18,
                lineHeight: 1.48,
                color: '#e2e8f0',
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `translateY(${terminalInnerScrollY}px)`,
                }}
              >
                {/* Step 1: Launch & Banner */}
                <div>
                  <span style={{ color: '#94a3b8' }}>PS C:\Users\LengxiQwQ&gt; </span>
                  <span style={{ color: COLORS.terminalAmber, fontWeight: 700 }}>playlistout</span>
                </div>
                <div style={{ marginTop: 2, color: COLORS.terminalAmber, fontWeight: 700, fontSize: 20 }}>
                  Playlist Out CLI v3.0.0 · 把你的歌单带走 - 命令行版
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 16.5 }}>
                  你的歌单，不应该只困在一个音乐平台里。解析、导出，并把歌单继续带进支持的开源播放器。
                </div>

                <div style={{ color: '#475569', margin: '6px 0' }}>
                  ────────────────────────────────────────────────────────────────
                </div>

                {/* 6-Platform Colored Menu (Exact colors from cli/core/ui.py) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px 24px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff' }}>1</strong>{' '}
                    <span style={{ color: COLORS.terminalRed, fontWeight: 700 }}>网易云音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>链接 / 短链 / ID / UID</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>2</strong>{' '}
                    <span style={{ color: COLORS.terminalGreen, fontWeight: 700 }}>QQ 音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>链接 / 短链 / ID / QQ号</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>3</strong>{' '}
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>酷狗音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>扫码全量 / 概念版免登</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>4</strong>{' '}
                    <span style={{ color: COLORS.terminalAmber, fontWeight: 700 }}>酷我音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>链接 / 短链 / 歌单 ID</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>5</strong>{' '}
                    <span style={{ color: COLORS.terminalCyan, fontWeight: 700 }}>汽水音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>链接 / 抖音分享文案</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>6</strong>{' '}
                    <span style={{ color: COLORS.terminalMagenta, fontWeight: 700 }}>咪咕音乐</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>链接 / 短链 / 歌单 ID</span>
                  </div>
                </div>

                {/* Step 2: Paste URL & Smart Detection */}
                {frame >= 1200 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: '#cbd5e1' }}>
                      💡 直接粘贴链接或分享文案即可自动识别平台：
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{ color: COLORS.terminalCyan, fontWeight: 700 }}>&gt; </span>
                      <span style={{ color: '#ffffff', fontWeight: 700 }}>{shownUrl}</span>
                      {frame < 1258 && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 20,
                            backgroundColor: COLORS.terminalCyan,
                            marginLeft: 4,
                            verticalAlign: 'middle',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Recognition + Playlist Details + Format Menu */}
                {frame >= 1262 && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px dashed #334155',
                      opacity: smoothStep(frame, 1262, 1275, 0, 1),
                    }}
                  >
                    <div>
                      <span>✅ </span>
                      <span style={{ color: COLORS.terminalGreen, fontWeight: 700 }}>
                        已识别: QQ 音乐
                      </span>
                      <span style={{ marginLeft: 24, color: COLORS.terminalCyan }}>
                        🚀 正在获取歌单...
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                        borderLeft: `4px solid ${COLORS.terminalCyan}`,
                        padding: '8px 16px',
                        borderRadius: '0 8px 8px 0',
                      }}
                    >
                      <div style={{ color: COLORS.terminalCyan, fontWeight: 700 }}>
                        🎵 歌单详情
                      </div>
                      <div style={{ display: 'flex', gap: 28, marginTop: 4, fontSize: 18 }}>
                        <span>歌单：<strong>花谱、鎖那、鹿乃 · 日系女声精选</strong></span>
                        <span>作者：<strong>琴心月满</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 28, marginTop: 2, fontSize: 18 }}>
                        <span>歌曲：<strong style={{ color: COLORS.terminalGreen }}>104 首</strong></span>
                        <span>时长：<strong>7 小时 6 分钟</strong></span>
                        <span>状态：<strong style={{ color: COLORS.terminalAmber }}>VIP 2</strong></span>
                      </div>
                    </div>

                    {/* Format Selection Menu */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: COLORS.terminalCyan, fontWeight: 700 }}>
                        📦 导出格式（可多选，直接回车全部导出）
                      </div>
                      <div style={{ display: 'flex', gap: 18, marginTop: 4, fontSize: 17.5 }}>
                        <span><strong>1</strong> Excel (.xlsx)</span>
                        <span><strong>2</strong> JSON (.json)</span>
                        <span><strong>3</strong> CSV (.csv)</span>
                        <span><strong>4</strong> TXT (.txt)</span>
                        <span><strong>5</strong> M3U8 (.m3u8)</span>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ color: '#94a3b8' }}>选择格式，可多选，例如 (1, 2): </span>
                        <span style={{ color: COLORS.terminalCyan, fontWeight: 700 }}>&gt; </span>
                        <span style={{ color: COLORS.terminalAmber, fontWeight: 700 }}>{shownFmt}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Export Complete */}
                {frame >= 1348 && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 18px',
                      backgroundColor: 'rgba(74, 222, 128, 0.12)',
                      border: `2px solid ${COLORS.terminalGreen}`,
                      borderRadius: 10,
                      opacity: smoothStep(frame, 1348, 1364, 0, 1),
                    }}
                  >
                    <div style={{ color: COLORS.terminalGreen, fontWeight: 700 }}>
                      ✅ Excel  output/【QQ 音乐】花谱、鎖那、鹿乃精选 - 琴心月满.xlsx
                    </div>
                    <div style={{ color: COLORS.terminalCyan, fontWeight: 700, marginTop: 4 }}>
                      ✅ JSON   output/【QQ 音乐】花谱、鎖那、鹿乃精选 - 琴心月满.json
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT: STATIONERY COMPANION CARDS ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, justifyContent: 'space-between' }}>
          {/* Card 1: Two Ways to Get CLI */}
          <PaperCard
            bg={COLORS.noteMint}
            cutoutShadow={true}
            rotateDeg={0.8}
            style={{
              padding: '22px 24px',
              transform: `scale(${0.9 + 0.1 * journalSpring(frame, 1160)}) rotate(0.8deg)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 16 }}>
                双获取方式 · 零门槛上手
              </StickerBadge>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#166534',
                  whiteSpace: 'nowrap',
                }}
              >
                Python 3.14 · PyInstaller
              </span>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: `2px solid ${COLORS.ink}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontFamily: FONTS.sans, fontSize: 17, fontWeight: 800, color: COLORS.ink }}>
                  🗂️ 免安装单文件（桌面双击即用）
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.inkLight, marginTop: 2 }}>
                  GitHub Releases 提供 Windows .exe、macOS .command 与 Linux 独立发行包，无需配置 Python 环境。
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#181c22',
                  border: `2px solid ${COLORS.ink}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: '#fde047',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚡ NPM 全局一键安装（终端玩家推荐）
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 17, color: '#4ade80', marginTop: 4 }}>
                  $ npm install -g playlistout
                </div>
              </div>
            </div>
          </PaperCard>

          {/* Card 2: Interactive Flow Highlights */}
          <PaperCard
            bg={COLORS.paperWhite}
            cutoutShadow={true}
            rotateDeg={-0.7}
            style={{
              padding: '20px 24px',
              transform: `scale(${0.9 + 0.1 * journalSpring(frame, 1220)}) rotate(-0.7deg)`,
            }}
          >
            <div style={{ fontFamily: FONTS.handwriting, fontSize: 28, fontWeight: 700, color: COLORS.ink }}>
              交互向导四步直达 ✦
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                fontFamily: FONTS.sans,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: frame >= 1160 ? '#fef3c7' : '#f8fafc',
                  border: `2px solid ${COLORS.ink}`,
                }}
              >
                ① 启动六大平台主菜单
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: frame >= 1215 ? '#dcfce7' : '#f8fafc',
                  border: `2px solid ${COLORS.ink}`,
                }}
              >
                ② 粘贴链接自动识别
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: frame >= 1315 ? '#dbeafe' : '#f8fafc',
                  border: `2px solid ${COLORS.ink}`,
                }}
              >
                ③ 多选格式 (1~5 / Enter)
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: frame >= 1350 ? '#fce7f3' : '#f8fafc',
                  border: `2px solid ${COLORS.ink}`,
                }}
              >
                ④ 自动打开 output 目录
              </div>
            </div>
          </PaperCard>

          {/* Card 3: Command-Line Script & Batch Automation Mode */}
          <PaperCard
            bg={COLORS.noteYellow}
            altBorder={true}
            cutoutShadow={true}
            rotateDeg={0.9}
            style={{
              padding: '20px 24px',
              transform: `scale(${0.9 + 0.1 * journalSpring(frame, 1330)}) rotate(0.9deg)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: FONTS.handwriting, fontSize: 27, fontWeight: 700, color: COLORS.ink }}>
                亦支持纯命令行自动化批处理：
              </span>
              <StickerBadge color="yellow" rotateDeg={1} font="mono" style={{ fontSize: 14, padding: '2px 10px' }}>
                Headless CLI
              </StickerBadge>
            </div>

            <div
              style={{
                marginTop: 10,
                backgroundColor: '#181c22',
                border: `2px solid ${COLORS.ink}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: FONTS.mono,
                fontSize: 14,
                lineHeight: 1.55,
                color: '#e2e8f0',
              }}
            >
              <div style={{ color: '#94a3b8' }}># 单歌单静默导出指定格式</div>
              <div style={{ color: '#fde047' }}>
                playlistout "https://music.163.com/..." -f xlsx,csv
              </div>
              <div style={{ color: '#94a3b8', marginTop: 4 }}># 用户公开歌单全量批量导出</div>
              <div style={{ color: '#86efac' }}>
                playlistout "1160951354" -p qqmusic --user -f json
              </div>
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  );
};
