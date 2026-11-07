import React from 'react';
import { interpolate } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  PaperCard,
  PointerCursor,
  StickerBadge,
  WashiTape,
} from '../components/JournalPrimitives';

interface TrackRowData {
  idx: string;
  title: string;
  artist: string;
  album: string;
  vip: boolean;
  status: 'playable' | 'unplayable';
  statusText: string;
  duration: string;
  coverBg: string;
  coverIcon: string;
}

const SAMPLE_TRACKS: TrackRowData[] = [
  {
    idx: '01',
    title: '春日影 (Haruhikage)',
    artist: 'MyGO!!!!!',
    album: '跡暖空',
    vip: false,
    status: 'playable',
    statusText: '正常',
    duration: '04:18',
    coverBg: '#dbeafe',
    coverIcon: '🎸',
  },
  {
    idx: '02',
    title: '命に嫌われている。',
    artist: '花谱 (KAF)',
    album: '観測 α',
    vip: true,
    status: 'playable',
    statusText: '正常',
    duration: '04:32',
    coverBg: '#fce7f3',
    coverIcon: '🌸',
  },
  {
    idx: '03',
    title: 'どんな結末がお望みだい？',
    artist: '鎖那 (sana)',
    album: 'Hush a by little girl',
    vip: false,
    status: 'playable',
    statusText: '正常',
    duration: '03:54',
    coverBg: '#dcfce7',
    coverIcon: '🍀',
  },
  {
    idx: '04',
    title: '夜に駆ける (Acoustic Ver.)',
    artist: '鹿乃 (Kano)',
    album: 'yuanfen',
    vip: false,
    status: 'unplayable',
    statusText: '下架/无版权',
    duration: '04:21',
    coverBg: '#f3f4f6',
    coverIcon: '🌙',
  },
];

const STEPS = [
  { num: '①', label: '复制歌单链接', activeStart: 225 },
  { num: '②', label: '粘贴到输入框', activeStart: 268 },
  { num: '③', label: '点击「解析」', activeStart: 325 },
  { num: '④', label: '获取完整曲目列表', activeStart: 380 },
];

