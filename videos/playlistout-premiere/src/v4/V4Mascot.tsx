import React from 'react';
import { useCurrentFrame } from 'remotion';
import { NoteMascot } from '../components/NoteMascot';

const at = [
  { f: 60, x: 1362, y: 556, size: 220 },
  { f: 230, x: 1362, y: 556, size: 220 },
  { f: 250, x: 1765, y: 430, size: 170 },
  { f: 660, x: 1765, y: 430, size: 170 },
  { f: 900, x: 1765, y: 430, size: 170 },
  { f: 1080, x: 1765, y: 430, size: 175 },
  { f: 1420, x: 1765, y: 430, size: 170 },
  { f: 1620, x: 1765, y: 430, size: 170 },
  { f: 1740, x: 1765, y: 430, size: 170 },
];

/**
 * Visibility-first placement for the scale pass. The character stays on the
 * paper margin, outside the enlarged UI, so no label is covered. Its new
 * design, hand contact and beat sync are the next character round.
 */
export const V4Mascot: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 60) return null;

  let a = at[0];
  let b = at[1];
  for (let i = 0; i < at.length - 1; i++) {
    if (frame >= at[i].f && frame <= at[i + 1].f) {
      a = at[i];
      b = at[i + 1];
      break;
    }
  }
  const t = b.f === a.f ? 0 : Math.max(0, Math.min(1, (frame - a.f) / (b.f - a.f)));
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const size = a.size + (b.size - a.size) * t;
  const beat = Math.sin((frame / 30) * Math.PI * 4) * 3;
  const sway = Math.sin(frame / 14) * 2.5;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2 + sway,
        top: y - size * 0.58 + beat,
        width: size,
        height: size * 1.16,
        zIndex: 880,
        pointerEvents: 'none',
      }}
    >
      <NoteMascot
        size={size}
        rotation={-2 + sway * 0.6}
        expression={frame > 250 && frame < 1100 ? 'happy' : 'proud'}
        pose={frame > 250 ? 'wave' : 'idle'}
        backdrop={frame >= 1080 && frame < 1460}
      />
    </div>
  );
};
