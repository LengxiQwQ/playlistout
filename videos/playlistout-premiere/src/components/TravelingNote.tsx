import React from 'react';
import { useCurrentFrame } from 'remotion';
import { interpolate, Easing } from 'remotion';
import { NoteBuddy } from './Paper';

type Key = { f: number; x: number; y: number; s: number; r: number; o?: number };

/**
 * The little yellow note is the visual thread: it starts behind the bars,
 * escapes into the URL field, disappears inside the document, and returns when
 * the playlist has become something portable again.
 */
const KEYS: Key[] = [
  { f: 0, x: 1365, y: 568, s: 1.02, r: -3, o: 0 },
  { f: 8, x: 1365, y: 568, s: 1.02, r: -3, o: 1 },
  { f: 118, x: 1362, y: 565, s: 1.02, r: -1, o: 1 },
  { f: 145, x: 1357, y: 548, s: 1.04, r: 4, o: 1 },
  { f: 156, x: 1455, y: 388, s: 1.12, r: 17, o: 1 },
  { f: 170, x: 1614, y: 232, s: 1.06, r: -12, o: 1 },
  { f: 186, x: 1575, y: 376, s: 0.88, r: 8, o: 1 },
  { f: 205, x: 980, y: 500, s: 0.7, r: -4, o: 1 },
  { f: 218, x: 907, y: 516, s: 0.28, r: 10, o: 0 },
  { f: 500, x: 907, y: 516, s: 0.28, r: 10, o: 0 },
  { f: 526, x: 940, y: 470, s: 0.76, r: -8, o: 1 },
  { f: 548, x: 1060, y: 250, s: 0.72, r: 8, o: 1 },
  { f: 558, x: 1100, y: 200, s: 0.64, r: 4, o: 0 },
  { f: 650, x: 1650, y: 192, s: 0.64, r: 4, o: 0 },
  { f: 668, x: 1650, y: 192, s: 0.78, r: -3, o: 1 },
  { f: 742, x: 1690, y: 198, s: 0.8, r: 3, o: 1 },
  { f: 758, x: 1732, y: 190, s: 0.76, r: 6, o: 0 },
];

const valueAt = (frame: number, key: keyof Omit<Key, 'f'>, fallback: number) => {
  if (frame <= KEYS[0].f) return KEYS[0][key] ?? fallback;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const span = Math.max(1, b.f - a.f);
      return interpolate(frame, [a.f, b.f], [a[key] ?? fallback, b[key] ?? fallback], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }
  return KEYS[KEYS.length - 1][key] ?? fallback;
};

export const TravelingNote: React.FC = () => {
  const frame = useCurrentFrame();
  const x = valueAt(frame, 'x', 960);
  const y = valueAt(frame, 'y', 500);
  const scale = valueAt(frame, 's', 1);
  const rotation = valueAt(frame, 'r', 0);
  const opacity = valueAt(frame, 'o', 0);
  const bobY = frame < 150 || (frame > 526 && frame < 1540) ? Math.sin(frame / 17) * 2.6 : 0;
  const bobR = frame < 150 ? Math.sin(frame / 23) * 2.1 : 0;
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 60 + bobY,
        width: 120,
        height: 120,
        zIndex: 880,
        opacity,
        pointerEvents: 'none',
        filter: 'saturate(1.02)',
      }}
      aria-hidden="true"
    >
      {/* faint motion trail during the big escape */}
      {frame > 150 && frame < 205 ? (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 30,
            width: 80,
            height: 80,
            borderRadius: 10,
            background: 'rgba(255,234,153,.14)',
            filter: 'blur(10px)',
            transform: 'translate(-46px, 28px) rotate(-14deg)',
          }}
        />
      ) : null}
      <NoteBuddy
        size={120}
        rotation={rotation + bobR}
        style={{
          transformOrigin: 'center',
          transform: `scale(${scale}) rotate(${rotation + bobR}deg)`,
        }}
      />
    </div>
  );
};
