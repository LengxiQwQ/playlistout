import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { calculateParabola, getMemeBeatJitter } from '../anim';
import { C, F } from '../theme';
import {
  CloudNoteMascot,
  MascotExpression,
  MascotPose,
  ReachDirection,
} from './CloudNoteMascot';

interface MascotState {
  f: number;
  x: number;
  y: number;
  size: number;
  pose: MascotPose;
  expression: MascotExpression;
  reachDir?: ReachDirection;
  isContact?: boolean;
  pointDir?: 'left' | 'right' | 'down';
  flipX?: boolean;
  bubble?: string;
  isJump?: boolean;
  jumpApex?: number;
}

const TRAJECTORY: MascotState[] = [
  // ================= 场景 1：笼中受困 -> 钥匙破笼 -> 腾空高跃 -> 品牌手账展台 =================
  { f: 0,   x: 480,  y: 530, size: 230, pose: 'trapped', expression: 'panic' },
  { f: 120, x: 480,  y: 530, size: 230, pose: 'trapped', expression: 'panic' },
  { f: 135, x: 480,  y: 520, size: 235, pose: 'cheer',   expression: 'rescued', bubble: '锁开了！' },
  { f: 150, x: 480,  y: 520, size: 235, pose: 'jump',    expression: 'rescued', isJump: true, jumpApex: 280 },
  // 破笼跃落于右侧专属展台 (x: 1360, y: 650，位于品牌卡下方专属基座，绝不遮挡 6 平台胶带！)
  { f: 185, x: 1360, y: 650, size: 235, pose: 'cheer',   expression: 'happy',   bubble: '自由啦！把歌单带走！' },
  { f: 235, x: 1360, y: 650, size: 235, pose: 'cheer',   expression: 'happy' },

  // ================= 场景 2：跑向输送带 -> 粘贴链接 -> 跺下果冻解析键 -> 专属观景台引导 =================
  { f: 240, x: 280,  y: 280, size: 210, pose: 'run',     expression: 'happy', bubble: '粘贴歌单链接 ♪' },
  { f: 300, x: 960,  y: 280, size: 210, pose: 'run',     expression: 'happy' },
  { f: 315, x: 960,  y: 280, size: 210, pose: 'push',    expression: 'focus', bubble: '啪嗒贴上！' },
  { f: 345, x: 960,  y: 280, size: 210, pose: 'jump',    expression: 'focus', isJump: true, jumpApex: 120 },
  { f: 365, x: 1320, y: 270, size: 215, pose: 'press',   expression: 'focus', reachDir: 'right', isContact: true, bubble: '一秒解析！' },
  { f: 385, x: 1320, y: 270, size: 215, pose: 'press',   expression: 'focus', reachDir: 'right', isContact: true },
  { f: 395, x: 1320, y: 270, size: 215, pose: 'jump',    expression: 'happy', isJump: true, jumpApex: 110 },
  // 跳下至右侧专属独立观景露台 (x: 1620, y: 550，零遮挡左侧 104 首曲目卷轴！)
  { f: 415, x: 1620, y: 550, size: 215, pose: 'guide',   expression: 'wink',  pointDir: 'left', bubble: '104 首全部解析就绪！' },
  { f: 590, x: 1620, y: 550, size: 215, pose: 'guide',   expression: 'wink',  pointDir: 'left' },

  // ================= 场景 3：折纸多格式 -> 专属中央走廊跳跃 (零遮挡 Excel/JSON 正文！) =================
  // 位于左侧卡片下方的开阔走廊 (x: 520, y: 650)
  { f: 600, x: 520,  y: 650, size: 205, pose: 'guide',   expression: 'happy', pointDir: 'right', bubble: '双工作表 Excel！' },
  { f: 710, x: 520,  y: 650, size: 205, pose: 'guide',   expression: 'happy', pointDir: 'right' },
  // 腾空跨越至右侧 JSON 卡片下方的开阔走廊 (x: 1380, y: 650)，绝不压在 JSON 代码上！
  { f: 715, x: 520,  y: 650, size: 205, pose: 'jump',    expression: 'rescued', isJump: true, jumpApex: 150 },
  { f: 745, x: 1380, y: 650, size: 205, pose: 'idle',    expression: 'proud', bubble: '标准 JSON 结构！' },
  { f: 815, x: 1380, y: 650, size: 205, pose: 'idle',    expression: 'proud' },
  // 跳向底部安全印章
  { f: 820, x: 1380, y: 650, size: 205, pose: 'jump',    expression: 'happy', isJump: true, jumpApex: 120 },
  { f: 850, x: 960,  y: 810, size: 215, pose: 'press',   expression: 'happy', reachDir: 'down', isContact: true, bubble: '本地安全生成！' },
  { f: 890, x: 960,  y: 810, size: 215, pose: 'press',   expression: 'happy', reachDir: 'down', isContact: true },

  // ================= 场景 4：批量跳格子打勾 (1, 2, 3) -> 抓拉链一拉到底封箱 =================
  { f: 900,  x: 580,  y: 260, size: 180, pose: 'press', expression: 'focus', reachDir: 'down', isContact: true, bubble: '第 1 张已勾！' },
  { f: 940,  x: 580,  y: 260, size: 180, pose: 'press', expression: 'focus', reachDir: 'down', isContact: true },
  { f: 945,  x: 580,  y: 260, size: 180, pose: 'jump',  expression: 'happy', isJump: true, jumpApex: 80 },
  { f: 965,  x: 1100, y: 260, size: 180, pose: 'press', expression: 'wink',  reachDir: 'down', isContact: true, bubble: '第 2 张已勾！' },
  { f: 980,  x: 1100, y: 260, size: 180, pose: 'press', expression: 'wink',  reachDir: 'down', isContact: true },
  { f: 985,  x: 1100, y: 260, size: 180, pose: 'jump',  expression: 'cheer', isJump: true, jumpApex: 80 },
  { f: 1005, x: 1620, y: 260, size: 180, pose: 'press', expression: 'cheer', reachDir: 'down', isContact: true, bubble: '151 首全部勾选！' },
  { f: 1030, x: 1620, y: 260, size: 180, pose: 'press', expression: 'cheer', reachDir: 'down', isContact: true },
  { f: 1035, x: 1620, y: 260, size: 180, pose: 'jump',  expression: 'happy', isJump: true, jumpApex: 120 },
  { f: 1065, x: 520,  y: 730, size: 195, pose: 'pull',  expression: 'pull',  reachDir: 'left', bubble: '抓住拉链！' },
  { f: 1075, x: 520,  y: 730, size: 195, pose: 'pull',  expression: 'pull',  reachDir: 'left', bubble: '用力拉——' },
  { f: 1140, x: 1360, y: 730, size: 195, pose: 'pull',  expression: 'pull',  reachDir: 'left', bubble: '封箱打包完成！' },
  { f: 1150, x: 1420, y: 730, size: 205, pose: 'idle',  expression: 'proud', bubble: 'ZIP 封箱完成！' },
  { f: 1190, x: 1420, y: 730, size: 205, pose: 'idle',  expression: 'proud' },

  // ================= 场景 5：微型终端笔记本敲字 -> 并拢双脚跺下黄色 Enter 回车 =================
  { f: 1200, x: 1540, y: 440, size: 230, pose: 'laptop', expression: 'focus', bubble: '命令行极速体验！' },
  { f: 1315, x: 1540, y: 440, size: 230, pose: 'laptop', expression: 'focus' },
  { f: 1320, x: 1540, y: 440, size: 230, pose: 'jump',   expression: 'focus', isJump: true, jumpApex: 140, bubble: '敲下回车！' },
  { f: 1350, x: 1540, y: 730, size: 240, pose: 'press',  expression: 'rescued', reachDir: 'down', isContact: true },
  { f: 1385, x: 1540, y: 730, size: 240, pose: 'press',  expression: 'rescued', reachDir: 'down', isContact: true },
  { f: 1395, x: 1540, y: 700, size: 230, pose: 'cheer',  expression: 'happy', bubble: '全平台单文件免配环境！' },
  { f: 1490, x: 1540, y: 700, size: 230, pose: 'cheer',  expression: 'happy' },

  // ================= 场景 6：第三方开源播放器生态流动 =================
  { f: 1500, x: 420,  y: 660, size: 190, pose: 'run',   expression: 'happy', bubble: '歌单流入各大播放器 ♪' },
  { f: 1560, x: 1020, y: 660, size: 190, pose: 'run',   expression: 'happy' },
  { f: 1610, x: 1540, y: 660, size: 190, pose: 'star',  expression: 'cheer' },

  // ================= 场景 7：品牌手账终章 -> 抱金星 -> 眨眼定格 =================
  { f: 1620, x: 1460, y: 550, size: 275, pose: 'star',  expression: 'happy', bubble: '把你的歌单带走 ♥' },
  { f: 1680, x: 1460, y: 550, size: 275, pose: 'star',  expression: 'wink',  bubble: '把你的歌单带走 ♥' },
  { f: 1740, x: 1460, y: 550, size: 275, pose: 'star',  expression: 'wink' },
];

