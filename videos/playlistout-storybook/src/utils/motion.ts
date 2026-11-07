import { interpolate, spring, Easing } from 'remotion';
import { FPS } from '../theme/tokens';

/**
 * Natural journal spring with gentle overshoot (paper & sticker physics)
 */
export function journalSpring(
  frame: number,
  startFrame: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {}
): number {
  return spring({
    frame: frame - startFrame,
    fps: FPS,
    config: {
      damping: config.damping ?? 13,
      stiffness: config.stiffness ?? 150,
      mass: config.mass ?? 0.85,
    },
  });
}

/**
 * Snappy UI spring for buttons, tapes, and stamps
 */
export function snappySpring(frame: number, startFrame: number): number {
  return spring({
    frame: frame - startFrame,
    fps: FPS,
    config: {
      damping: 11,
      stiffness: 210,
      mass: 0.7,
    },
  });
}

/**
 * Soft camera & paper-slide interpolation using cubic-bezier(0.16, 1, 0.3, 1)
 */
export function smoothStep(
  frame: number,
  startFrame: number,
  endFrame: number,
  fromVal = 0,
  toVal = 1
): number {
  return interpolate(frame, [startFrame, endFrame], [fromVal, toVal], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

/**
 * Smooth entrance + exit envelope for overlapping acts so scenes morph without hard cuts
 */
export function sceneEnvelope(
  frame: number,
  startFrame: number,
  endFrame: number,
  enterFrames = 20,
  exitFrames = 22
): {
  opacity: number;
  enterProgress: number;
  exitProgress: number;
} {
  const enterProgress = smoothStep(frame, startFrame, startFrame + enterFrames, 0, 1);
  const exitProgress = smoothStep(frame, endFrame - exitFrames, endFrame, 0, 1);
  const opacity = enterProgress * (1 - exitProgress);
  return { opacity, enterProgress, exitProgress };
}

/**
 * Subtle organic floating motion for musical notes, sparkles, and paper cards
 */
export function floatOffset(frame: number, seed: number, amplitude = 5, speed = 0.07): { x: number; y: number; rot: number } {
  const t = frame * speed + seed * 1.7;
  return {
    x: Math.cos(t * 0.85) * (amplitude * 0.6),
    y: Math.sin(t) * amplitude,
    rot: Math.sin(t * 0.65 + seed) * 1.8,
  };
}
