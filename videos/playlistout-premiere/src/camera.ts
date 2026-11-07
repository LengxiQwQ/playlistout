import { Easing, interpolate } from 'remotion';

type CameraKey = { f: number; scale: number; x: number; y: number };

/**
 * A small camera on a desk, not a zooming website demo. Each move finds one
 * readable subject on the page and leaves the surrounding paper visible.
 */
const KEYS: CameraKey[] = [
  { f: 0, scale: 1.0, x: 960, y: 540 },
  { f: 145, scale: 1.0, x: 960, y: 540 },
  { f: 172, scale: 1.03, x: 960, y: 540 },
  { f: 198, scale: 1.1, x: 960, y: 535 },
  { f: 228, scale: 1.23, x: 960, y: 532 },
  { f: 260, scale: 1.3, x: 960, y: 528 },
  { f: 315, scale: 1.28, x: 960, y: 552 },
  { f: 405, scale: 1.28, x: 960, y: 580 },
  { f: 455, scale: 1.3, x: 960, y: 665 },
  { f: 500, scale: 1.1, x: 965, y: 565 },
  { f: 526, scale: 1.05, x: 1000, y: 555 },
  { f: 560, scale: 1.5, x: 1250, y: 540 },
  { f: 620, scale: 1.5, x: 1500, y: 554 },
  { f: 680, scale: 1.04, x: 980, y: 590 },
  { f: 742, scale: 1.04, x: 960, y: 555 },
  { f: 765, scale: 1.0, x: 960, y: 540 },
  { f: 825, scale: 1.06, x: 960, y: 540 },
  { f: 885, scale: 1.22, x: 1350, y: 590 },
  { f: 945, scale: 1.15, x: 1100, y: 560 },
  { f: 990, scale: 1.0, x: 960, y: 540 },
  { f: 1008, scale: 1.03, x: 960, y: 540 },
  { f: 1060, scale: 1.12, x: 900, y: 540 },
  { f: 1140, scale: 1.22, x: 810, y: 550 },
  { f: 1220, scale: 1.22, x: 810, y: 585 },
  { f: 1290, scale: 1.1, x: 900, y: 650 },
  { f: 1320, scale: 1.04, x: 920, y: 705 },
  { f: 1360, scale: 1.0, x: 960, y: 580 },
  { f: 1385, scale: 1.02, x: 960, y: 540 },
  { f: 1460, scale: 1.02, x: 960, y: 540 },
  { f: 1500, scale: 1.04, x: 960, y: 560 },
  { f: 1530, scale: 1.0, x: 960, y: 540 },
  { f: 1560, scale: 1.0, x: 960, y: 540 },
  { f: 1680, scale: 1.01, x: 960, y: 540 },
];

export type CameraState = { scale: number; x: number; y: number };

const between = (frame: number, a: CameraKey, b: CameraKey) => {
  const t = interpolate(frame, [a.f, b.f], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  return {
    scale: a.scale + (b.scale - a.scale) * t,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
};

export const getCamera = (frame: number): CameraState => {
  let base: CameraState = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (frame >= KEYS[i].f && frame <= KEYS[i + 1].f) {
      base = between(frame, KEYS[i], KEYS[i + 1]);
      break;
    }
  }
  if (frame < KEYS[0].f) base = KEYS[0];
  return {
    scale: base.scale + Math.sin(frame / 97) * 0.0012,
    x: base.x + Math.sin(frame / 109) * 0.9,
    y: base.y + Math.cos(frame / 83) * 0.7,
  };
};
