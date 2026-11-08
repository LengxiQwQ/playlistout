import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { NoteMascot, type MascotExpression, type MascotPose } from './NoteMascot';

type Key = {
  f: number;
  x: number;
  y: number;
  size: number;
  r: number;
  /** Height of the jump that leads into this pose, in screen pixels. */
  lift?: number;
};

/**
 * The note is the protagonist and the hand of the film. It stays on screen for
 * the whole story, stands on real window edges, and jumps between them with a
 * gravity-shaped arc instead of sliding through the frame.
 */
const KEYS: Key[] = [
  // caged
  { f: 0, x: 1362, y: 556, size: 230, r: -4 },
  { f: 8, x: 1362, y: 556, size: 230, r: -4 },
  { f: 112, x: 1363, y: 553, size: 230, r: 1 },
  { f: 138, x: 1362, y: 548, size: 230, r: 4 },

  // out through the opening door, then onto the search card
  { f: 152, x: 1360, y: 520, size: 222, r: 8, lift: 54 },
  { f: 166, x: 1420, y: 398, size: 186, r: -9, lift: 120 },
  { f: 180, x: 1220, y: 348, size: 164, r: 9, lift: 110 },
  { f: 196, x: 965, y: 402, size: 146, r: -4, lift: 155 },
  { f: 226, x: 965, y: 402, size: 146, r: 2 },

  // to the parse button and down onto it
  { f: 250, x: 1360, y: 405, size: 142, r: -6, lift: 62 },
  { f: 260, x: 1390, y: 430, size: 140, r: 1, lift: 22 },
  { f: 274, x: 1445, y: 390, size: 140, r: 8, lift: 52 },

  // ride the result in
  { f: 304, x: 1500, y: 272, size: 136, r: -6, lift: 138 },
  { f: 400, x: 1510, y: 270, size: 136, r: 4 },

  // jump toward the export button
  { f: 448, x: 1310, y: 750, size: 132, r: -8, lift: 108 },
  { f: 466, x: 1360, y: 820, size: 130, r: 1, lift: 54 },
  { f: 484, x: 1390, y: 806, size: 128, r: 4, lift: 34 },

  // folder at the start of export
  { f: 516, x: 1600, y: 292, size: 126, r: -7, lift: 144 },
  { f: 555, x: 1660, y: 268, size: 138, r: 3 },
  { f: 620, x: 1660, y: 268, size: 124, r: -2 },
  { f: 672, x: 1560, y: 300, size: 122, r: 7 },

  // jump to the batch page
  { f: 746, x: 1600, y: 300, size: 122, r: 3 },
  { f: 764, x: 1600, y: 150, size: 124, r: -2, lift: 142 },
  { f: 840, x: 1590, y: 148, size: 138, r: 2 },

  // onto the batch button
  { f: 858, x: 1310, y: 510, size: 122, r: -5, lift: 106 },
  { f: 878, x: 1350, y: 560, size: 120, r: 1, lift: 42 },
  { f: 892, x: 1370, y: 552, size: 120, r: 3, lift: 22 },

  // onto the finished workbook / envelope
  { f: 930, x: 1280, y: 380, size: 120, r: -7, lift: 116 },
  { f: 956, x: 1360, y: 560, size: 118, r: 4 },
  { f: 990, x: 1470, y: 470, size: 116, r: -2, lift: 58 },

  // terminal
  { f: 1010, x: 1530, y: 170, size: 118, r: -5, lift: 152 },
  { f: 1080, x: 1510, y: 240, size: 132, r: 2 },
  { f: 1180, x: 1470, y: 255, size: 118, r: -2 },
  { f: 1250, x: 1360, y: 300, size: 118, r: 4 },

  // ecology cards
  { f: 1330, x: 1400, y: 360, size: 116, r: 0 },
  { f: 1370, x: 1590, y: 286, size: 116, r: -4, lift: 92 },
  { f: 1450, x: 1590, y: 286, size: 116, r: 2 },
  { f: 1500, x: 1500, y: 360, size: 112, r: -3, lift: 38 },

  // the final card; it stays in the film to the end
  { f: 1530, x: 1530, y: 330, size: 112, r: 3 },
  { f: 1548, x: 1530, y: 260, size: 120, r: 0, lift: 104 },
  { f: 1580, x: 1510, y: 250, size: 110, r: -2 },
  { f: 1680, x: 1510, y: 250, size: 110, r: 1 },
];

