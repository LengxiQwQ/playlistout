import React from 'react';
import { interpolate } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  MarkerHighlight,
  PaperCard,
  PointerCursor,
  StickerBadge,
  WashiTape,
} from '../components/JournalPrimitives';

interface UserPlaylistCardItem {
  id: string;
  title: string;
  count: string;
  plays: string;
  icon: string;
  coverBg: string;
}

const USER_PLAYLISTS: UserPlaylistCardItem[] = [
  { id: '01', title: '花谱、鎖那、鹿乃 · 日系女声精选', count: '104 首', plays: '1.8万次播放', icon: '🌸', coverBg: '#fce7f3' },
  { id: '02', title: '2026 年度最爱听的 100 首歌', count: '100 首', plays: '3.2万次播放', icon: '🌟', coverBg: '#fef3c7' },
  { id: '03', title: '写代码专用 · 器乐后摇与数学摇滚', count: '156 首', plays: '9,420次播放', icon: '🎸', coverBg: '#dbeafe' },
  { id: '04', title: '周末兜风 · 城市流行 CityPop 漫游', count: '72 首', plays: '6,150次播放', icon: '🌇', coverBg: '#ffedd5' },
  { id: '05', title: '经典粤语黄金年代 · 珍藏金曲', count: '120 首', plays: '2.4万次播放', icon: '📻', coverBg: '#dcfce7' },
  { id: '06', title: '独立民谣 · 晚风与篝火 Live 集', count: '65 首', plays: '4,800次播放', icon: '🏕️', coverBg: '#f3e8ff' },
];

