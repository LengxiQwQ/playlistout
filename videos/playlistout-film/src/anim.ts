import { Easing, interpolate } from 'remotion';
import { FRAMES_PER_BEAT } from './theme';

export const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val));

export const easeOut = (frame: number, start: number, duration: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

export const easeInOut = (frame: number, start: number, duration: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

export const easeBackOut = (frame: number, start: number, duration: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.6)),
  });

/**
 * 120 BPM musical beat pulse: returns 0..1..0 every beat (15 frames at 30fps).
 */
export const beatPulse = (frame: number, offset = 0) => {
  const phase = ((frame + offset) % FRAMES_PER_BEAT) / FRAMES_PER_BEAT;
  return Math.sin(phase * Math.PI);
};

/**
 * Cute bouncy idle rhythm synced to 120 BPM.
 */
export const beatBounce = (frame: number, amp = 6) => {
  const phase = (frame % FRAMES_PER_BEAT) / FRAMES_PER_BEAT;
  // Crisp bounce down on the beat, airy float up in between
  return -Math.abs(Math.sin(phase * Math.PI)) * amp;
};

export const typeOn = (text: string, frame: number, startFrame: number, charsPerSec = 28, fps = 30) => {
  if (frame <= startFrame) return '';
  const elapsed = (frame - startFrame) / fps;
  const count = Math.min(text.length, Math.floor(elapsed * charsPerSec));
  return text.slice(0, count);
};

export const blink = (frame: number, period = 24) => (frame % period < period * 0.55 ? 1 : 0.15);
