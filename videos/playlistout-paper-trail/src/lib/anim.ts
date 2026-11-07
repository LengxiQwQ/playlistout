import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS} from '../timeline';

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp(t), 3);
export const easeInOutCubic = (t: number) =>
  clamp(t) < 0.5 ? 4 * Math.pow(clamp(t), 3) : 1 - Math.pow(-2 * clamp(t) + 2, 3) / 2;

export const between = (frame: number, start: number, end: number) =>
  clamp((frame - start) / Math.max(1, end - start));

export const easeBetween = (
  frame: number,
  start: number,
  end: number,
  easing: (t: number) => number = easeInOutCubic,
) => easing((frame - start) / Math.max(1, end - start));

export const fadeInOut = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
  max = 1,
) =>
  interpolate(frame, [inStart, inEnd, outStart, outEnd], [0, max, max, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const springIn = ({
  frame,
  start = 0,
  fps = FPS,
  damping = 18,
  stiffness = 130,
  mass = 0.7,
}: {
  frame: number;
  start?: number;
  fps?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
}) =>
  spring({
    frame: frame - start,
    fps,
    config: {damping, stiffness, mass},
  });

export const softSpring = (frame: number, start = 0, fps = FPS) =>
  spring({frame: frame - start, fps, config: {damping: 22, stiffness: 90, mass: 1.1}});

export const useFrameSeconds = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, seconds: frame / fps};
};

export const popScale = (frame: number, start: number, fps = FPS) =>
  interpolate(spring({frame: frame - start, fps, config: {damping: 12, stiffness: 190, mass: 0.6}}), [0, 1], [0.55, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const paperSettle = (frame: number, start: number, from = -8, fps = FPS) =>
  spring({
    frame: frame - start,
    fps,
    config: {damping: 15, stiffness: 95, mass: 0.9},
    from,
    to: 0,
  });

export const bezier = Easing.bezier(0.22, 1, 0.36, 1);

export const slowPan = (frame: number, start: number, end: number, from: number, to: number) =>
  interpolate(frame, [start, end], [from, to], {
    easing: Easing.bezier(0.33, 0, 0.67, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export type NoteKey = {
  t: number;
  x: number;
  y: number;
  scale?: number;
  rot?: number;
  opacity?: number;
  lift?: number;
};

export const sampleNoteKeys = (seconds: number, keys: NoteKey[]) => {
  if (seconds <= keys[0].t) return {...keys[0]};
  if (seconds >= keys[keys.length - 1].t) return {...keys[keys.length - 1]};

  let a = keys[0];
  let b = keys[1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (seconds >= keys[i].t && seconds <= keys[i + 1].t) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const local = clamp((seconds - a.t) / Math.max(0.001, b.t - a.t));
  const t = easeInOutCubic(local);
  const jump = Math.sin(local * Math.PI);
  return {
    ...a,
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t) - jump * 18,
    scale: lerp(a.scale ?? 1, b.scale ?? 1, t),
    rot: lerp(a.rot ?? 0, b.rot ?? 0, t),
    opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, t),
    lift: lerp(a.lift ?? 0, b.lift ?? 0, t),
  };
};

export const stagger = (index: number, interval = 4, base = 0) => base + index * interval;
