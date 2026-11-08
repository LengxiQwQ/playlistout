import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { ASSETS } from '../assets';
import { C, F } from '../theme';

export const JournalStage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  // 微幅运镜跟随与有机纸张呼吸（10-16px范围的平滑缓动，绝不晃眼，赋予全局连续空间质感）
  const breathX = Math.sin(frame / 65) * 1.6;
  const breathY = Math.cos(frame / 80) * 1.2;

  // 场景动线宏观镜头推移（跟随视觉叙事重心平滑侧移与高潮微推）
  const camX = interpolate(
    frame,
    [0, 222, 336, 534, 648, 816, 960, 1074, 1374, 1566, 1740],
    [0, 4, -8, 10, -10, 8, -6, 0, 0, 0, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const camY = interpolate(
    frame,
    [0, 222, 534, 816, 1074, 1566, 1740],
    [0, -4, 0, -4, 0, -6, -2],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const camScale = interpolate(
    frame,
    [0, 1566, 1680, 1740],
    [1.0, 1.0, 1.016, 1.02],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const holes = Array.from({ length: 12 }, (_, i) => i);
  const ruledLines = Array.from({ length: 23 }, (_, i) => i);

  return (
    <AbsoluteFill
      className="film-root"
      style={{
        backgroundColor: C.paper,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${breathX + camX}px, ${breathY + camY}px) scale(${camScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* 1. Paper Fibre & Pulp Base Texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${ASSETS.fibrePage})`,
            backgroundSize: '1920px 1080px',
            opacity: 0.78,
            pointerEvents: 'none',
          }}
        />

        {/* 2. Paper Creases & Fine Grain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${ASSETS.creases}), url(${ASSETS.grain})`,
            backgroundSize: '1024px 1024px, 256px 256px',
            backgroundRepeat: 'repeat, repeat',
            opacity: 0.34,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />

        {/* 3. Notebook Ruled Horizontal Lines (46px spacing for 200% zoom comfort) */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {ruledLines.map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 44 + i * 46,
                height: 2,
                backgroundColor: C.line,
                opacity: 0.72,
              }}
            />
          ))}
        </div>

        {/* 4. Left Red Vertical Margin Line */}
        <div
          style={{
            position: 'absolute',
            left: 118,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: C.marginRed,
            opacity: 0.75,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 124,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: C.marginRed,
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        />

        {/* 5. Left Loose-Leaf Binder Holes */}
        <div
          style={{
            position: 'absolute',
            left: 38,
            top: 32,
            bottom: 32,
            width: 44,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {holes.map((h) => (
            <div
              key={h}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '3px solid #968f83',
                backgroundColor: 'rgba(255, 253, 248, 0.88)',
                boxShadow:
                  'inset 3px 3px 5px rgba(45, 52, 54, 0.26), 1px 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            />
          ))}
        </div>

        {/* 6. Subtle Bottom-Right Notebook Corner Stamp */}
        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: F.mono,
            fontSize: 16,
            fontWeight: 700,
            color: C.inkMuted,
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <span>PLAYLIST OUT · MUSIC JOURNAL</span>
          <span>·</span>
          <span>LOCAL EXPORT</span>
        </div>

        {/* 7. Main Scene Content Layer */}
        {children}

        {/* 8. Warm Vignette & Paper Edge Lighting */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow:
              'inset 0 0 90px rgba(95, 72, 38, 0.10), inset 0 0 24px rgba(95, 72, 38, 0.06)',
            pointerEvents: 'none',
            zIndex: 990,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
