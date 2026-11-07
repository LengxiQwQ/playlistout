import React from 'react';
import { WashiTape, JournalSticker, MarkerBtn } from '../components/Stationery';
import {
  beatPulse,
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  lerp,
  quadBezier,
  rangeProgress,
  springPop,
} from '../utils/motion';

export interface PlatformCardSpec {
  id: string;
  name: string;
  stickerLabel: string;
  playlistSample: string;
  tracks: string;
  capNote: string;
  color: 'green' | 'red' | 'lime' | 'yellow' | 'pink' | 'blue';
  accent: string;
  bg: string;
  // Initial island position (center x, center y, rot)
  islandPos: [number, number, number];
  // Target sticker position inside SearchNote at frame 220 (center x, center y, rot)
  targetStickerPos: [number, number, number];
}

export const SIX_PLATFORMS: PlatformCardSpec[] = [
  {
    id: 'qqmusic',
    name: 'QQ 音乐',
    stickerLabel: 'QQ 音乐（可批量）',
    playlistSample: '花谱、鎖那、鹿乃 ˗ˋˏ♡ˎˊ˗',
    tracks: '104 首',
    capNote: '歌单链接 / 短链 / QQ号批量',
    color: 'green',
    accent: '#059669',
    bg: '#f0fdf4',
    islandPos: [365, 365, -3.2],
    targetStickerPos: [535, 396, -1.5],
  },
  {
    id: 'netease',
    name: '网易云音乐',
    stickerLabel: '网易云音乐（可批量）',
    playlistSample: '后摇与日系器乐珍藏',
    tracks: '246 首',
    capNote: '歌单链接 / 短链 / UID批量',
    color: 'red',
    accent: '#e11d48',
    bg: '#fff1f2',
    islandPos: [985, 358, 1.8],
    targetStickerPos: [722, 396, 1.5],
  },
  {
    id: 'qishui',
    name: '汽水音乐',
    stickerLabel: '汽水音乐',
    playlistSample: '抖音宝藏原声同步合集',
    tracks: '92 首',
    capNote: '汽水官方 ⇄ 抖音原声双通道',
    color: 'lime',
    accent: '#65a30d',
    bg: '#f7fee7',
    islandPos: [1585, 368, -2.1],
    targetStickerPos: [872, 396, -1.0],
  },
  {
    id: 'kuwo',
    name: '酷我音乐',
    stickerLabel: '酷我音乐',
    playlistSample: '通勤午后治愈轻音乐',
    tracks: '64 首',
    capNote: '公开歌单免登录自动分页',
    color: 'yellow',
    accent: '#ca8a04',
    bg: '#fefce8',
    islandPos: [380, 710, 2.5],
    targetStickerPos: [988, 396, -0.5],
  },
  {
    id: 'migu',
    name: '咪咕音乐',
    stickerLabel: '咪咕音乐',
    playlistSample: '华语经典现场 Live 辑',
    tracks: '110 首',
    capNote: '公开歌单免登录并发拉取',
    color: 'pink',
    accent: '#db2777',
    bg: '#fdf2f8',
    islandPos: [985, 725, -1.6],
    targetStickerPos: [1104, 396, 0.5],
  },
  {
    id: 'kugou',
    name: '酷狗音乐',
    stickerLabel: '酷狗音乐（可批量）',
    playlistSample: '岁月留声 · 粤语金曲榜',
    tracks: '85 首',
    capNote: '免登预览10首 · 扫码解锁全量',
    color: 'blue',
    accent: '#2563eb',
    bg: '#eff6ff',
    islandPos: [1575, 710, 2.1],
    targetStickerPos: [1268, 396, 1.0],
  },
];

