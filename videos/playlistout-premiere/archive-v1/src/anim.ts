import { Easing, interpolate, spring } from 'remotion';
import { EASE, FPS } from './theme';

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smooth = (
  frame: number,
  input: [number, number],
  output: [number, number] = [0, 1],
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...EASE.soft),
  });

export const easeOut = (
  frame: number,
  start: number,
  duration: number,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, start + duration], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...EASE.journal),
  });

export const easeInOut = (
  frame: number,
  start: number,
  duration: number,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, start + duration], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

export const fadeIn = (frame: number, start: number, duration = 15) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

export const fadeOut = (frame: number, start: number, duration = 15) =>
  interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });

export const fadeWindow = (
  frame: number,
  inStart: number,
  outStart: number,
  inDuration = 15,
  outDuration = 18,
) => Math.min(fadeIn(frame, inStart, inDuration), fadeOut(frame, outStart, outDuration));

export const springIn = (
  frame: number,
  start: number,
  fps = FPS,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
  durationInFrames = 34,
) =>
  spring({
    frame: frame - start,
    fps,
    config: {
      damping: config.damping ?? 18,
      stiffness: config.stiffness ?? 120,
      mass: config.mass ?? 0.8,
    },
    durationInFrames,
  });

export const springPop = (frame: number, start: number, fps = FPS) =>
  spring({
    frame: frame - start,
    fps,
    from: 0,
    to: 1,
    config: { damping: 11, stiffness: 160, mass: 0.55 },
    durationInFrames: 28,
  });

export const bob = (
  frame: number,
  amplitude = 2,
  period = 80,
  phase = 0,
) => Math.sin(((frame + phase) / period) * Math.PI * 2) * amplitude;

export const slowRotate = (
  frame: number,
  start: number,
  duration: number,
  from: number,
  to: number,
) => easeInOut(frame, start, duration, from, to);

export const hiddenWhen = (frame: number, start: number, end: number) =>
  frame < start || frame > end;

export const beatPulse = (frame: number, bpm = 120, strength = 0.02) => {
  const framePerBeat = (60 / bpm) * FPS;
  const phase = (frame % framePerBeat) / framePerBeat;
  return 1 + strength * Math.exp(-phase * 7) * Math.cos(phase * Math.PI * 4);
};

export const stagger = (
  frame: number,
  index: number,
  start: number,
  gap = 5,
  duration = 24,
) => easeOut(frame, start + index * gap, duration);

export const typeOn = (text: string, frame: number, start: number, cps = 22) => {
  const shown = Math.max(0, Math.floor((frame - start) / FPS * cps));
  return text.slice(0, Math.min(text.length, shown));
};

export const blink = (frame: number, period = 30, onRatio = 0.58) =>
  frame % period < period * onRatio ? 1 : 0;

export const seeded = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

export const handBoil = (frame: number, seed = 0, strength = 1) => {
  const step = Math.floor(frame / 3);
  return {
    x: (seeded(step + seed) - 0.5) * 0.8 * strength,
    y: (seeded(step + 41 + seed) - 0.5) * 0.8 * strength,
    r: (seeded(step + 91 + seed) - 0.5) * 0.18 * strength,
  };
};

export const truncate = (text: string, max = 36) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;