export const Act2WebParse: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 215 || frame > 588) return null;

  const enterOpacity = smoothStep(frame, 215, 232, 0, 1);
  const exitProg = smoothStep(frame, 562, 585, 0, 1);
  const sceneOpacity = enterOpacity * (1 - exitProg);

  // Camera pans up smoothly as ResultPaper unfolds at frame 375 while SearchNote fades out cleanly
  const cameraPanY = smoothStep(frame, 370, 406, 0, -248);
  const searchNoteOpacity = 1 - smoothStep(frame, 368, 392, 0, 1);
  const headerBarOpacity = smoothStep(frame, 232, 246, 0, 1) * (1 - smoothStep(frame, 554, 568, 0, 1));

  // Typing / Pasting URL inside PaperInput
  const urlText = 'https://y.qq.com/n/ryqq/playlist/9140654872';
  const isPasted = frame >= 272;
  const isParsing = frame >= 330 && frame < 376;
  const hasResult = frame >= 375;

  // Format toggle animation at bottom of ResultPaper
  const jsonChecked = frame >= 535;

  // Cursor trajectory across Act 2
  const cursorX = interpolate(
    frame,
    [230, 272, 295, 315, 330, 380, 515, 535, 558, 570],
    [480, 760, 860, 1455, 1455, 1620, 685, 685, 1485, 1485],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cursorY = interpolate(
    frame,
    [230, 272, 295, 315, 330, 380, 515, 535, 558, 570],
    [160, 255, 255, 255, 255, 480, 705, 705, 705, 705],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const isClicking =
    Math.abs(frame - 272) <= 4 ||
    Math.abs(frame - 330) <= 4 ||
    Math.abs(frame - 535) <= 4 ||
    Math.abs(frame - 570) <= 4;
  const activeClickFrame =
    frame >= 565 ? 570 : frame >= 530 ? 535 : frame >= 325 ? 330 : 272;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
      }}
    >
      {/* Top 4-Step Progress Strip (Pinned cleanly below header) */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 80,
          top: 82,
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
          zIndex: 60,
          opacity: headerBarOpacity,
        }}
      >
        {STEPS.map((st, i) => {
          const isActive = frame >= st.activeStart;
          const pop = isActive ? snappySpring(frame, st.activeStart) : 0.94;
          return (
            <React.Fragment key={st.num}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 18px',
                  borderRadius: 999,
                  border: `2.5px solid ${COLORS.ink}`,
                  backgroundColor: isActive ? COLORS.noteYellowDark : COLORS.paperWhite,
                  boxShadow: isActive ? '3px 3px 0 #2d3436' : '1px 1px 0 rgba(45,52,54,0.2)',
                  fontFamily: FONTS.sans,
                  fontSize: 19,
                  fontWeight: 700,
                  color: isActive ? COLORS.ink : COLORS.inkMuted,
                  transform: `scale(${0.92 + 0.08 * pop})`,
                }}
              >
                <span style={{ color: isActive ? COLORS.amber : COLORS.inkMuted }}>{st.num}</span>
                <span>{st.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    alignSelf: 'center',
                    fontFamily: FONTS.mono,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.inkMuted,
                  }}
                >
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Scrolling Notebook Stage (SearchNote + ResultPaper) */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 80,
          top: 138,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${cameraPanY}px) scale(${1 - exitProg * 0.06})`,
        }}
      >
        {/* ==================== 1. YELLOW SEARCH NOTE ==================== */}
        <div
          style={{
            width: 1180,
            backgroundColor: COLORS.noteYellow,
            border: `3px solid ${COLORS.ink}`,
            borderRadius: BORDERS.handDrawn,
            boxShadow: SHADOWS.paperWarm,
            padding: '26px 38px',
            position: 'relative',
            transform: 'rotate(0.25deg)',
            opacity: searchNoteOpacity,
            pointerEvents: 'none',
          }}
        >
          <WashiTape
            color="pink"
            width={130}
            height={28}
            rotateDeg={-7}
            style={{ position: 'absolute', top: -14, left: 42 }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.handwriting,
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.ink,
              }}
            >
              在这里粘贴歌单链接 ↓
            </span>
            <span
              style={{
                backgroundColor: '#eff6ff',
                border: `2px solid ${COLORS.ink}`,
                borderRadius: BORDERS.handDrawnSubtle,
                boxShadow: '2px 2px 0 #2d3436',
                padding: '3px 14px',
                fontFamily: FONTS.mono,
                fontSize: 16,
                fontWeight: 700,
                color: '#1d4ed8',
              }}
            >
              支持长链 / 短链 / 分享文案 / 纯数字 ID
            </span>
          </div>

          {/* Flying Clipboard Slip before paste (Frames 235..272) */}
          {frame >= 232 && frame < 276 && (
            <div
              style={{
                position: 'absolute',
                left: interpolate(frame, [232, 270], [180, 60], { extrapolateRight: 'clamp' }),
                top: interpolate(frame, [232, 270], [-42, 74], { extrapolateRight: 'clamp' }),
                backgroundColor: '#dcfce7',
                border: `2.5px solid ${COLORS.ink}`,
                borderRadius: 10,
                boxShadow: '4px 4px 0 #2d3436',
                padding: '6px 16px',
                fontFamily: FONTS.mono,
                fontSize: 18,
                fontWeight: 700,
                color: '#166534',
                zIndex: 80,
                transform: `rotate(${interpolate(frame, [232, 270], [-6, 0])}deg)`,
              }}
            >
              📋 已复制：{urlText}
            </div>
          )}

          {/* PaperInput + MarkerButton */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                height: 62,
                backgroundColor: COLORS.paperWhite,
                border: `3px solid ${isPasted ? COLORS.qqGreen : COLORS.ink}`,
                borderRadius: BORDERS.handDrawnSubtle,
                boxShadow: isPasted
                  ? '0 0 0 4px rgba(5, 150, 105, 0.16)'
                  : 'inset 2px 2px 0 rgba(45,52,54,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 22px',
              }}
            >
              {isPasted ? (
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.ink,
                  }}
                >
                  {urlText}
                </span>
              ) : (
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 21,
                    color: COLORS.inkMuted,
                  }}
                >
                  粘贴公开歌单链接、QQ 号或主页链接
                </span>
              )}

              {isPasted && (
                <span
                  style={{
                    backgroundColor: COLORS.qqBg,
                    border: `2px solid ${COLORS.qqGreen}`,
                    color: COLORS.qqGreen,
                    borderRadius: 6,
                    padding: '2px 10px',
                    fontFamily: FONTS.sans,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  ✓ 自动识别：QQ 音乐
                </span>
              )}
            </div>

            <div
              style={{
                height: 62,
                padding: '0 36px',
                backgroundColor: isParsing ? COLORS.amber : COLORS.ink,
                color: COLORS.paperWhite,
                border: `3px solid ${COLORS.ink}`,
                borderRadius: BORDERS.handDrawnAlt,
                boxShadow:
                  Math.abs(frame - 330) <= 4 ? '1px 1px 0 #2d3436' : SHADOWS.cutoutSm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.handwriting,
                fontSize: 28,
                fontWeight: 700,
                transform:
                  Math.abs(frame - 330) <= 4
                    ? 'translate(3px, 3px) rotate(-1deg)'
                    : 'rotate(-1deg)',
              }}
            >
              {isParsing ? '解析中...' : '解析'}
            </div>
          </div>

          {/* 6 Platform Stickers Row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 17, padding: '4px 12px' }}>
              QQ 音乐（可批量）
            </StickerBadge>
            <StickerBadge color="red" rotateDeg={1} style={{ fontSize: 17, padding: '4px 12px' }}>
              网易云音乐（可批量）
            </StickerBadge>
            <StickerBadge color="lime" rotateDeg={-0.8} style={{ fontSize: 17, padding: '4px 12px' }}>
              汽水音乐（官方 / 抖音原声双通道）
            </StickerBadge>
            <StickerBadge color="yellow" rotateDeg={0.6} style={{ fontSize: 17, padding: '4px 12px' }}>
              酷我音乐
            </StickerBadge>
            <StickerBadge color="pink" rotateDeg={-0.6} style={{ fontSize: 17, padding: '4px 12px' }}>
              咪咕音乐
            </StickerBadge>
            <StickerBadge color="blue" rotateDeg={1} style={{ fontSize: 17, padding: '4px 12px' }}>
              酷狗音乐（扫码解锁全量）
            </StickerBadge>
          </div>
        </div>

        {/* Loading Note (Frames 332..375) */}
        {isParsing && (
          <div
            style={{
              marginTop: 28,
              backgroundColor: COLORS.paperCream,
              border: `3px dashed ${COLORS.ink}`,
              borderRadius: BORDERS.handDrawnSubtle,
              boxShadow: SHADOWS.cutoutSm,
              padding: '18px 36px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontFamily: FONTS.handwriting,
              fontSize: 30,
              color: COLORS.ink,
              transform: `scale(${journalSpring(frame, 332)}) rotate(-0.8deg)`,
            }}
          >
            <span style={{ fontSize: 32 }}>📖</span>
            <span>正在翻开歌单... 正在记下 104 首歌曲与可用状态...</span>
          </div>
        )}

        {/* ==================== 2. RESULT PAPER (Frames 375..585) ==================== */}
        {hasResult && (
          <div
            style={{
              marginTop: 22,
              width: 1260,
              transform: `scale(${0.9 + 0.1 * journalSpring(frame, 375)})`,
              transformOrigin: 'top center',
              position: 'relative',
            }}
          >
            {/* Green Corner Washi Tape (Exact match to ResultPaper.tsx) */}
            <WashiTape
              color="green"
              width={135}
              height={30}
              rotateDeg={-5}
              frame={frame}
              appearFrame={378}
              style={{ position: 'absolute', top: -14, left: 28, zIndex: 30 }}
            />

            <PaperCard bg={COLORS.paperWhite} style={{ padding: '26px 34px' }}>
              {/* A. Playlist Summary Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 18,
                  borderBottom: `2px dashed ${COLORS.line}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                  {/* Cover Art */}
                  <div
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #fde68a 0%, #fca5a5 52%, #c4b5fd 100%)',
                      border: `3px solid ${COLORS.ink}`,
                      boxShadow: SHADOWS.cutoutSm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 42,
                      transform: 'rotate(-2deg)',
                    }}
                  >
                    🎧
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <StickerBadge color="green" rotateDeg={-1.5} style={{ fontSize: 17, padding: '3px 12px' }}>
                        QQ 音乐歌单
                      </StickerBadge>
                      <span
                        style={{
                          fontFamily: FONTS.mono,
                          fontSize: 16,
                          color: COLORS.inkLight,
                          backgroundColor: 'rgba(45,52,54,0.06)',
                          padding: '2px 10px',
                          borderRadius: 6,
                        }}
                      >
                        #日系女声 #ACG #深夜循环
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 30,
                        fontWeight: 800,
                        color: COLORS.ink,
                      }}
                    >
                      花谱、鎖那、鹿乃 · 日系女声精选集
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: FONTS.sans,
                        fontSize: 18,
                        color: COLORS.inkLight,
                        display: 'flex',
                        gap: 10,
                      }}
                    >
                      <strong style={{ color: COLORS.ink }}>共 104 首歌曲</strong>
                      <span>·</span>
                      <span>创建者：琴心月满</span>
                      <span>·</span>
                      <span>总时长：7 小时 6 分钟</span>
                      <span>·</span>
                      <span style={{ color: COLORS.amber, fontWeight: 700 }}>自动标定 VIP / 下架状态</span>
                    </div>
                  </div>
                </div>

                {/* Callout Stamp */}
                <div
                  style={{
                    backgroundColor: COLORS.noteMint,
                    border: `2.5px solid ${COLORS.ink}`,
                    borderRadius: BORDERS.handDrawnSubtle,
                    boxShadow: SHADOWS.sticker,
                    padding: '10px 18px',
                    transform: 'rotate(1.8deg)',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ fontFamily: FONTS.handwriting, fontSize: 24, fontWeight: 700, color: '#166534' }}>
                    ✓ 全量 104 首秒级解析
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: COLORS.inkLight }}>
                    包含封面 · 专辑 · 时长 · ISRC
                  </div>
                </div>
              </div>

              {/* B. TrackTable (Crisp, large & readable) */}
              <div style={{ marginTop: 14 }}>
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 56px 1.6fr 1.1fr 1.2fr 90px 130px 80px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: `2px dashed ${COLORS.line}`,
                    fontFamily: FONTS.sans,
                    fontSize: 17,
                    fontWeight: 700,
                    color: COLORS.inkMuted,
                  }}
                >
                  <span>#</span>
                  <span>封面</span>
                  <span>歌曲标题</span>
                  <span>歌手</span>
                  <span>专辑</span>
                  <span style={{ textAlign: 'center' }}>VIP</span>
                  <span style={{ textAlign: 'center' }}>状态</span>
                  <span style={{ textAlign: 'right' }}>时长</span>
                </div>

                {/* Table Rows */}
                {SAMPLE_TRACKS.map((tr, idx) => {
                  const rowStart = 398 + idx * 14;
                  const rowProg = journalSpring(frame, rowStart);
                  const isUnplayable = tr.status === 'unplayable';

                  // Lift-off animation when clicking Export at frame 570
                  const liftY = smoothStep(frame, 570, 585, 0, -24 - idx * 8);

                  return (
                    <div
                      key={tr.idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '56px 56px 1.6fr 1.1fr 1.2fr 90px 130px 80px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(45, 52, 54, 0.08)',
                        backgroundColor: isUnplayable ? 'rgba(243, 244, 246, 0.65)' : '#ffffff',
                        opacity: Math.min(1, Math.max(0, (frame - rowStart) / 8)) * (isUnplayable ? 0.78 : 1),
                        transform: `translateY(${(1 - rowProg) * 18 + liftY}px)`,
                      }}
                    >
                      <span style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 700, color: COLORS.inkMuted }}>
                        {tr.idx}
                      </span>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 6,
                          backgroundColor: tr.coverBg,
                          border: `1.5px solid ${COLORS.ink}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        {tr.coverIcon}
                      </div>
                      <span
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 20,
                          fontWeight: 700,
                          color: isUnplayable ? '#6b7280' : COLORS.ink,
                        }}
                      >
                        {tr.title}
                      </span>
                      <span style={{ fontFamily: FONTS.sans, fontSize: 19, color: COLORS.inkLight }}>
                        {tr.artist}
                      </span>
                      <span style={{ fontFamily: FONTS.sans, fontSize: 18, color: COLORS.inkMuted }}>
                        {tr.album}
                      </span>
                      <div style={{ textAlign: 'center' }}>
                        {tr.vip ? (
                          <span
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1.5px solid #f59e0b',
                              borderRadius: 6,
                              padding: '2px 10px',
                              fontFamily: FONTS.mono,
                              fontSize: 15,
                              fontWeight: 700,
                            }}
                          >
                            VIP
                          </span>
                        ) : (
                          <span style={{ color: COLORS.inkMuted }}>—</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: isUnplayable ? '#fef2f2' : '#f0fdf4',
                            color: isUnplayable ? '#991b1b' : '#166534',
                            border: `1.5px solid ${isUnplayable ? '#fecaca' : '#bbf7d0'}`,
                            borderRadius: 6,
                            padding: '3px 12px',
                            fontFamily: FONTS.sans,
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                        >
                          {tr.statusText}
                        </span>
                      </div>
                      <span
                        style={{
                          textAlign: 'right',
                          fontFamily: FONTS.mono,
                          fontSize: 18,
                          color: COLORS.inkLight,
                        }}
                      >
                        {tr.duration}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* C. ExportToolbar (Exact match to ExportToolbar.tsx) */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: `2px dashed ${COLORS.line}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
                  <span
                    style={{
                      fontFamily: FONTS.handwriting,
                      fontSize: 25,
                      fontWeight: 700,
                      color: COLORS.ink,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    选择导出格式（可多选）：
                  </span>
                  <StickerBadge color="green" rotateDeg={-1} checked={true} font="mono" style={{ fontSize: 17 }}>
                    Excel (.xlsx)
                  </StickerBadge>
                  <StickerBadge
                    color="blue"
                    rotateDeg={1.5}
                    checked={jsonChecked}
                    font="mono"
                    style={{
                      fontSize: 17,
                      transform:
                        Math.abs(frame - 535) <= 5 ? 'scale(1.12) rotate(1.5deg)' : 'rotate(1.5deg)',
                    }}
                  >
                    JSON
                  </StickerBadge>
                  <StickerBadge color="yellow" rotateDeg={-1.5} checked={false} font="mono" style={{ fontSize: 17 }}>
                    TXT
                  </StickerBadge>
                  <StickerBadge color="pink" rotateDeg={1} checked={false} font="mono" style={{ fontSize: 17 }}>
                    CSV
                  </StickerBadge>
                  <StickerBadge color="purple" rotateDeg={-1} checked={false} font="mono" style={{ fontSize: 17 }}>
                    M3U8
                  </StickerBadge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'nowrap' }}>
                  <span
                    style={{
                      fontFamily: FONTS.handwriting,
                      fontSize: 24,
                      color: COLORS.inkLight,
                      transform: 'rotate(-2deg)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    把歌单带走 →
                  </span>
                  <div
                    style={{
                      backgroundColor: COLORS.ink,
                      color: COLORS.paperWhite,
                      border: `3px solid ${COLORS.ink}`,
                      borderRadius: BORDERS.handDrawnAlt,
                      boxShadow:
                        Math.abs(frame - 570) <= 5 ? '1px 1px 0 #2d3436' : SHADOWS.cutoutSm,
                      padding: '8px 26px',
                      fontFamily: FONTS.handwriting,
                      fontSize: 25,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      transform:
                        Math.abs(frame - 570) <= 5
                          ? 'translate(3px, 3px) rotate(-1deg)'
                          : 'rotate(-1deg)',
                    }}
                  >
                    {jsonChecked ? '导出 (2) ↓' : '导出 (Excel) ↓'}
                  </div>
                </div>
              </div>
            </PaperCard>
          </div>
        )}
      </div>

      {/* Animated Hand-Drawn Pointer Cursor */}
      <PointerCursor
        x={cursorX}
        y={cursorY}
        clicking={isClicking}
        frame={frame}
        clickFrame={activeClickFrame}
      />
    </div>
  );
};
