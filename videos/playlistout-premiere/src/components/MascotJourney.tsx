import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { NoteMascot, type MascotExpression, type MascotPose } from './NoteMascot';

type Key = {
  f: number;
  x: number;
  y: number;
  size: number;
  r: number;
  o: number;
};

/**
 * The note is the protagonist and the hand of the film. It is kept in the same
 * world space as the interface, so the camera can push in without the mascot
 * drifting away from the button it is pressing.
 */
const KEYS: Key[] = [
  { f: 0, x: 1362, y: 548, size: 230, r: -4, o: 0 },
  { f: 8, x: 1362, y: 548, size: 230, r: -4, o: 1 },
  { f: 112, x: 1365, y: 548, size: 230, r: 1, o: 1 },
  { f: 145, x: 1360, y: 530, size: 235, r: 5, o: 1 },
  { f: 158, x: 1430, y: 385, size: 200, r: 18, o: 1 },
  { f: 172, x: 1568, y: 282, size: 180, r: -12, o: 1 },
  { f: 190, x: 1250, y: 400, size: 150, r: 10, o: 1 },
  { f: 203, x: 930, y: 492, size: 130, r: -4, o: 1 },
  { f: 214, x: 895, y: 500, size: 48, r: 8, o: 1 },
  { f: 220, x: 890, y: 500, size: 8, r: 16, o: 0 },
  { f: 247, x: 1487, y: 422, size: 12, r: -6, o: 0 },
  { f: 251, x: 1487, y: 420, size: 96, r: 2, o: 1 },
  { f: 258, x: 1487, y: 410, size: 112, r: -2, o: 1 },
  { f: 264, x: 1487, y: 412, size: 112, r: 1, o: 1 },
  { f: 276, x: 1450, y: 390, size: 108, r: -8, o: 1 },
  { f: 310, x: 1560, y: 350, size: 105, r: 4, o: 1 },
  { f: 410, x: 1580, y: 350, size: 105, r: 4, o: 1 },
  { f: 440, x: 1540, y: 600, size: 100, r: -4, o: 1 },
  { f: 456, x: 1330, y: 790, size: 98, r: -6, o: 1 },
  { f: 472, x: 1330, y: 810, size: 98, r: 0, o: 1 },
  { f: 482, x: 1330, y: 808, size: 98, r: 1, o: 1 },
  { f: 498, x: 1460, y: 720, size: 96, r: 9, o: 1 },
  { f: 516, x: 1450, y: 650, size: 90, r: 4, o: 0 },
  { f: 528, x: 1680, y: 250, size: 100, r: -5, o: 1 },
  { f: 570, x: 1680, y: 250, size: 100, r: 3, o: 1 },
  { f: 620, x: 1680, y: 250, size: 100, r: -7, o: 1 },
  { f: 675, x: 1700, y: 720, size: 100, r: 4, o: 1 },
  { f: 725, x: 1700, y: 720, size: 98, r: 2, o: 1 },
  { f: 748, x: 1580, y: 620, size: 92, r: 6, o: 0 },
  { f: 762, x: 1680, y: 230, size: 98, r: -2, o: 1 },
  { f: 835, x: 1640, y: 240, size: 98, r: 2, o: 1 },
  { f: 862, x: 1332, y: 610, size: 98, r: 2, o: 1 },
  { f: 882, x: 1332, y: 635, size: 98, r: 1, o: 1 },
  { f: 890, x: 1332, y: 630, size: 98, r: 0, o: 1 },
  { f: 908, x: 1420, y: 540, size: 96, r: -7, o: 1 },
  { f: 935, x: 1430, y: 640, size: 96, r: 3, o: 1 },
  { f: 950, x: 1430, y: 650, size: 94, r: 1, o: 1 },
  { f: 978, x: 1450, y: 560, size: 92, r: -6, o: 1 },
  { f: 995, x: 1490, y: 480, size: 90, r: 4, o: 0 },
  { f: 1012, x: 1480, y: 320, size: 96, r: -3, o: 1 },
  { f: 1080, x: 1410, y: 760, size: 92, r: 2, o: 1 },
  { f: 1160, x: 1370, y: 760, size: 92, r: -2, o: 1 },
  { f: 1228, x: 1350, y: 760, size: 92, r: 3, o: 1 },
  { f: 1290, x: 1340, y: 650, size: 92, r: -4, o: 1 },
  { f: 1340, x: 1380, y: 430, size: 90, r: 4, o: 0 },
  { f: 1388, x: 1730, y: 300, size: 92, r: -4, o: 1 },
  { f: 1460, x: 1730, y: 320, size: 92, r: 2, o: 1 },
  { f: 1498, x: 1690, y: 430, size: 92, r: -5, o: 1 },
  { f: 1530, x: 1600, y: 280, size: 96, r: 5, o: 1 },
  { f: 1542, x: 1200, y: 380, size: 80, r: -4, o: 0 },
  { f: 1680, x: 1200, y: 380, size: 80, r: -4, o: 0 },
];

