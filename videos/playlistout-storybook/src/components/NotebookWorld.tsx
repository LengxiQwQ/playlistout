import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { floatOffset, smoothStep } from '../utils/motion';

interface NotebookWorldProps {
  frame: number;
  children: React.ReactNode;
}

const CHAPTERS = [
  { start: 0, end: 225, num: '01', label: '歌单困境 · 手账登场' },
  { start: 225, end: 570, num: '02', label: '网页一键解析歌单' },
  { start: 570, end: 855, num: '03', label: '多格式本地导出' },
  { start: 855, end: 1140, num: '04', label: '用户合集批量打包' },
  { start: 1140, end: 1455, num: '05', label: '跨平台桌面 CLI' },
  { start: 1455, end: 1605, num: '06', label: '开源播放器与 API 生态' },
  { start: 1605, end: 1680, num: '07', label: '把你的歌单带走' },
];

export const NotebookWorld: React.FC<NotebookWorldProps> = ({ frame, children }) => {
  const grainUrl = staticFile('assets/paper-grain.png');
  const logoUrl = staticFile('assets/logo-128.png');

  // Continuous gentle vertical scroll of the notebook ruling as chapters progress
  const scrollY =
    smoothStep(frame, 110, 235, 0, -42) +
    smoothStep(frame, 365, 420, 0, -56) +
    smoothStep(frame, 565, 615, 0, -48) +
    smoothStep(frame, 850, 900, 0, -52) +
    smoothStep(frame, 1135, 1185, 0, -52) +
    smoothStep(frame, 1450, 1495, 0, -48) +
    smoothStep(frame, 1600, 1635, 0, 42);

  const activeChapter =
    CHAPTERS.find((c) => frame >= c.start && frame < c.end) || CHAPTERS[CHAPTERS.length - 1];

  const ambientNotes = [
    { x: 1842, y: 158, char: '♪', color: COLORS.amber, seed: 1 },
    { x: 1854, y: 490, char: '✦', color: '#eab308', seed: 2 },
    { x: 1838, y: 845, char: '♫', color: '#059669', seed: 3 },
    { x: 142, y: 970, char: '✧', color: '#e11d48', seed: 4 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        color: COLORS.ink,
        fontFamily: FONTS.sans,
        overflow: 'hidden',
      }}
    >
      {/* 1. Ruled Notebook Lines + Authentic Paper Grain (Scrolling in gentle parallax) */}
      <div
        style={{
          position: 'absolute',
          inset: -120,
          backgroundImage: `url('${grainUrl}'), repeating-linear-gradient(to bottom, transparent 0px, transparent 40.5px, ${COLORS.line} 40.5px, ${COLORS.line} 42px)`,
          backgroundSize: '256px 256px, 100% 42px',
          transform: `translateY(${scrollY % 42}px)`,
          pointerEvents: 'none',
        }}
      />

      {/* 2. Left Loose-Leaf Binder Spine (Exact visual DNA from web/src/design/paper.css) */}
      <div
        style={{
          position: 'absolute',
          left: 38,
          top: 24 + (scrollY * 0.35),
          bottom: -120,
          width: 34,
          display: 'flex',
          flexDirection: 'column',
          gap: 50,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '3px solid #8a8f92',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              boxShadow:
                'inset 2px 2px 3px rgba(45, 52, 54, 0.28), 1px 1px 2px rgba(45, 52, 54, 0.12)',
              position: 'relative',
            }}
          >
            {/* Subtle metallic binder ring tab on left */}
            <div
              style={{
                position: 'absolute',
                left: -26,
                top: 9,
                width: 24,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#cbd5e1',
                border: '1.5px solid #64748b',
              }}
            />
          </div>
        ))}
      </div>

      {/* 3. Notebook Coral-Red Vertical Margin Line */}
      <div
        style={{
          position: 'absolute',
          left: 98,
          top: 0,
          bottom: 0,
          width: 2.5,
          backgroundColor: COLORS.marginRed,
          opacity: 0.82,
          zIndex: 25,
          pointerEvents: 'none',
        }}
      />

      {/* 4. Top Music-Journal Header Strip (Persistent subtle context bar) */}
      <div
        style={{
          position: 'absolute',
          left: 132,
          right: 54,
          top: 18,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 45,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Img
            src={logoUrl}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: `2px solid ${COLORS.ink}`,
              boxShadow: '2px 2px 0 #2d3436',
              backgroundColor: '#fff',
            }}
          />
          <span
            style={{
              fontFamily: FONTS.marker,
              fontSize: 24,
              color: COLORS.ink,
              letterSpacing: '0.02em',
            }}
          >
            Playlist Out
          </span>
          <span
            style={{
              fontFamily: FONTS.handwriting,
              fontSize: 22,
              color: COLORS.inkLight,
              marginLeft: 4,
            }}
          >
            · 把你的歌单带走
          </span>
        </div>

        {/* Right: Chapter Indicator Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: COLORS.paperCream,
            border: `2px solid ${COLORS.ink}`,
            borderRadius: BORDERS.handDrawnSubtle,
            boxShadow: SHADOWS.sticker,
            padding: '4px 16px',
            transform: 'rotate(0.6deg)',
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 15,
              fontWeight: 700,
              color: COLORS.amber,
              backgroundColor: COLORS.noteYellow,
              padding: '1px 7px',
              borderRadius: 4,
              border: `1.5px solid ${COLORS.ink}`,
            }}
          >
            CHAPTER {activeChapter.num}
          </span>
          <span
            style={{
              fontFamily: FONTS.handwriting,
              fontSize: 21,
              color: COLORS.ink,
            }}
          >
            {activeChapter.label}
          </span>
        </div>
      </div>

      {/* 5. Ambient Margin Doodles */}
      {ambientNotes.map((item, idx) => {
        const off = floatOffset(frame, item.seed, 6, 0.06);
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: item.x + off.x,
              top: item.y + off.y,
              transform: `rotate(${off.rot * 2}deg)`,
              fontFamily: FONTS.handwriting,
              fontSize: 30,
              color: item.color,
              opacity: 0.65,
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            {item.char}
          </div>
        );
      })}

      {/* 6. Main Stage Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 35,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