const at = (frame: number): { a: Key; b: Key; t: number } => {
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (frame >= KEYS[i].f && frame <= KEYS[i + 1].f) {
      const t = interpolate(frame, [KEYS[i].f, KEYS[i + 1].f], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
      return { a: KEYS[i], b: KEYS[i + 1], t };
    }
  }
  return { a: KEYS[KEYS.length - 1], b: KEYS[KEYS.length - 1], t: 1 };
};

const CLICKS = [
  { f: 258, x: 1480, y: 500 },
  { f: 474, x: 1510, y: 900 },
  { f: 880, x: 1320, y: 590 },
];

const ClickMarks: React.FC<{ frame: number }> = ({ frame }) => {
  const active = CLICKS.find((c) => frame >= c.f && frame < c.f + 14);
  if (!active) return null;
  const t = (frame - active.f) / 14;
  return (
    <div
      style={{
        position: 'absolute',
        left: active.x - 24,
        top: active.y - 24,
        width: 48,
        height: 48,
        zIndex: 875,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1.4px solid rgba(45,52,54,.55)',
          transform: `scale(${0.5 + t * 1.4})`,
          opacity: (1 - t) * 0.7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'rgba(45,52,54,.38)',
          opacity: (1 - t) * 0.8,
        }}
      />
    </div>
  );
};
const expressionFor = (frame: number): MascotExpression => {
  if (frame < 42) return 'happy';
  if (frame < 145) return 'sleepy';
  if (frame < 210) return 'wow';
  if (frame < 280) return 'focus';
  if (frame < 455) return 'proud';
  if (frame < 500) return 'focus';
  if (frame < 748) return 'happy';
  if (frame < 900) return 'focus';
  if (frame < 1000) return 'proud';
  if (frame < 1340) return 'focus';
  if (frame < 1540) return 'happy';
  return 'proud';
};

const poseFor = (frame: number): MascotPose => {
  if ((frame >= 255 && frame < 276) || (frame >= 470 && frame < 490) || (frame >= 878 && frame < 900)) {
    return 'click';
  }
  if (frame < 145 || (frame >= 166 && frame < 210) || (frame >= 500 && frame < 530) || (frame >= 1000 && frame < 1030) || (frame >= 1540 && frame < 1580)) {
    return 'wave';
  }
  if ((frame >= 300 && frame < 455) || (frame >= 620 && frame < 748) || (frame >= 1370 && frame < 1490)) {
    return 'point';
  }
  return 'idle';
};

export const MascotJourney: React.FC = () => {
  const globalFrame = useCurrentFrame();
  if (globalFrame < 60) return null;
  const frame = globalFrame - 60;
  const { a, b, t } = at(frame);
  const x = a.x + (b.x - a.x) * t;
  const yLinear = a.y + (b.y - a.y) * t;
  const y = yLinear - (a.lift ?? 0) * 4 * t * (1 - t);
  const size = a.size + (b.size - a.size) * t;
  // A small grounded weight-shift. The character never becomes a frozen
  // sticker while it is thinking or waiting for a click.
  const idleX = Math.sin(frame / 10) * 8.5;
  const idleY = Math.sin(frame / 7) * 3.2;
  const idleRot = Math.sin(frame / 12) * 4.5;
  const breathe = Math.sin(frame / 16) * 0.01;
  const rotation = a.r + (b.r - a.r) * t;

  const squash = (() => {
    if (!a.lift) return 0;
    const landing = Math.max(0, (t - 0.82) / 0.18);
    const takeoff = Math.max(0, (1 - t) / 0.12);
    return Math.sin(Math.min(1, landing) * Math.PI) * 0.08 - Math.sin(Math.min(1, takeoff) * Math.PI) * 0.05;
  })();

  const action =
    (frame >= 258 && frame < 268) ||
    (frame >= 474 && frame < 484) ||
    (frame >= 882 && frame < 892);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2 + idleX,
        top: y - size * 0.58 + idleY,
        width: size,
        height: size * 1.16,
        zIndex: 880,
        pointerEvents: 'none',
      }}
    >
      <ClickMarks frame={frame} />
      <NoteMascot
        size={size}
        rotation={rotation + Math.sin(frame / 41) * 1.2 + idleRot}
        expression={expressionFor(frame)}
        blink={frame % 104 > 4 && frame % 104 < 8}
        pose={poseFor(frame)}
        backdrop={frame >= 1000 && frame < 1360}
        style={{
          transformOrigin: 'center bottom',
          transform: action
            ? 'translateY(5px) scale(1.08, .92)'
            : `translateY(${Math.sin(frame / 12) * 1.1}px) scale(${1 + squash + breathe}, ${1 - squash + breathe * 0.6})`,
        }}
      />
    </div>
  );
};
