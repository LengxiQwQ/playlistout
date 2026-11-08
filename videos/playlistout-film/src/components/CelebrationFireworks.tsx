import React from 'react';
import { easeBackOut } from '../anim';
import { C, F } from '../theme';

export interface FireworkParticleDef {
  angleRad: number;
  dist: number;
  color: string;
  type: 'ribbon' | 'star' | 'note' | 'diamond' | 'circle';
  noteChar: string;
  rotSpeed: number;
  gravity: number;
  size: number;
}

// 40 颗精美彩片粒子模板
export const GENERATE_FIREWORK_PARTICLES = (seed = 0): FireworkParticleDef[] => {
  return Array.from({ length: 40 }).map((_, i) => {
    const angleDeg = -175 + (i * 350) / 39 + (((i * 17 + seed * 13) % 25) - 12);
    const angleRad = (angleDeg * Math.PI) / 180;
    const dist = 120 + (((i * 37 + seed * 23) % 230));
    const colors = ['#FFD700', '#38BDF8', '#4ADE80', '#F43F5E', '#A855F7', '#FDE047', '#FF9F43', '#FFFFFF'];
    const color = colors[(i + seed) % colors.length];
    const types: ('ribbon' | 'star' | 'note' | 'diamond' | 'circle')[] = [
      'ribbon',
      'star',
      'ribbon',
      'note',
      'diamond',
      'star',
      'circle',
    ];
    const type = types[(i + seed) % types.length];
    const notes = ['♪', '♫', '♬'];
    const noteChar = notes[(i + seed) % notes.length];
    const rotSpeed = (((i * 53 + seed * 31) % 720) - 360);
    return {
      angleRad,
      dist,
      color,
      type,
      noteChar,
      rotSpeed,
      gravity: 0.55 + (((i * 19 + seed * 7) % 45) / 100),
      size: 13 + (((i * 11 + seed * 5) % 12)),
    };
  });
};

const DEFAULT_PARTICLES = GENERATE_FIREWORK_PARTICLES(42);

export interface CelebrationFireworksProps {
  frame: number;
  burstFrame: number;
  cx: number;
  cy: number;
  duration?: number;
  scale?: number;
  badgeText?: string;
  badgeBg?: string;
  badgeInk?: string;
  particles?: FireworkParticleDef[];
}

/**
 * 通用爆炸礼花组件 (带双重光环扩散冲击波、飞舞彩片、音符与星星，可选庆祝徽章)
 */
export const CelebrationFireworks: React.FC<CelebrationFireworksProps> = ({
  frame,
  burstFrame,
  cx,
  cy,
  duration = 48,
  scale = 1,
  badgeText,
  badgeBg = C.yellow,
  badgeInk = C.ink,
  particles = DEFAULT_PARTICLES,
}) => {
  if (frame < burstFrame || frame > burstFrame + duration) return null;

  const age = frame - burstFrame;
  const progress = Math.min(1, age / (duration * 0.8));
  const shockProgress = Math.min(1, age / (duration * 0.5));
  const badgePop = easeBackOut(frame, burstFrame + 2, 16);
  const badgeFade = age > duration - 14 ? Math.max(0, 1 - (age - (duration - 14)) / 14) : 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 55,
      }}
    >
      {/* 1. 双重扩散冲击波光环 */}
      {shockProgress < 1 && (
        <svg
          style={{
            position: 'absolute',
            left: cx - 260 * scale,
            top: cy - 260 * scale,
            width: 520 * scale,
            height: 520 * scale,
            overflow: 'visible',
          }}
          viewBox="-260 -260 520 520"
        >
          {/* 金色主扩散圆环 */}
          <circle
            cx={0}
            cy={0}
            r={shockProgress * 220 * scale}
            fill="none"
            stroke="#FFD700"
            strokeWidth={Math.max(1, (1 - shockProgress) * 7)}
            strokeDasharray="14 8"
            opacity={(1 - shockProgress) * 0.95}
          />
          {/* 彩色内层光环 */}
          <circle
            cx={0}
            cy={0}
            r={Math.max(0, shockProgress * 150 * scale - 10)}
            fill="none"
            stroke="#38BDF8"
            strokeWidth={Math.max(1, (1 - shockProgress) * 5)}
            opacity={(1 - shockProgress) * 0.85}
          />
        </svg>
      )}

      {/* 2. 向四周爆炸迸发的彩色纸屑、四角星芒与飞舞音符 */}
      {particles.map((p, idx) => {
        const flyEase = 1 - Math.pow(1 - progress, 2.5);
        const curDist = p.dist * scale * flyEase;
        const px = cx + Math.cos(p.angleRad) * curDist;
        const py = cy + Math.sin(p.angleRad) * curDist + progress * progress * p.gravity * 85 * scale;
        const pRot = progress * p.rotSpeed;
        const pOpacity = progress < 0.08 ? progress / 0.08 : Math.max(0, 1 - Math.pow(progress, 1.5));
        const pScale = (progress < 0.1 ? progress / 0.1 : Math.max(0.2, 1 - progress * 0.65)) * scale;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: `translate(-50%, -50%) rotate(${pRot}deg) scale(${pScale})`,
              opacity: pOpacity,
              color: p.color,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: p.size,
              userSelect: 'none',
              filter: 'drop-shadow(1px 2px 0 rgba(45, 52, 54, 0.35))',
            }}
          >
            {p.type === 'ribbon' && (
              <div
                style={{
                  width: p.size * 1.35,
                  height: p.size * 0.55,
                  borderRadius: 3,
                  backgroundColor: p.color,
                  border: '1.8px solid #2d3436',
                }}
              />
            )}
            {p.type === 'star' && <span>✦</span>}
            {p.type === 'note' && <span>{p.noteChar}</span>}
            {p.type === 'diamond' && (
              <div
                style={{
                  width: p.size * 0.85,
                  height: p.size * 0.85,
                  backgroundColor: p.color,
                  border: '1.6px solid #2d3436',
                  transform: 'rotate(45deg)',
                }}
              />
            )}
            {p.type === 'circle' && (
              <div
                style={{
                  width: p.size * 0.75,
                  height: p.size * 0.75,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  border: '1.6px solid #2d3436',
                }}
              />
            )}
          </div>
        );
      })}

      {/* 3. 庆祝浮起徽章 (可选) */}
      {badgeText && (
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy - 75 * scale,
            transform: `translate(-50%, -50%) scale(${badgePop}) translateY(${-progress * 30}px) rotate(-1.5deg)`,
            opacity: badgeFade * Math.min(1, age / 4),
            padding: '12px 24px',
            borderRadius: 22,
            backgroundColor: badgeBg,
            border: '3.5px solid #2d3436',
            boxShadow: '0 10px 0 #2d3436, 0 16px 28px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            whiteSpace: 'nowrap',
            zIndex: 60,
          }}
        >
          <span
            style={{
              fontFamily: F.sans,
              fontSize: 24,
              fontWeight: 900,
              color: badgeInk,
              letterSpacing: '-0.01em',
            }}
          >
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};
