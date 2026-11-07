import React from 'react';
import { WashiTape, JournalSticker, MarkerBtn, InkCursor } from '../components/Stationery';
import { SIX_PLATFORMS } from './Act1DilemmaAndDebut';
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  lerp,
  rangeProgress,
  springPop,
} from '../utils/motion';

interface TrackRowSpec {
  index: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  vip: boolean;
  extraBadge?: string;
  status: 'playable' | 'paid' | 'unplayable';
  statusLabel: string;
  coverColor: string;
  coverEmoji: string;
}

export const DEMO_TRACKS: TrackRowSpec[] = [
  {
    index: '001',
    title: '過去を喰らう',
    artist: '花谱 (KAF)',
    album: '魔法 α (观测)',
    duration: '03:42',
    vip: true,
    status: 'playable',
    statusLabel: '正常',
    coverColor: '#dbeafe',
    coverEmoji: '🌌',
  },
  {
    index: '002',
    title: '魔法 (feat. 理芽)',
    artist: '花谱 / 理芽',
    album: '不可解弐 Q2',
    duration: '04:08',
    vip: false,
    status: 'playable',
    statusLabel: '正常',
    coverColor: '#fce7f3',
    coverEmoji: '✨',
  },
  {
    index: '003',
    title: 'パズル (Puzzle)',
    artist: '鎖那 (sana)',
    album: 'Hush a by little girl',
    duration: '04:15',
    vip: false,
    status: 'playable',
    statusLabel: '正常',
    coverColor: '#fef3c7',
    coverEmoji: '🧩',
  },
  {
    index: '004',
    title: 'Stella-rium',
    artist: '鹿乃 (Kano)',
    album: 'nowhere',
    duration: '04:51',
    vip: true,
    status: 'paid',
    statusLabel: '付费专辑',
    coverColor: '#f3e8ff',
    coverEmoji: '🌠',
  },
  {
    index: '005',
    title: '心臓と絡繰 (灰歌备份)',
    artist: '花谱 (KAF)',
    album: '观测 β',
    duration: '03:58',
    vip: false,
    status: 'unplayable',
    statusLabel: '下架/无版权',
    coverColor: '#e2e8f0',
    coverEmoji: '🕰️',
  },
  {
    index: '006',
    title: '夏休みの宿題 (Live)',
    artist: '鎖那 (sana)',
    album: 'Sana Live Collection',
    duration: '03:24',
    vip: false,
    extraBadge: '视频原声',
    status: 'playable',
    statusLabel: '正常',
    coverColor: '#dcfce7',
    coverEmoji: '🍃',
  },
];

