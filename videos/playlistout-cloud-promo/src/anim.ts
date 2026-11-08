import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './theme';

/**
 * Snappy meme beat jitter (表情包魔性鼓点压缩抖动)
 * 严格按照 120 BPM 鼓点瞬间压缩拉伸，非平缓正弦波，实现富有节奏感的表情包抖动！
 */
export function getMemeBeatJitter(frame: number) {
  const beatPhase = ((frame % 15) + 15) % 15;
  if (beatPhase === 0) {
    // 鼓点落下的瞬态强力压缩
    return { scaleX: 1.15, scaleY: 0.84, translateY: 7, rot: 1.0, squash: 0.82 };
  }
  if (beatPhase === 1) {
    return { scaleX: 1.10, scaleY: 0.89, translateY: 4, rot: 0.5, squash: 0.88 };
  }
  if (beatPhase === 2) {
    // 迅猛回弹反冲（拉伸）
    return { scaleX: 0.93, scaleY: 1.09, translateY: -6, rot: -0.8, squash: 1.14 };
  }
  if (beatPhase === 3) {
    return { scaleX: 0.97, scaleY: 1.04, translateY: -3, rot: -0.3, squash: 1.06 };
  }
  if (beatPhase === 4) {
    return { scaleX: 1.01, scaleY: 0.99, translateY: 1, rot: 0.1, squash: 0.99 };
  }
  return { scaleX: 1.0, scaleY: 1.0, translateY: 0, rot: 0, squash: 1.0 };
}

/**
 * 带有物理惯性与重力的抛物线跳跃计算
 */
export function calculateParabola(
  frame: number,
  startF: number,
  endF: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
  apexHeight: number = 180,
) {
  if (frame <= startF) return { x: start.x, y: start.y, inAir: 0, squash: 1 };
  if (frame >= endF) return { x: end.x, y: end.y, inAir: 0, squash: 1 };

  const total = endF - startF;
  const current = frame - startF;
  const progress = current / total;

  // X 轴平滑平移
  const x = interpolate(progress, [0, 1], [start.x, end.x], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Y 轴重力抛物线 (4 * h * t * (1 - t))
  const arcLift = 4 * apexHeight * progress * (1 - progress);
  const baseY = interpolate(progress, [0, 1], [start.y, end.y]);
  const y = baseY - arcLift;

  // 起跳、腾空与落地的物理挤压伸展 (Squash & Stretch)
  let squash = 1.0;
  if (progress < 0.15) {
    // 起跳蓄力压缩
    squash = interpolate(progress, [0, 0.1], [1.0, 0.78], { extrapolateRight: 'clamp' });
  } else if (progress < 0.85) {
    // 滞空拉伸
    squash = 1.18;
  } else {
    // 落地瞬间冲量压扁与恢复
    const landT = (progress - 0.85) / 0.15;
    if (landT < 0.5) {
      squash = interpolate(landT, [0, 0.5], [1.18, 0.76]);
    } else {
      squash = interpolate(landT, [0.5, 1.0], [0.76, 1.0]);
    }
  }

  return { x, y, inAir: arcLift, squash };
}

/**
 * 弹性弹出 (Elastic Pop In)
 */
export function popIn(
  frame: number,
  startF: number,
  durF: number = 12,
  overshoot: number = 1.12,
) {
  if (frame < startF) return { scale: 0, opacity: 0 };
  const t = Math.min(1, (frame - startF) / durF);
  if (t < 0.65) {
    const p = t / 0.65;
    return {
      scale: p * overshoot,
      opacity: Math.min(1, p * 1.5),
    };
  }
  const p = (t - 0.65) / 0.35;
  return {
    scale: overshoot - (overshoot - 1.0) * p,
    opacity: 1,
  };
}

/**
 * 简易淡入淡出
 */
export function fadeSlide(
  frame: number,
  startF: number,
  durF: number = 10,
  slideDistance: number = 30,
) {
  if (frame < startF) return { opacity: 0, y: slideDistance };
  const t = Math.min(1, (frame - startF) / durF);
  const ease = Easing.out(Easing.cubic)(t);
  return {
    opacity: ease,
    y: slideDistance * (1 - ease),
  };
}