export const MascotActor: React.FC = () => {
  const frame = useCurrentFrame();

  let prev = TRAJECTORY[0];
  let next = TRAJECTORY[0];
  for (let i = 0; i < TRAJECTORY.length - 1; i++) {
    if (frame >= TRAJECTORY[i].f && frame <= TRAJECTORY[i + 1].f) {
      prev = TRAJECTORY[i];
      next = TRAJECTORY[i + 1];
      break;
    }
  }

  let x = prev.x;
  let y = prev.y;
  let inAir = 0;
  let squash = 1.0;

  if (prev.isJump && next.f > prev.f) {
    const res = calculateParabola(
      frame,
      prev.f,
      next.f,
      { x: prev.x, y: prev.y },
      { x: next.x, y: next.y },
      prev.jumpApex ?? 160,
    );
    x = res.x;
    y = res.y;
    inAir = res.inAir;
    squash = res.squash;
  } else if (next.f > prev.f) {
    const p = (frame - prev.f) / (next.f - prev.f);
    const ease = Easing.inOut(Easing.cubic)(p);
    x = interpolate(ease, [0, 1], [prev.x, next.x]);
    y = interpolate(ease, [0, 1], [prev.y, next.y]);
  }

  const size = interpolate(frame, [prev.f, next.f], [prev.size, next.size], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pose = frame >= next.f - 4 ? next.pose : prev.pose;
  const expression = frame >= next.f - 4 ? next.expression : prev.expression;
  const reachDir = prev.reachDir ?? next.reachDir ?? 'none';
  const isContact = (prev.isContact && frame >= prev.f) || (next.isContact && frame >= next.f - 6);
  const pointDir = prev.pointDir ?? next.pointDir ?? 'right';
  const flipX = prev.flipX ?? false;
  const bubble = prev.bubble ?? next.bubble;

  const jitter = getMemeBeatJitter(frame);
  const panicShakeX = expression === 'panic' ? Math.sin(frame * 2.4) * 2.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x + panicShakeX,
        top: y,
        transform: `translate(-50%, -50%) translate(${jitter.translateY * 0.3}px, ${jitter.translateY}px) rotate(${jitter.rot}deg) scale(${jitter.scaleX}, ${jitter.scaleY})`,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {/* 萌萌手账纸风气泡 */}
      {bubble && (
        <div
          style={{
            position: 'absolute',
            bottom: size * 0.92,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFFDF9',
            border: '3px solid #3E5366',
            borderRadius: 22,
            padding: '6px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
            whiteSpace: 'nowrap',
            fontFamily: F.kuaile,
            fontSize: 20,
            fontWeight: 800,
            color: '#2B3942',
            zIndex: 60,
          }}
        >
          {bubble}
          <div
            style={{
              position: 'absolute',
              bottom: -9,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '9px solid #3E5366',
            }}
          />
        </div>
      )}

      {/* 官方吉祥物组件 */}
      <CloudNoteMascot
        size={size}
        frame={frame}
        pose={pose}
        expression={expression}
        reachDir={reachDir}
        isContact={isContact}
        pointDir={pointDir}
        squash={squash * jitter.squash}
        inAir={inAir}
        flipX={flipX}
        catEars={true}
        stickerBorder={true}
      />
    </div>
  );
};
