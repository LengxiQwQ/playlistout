import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, floatOffset } from '../utils/motion';
import { MarkerHighlight, StickerBadge, WashiTape, type StickerColor } from '../components/JournalPrimitives';

interface PlatformIsland {
  id: string;
  name: string;
  stickerLabel: string;
  stickerColor: StickerColor;
  bg: string;
  accent: string;
  playlistTitle: string;
  trackCount: string;
  painTag: string;
  // Grid position in Phase 1A (0..115)
  gridX: number;
  gridY: number;
  rot: number;
  // Target sticker position inside SearchNote in Phase 1B (130..240)
  targetX: number;
  targetY: number;
}

const ISLANDS: PlatformIsland[] = [
  {
    id: 'qq',
    name: 'QQ 音乐',
    stickerLabel: 'QQ 音乐（可批量）',
    stickerColor: 'green',
    bg: COLORS.qqBg,
    accent: COLORS.qqGreen,
    playlistTitle: '《花谱、鎖那、鹿乃精选》',
    trackCount: '104 首',
    painTag: '换软件搬不走?',
    gridX: 210,
    gridY: 225,
    rot: -2.2,
    targetX: 468,
    targetY: 502,
  },
  {
    id: 'netease',
    name: '网易云音乐',
    stickerLabel: '网易云音乐（可批量）',
    stickerColor: 'red',
    bg: COLORS.neteaseBg,
    accent: COLORS.neteaseRed,
    playlistTitle: '《后摇与数学摇滚精选》',
    trackCount: '328 首',
    painTag: '千首歌单被截断?',
    gridX: 745,
    gridY: 215,
    rot: 1.5,
    targetX: 654,
    targetY: 502,
  },
  {
    id: 'kugou',
    name: '酷狗音乐',
    stickerLabel: '酷狗音乐（可批量）',
    stickerColor: 'blue',
    bg: COLORS.kugouBg,
    accent: COLORS.kugouBlue,
    playlistTitle: '《车载经典粤语金曲》',
    trackCount: '86 首',
    painTag: '云端歌单难导出?',
    gridX: 1280,
    gridY: 230,
    rot: -1.6,
    targetX: 864,
    targetY: 502,
  },
  {
    id: 'kuwo',
    name: '酷我音乐',
    stickerLabel: '酷我音乐',
    stickerColor: 'yellow',
    bg: COLORS.kuwoBg,
    accent: COLORS.kuwoYellow,
    playlistTitle: '《独立民谣 · 晚风集》',
    trackCount: '64 首',
    painTag: '缺少本地备份?',
    gridX: 225,
    gridY: 575,
    rot: 1.8,
    targetX: 1054,
    targetY: 502,
  },
  {
    id: 'qishui',
    name: '汽水音乐',
    stickerLabel: '汽水音乐',
    stickerColor: 'lime',
    bg: COLORS.qishuiBg,
    accent: COLORS.qishuiLime,
    playlistTitle: '《抖音宝藏 BGM 原声》',
    trackCount: '142 首',
    painTag: '短链原声难提取?',
    gridX: 755,
    gridY: 585,
    rot: -1.4,
    targetX: 1172,
    targetY: 502,
  },
  {
    id: 'migu',
    name: '咪咕音乐',
    stickerLabel: '咪咕音乐',
    stickerColor: 'pink',
    bg: COLORS.miguBg,
    accent: COLORS.miguPink,
    playlistTitle: '《华语黄金年代全集》',
    trackCount: '195 首',
    painTag: '曲库散落各平台?',
    gridX: 1290,
    gridY: 570,
    rot: 2.1,
    targetX: 1290,
    targetY: 502,
  },
];