export const Act1DilemmaAndDebut: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame > 235) return null;

  const pulse = beatPulse(frame, 1);
  // Phase 1 (0..105): Dilemma & trapped islands
  // Phase 2 (105..170): Marker slash frees the islands & Hero Title + SearchNote unfold
  // Phase 3 (165..220): The 6 islands fly along curved paths right into the SearchNote's platform stickers!
  const unlockProg = easeOutCubic(rangeProgress(frame, 102, 132));
  const dilemmaFade = 1 - easeInOutCubic(rangeProgress(frame, 96, 124));
  const heroPop = springPop(frame, 108, { damping: 13, stiffness: 140 });
  const searchNotePop = springPop(frame, 154, { damping: 14, stiffness: 135 });
  const handoffFadeOut = 1 - easeInOutCubic(rangeProgress(frame, 215, 232));

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: handoffFadeOut }}>
      {/* 1. Opening Dilemma Banner (Frames 0 - 124) */}
      {dilemmaFade > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 56,
            transform: `translate(-50%, ${(1 - dilemmaFade) * -35}px) rotate(-0.6deg)`,
            opacity: dilemmaFade,
            zIndex: 40,
            textAlign: 'center',
          }}
        >
          <div
            className="hand-border paper-textured shadow-sticky"
            style={{
              backgroundColor: '#fff8bd',
              padding: '12px 34px',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
          >
            <WashiTape
              color="pink"
              rotateDeg={-10}
              width={105}
              height={24}
              style={{ position: 'absolute', top: -12, left: -18 }}
            />
            <WashiTape
              color="cyan"
              rotateDeg={8}
              width={105}
              height={24}
              style={{ position: 'absolute', bottom: -12, right: -18 }}
            />
            <div
              className="font-brush"
              style={{ fontSize: 38, color: '#2d3436', letterSpacing: '0.02em', lineHeight: 1.15 }}
            >
              精心收藏的歌单，为什么总被困在单一平台里？
            </div>
            <div
              className="font-sans"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#991b1b',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <span>🔒 跨软件无法直接导出</span>
              <span>·</span>
              <span>⚠️ 曲目变灰 / 下架难以备份</span>
              <span>·</span>
              <span>📋 手工抄歌单太折腾</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Golden Liberation Marker Stroke at Frame 102-145 */}
      {frame >= 100 && frame <= 165 && (
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 55,
            opacity: 1 - rangeProgress(frame, 140, 165),
          }}
        >
          <path
            d="M 190 420 C 640 240, 1280 780, 1760 310"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="2100"
            strokeDashoffset={2100 * (1 - easeOutCubic(rangeProgress(frame, 100, 126)))}
            style={{ filter: 'drop-shadow(0 4px 10px rgba(245, 158, 11, 0.45))' }}
          />
        </svg>
      )}

      {/* 3. Hero Title "把你的歌单带走" (matches Hero.tsx & Screenshot 2, Frames 108+) */}
      {frame >= 108 && (
        <div
          style={{
            position: 'absolute',
            left: 410,
            width: 1140,
            top: 96,
            textAlign: 'center',
            opacity: Math.min(1, heroPop),
            transform: `translateY(${(1 - heroPop) * 24}px) scale(${0.92 + 0.08 * heroPop})`,
            zIndex: 35,
          }}
        >
          {/* Top-right tilted orange doodle from Hero.tsx */}
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
              {/* Animated yellow marker highlight bar */}
              <span
                style={{
                  position: 'absolute',
                  left: '-3%',
                  width: `${106 * easeOutCubic(rangeProgress(frame, 116, 142))}%`,
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

      {/* 4. Search Sticky Note Unfolding in Center (Frames 154+, exact match with Act 2) */}
      {frame >= 154 && (
        <div
          className="hand-border paper-textured shadow-sticky"
          style={{
            position: 'absolute',
            left: 410,
            top: 214,
            width: 1140,
            padding: '28px 36px 26px',
            backgroundColor: '#fff8bd',
            transform: `translateY(${(1 - searchNotePop) * 40}px) scale(${0.9 + 0.1 * searchNotePop}) rotate(0.35deg)`,
            opacity: Math.min(1, searchNotePop),
            zIndex: 30,
          }}
        >
          {/* Yellow Sparkle on top right */}
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

          {/* Top Row: Label + Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div className="font-playful" style={{ fontSize: 26, fontWeight: 700, color: '#2d3436' }}>
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
                height: 56,
                backgroundColor: '#ffffff',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                color: '#8a8f92',
                fontSize: 18,
                boxShadow: 'inset 2px 2px 0 rgba(45, 52, 54, 0.08)',
              }}
            >
              粘贴公开歌单链接、QQ 号或主页链接
            </div>
            <MarkerBtn variant="ink" rotateDeg={-1} style={{ height: 56, padding: '0 32px' }}>
              解析
            </MarkerBtn>
          </div>

          {/* Placeholder space for the 6 platform stickers that land here at frames 165-215 */}
          <div style={{ height: 52, marginTop: 18 }} />
        </div>
      )}

      {/* 5. The 6 Music Platform Cards — Morphing from Trapped Islands into SearchNote Stickers! */}
      {SIX_PLATFORMS.map((p, idx) => {
        const cardEnter = easeOutBack(rangeProgress(frame, idx * 6, idx * 6 + 24), 1.25);
        // Morph progress from island card (0) to compact sticker inside SearchNote (1)
        const morphStart = 148 + idx * 5;
        const morphEnd = 198 + idx * 4;
        const m = easeInOutCubic(rangeProgress(frame, morphStart, morphEnd));

        // Struggle jiggle before unlock (frames 25..102)
        const struggle =
          frame < 105
            ? Math.sin((frame + idx * 11) * 0.45) * (2.5 + pulse * 3.5)
            : 0;

        // Curved flight path from islandPos to targetStickerPos
        const ctrlX = (p.islandPos[0] + p.targetStickerPos[0]) * 0.5 + (idx % 2 === 0 ? -60 : 60);
        const ctrlY = Math.min(p.islandPos[1], p.targetStickerPos[1]) - 95;
        const [cx, cy] = quadBezier(
          m,
          [p.islandPos[0], p.islandPos[1]],
          [ctrlX, ctrlY],
          [p.targetStickerPos[0], p.targetStickerPos[1]],
        );

        const w = lerp(430, 168, m);
        const h = lerp(196, 38, m);
        const rot = lerp(p.islandPos[2] + struggle * 0.35, p.targetStickerPos[2], m);
        const detailOpacity = clamp01(1 - m * 2.1);
        const compactStickerOpacity = clamp01((m - 0.45) * 2.0);

        return (
          <div
            key={p.id}
            className="hand-border-subtle paper-textured"
            style={{
              position: 'absolute',
              left: cx - w / 2,
              top: cy - h / 2,
              width: w,
              height: h,
              backgroundColor: p.bg,
              borderColor: m < 0.7 ? p.accent : '#2d3436',
              borderWidth: 2.5,
              boxShadow:
                m < 0.5
                  ? '5px 6px 0 rgba(45, 52, 54, 0.85)'
                  : '2.5px 3px 0 #2d3436',
              transform: `scale(${cardEnter}) rotate(${rot}deg)`,
              zIndex: 45 + idx,
              overflow: 'hidden',
              padding: m < 0.5 ? '14px 18px' : '4px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Full Island Card Content (visible before morph completes) */}
            {detailOpacity > 0.02 && (
              <div style={{ opacity: detailOpacity, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: p.accent,
                        border: '1.5px solid #2d3436',
                      }}
                    />
                    <span className="font-playful" style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>
                      {p.name}
                    </span>
                  </div>

                  {/* Lock badge turns into Unlocked Check at frame 105! */}
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: unlockProg < 0.5 ? '#fee2e2' : '#dcfce7',
                      color: unlockProg < 0.5 ? '#991b1b' : '#166534',
                      border: `1.5px solid ${unlockProg < 0.5 ? '#f87171' : '#22c55e'}`,
                      transform: `scale(${1 + (unlockProg > 0.2 && unlockProg < 0.8 ? 0.18 : 0)})`,
                    }}
                  >
                    {unlockProg < 0.5 ? '🔒 歌单被困' : '✓ 支持解析'}
                  </span>
                </div>

                {/* Sample Playlist Row inside the island */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.86)',
                    border: '1.5px dashed rgba(45, 52, 54, 0.3)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 18, color: p.accent }}>♪</span>
                    <span
                      className="font-sans"
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#2d3436',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.playlistSample}
                    </span>
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: p.accent,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {p.tracks}
                  </span>
                </div>

                {/* Authentic Platform Capability Footer */}
                <div
                  className="font-sans"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{p.capNote}</span>
                  <span style={{ color: p.accent, fontWeight: 700 }}>→ 带走</span>
                </div>
              </div>
            )}

            {/* Compact Sticker Content (as it lands into the SearchNote sticker bar!) */}
            {compactStickerOpacity > 0.02 && (
              <div
                className="font-playful"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: '#2d3436',
                  opacity: compactStickerOpacity,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.stickerLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