export const Act4BatchExport: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 845 || frame > 1158) return null;

  const enterProg = smoothStep(frame, 845, 870, 0, 1);
  const exitProg = smoothStep(frame, 1132, 1155, 0, 1);
  const sceneOpacity = enterProg * (1 - exitProg);

  const isExporting = frame >= 988 && frame < 1038;
  const isExportDone = frame >= 1030;
  const progressPct = Math.round(smoothStep(frame, 990, 1032, 1, 18));

  // Cursor clicks '一键打包导出选中歌单 (18)' at frame 988
  const cursorX = interpolate(
    frame,
    [880, 955, 988, 1045],
    [680, 520, 485, 1320],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cursorY = interpolate(
    frame,
    [880, 955, 988, 1045],
    [340, 815, 895, 520],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const isClicking = Math.abs(frame - 988) <= 4;

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
          opacity: smoothStep(frame, 858, 872, 0, 1) * (1 - smoothStep(frame, 1126, 1140, 0, 1)),
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
            不止一张歌单，{' '}
            <MarkerHighlight frame={frame} startFrame={862} color="#bbf7d0">
              整本音乐收藏册
            </MarkerHighlight>{' '}
            也能一键打包带走
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap' }}>
          <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 15, padding: '4px 12px' }}>
            QQ 号公开歌单批量
          </StickerBadge>
          <StickerBadge color="red" rotateDeg={1} style={{ fontSize: 15, padding: '4px 12px' }}>
            网易云 UID 公开歌单批量
          </StickerBadge>
          <StickerBadge color="blue" rotateDeg={-0.8} style={{ fontSize: 15, padding: '4px 12px' }}>
            酷狗个人云端歌单批量
          </StickerBadge>
        </div>
      </div>

      {/* Main Split Stage: Left = UserPlaylistsPaper (Selection), Right = Multi-Sheet Excel & ZIP Deliverables */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 60,
          top: 156,
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.95fr',
          gap: 32,
          alignItems: 'stretch',
        }}
      >
        {/* ==================== LEFT: USER PLAYLISTS COLLECTION BINDER ==================== */}
        <div
          style={{
            position: 'relative',
            transform: `scale(${0.92 + 0.08 * journalSpring(frame, 852)})`,
          }}
        >
          {/* Pink Corner Washi Tape (Exact match to UserPlaylistsPaper.tsx) */}
          <WashiTape
            color="pink"
            width={145}
            height={30}
            rotateDeg={-10}
            frame={frame}
            appearFrame={858}
            style={{ position: 'absolute', top: -12, left: -18, zIndex: 25 }}
          />

          <PaperCard bg="#ffffff" style={{ padding: '24px 28px', height: 825 }}>
            {/* Binder Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: 14,
                borderBottom: `2px dashed ${COLORS.line}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 16, padding: '3px 12px' }}>
                    QQ 音乐 · 歌单收藏册
                  </StickerBadge>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.inkLight }}>
                    QQ 号: 1160951354
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: FONTS.handwriting,
                    fontSize: 38,
                    fontWeight: 700,
                    color: COLORS.ink,
                    lineHeight: 1.15,
                  }}
                >
                  琴心月满 的音乐手账
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: FONTS.sans,
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.inkLight,
                  }}
                >
                  共 <strong style={{ color: COLORS.ink }}>18</strong> 个公开歌单 · 累计{' '}
                  <strong style={{ color: COLORS.ink }}>1,420</strong> 首歌曲
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: `2px solid ${COLORS.ink}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontFamily: FONTS.sans,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1d4ed8',
                  boxShadow: '2px 2px 0 #2d3436',
                }}
              >
                ✓ 已全选 (18 / 18)
              </div>
            </div>

            {/* 2x3 Playlist Selection Grid */}
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              {USER_PLAYLISTS.map((pl, idx) => {
                const checkFrame = 910 + idx * 9;
                const isChecked = frame >= checkFrame;
                const checkPop = isChecked ? snappySpring(frame, checkFrame) : 1;

                return (
                  <div
                    key={pl.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      backgroundColor: isChecked ? '#ffffff' : '#f8fafc',
                      border: `2px solid ${COLORS.ink}`,
                      borderRadius: 8,
                      boxShadow: isChecked ? '3px 3px 0 #2d3436' : '1px 1px 0 rgba(45,52,54,0.1)',
                      transform: `scale(${0.96 + 0.04 * checkPop})`,
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 5,
                        backgroundColor: isChecked ? '#16a34a' : '#ffffff',
                        border: `2px solid ${COLORS.ink}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {isChecked ? '✓' : ''}
                    </div>

                    {/* Cover */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 6,
                        backgroundColor: pl.coverBg,
                        border: `1.5px solid ${COLORS.ink}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      {pl.icon}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 16.5,
                          fontWeight: 700,
                          color: COLORS.ink,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {pl.title}
                      </div>
                      <div
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 14,
                          color: COLORS.inkLight,
                          marginTop: 2,
                        }}
                      >
                        {pl.count} · {pl.plays}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 10,
                textAlign: 'center',
                fontFamily: FONTS.handwriting,
                fontSize: 21,
                color: COLORS.inkLight,
              }}
            >
              + 其余 12 个公开歌单已同步勾选（单次最高支持 50 个歌单并发整理）
            </div>

            {/* Batch Export Control Panel (Exact match to UserPlaylistsPaper.tsx) */}
            <div
              style={{
                marginTop: 14,
                backgroundColor: '#f8fafc',
                border: `2.5px solid ${COLORS.ink}`,
                boxShadow: '3px 3px 0 #2d3436',
                borderRadius: 10,
                padding: '18px 22px',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.handwriting,
                  fontSize: 26,
                  fontWeight: 700,
                  color: COLORS.ink,
                  marginBottom: 10,
                }}
              >
                批量打包导出模式：
              </div>

              {/* Format Pills */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  { label: '✓ Excel 工作簿 (.xlsx / 多表合一)', active: true, bg: '#fed7aa' },
                  { label: '✓ ZIP 压缩包 (JSON / Excel / CSV / TXT / M3U8)', active: true, bg: '#bfdbfe' },
                ].map((b, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: `2px solid ${COLORS.ink}`,
                      backgroundColor: b.bg,
                      boxShadow: '2px 2px 0 #2d3436',
                      fontFamily: FONTS.sans,
                      fontSize: 16,
                      fontWeight: 700,
                      color: COLORS.ink,
                    }}
                  >
                    {b.label}
                  </div>
                ))}
              </div>

              {/* Action Button or Progress Bar */}
              {isExporting ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: `2px dashed ${COLORS.ink}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: FONTS.sans,
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#16a34a',
                      marginBottom: 8,
                    }}
                  >
                    <span>正在翻阅整理 [{progressPct}/18] 歌单合集...</span>
                    <span>{Math.round((progressPct / 18) * 100)}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 12,
                      backgroundColor: '#e2e8f0',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(progressPct / 18) * 100}%`,
                        height: '100%',
                        backgroundColor: '#22c55e',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      backgroundColor: isExportDone ? '#15803d' : COLORS.ink,
                      color: '#ffffff',
                      border: `3px solid ${COLORS.ink}`,
                      borderRadius: BORDERS.handDrawnAlt,
                      boxShadow: isClicking ? '1px 1px 0 #2d3436' : SHADOWS.cutoutSm,
                      padding: '10px 26px',
                      fontFamily: FONTS.sans,
                      fontSize: 20,
                      fontWeight: 800,
                      transform: isClicking ? 'translate(2px, 2px)' : 'none',
                    }}
                  >
                    {isExportDone
                      ? '✅ 批量导出完成：成功 18 / 18 个歌单'
                      : '📥 一键打包导出选中歌单 (18)'}
                  </div>
                  <span style={{ fontFamily: FONTS.handwriting, fontSize: 22, color: COLORS.inkLight }}>
                    一次操作 · 整本带走 ✦
                  </span>
                </div>
              )}
            </div>
          </PaperCard>
        </div>

        {/* ==================== RIGHT: DUAL BATCH DELIVERABLES (MULTI-SHEET EXCEL & ZIP) ==================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            justifyContent: 'center',
          }}
        >
          {/* Deliverable 1: Multi-Sheet Excel Workbook */}
          <div
            style={{
              position: 'relative',
              transform: `translateX(${(1 - journalSpring(frame, 1005)) * 60}px) scale(${0.88 + 0.12 * journalSpring(frame, 1005)}) rotate(0.8deg)`,
              opacity: smoothStep(frame, 995, 1020, 0, 1),
            }}
          >
            <WashiTape
              color="green"
              width={130}
              height={28}
              rotateDeg={-5}
              frame={frame}
              appearFrame={1015}
              style={{ position: 'absolute', top: -13, left: 32, zIndex: 25 }}
            />

            <PaperCard bg={COLORS.noteMint} cutoutShadow={true} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 18 }}>
                  方式 A · 多工作表 Excel 工作簿
                </StickerBadge>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 16,
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `2px solid ${COLORS.ink}`,
                  }}
                >
                  multi_sheet_xlsx
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontFamily: FONTS.sans,
                  fontSize: 26,
                  fontWeight: 800,
                  color: COLORS.ink,
                }}
              >
                📚 一册总览：所有歌单合订为单个 .xlsx
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontFamily: FONTS.sans,
                  fontSize: 17,
                  color: COLORS.inkLight,
                  fontWeight: 600,
                }}
              >
                每张歌单自动生成独立 Sheet 工作表，翻页即可浏览全部收藏：
              </div>

              {/* Fanning Worksheet Tabs Visual */}
              <div
                style={{
                  marginTop: 16,
                  backgroundColor: '#ffffff',
                  border: `2.5px solid ${COLORS.ink}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  boxShadow: 'inset 2px 2px 0 rgba(45,52,54,0.06)',
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 15,
                    color: '#15803d',
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  📄 【QQ 音乐歌单合集】琴心月满 - 共18个歌单_2026-11-07.xlsx
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { name: '01_花谱鎖那精选', bg: '#dcfce7' },
                    { name: '02_2026年度最爱', bg: '#fef3c7' },
                    { name: '03_写代码专用', bg: '#dbeafe' },
                    { name: '04_CityPop漫游', bg: '#fce7f3' },
                    { name: '+ 其余 14 张工作表...', bg: '#f1f5f9' },
                  ].map((tab, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        backgroundColor: tab.bg,
                        border: `2px solid ${COLORS.ink}`,
                        borderRadius: '6px 6px 2px 2px',
                        padding: '4px 10px',
                        fontFamily: FONTS.mono,
                        fontSize: 14,
                        fontWeight: 700,
                        color: COLORS.ink,
                      }}
                    >
                      {tab.name}
                    </span>
                  ))}
                </div>
              </div>
            </PaperCard>
          </div>

          {/* Deliverable 2: ZIP Archive Parcel */}
          <div
            style={{
              position: 'relative',
              transform: `translateX(${(1 - journalSpring(frame, 1030)) * 60}px) scale(${0.88 + 0.12 * journalSpring(frame, 1030)}) rotate(-0.8deg)`,
              opacity: smoothStep(frame, 1020, 1045, 0, 1),
            }}
          >
            <WashiTape
              color="yellow"
              width={130}
              height={28}
              rotateDeg={6}
              frame={frame}
              appearFrame={1040}
              style={{ position: 'absolute', top: -13, right: 36, zIndex: 25 }}
            />

            <PaperCard bg={COLORS.noteYellow} altBorder={true} cutoutShadow={true} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StickerBadge color="blue" rotateDeg={1} style={{ fontSize: 18 }}>
                  方式 B · ZIP 歌单合集压缩包
                </StickerBadge>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 16,
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `2px solid ${COLORS.ink}`,
                  }}
                >
                  .zip (JSON / XLSX / CSV / TXT / M3U8)
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontFamily: FONTS.sans,
                  fontSize: 26,
                  fontWeight: 800,
                  color: COLORS.ink,
                }}
              >
                📦 分档打包：18 份独立文件整齐归档
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontFamily: FONTS.sans,
                  fontSize: 17,
                  color: COLORS.inkLight,
                  fontWeight: 600,
                }}
              >
                包内每张歌单独立命名，同名文件自动追加 (2) 防覆盖：
              </div>

              {/* ZIP Contents Tree */}
              <div
                style={{
                  marginTop: 14,
                  backgroundColor: '#ffffff',
                  border: `2.5px solid ${COLORS.ink}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontFamily: FONTS.mono,
                  fontSize: 14.5,
                  color: COLORS.ink,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, color: '#b45309' }}>
                  🗜️ 【QQ 音乐歌单合集】琴心月满 - 共18个歌单 (JSON)_2026.zip
                </div>
                <div style={{ paddingLeft: 18, color: COLORS.inkLight }}>
                  ├─ 📄 花谱、鎖那、鹿乃精选 - 琴心月满.json
                </div>
                <div style={{ paddingLeft: 18, color: COLORS.inkLight }}>
                  ├─ 📄 2026 年度最爱听的 100 首歌 - 琴心月满.json
                </div>
                <div style={{ paddingLeft: 18, color: COLORS.inkLight }}>
                  └─ 📄 写代码专用 · 器乐后摇 - 琴心月满.json (+15 files)
                </div>
              </div>
            </PaperCard>
          </div>
        </div>
      </div>

      {/* Pointer Cursor */}
      {frame < 1035 && (
        <PointerCursor
          x={cursorX}
          y={cursorY}
          clicking={isClicking}
          frame={frame}
          clickFrame={988}
        />
      )}
    </div>
  );
};