export const Act1DilemmaAndDebut: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame > 245) return null;

  // Phase 1A -> 1B morph progress (Frames 108..155)
  const morphProg = smoothStep(frame, 108, 155, 0, 1);
  // Handoff into Act 2 (Frames 212..240): camera/card shifts up into Act 2's top SearchNote position
  const handoffProg = smoothStep(frame, 212, 240, 0, 1);
  const sceneOpacity = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Bonk recoil when Hero Note hits the barrier at frames 76 and 94
  const bonkShake =
    (frame >= 74 && frame <= 84 ? Math.sin((frame - 74) * 1.8) * 6 : 0) +
    (frame >= 92 && frame <= 102 ? Math.sin((frame - 92) * 1.8) * 6 : 0);

  const logoUrl = staticFile('assets/logo-512.png');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        transform: `translateY(${-handoffProg * 145}px)`,
      }}
    >
      {/* ==================== PHASE 1A HEADLINE (Frames 0..125) ==================== */}
      {frame < 135 && (
        <div
          style={{
            position: 'absolute',
            left: 140,
            right: 80,
            top: 86,
            textAlign: 'center',
            opacity: 1 - smoothStep(frame, 102, 126, 0, 1),
            transform: `translateY(${smoothStep(frame, 102, 126, 0, -28)}px) scale(${0.92 + 0.08 * journalSpring(frame, 2)})`,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontFamily: FONTS.handwriting,
              fontSize: 54,
              fontWeight: 700,
              color: COLORS.ink,
              textShadow: '2px 3px 0 rgba(65, 48, 12, 0.16)',
            }}
          >
            用心收藏的歌单，为什么总{' '}
            <MarkerHighlight frame={frame} startFrame={18} color="#fecdd3">
              被困在单一平台
            </MarkerHighlight>{' '}
            里？
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: FONTS.sans,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.inkLight,
            }}
          >
            会员过期灰显 · 跨软件格式壁垒 · 大歌单截断 · 换个播放器就得从头建起
          </div>
        </div>
      )}

      {/* Dashed Cage / Barrier Lines between Platform Islands (Phase 1A) */}
      {frame < 125 && (
        <div
          style={{
            position: 'absolute',
            left: 220,
            right: 140,
            top: 505,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (1 - morphProg * 1.3) * smoothStep(frame, 25, 45, 0, 1),
            transform: `translateX(${bonkShake}px)`,
          }}
        >
          <div
            style={{
              flex: 1,
              borderTop: `3px dashed ${COLORS.neteaseRed}`,
              opacity: 0.65,
            }}
          />
          <span
            style={{
              margin: '0 20px',
              backgroundColor: '#fff1f2',
              border: `2px solid ${COLORS.ink}`,
              borderRadius: 999,
              padding: '4px 20px',
              fontFamily: FONTS.mono,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.neteaseRed,
              boxShadow: '2px 2px 0 #2d3436',
            }}
          >
            🔒 平台孤岛壁垒 · 歌单数据难以自由带走
          </span>
          <div
            style={{
              flex: 1,
              borderTop: `3px dashed ${COLORS.neteaseRed}`,
              opacity: 0.65,
            }}
          />
        </div>
      )}

      {/* ==================== PHASE 1B HERO DEBUT & YELLOW SEARCH NOTE (Frames 108..240) ==================== */}
      {frame >= 105 && (
        <div
          style={{
            position: 'absolute',
            left: 140,
            right: 80,
            top: 92,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Brand Emblem + Hero Title (exact match to real website Hero.tsx) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: smoothStep(frame, 112, 136, 0, 1),
              transform: `scale(${0.86 + 0.14 * journalSpring(frame, 112)})`,
              position: 'relative',
              width: 1180,
            }}
          >
            {/* Top-right warm orange doodle from Hero.tsx */}
            <div
              style={{
                position: 'absolute',
                right: -35,
                top: -8,
                fontFamily: FONTS.handwriting,
                fontSize: 28,
                color: COLORS.amber,
                transform: 'rotate(3deg)',
                whiteSpace: 'nowrap',
              }}
            >
              无需注册 · 干净清爽 :)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Img
                src={logoUrl}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  border: `3px solid ${COLORS.ink}`,
                  boxShadow: SHADOWS.cutoutSm,
                  backgroundColor: '#fff',
                  transform: 'rotate(-3deg)',
                }}
              />
              <div
                style={{
                  fontFamily: FONTS.handwriting,
                  fontSize: 78,
                  fontWeight: 700,
                  color: COLORS.ink,
                  textShadow: '3px 3.5px 0 rgba(65, 48, 12, 0.24)',
                  letterSpacing: '0.02em',
                }}
              >
                把你的{' '}
                <MarkerHighlight frame={frame} startFrame={126} color={COLORS.highlightYellow}>
                  歌单带走
                </MarkerHighlight>
              </div>
            </div>

            <div
              style={{
                marginTop: 4,
                fontFamily: FONTS.handwriting,
                fontSize: 30,
                color: COLORS.inkLight,
              }}
            >
              一本把你喜爱的歌单轻松带走的数字音乐手账 ✦ Paste · Parse · Export
            </div>
          </div>

          {/* Yellow Sticky SearchNote Unfolding (Exact match to SearchNote.tsx) */}
          <div
            style={{
              marginTop: 32,
              width: 1160,
              backgroundColor: COLORS.noteYellow,
              border: `3px solid ${COLORS.ink}`,
              borderRadius: BORDERS.handDrawn,
              boxShadow: SHADOWS.paperWarm,
              padding: '38px 46px 96px',
              position: 'relative',
              transform: `rotate(0.35deg) scale(${0.88 + 0.12 * journalSpring(frame, 120)})`,
              opacity: smoothStep(frame, 118, 140, 0, 1),
            }}
          >
            {/* Top-left Pink Washi Tape & Bottom-right Cyan Washi Tape */}
            <WashiTape
              color="pink"
              width={145}
              height={32}
              rotateDeg={-8}
              frame={frame}
              appearFrame={134}
              style={{ position: 'absolute', top: -16, left: 48 }}
            />
            <WashiTape
              color="cyan"
              width={145}
              height={32}
              rotateDeg={-5}
              frame={frame}
              appearFrame={146}
              style={{ position: 'absolute', bottom: -15, right: 54 }}
            />

            {/* Yellow Sparkle on top right */}
            <div
              style={{
                position: 'absolute',
                right: -28,
                top: -36,
                fontSize: 48,
                color: COLORS.gold,
              }}
            >
              ✦
            </div>

            {/* Label + Badge row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.handwriting,
                  fontSize: 36,
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
                  boxShadow: '2.5px 2.5px 0 #2d3436',
                  padding: '5px 16px',
                  fontFamily: FONTS.mono,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1d4ed8',
                }}
              >
                跨平台公开歌单解析
              </span>
            </div>

            {/* PaperInput + MarkerButton row */}
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  height: 68,
                  backgroundColor: COLORS.paperWhite,
                  border: `3px solid ${COLORS.ink}`,
                  borderRadius: BORDERS.handDrawnSubtle,
                  boxShadow: 'inset 2px 2px 0 rgba(45,52,54,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px',
                  fontFamily: FONTS.sans,
                  fontSize: 23,
                  color: COLORS.inkMuted,
                }}
              >
                粘贴公开歌单链接、分享短链、QQ 号或网易云 UID...
              </div>
              <div
                style={{
                  height: 68,
                  padding: '0 38px',
                  backgroundColor: COLORS.ink,
                  color: COLORS.paperWhite,
                  border: `3px solid ${COLORS.ink}`,
                  borderRadius: BORDERS.handDrawnAlt,
                  boxShadow: SHADOWS.cutoutSm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONTS.handwriting,
                  fontSize: 30,
                  fontWeight: 700,
                  transform: 'rotate(-1deg)',
                }}
              >
                解析
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONTINUOUS MORPHING PLATFORM CARDS -> STICKERS ==================== */}
      {ISLANDS.map((island, idx) => {
        const appearProg = journalSpring(frame, 6 + idx * 8);
        const bob = floatOffset(frame, idx + 1, 4, 0.06);

        // Interpolate position from Phase 1A island grid -> Phase 1B SearchNote sticker bar!
        const curX = interpolate(morphProg, [0, 1], [island.gridX + bob.x + bonkShake * (idx % 2 === 0 ? 1 : -1), island.targetX]);
        const curY = interpolate(morphProg, [0, 1], [island.gridY + bob.y, island.targetY]);
        const curRot = interpolate(morphProg, [0, 1], [island.rot + bob.rot * 0.4, (idx % 2 === 0 ? -1.2 : 1.2)]);

        return (
          <div
            key={island.id}
            style={{
              position: 'absolute',
              left: curX,
              top: curY,
              transform: `rotate(${curRot}deg) scale(${appearProg})`,
              transformOrigin: 'left top',
              zIndex: 50,
            }}
          >
            {/* Full Island Card (fades out as morphProg approaches 1) */}
            {morphProg < 0.85 && (
              <div
                style={{
                  width: 440,
                  backgroundColor: island.bg,
                  border: `3px solid ${COLORS.ink}`,
                  borderRadius: BORDERS.handDrawn,
                  boxShadow: SHADOWS.cutout,
                  padding: '20px 24px',
                  opacity: 1 - morphProg * 1.15,
                  transform: `scale(${1 - morphProg * 0.45})`,
                  transformOrigin: 'left top',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      backgroundColor: island.accent,
                      color: '#fff',
                      fontFamily: FONTS.sans,
                      fontWeight: 800,
                      fontSize: 20,
                      padding: '4px 14px',
                      borderRadius: 999,
                      border: `2px solid ${COLORS.ink}`,
                    }}
                  >
                    {island.name}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 17,
                      fontWeight: 700,
                      color: COLORS.neteaseRed,
                      backgroundColor: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: `1.5px dashed ${COLORS.neteaseRed}`,
                    }}
                  >
                    🔒 {island.painTag}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    fontFamily: FONTS.sans,
                    fontSize: 24,
                    fontWeight: 800,
                    color: COLORS.ink,
                  }}
                >
                  {island.playlistTitle}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: FONTS.handwriting,
                    fontSize: 22,
                    color: COLORS.inkLight,
                  }}
                >
                  <span>🎵 {island.trackCount}</span>
                  <span>♪ ♫ ♬</span>
                </div>
              </div>
            )}

            {/* Compact Platform Sticker inside SearchNote (fades in as morphProg > 0.35) */}
            {morphProg > 0.3 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: Math.min(1, (morphProg - 0.3) / 0.5),
                  transform: `scale(${0.7 + 0.3 * Math.min(1, (morphProg - 0.3) / 0.55)})`,
                  transformOrigin: 'left top',
                }}
              >
                <StickerBadge color={island.stickerColor} rotateDeg={0} style={{ fontSize: 18, padding: '5px 12px' }}>
                  {island.stickerLabel}
                </StickerBadge>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