export const Act2WebParsing: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 215 || frame > 588) return null;

  const enterFade = easeInOutCubic(rangeProgress(frame, 215, 232));
  const exitProg = easeInOutCubic(rangeProgress(frame, 556, 586));
  const exitFade = 1 - exitProg;

  // Timeline inside Act 2:
  // 235..262: Cursor moves to input & pastes URL
  // 272..295: Cursor moves to Parse button & clicks at frame 286
  // 295..325: Brief snappy loading state ("正在翻开歌单...")
  // 322..365: SearchNote docks smoothly upward while ResultPaper unfolds below!
  const urlPasted = frame >= 254;
  const pasteFlash = clamp01(1 - Math.abs(frame - 257) / 10);
  const isClickingParse = frame >= 284 && frame <= 293;
  const isLoading = frame >= 290 && frame < 328;

  const dockProg = easeInOutCubic(rangeProgress(frame, 320, 358));
  const resultPop = springPop(frame, 326, { damping: 14, stiffness: 130 });

  // SearchNote docks from top=214 to top=86 (compact scale) as ResultPaper unfolds
  const searchTop = lerp(214, 84, dockProg) - exitProg * 140;
  const searchScale = lerp(1, 0.84, dockProg);
  const heroTitleOpacity = clamp01(1 - dockProg * 1.8);

  // Cursor choreography
  let cursorX = 1150;
  let cursorY = 390;
  let cursorClick = false;
  let cursorLabel: string | undefined = undefined;
  let cursorOpacity = 1;

  if (frame < 260) {
    const p = easeInOutCubic(rangeProgress(frame, 222, 252));
    cursorX = lerp(1320, 760, p);
    cursorY = lerp(490, 316, p);
    cursorClick = frame >= 250 && frame <= 258;
    cursorLabel = frame < 254 ? '📋 粘贴歌单链接' : '✓ 已粘贴';
  } else if (frame < 315) {
    const p = easeInOutCubic(rangeProgress(frame, 262, 284));
    cursorX = lerp(760, 1455, p);
    cursorY = lerp(316, 316, p);
    cursorClick = isClickingParse;
    cursorLabel = isClickingParse ? '点击解析!' : undefined;
  } else if (frame < 540) {
    const p = easeInOutCubic(rangeProgress(frame, 345, 455));
    cursorX = lerp(1455, 680, p);
    cursorY = lerp(316, 652, p);
    cursorLabel = frame >= 445 && frame <= 515 ? '✨ 完整曲目与状态' : undefined;
  } else {
    cursorOpacity = 1 - rangeProgress(frame, 540, 565);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: Math.min(enterFade, exitFade) }}>
      {/* 1. Hero Title (fades gracefully upward as ResultPaper unfolds at frame 320) */}
      {heroTitleOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: 410,
            width: 1140,
            top: lerp(96, 36, dockProg),
            textAlign: 'center',
            opacity: heroTitleOpacity,
            zIndex: 25,
          }}
        >
          <div
            className="font-playful"
            style={{
              position: 'absolute',
              right: 28,
              top: -6,
              fontSize: 22,
              color: '#d97706',
              transform: 'rotate(-5deg)',
              fontWeight: 700,
            }}
          >
            无需注册 · 干净清爽 :)
          </div>
          <h1
            className="font-brush"
            style={{
              fontSize: 72,
              lineHeight: 1.15,
              color: '#2d3436',
              textShadow: '3px 3.5px 0 rgba(65, 48, 12, 0.22)',
              display: 'inline-block',
              position: 'relative',
            }}
          >
            <span>把你的 </span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              歌单带走
              <span
                style={{
                  position: 'absolute',
                  left: '-3%',
                  width: '106%',
                  bottom: 2,
                  height: 14,
                  backgroundColor: '#ffeaa7',
                  transform: 'rotate(-1deg)',
                  zIndex: -1,
                  borderRadius: 8,
                }}
              />
            </span>
          </h1>
        </div>
      )}

      {/* 2. Persistent Yellow Search Sticky Note (SearchNote.tsx) */}
      <div
        className="hand-border paper-textured shadow-sticky"
        style={{
          position: 'absolute',
          left: 410,
          top: searchTop,
          width: 1140,
          padding: dockProg > 0.5 ? '18px 30px 16px' : '28px 36px 26px',
          backgroundColor: '#fff8bd',
          transform: `scale(${searchScale}) rotate(0.35deg)`,
          transformOrigin: 'top center',
          zIndex: 35,
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -24,
            top: -32,
            color: '#eab308',
            fontSize: 42,
            zIndex: 25,
          }}
        >
          ✦
        </div>
        <WashiTape
          color="pink"
          rotateDeg={-12}
          width={118}
          height={26}
          style={{ position: 'absolute', top: -14, left: -16 }}
        />
        <WashiTape
          color="cyan"
          rotateDeg={6}
          width={118}
          height={26}
          style={{ position: 'absolute', bottom: -14, right: -18 }}
        />

        {/* Top Label Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div className="font-playful" style={{ fontSize: 25, fontWeight: 700, color: '#2d3436' }}>
            在这里粘贴歌单链接 ↓
          </div>
          <JournalSticker
            color="blue"
            rotateDeg={0.5}
            className="font-mono"
            style={{ fontSize: 13, padding: '4px 12px', color: '#1d4ed8' }}
          >
            跨平台公开歌单解析
          </JournalSticker>
        </div>

        {/* Input Box + Parse Button */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            className="hand-border-subtle"
            style={{
              flex: 1,
              height: 54,
              backgroundColor: pasteFlash > 0 ? '#fef9c3' : '#ffffff',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: urlPasted ? '#2563eb' : '#2d3436',
              boxShadow: urlPasted
                ? '0 0 0 3px rgba(37, 99, 235, 0.16)'
                : 'inset 2px 2px 0 rgba(45, 52, 54, 0.08)',
            }}
          >
            {urlPasted ? (
              <span
                className="font-mono"
                style={{ fontSize: 18.5, fontWeight: 700, color: '#1e293b', letterSpacing: '0.01em' }}
              >
                https://y.qq.com/n/ryqq/playlist/9140654872
              </span>
            ) : (
              <span style={{ fontSize: 18, color: '#8a8f92' }}>
                粘贴公开歌单链接、QQ 号或主页链接
              </span>
            )}
            {urlPasted && (
              <span
                className="font-mono"
                style={{
                  fontSize: 13,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid #86efac',
                  fontWeight: 700,
                }}
              >
                ✓ 自动识别：QQ 音乐
              </span>
            )}
          </div>

          <MarkerBtn
            variant="ink"
            rotateDeg={-1}
            pressed={isClickingParse}
            style={{ height: 54, padding: '0 32px' }}
          >
            {isLoading ? '解析中...' : '解析'}
          </MarkerBtn>
        </div>

        {/* 6 Supported Platform Stickers Row (Matches SearchNote.tsx) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'nowrap',
            marginTop: 14,
          }}
        >
          {SIX_PLATFORMS.map((p) => (
            <JournalSticker
              key={p.id}
              color={p.color}
              rotateDeg={p.targetStickerPos[2]}
              active={urlPasted && p.id === 'qqmusic'}
              className="font-playful"
              style={{
                fontSize: 15,
                padding: '5px 13px',
                backgroundColor: urlPasted && p.id === 'qqmusic' ? '#bbf7d0' : undefined,
              }}
            >
              {p.stickerLabel}
            </JournalSticker>
          ))}
        </div>

        {/* Snappy Loading Note (Frames 290-326) */}
        {isLoading && (
          <div
            className="font-playful"
            style={{
              marginTop: 12,
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              border: '1.5px dashed #2d3436',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 18,
              color: '#2d3436',
            }}
          >
            <span style={{ display: 'inline-block', transform: `rotate(${frame * 16}deg)` }}>♫</span>
            <span>正在翻开歌单 · 正在记下 104 首歌曲...</span>
          </div>
        )}
      </div>

      {/* 3. Unfolded ResultPaper + Right Stationery Capability Notes (Frames 326+) */}
      {frame >= 326 && (
        <div
          style={{
            position: 'absolute',
            left: 132,
            right: 52,
            top: 282 - exitProg * 95,
            display: 'grid',
            gridTemplateColumns: '1220px 1fr',
            gap: 26,
            alignItems: 'start',
            transform: `translateY(${(1 - resultPop) * 55}px) scale(${0.94 + 0.06 * resultPop})`,
            opacity: Math.min(1, resultPop),
            zIndex: 40,
          }}
        >
          {/* LEFT: Authentic ResultPaper Card (PlaylistSummary + TrackTable) */}
          <div
            className="hand-border paper-textured shadow-paper"
            style={{
              backgroundColor: '#ffffff',
              padding: '24px 30px 22px',
              position: 'relative',
            }}
          >
            {/* Green corner washi tape from ResultPaper.tsx */}
            <WashiTape
              color="green"
              rotateDeg={-5}
              width={110}
              height={24}
              style={{ position: 'absolute', top: -12, left: 22 }}
            />
            <div
              style={{
                position: 'absolute',
                right: 18,
                top: -28,
                color: '#94a3b8',
                fontSize: 38,
              }}
            >
              ⌇
            </div>

            {/* PlaylistSummary Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 16,
                borderBottom: '2px dashed #e2dacd',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* Hand-drawn Playlist Cover Box */}
                <div
                  className="hand-border-subtle shadow-cutout-sm"
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #fde68a 0%, #fbcfe8 55%, #bfdbfe 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'rotate(-2deg)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 34, lineHeight: 1 }}>♫</span>
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: '#2d3436' }}>
                    104 TRACKS
                  </span>
                </div>

                {/* Title & Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <JournalSticker
                      color="green"
                      rotateDeg={-1.5}
                      className="font-playful"
                      style={{ fontSize: 13.5, padding: '2px 10px' }}
                    >
                      QQ 音乐歌单
                    </JournalSticker>
                    <span className="font-mono" style={{ fontSize: 12.5, color: '#64748b' }}>
                      #日系 &nbsp;#VTuber &nbsp;#女声翻唱
                    </span>
                  </div>

                  <h2
                    className="font-sans"
                    style={{ fontSize: 26, fontWeight: 800, color: '#2d3436', lineHeight: 1.2 }}
                  >
                    花谱、鎖那、鹿乃 ˗ˋˏ♡ˎˊ˗
                  </h2>

                  <div
                    className="font-sans"
                    style={{
                      fontSize: 14,
                      color: '#576064',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <strong style={{ color: '#15803d' }}>共 104 首歌曲</strong>
                    <span>·</span>
                    <span>QQ 音乐</span>
                    <span>·</span>
                    <span>
                      创建者：<strong style={{ color: '#2d3436' }}>琴心月满</strong>
                    </span>
                    <span>·</span>
                    <span>总时长 7 小时 6 分钟</span>
                    <span>·</span>
                    <span>2.8万 次播放</span>
                  </div>
                </div>
              </div>

              {/* Right Action Stickers from PlaylistSummary.tsx */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <JournalSticker
                  color="white"
                  rotateDeg={-1}
                  className="font-playful"
                  style={{ fontSize: 14.5, padding: '6px 14px' }}
                >
                  在 QQ 音乐中查看 ↗
                </JournalSticker>
                <JournalSticker
                  color="yellow"
                  rotateDeg={1}
                  className="font-playful"
                  style={{ fontSize: 14.5, padding: '6px 14px' }}
                >
                  解析其他歌单
                </JournalSticker>
              </div>
            </div>

            {/* TrackTable Section */}
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span className="font-sans" style={{ fontSize: 16, fontWeight: 800, color: '#2d3436' }}>
                  歌曲列表 (104)
                </span>
                <span className="font-playful" style={{ fontSize: 15, color: '#059669', fontWeight: 700 }}>
                  ✓ 歌名 · 歌手 · 专辑 · 时长 · VIP与下架状态完整解析
                </span>
              </div>

              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 48px 1.3fr 1fr 1fr 74px 104px 72px',
                  alignItems: 'center',
                  padding: '7px 10px',
                  borderBottom: '2px dashed #e2dacd',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#7f868a',
                }}
              >
                <span style={{ textAlign: 'center' }}>#</span>
                <span>封面</span>
                <span>歌曲标题</span>
                <span>歌手</span>
                <span>专辑</span>
                <span style={{ textAlign: 'center' }}>VIP</span>
                <span style={{ textAlign: 'center' }}>状态</span>
                <span style={{ textAlign: 'right' }}>时长</span>
              </div>

              {/* Cascading Track Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {DEMO_TRACKS.map((tr, rIdx) => {
                  const rowStart = 352 + rIdx * 9;
                  const rowPop = easeOutBack(rangeProgress(frame, rowStart, rowStart + 18), 1.15);
                  const isHovered = rIdx === 1 && frame >= 435 && frame <= 535;
                  const isGreyed = tr.status === 'unplayable';

                  let statusBg = '#f0fdf4';
                  let statusFg = '#166534';
                  let statusBd = '#bbf7d0';
                  if (tr.status === 'unplayable') {
                    statusBg = '#fef2f2';
                    statusFg = '#991b1b';
                    statusBd = '#fecaca';
                  } else if (tr.status === 'paid') {
                    statusBg = '#f3e8ff';
                    statusFg = '#6b21a8';
                    statusBd = '#d8b4fe';
                  }

                  return (
                    <div
                      key={tr.index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 48px 1.3fr 1fr 1fr 74px 104px 72px',
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderRadius: 6,
                        borderBottom: '1px solid rgba(45, 52, 54, 0.08)',
                        backgroundColor: isHovered
                          ? 'rgba(254, 240, 138, 0.55)'
                          : isGreyed
                          ? 'rgba(241, 245, 249, 0.65)'
                          : 'transparent',
                        opacity: clamp01(rowPop) * (isGreyed ? 0.78 : 1),
                        transform: `translateX(${(1 - clamp01(rowPop)) * 32}px)`,
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{
                          textAlign: 'center',
                          fontSize: 13.5,
                          fontWeight: isHovered ? 700 : 500,
                          color: isHovered ? '#2d3436' : '#8a8f92',
                          transform: isHovered ? 'scale(1.15) rotate(-4deg)' : 'none',
                        }}
                      >
                        {tr.index}
                      </span>

                      <div>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 5,
                            backgroundColor: tr.coverColor,
                            border: '1.5px solid #2d3436',
                            boxShadow: isHovered ? '2px 2.5px 0 #2d3436' : '1px 1px 0 #2d3436',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                          }}
                        >
                          {tr.coverEmoji}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingRight: 8 }}>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: isGreyed ? '#64748b' : '#2d3436',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {tr.title}
                        </span>
                        {tr.extraBadge && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              flexShrink: 0,
                            }}
                          >
                            {tr.extraBadge}
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 14,
                          color: isGreyed ? '#94a3b8' : '#4b5563',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingRight: 8,
                        }}
                      >
                        {tr.artist}
                      </span>

                      <span
                        style={{
                          fontSize: 13.5,
                          color: isGreyed ? '#94a3b8' : '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingRight: 8,
                        }}
                      >
                        {tr.album}
                      </span>

                      <div style={{ textAlign: 'center' }}>
                        {tr.vip ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fcd34d',
                            }}
                          >
                            VIP
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: statusBg,
                            color: statusFg,
                            border: `1px solid ${statusBd}`,
                          }}
                        >
                          {tr.statusLabel}
                        </span>
                      </div>

                      <span
                        className="font-mono"
                        style={{
                          textAlign: 'right',
                          fontSize: 13.5,
                          color: '#7f868a',
                        }}
                      >
                        {tr.duration}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Authentic Stationery Callout Notes (Platform Nuances & Real Features) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Note 1: Status & Grey-Song Backup */}
            {frame >= 400 && (
              <div
                className="hand-border-alt paper-textured shadow-sticky"
                style={{
                  backgroundColor: '#fff8bd',
                  padding: '16px 20px',
                  transform: `scale(${springPop(frame, 400)}) rotate(1.4deg)`,
                  position: 'relative',
                }}
              >
                <WashiTape
                  color="pink"
                  rotateDeg={-8}
                  width={84}
                  height={20}
                  style={{ position: 'absolute', top: -10, left: 24 }}
                />
                <div className="font-playful" style={{ fontSize: 21, fontWeight: 700, color: '#2d3436', marginBottom: 6 }}>
                  📌 为什么需要备份歌单？
                </div>
                <div className="font-sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: '#374151', fontWeight: 600 }}>
                  自动标定 <strong style={{ color: '#92400e' }}>VIP专享</strong>、
                  <strong style={{ color: '#6b21a8' }}>付费专辑</strong> 与{' '}
                  <strong style={{ color: '#991b1b' }}>下架/无版权</strong> 曲目，防止喜欢的歌悄悄变灰消失。
                </div>
              </div>
            )}

            {/* Note 2: QiShui Dual Channel */}
            {frame >= 435 && (
              <div
                className="hand-border paper-textured shadow-sticky"
                style={{
                  backgroundColor: '#ecfccb',
                  padding: '16px 20px',
                  transform: `scale(${springPop(frame, 435)}) rotate(-1.2deg)`,
                  position: 'relative',
                }}
              >
                <WashiTape
                  color="green"
                  rotateDeg={6}
                  width={84}
                  height={20}
                  style={{ position: 'absolute', top: -10, right: 24 }}
                />
                <div className="font-playful" style={{ fontSize: 20, fontWeight: 700, color: '#365314', marginBottom: 6 }}>
                  ⚡ 汽水音乐 · 双解析通道
                </div>
                <div className="font-sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3f6212', fontWeight: 600 }}>
                  支持一键切换 <strong>「汽水官方解析（歌名规范）」</strong> 与{' '}
                  <strong>「抖音全量解析（含短视频原声与配乐）」</strong>。
                </div>
              </div>
            )}

            {/* Note 3: Kugou Preview & Local QR Unlock */}
            {frame >= 470 && (
              <div
                className="hand-border-alt paper-textured shadow-sticky"
                style={{
                  backgroundColor: '#e8f8ff',
                  padding: '16px 20px',
                  transform: `scale(${springPop(frame, 470)}) rotate(1.1deg)`,
                  position: 'relative',
                }}
              >
                <WashiTape
                  color="cyan"
                  rotateDeg={-6}
                  width={84}
                  height={20}
                  style={{ position: 'absolute', top: -10, left: 28 }}
                />
                <div className="font-playful" style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>
                  🔓 酷狗音乐 · 预览与扫码解锁
                </div>
                <div className="font-sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: '#1e40af', fontWeight: 600 }}>
                  普通歌单免登录公开预览前 10 首；使用手机酷狗 App 扫码即可安全解锁完整歌单（凭证仅存本地浏览器，概念版免登全量）。
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hand-drawn Ink Cursor */}
      <InkCursor
        x={cursorX}
        y={cursorY}
        clicking={cursorClick}
        label={cursorLabel}
        opacity={cursorOpacity}
      />
    </div>
  );
};
