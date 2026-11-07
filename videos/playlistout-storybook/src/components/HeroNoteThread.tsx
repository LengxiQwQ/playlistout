import React from 'react';
import { interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme/tokens';

interface Waypoint {
  frame: number;
  x: number;
  y: number;
  scale: number;
  rot: number;
  badge?: string;
}

const WAYPOINTS: Waypoint[] = [
  // Act 1: Floats in the open center gap between Platform Islands, hits the barrier line, then unlocks Playlist Out
  { frame: 0, x: 690, y: 192, scale: 0.92, rot: -8 },
  { frame: 60, x: 690, y: 465, scale: 1.02, rot: 10, badge: '带不走?' },
  { frame: 76, x: 690, y: 495, scale: 1.12, rot: -16, badge: '受限!' },
  { frame: 94, x: 690, y: 455, scale: 0.98, rot: 8 },
  { frame: 118, x: 335, y: 165, scale: 1.15, rot: 360, badge: '解锁 ✦' },
  { frame: 165, x: 355, y: 345, scale: 0.96, rot: 6 },
  { frame: 220, x: 355, y: 235, scale: 0.92, rot: -5 },

  // Act 2: Guides from left of SearchNote to right of '解析' button, then glides along right margin beside ResultPaper
  { frame: 250, x: 285, y: 245, scale: 0.96, rot: 8, badge: '复制链接' },
  { frame: 295, x: 1630, y: 205, scale: 0.95, rot: -4 },
  { frame: 330, x: 1630, y: 245, scale: 1.12, rot: 12, badge: '解析!' },
  { frame: 385, x: 1685, y: 360, scale: 0.94, rot: -6 },
  { frame: 460, x: 1685, y: 540, scale: 0.98, rot: 5, badge: '104 首 ✓' },
  { frame: 555, x: 1685, y: 745, scale: 1.08, rot: -10, badge: '导出 ↓' },

  // Act 3: Floats in the open center gap above Excel & JSON cards, then in the bottom margin
  { frame: 615, x: 965, y: 150, scale: 0.95, rot: -8, badge: '.xlsx' },
  { frame: 690, x: 965, y: 150, scale: 0.95, rot: 8, badge: '.json' },
  { frame: 760, x: 265, y: 942, scale: 0.94, rot: -6 },
  { frame: 815, x: 265, y: 942, scale: 0.98, rot: 6, badge: '6 种格式' },
  { frame: 855, x: 1050, y: 160, scale: 0.95, rot: -8 },

  // Act 4: Sits in the open gap between the User Collection and the Batch Output cards
  { frame: 900, x: 1055, y: 168, scale: 0.95, rot: 6, badge: '18 个歌单' },
  { frame: 965, x: 1055, y: 420, scale: 0.98, rot: -6 },
  { frame: 995, x: 1055, y: 690, scale: 1.08, rot: 10, badge: '打包!' },
  { frame: 1090, x: 1055, y: 525, scale: 0.98, rot: -5, badge: 'ZIP + 多表' },
  { frame: 1140, x: 1055, y: 175, scale: 0.95, rot: 8 },

  // Act 5: Sits cleanly on the top-left corner of the CLI terminal and empty bottom-right terminal space
  { frame: 1185, x: 148, y: 162, scale: 0.92, rot: -8, badge: 'CLI' },
  { frame: 1240, x: 1385, y: 515, scale: 0.94, rot: 6 },
  { frame: 1395, x: 1385, y: 835, scale: 1.04, rot: -6, badge: 'Done ✓' },
  { frame: 1455, x: 1385, y: 155, scale: 0.98, rot: 10 },

  // Act 6: Floats in the open top-right corridor above the 3 player cards
  { frame: 1490, x: 1435, y: 104, scale: 0.92, rot: -6 },
  { frame: 1565, x: 1435, y: 104, scale: 0.96, rot: 6, badge: '自由流转' },
  { frame: 1605, x: 755, y: 220, scale: 0.96, rot: 0 },

  // Act 7: Settles gracefully beside the Brand Finale emblem
  { frame: 1635, x: 710, y: 255, scale: 0.94, rot: -6 },
  { frame: 1680, x: 710, y: 255, scale: 0.94, rot: -4 },
];

function sampleAtFrame(f: number) {
  const frames = WAYPOINTS.map((w) => w.frame);
  const xs = WAYPOINTS.map((w) => w.x);
  const ys = WAYPOINTS.map((w) => w.y);
  const scales = WAYPOINTS.map((w) => w.scale);
  const rots = WAYPOINTS.map((w) => w.rot);

  const x = interpolate(f, frames, xs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(f, frames, ys, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(f, frames, scales, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rot = interpolate(f, frames, rots, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Find active badge if within ±18 frames of a waypoint that has a badge
  let activeBadge: string | undefined;
  for (const wp of WAYPOINTS) {
    if (wp.badge && Math.abs(f - wp.frame) <= 18) {
      activeBadge = wp.badge;
      break;
    }
  }

  return { x, y, scale, rot, activeBadge };
}

export const HeroNoteThread: React.FC<{ frame: number }> = ({ frame }) => {
  const current = sampleAtFrame(frame);
  const beatPulse = 1 + 0.06 * Math.sin((frame / 15) * Math.PI * 2);

  // Sample 5 trail points behind the current frame for a smooth hand-drawn motion trail
  const trailPoints = [2, 4, 6, 8, 10].map((lag) => sampleAtFrame(Math.max(0, frame - lag)));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 95 }}>
      {/* Soft ink-dot motion trail */}
      {trailPoints.map((pt, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: pt.x - 6,
            top: pt.y - 6,
            width: 12 - i * 1.6,
            height: 12 - i * 1.6,
            borderRadius: '50%',
            backgroundColor: COLORS.gold,
            border: `1.5px solid ${COLORS.ink}`,
            opacity: 0.45 - i * 0.08,
          }}
        />
      ))}

      {/* The Hero Musical Note Token */}
      <div
        style={{
          position: 'absolute',
          left: current.x,
          top: current.y,
          transform: `translate(-50%, -50%) scale(${current.scale * beatPulse}) rotate(${current.rot}deg)`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#fef08a',
            border: `3px solid ${COLORS.ink}`,
            boxShadow: '3px 3px 0 #2d3436',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONTS.marker,
            fontSize: 26,
            color: COLORS.ink,
          }}
        >
          ♫
        </div>

        {current.activeBadge && (
          <div
            style={{
              backgroundColor: COLORS.paperWhite,
              border: `2px solid ${COLORS.ink}`,
              borderRadius: 999,
              boxShadow: '2px 2px 0 #2d3436',
              padding: '2px 12px',
              fontFamily: FONTS.handwriting,
              fontSize: 19,
              fontWeight: 700,
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {current.activeBadge}
          </div>
        )}
      </div>
    </div>
  );
};
