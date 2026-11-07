import { interpolate, spring } from 'remotion';

export const FPS = 30;
export const BPM = 120;
export const FRAMES_PER_BEAT = 15; // 0.5s at 30fps
export const FRAMES_PER_BAR = 60;  // 2.0s at 30fps
export const TOTAL_FRAMES = 1680;  // 56.0s (28 bars)

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function rangeProgress(frame: number, startFrame: number, endFrame: number): number {
  if (endFrame <= startFrame) return frame >= endFrame ? 1 : 0;
  return clamp01((frame - startFrame) / (endFrame - startFrame));
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeOutBack(t: number, overshoot = 1.45): number {
  const c = clamp01(t);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + overshoot * Math.pow(c - 1, 2);
}

export function springPop(
  frame: number,
  startFrame: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
): number {
  if (frame < startFrame) return 0;
  return spring({
    frame: frame - startFrame,
    fps: FPS,
    config: {
      damping: config.damping ?? 13,
      stiffness: config.stiffness ?? 150,
      mass: config.mass ?? 0.75,
    },
  });
}

/**
 * Musical 120 BPM beat pulse (peaks every 15 frames = 0.5s)
 */
export function beatPulse(frame: number, subDivision = 1): number {
  const period = FRAMES_PER_BEAT / subDivision;
  const phase = (frame % period) / period;
  return Math.exp(-phase * 5.2) * Math.sin(Math.min(1, phase * 10) * (Math.PI / 2));
}

/**
 * Smooth quadratic Bézier interpolation between P0, Control P1, and P2
 */
export function quadBezier(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
): [number, number] {
  const u = 1 - clamp01(t);
  const tt = clamp01(t);
  const x = u * u * p0[0] + 2 * u * tt * p1[0] + tt * tt * p2[0];
  const y = u * u * p0[1] + 2 * u * tt * p1[1] + tt * tt * p2[1];
  return [x, y];
}

/**
 * Smooth opacity envelope for a scene with soft entrance and handoff exit
 */
export function sceneEnvelope(
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
): number {
  if (frame <= inStart) return 0;
  if (frame >= outEnd) return 0;
  if (frame < inEnd) {
    return easeInOutCubic((frame - inStart) / (inEnd - inStart));
  }
  if (frame > outStart) {
    return 1 - easeInOutCubic((frame - outStart) / (outEnd - outStart));
  }
  return 1;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function typewriterText(text: string, frame: number, startFrame: number, durationFrames: number): string {
  const p = rangeProgress(frame, startFrame, startFrame + durationFrames);
  const chars = Math.floor(p * text.length);
  return text.slice(0, chars);
}