const valueAt = (frame: number, key: keyof Omit<Key, 'f'>, fallback: number) => {
  if (frame <= KEYS[0].f) return KEYS[0][key] ?? fallback;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (frame >= a.f && frame <= b.f) {
      return interpolate(frame, [a.f, b.f], [a[key] ?? fallback, b[key] ?? fallback], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }
  return KEYS[KEYS.length - 1][key] ?? fallback;
};

const expressionFor = (frame: number): MascotExpression => {
  if (frame < 42) return 'happy';
  if (frame < 130) return 'sleepy';
  if (frame < 248) return 'wow';
  if (frame >= 252 && frame < 280) return 'focus';
  if (frame >= 280 && frame < 455) return 'proud';
  if (frame >= 455 && frame < 500) return 'focus';
  if (frame >= 500 && frame < 748) return 'happy';
  if (frame >= 860 && frame < 910) return 'focus';
  if (frame >= 910 && frame < 995) return 'proud';
  if (frame >= 1000 && frame < 1340) return 'focus';
  if (frame >= 1388 && frame < 1530) return 'happy';
  return 'wink';
};

const poseFor = (frame: number): MascotPose => {
  if ((frame >= 258 && frame < 273) || (frame >= 470 && frame < 488) || (frame >= 880 && frame < 900) || (frame >= 940 && frame < 960)) {
    return 'press';
  }
  if (frame < 145 || (frame >= 190 && frame < 205) || (frame >= 1320 && frame < 1380) || (frame >= 1495 && frame < 1535)) {
    return 'wave';
  }
  if ((frame >= 300 && frame < 455) || (frame >= 620 && frame < 700) || (frame >= 1388 && frame < 1490)) {
    return 'point';
  }
  return 'idle';
};

const Puffs: React.FC<{ frame: number }> = ({ frame }) => {
  const puff = (start: number) => {
    const p = interpolate(frame, [start, start + 18], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    });
    if (p <= 0 || p >= 1) return null;
    return (
      <div style={{ position: 'absolute', left: 860, top: 475, width: 100, height: 70, opacity: 1 - p }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: 30 + Math.cos(i * 1.1) * (8 + p * 38),
              top: 20 + Math.sin(i * 1.4) * (4 + p * 24),
              width: 5 + (i % 2) * 3,
              height: 3 + (i % 3) * 2,
              borderRadius: i % 2 ? '50%' : 2,
              background: i % 2 ? '#d9ba6c' : '#fff4c7',
              transform: `rotate(${i * 41}deg)`,
            }}
          />
        ))}
      </div>
    );
  };
  return (
    <>
      {puff(214)}
      {frame >= 250 && frame < 280 ? (
        <div
          style={{
            position: 'absolute',
            left: 1480,
            top: 535,
            width: 18,
            height: 14,
            border: '1.4px solid rgba(45,52,54,.45)',
            borderRadius: '50%',
            transform: `scale(${Math.sin(((frame - 250) / 30) * Math.PI)})`,
            opacity: Math.sin(((frame - 250) / 30) * Math.PI) * 0.7,
          }}
        />
      ) : null}
    </>
  );
};

export const MascotJourney: React.FC = () => {
  const frame = useCurrentFrame();
  const x = valueAt(frame, 'x', 960);
  const y = valueAt(frame, 'y', 540);
  const size = valueAt(frame, 'size', 130);
  const rotation = valueAt(frame, 'r', 0);
  const opacity = valueAt(frame, 'o', 0);
  if (opacity <= 0.001) return null;

  const bob = frame >= 0 && frame < 220 ? Math.sin(frame / 17) * 3 : Math.sin(frame / 31) * 1.2;
  const action =
    (frame >= 258 && frame < 266) ||
    (frame >= 476 && frame < 486) ||
    (frame >= 882 && frame < 892) ||
    (frame >= 944 && frame < 954);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size * 0.58 + bob,
        width: size,
        height: size * 1.16,
        zIndex: 880,
        opacity,
        pointerEvents: 'none',
      }}
    >
      <NoteMascot
        size={size}
        rotation={rotation + Math.sin(frame / 37) * 1.4}
        expression={expressionFor(frame)}
        blink={frame % 96 > 4 && frame % 96 < 8}
        pose={poseFor(frame)}
        backdrop={frame >= 1000 && frame < 1350}
        style={{
          transformOrigin: 'center bottom',
          transform: action ? 'translateY(4px) scale(1.06, .94)' : undefined,
        }}
      />
    </div>
  );
};
