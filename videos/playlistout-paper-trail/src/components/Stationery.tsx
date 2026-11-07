import React from 'react';
import {COLORS} from '../theme';

type PaperProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  color?: string;
  textureOpacity?: number;
  borderWidth?: number;
  borderColor?: string;
  radius?: number | string;
  shadow?: string;
  className?: string;
  onClick?: () => void;
};

/**
 * A sheet of paper with the same fiber + crease language as the website,
 * plus a clean cut edge and a hard stationery shadow.
 */
export const Paper: React.FC<PaperProps> = ({
  children,
  style,
  color = COLORS.paperWhite,
  textureOpacity = 0.38,
  borderWidth = 2,
  borderColor = COLORS.ink,
  radius = 7,
  shadow = '12px 15px 0 rgba(48, 42, 33, 0.16)',
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: color,
        border: borderWidth ? `${borderWidth}px solid ${borderColor}` : 'none',
        borderRadius: radius,
        boxShadow: shadow,
        ...style,
      }}
    >
      <div
        className="paper-texture"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          opacity: textureOpacity,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.52), inset 0 -8px 16px rgba(92,70,39,0.035)',
        }}
      />
      {children}
    </div>
  );
};

const TAPE_BG: Record<string, string> = {
  pink: 'rgba(241, 164, 188, 0.78)',
  blue: 'rgba(155, 212, 235, 0.78)',
  green: 'rgba(146, 213, 177, 0.80)',
  yellow: 'rgba(246, 222, 139, 0.82)',
  kraft: 'rgba(211, 183, 137, 0.78)',
  white: 'rgba(249, 245, 235, 0.72)',
};

export const Tape: React.FC<{
  color?: keyof typeof TAPE_BG;
  rotate?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  opacity?: number;
}> = ({color = 'yellow', rotate = -3, width = 160, height = 34, style, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      width,
      height,
      background: TAPE_BG[color],
      backgroundImage:
        'repeating-linear-gradient(90deg, rgba(255,255,255,0.24) 0 3px, rgba(255,255,255,0.02) 3px 8px)',
      clipPath: 'polygon(1.5% 8%, 98% 0%, 100% 90%, 3% 100%, 0% 55%)',
      transform: `rotate(${rotate}deg)`,
      boxShadow: 'inset 0 0 8px rgba(255,255,255,0.12)',
      opacity,
      ...style,
    }}
  />
);

export const Sticker: React.FC<{
  children: React.ReactNode;
  bg?: string;
  ink?: string;
  border?: string;
  rotate?: number;
  style?: React.CSSProperties;
  shadow?: boolean;
}> = ({
  children,
  bg = COLORS.yellow,
  ink = COLORS.ink,
  border = COLORS.ink,
  rotate = 0,
  style,
  shadow = true,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      background: bg,
      color: ink,
      border: `1.5px solid ${border}`,
      borderRadius: 4,
      padding: '5px 11px',
      fontSize: 15,
      lineHeight: 1.15,
      boxShadow: shadow ? '2.5px 2.5px 0 rgba(45,52,54,0.92)' : 'none',
      transform: `rotate(${rotate}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

export const CoverArt: React.FC<{width: number; height: number; radius?: number; style?: React.CSSProperties}> = ({
  width,
  height,
  radius = 4,
  style,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(155deg, #28334d 0%, #3d4f66 42%, #b98e6d 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
      ...style,
    }}
  >
    <svg width={width} height={height} viewBox="0 0 200 200" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={`coverSky-${width}-${height}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#1f2d45" />
          <stop offset="0.55" stopColor="#3e5368" />
          <stop offset="1" stopColor="#b98568" />
        </linearGradient>
        <radialGradient id={`moonGlow-${width}-${height}`}>
          <stop offset="0" stopColor="#fff4ce" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ffe4a8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffe4a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#coverSky-${width}-${height})`} />
      <circle cx="150" cy="55" r="60" fill={`url(#moonGlow-${width}-${height})`} />
      <circle cx="150" cy="55" r="25" fill="#ffe9b5" opacity="0.95" />
      <circle cx="159" cy="48" r="25" fill="#374b62" opacity="0.92" />
      <path d="M0 148 C40 122 65 145 95 132 C126 119 158 135 200 112 V200 H0 Z" fill="#2b3b4e" opacity="0.78" />
      <path d="M0 165 C46 142 77 168 113 154 C153 138 172 159 200 150 V200 H0 Z" fill="#1e2a37" opacity="0.90" />
      <g fill="#ffe8b3" opacity="0.8">
        <circle cx="39" cy="38" r="1.7" />
        <circle cx="64" cy="72" r="1.3" />
        <circle cx="97" cy="36" r="1.1" />
        <circle cx="126" cy="88" r="1.5" />
        <circle cx="25" cy="102" r="1.2" />
      </g>
      <path d="M122 119c8-12 18-18 29-21" fill="none" stroke="#ffdfa2" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      <path d="M40 134v-29m0 0l-8 5m8-5l8 4" fill="none" stroke="#f6ddae" strokeWidth="1.1" strokeLinecap="round" opacity="0.4" />
    </svg>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, transparent 30%, transparent 72%, rgba(0,0,0,0.18) 100%)',
      }}
    />
  </div>
);

export const HandLine: React.FC<{
  width: number;
  color?: string;
  strokeWidth?: number;
  rotate?: number;
  style?: React.CSSProperties;
  opacity?: number;
}> = ({width, color = COLORS.orange, strokeWidth = 3, rotate = -0.6, style, opacity = 0.9}) => (
  <svg
    width={width}
    height={Math.max(8, strokeWidth * 4)}
    viewBox={`0 0 ${width} ${Math.max(8, strokeWidth * 4)}`}
    style={{display: 'block', transform: `rotate(${rotate}deg)`, ...style}}
  >
    <path
      d={`M3 ${strokeWidth * 2.2} C ${width * 0.22} ${strokeWidth * 0.8}, ${width * 0.55} ${strokeWidth * 3.4}, ${
        width - 3
      } ${strokeWidth * 1.4}`}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      opacity={opacity}
    />
  </svg>
);

export const HandDrawnCheck: React.FC<{size?: number; color?: string; progress?: number}> = ({
  size = 19,
  color = COLORS.green,
  progress = 1,
}) => {
  const len = 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block', overflow: 'visible'}}>
      <path
        d="M3.5 12.7c2.5 1.7 4.8 4.4 5.8 6.2C11.8 13 16.2 7.9 21.1 3.7"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - progress)}
      />
    </svg>
  );
};
