import React from 'react';
import {COLORS} from '../theme';

export const Sparkle: React.FC<{
  size?: number;
  color?: string;
  rotate?: number;
  style?: React.CSSProperties;
  opacity?: number;
}> = ({size = 28, color = '#e6b23c', rotate = 0, style, opacity = 1}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    style={{transform: `rotate(${rotate}deg)`, opacity, ...style}}
  >
    <path
      d="M16 2.5c.7 7.7 4.9 12.1 13.1 13.4-8.2 1.4-12.4 5.7-13.1 13.6C15.3 21.6 11.2 17.3 3 16 11.2 14.6 15.3 10.2 16 2.5Z"
      fill={color}
    />
  </svg>
);

export const Star: React.FC<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  rotate?: number;
  style?: React.CSSProperties;
  filled?: boolean;
}> = ({size = 24, color = COLORS.ink, strokeWidth = 2, rotate = 0, style, filled = true}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    style={{transform: `rotate(${rotate}deg)`, overflow: 'visible', ...style}}
  >
    <path
      d="M16 3.4 20 12l9.3 1.1-6.8 6.4 1.8 9.2L16 24.4l-8.3 4.3 1.8-9.2-6.8-6.4L12 12 16 3.4Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

export const ScribbleUnderline: React.FC<{
  width: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  style?: React.CSSProperties;
}> = ({width, color = COLORS.orange, strokeWidth = 4, progress = 1, style}) => {
  const path = `M3 11 C ${width * 0.2} 4, ${width * 0.38} 15, ${width * 0.55} 8 S ${
    width * 0.78
  } 2, ${width - 3} 7`;
  return (
    <svg width={width} height={20} viewBox={`0 0 ${width} 20`} style={{overflow: 'visible', ...style}}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={width * 1.15}
        strokeDashoffset={width * 1.15 * (1 - progress)}
        opacity="0.86"
      />
    </svg>
  );
};

export const HandArrow: React.FC<{
  width?: number;
  height?: number;
  color?: string;
  rotate?: number;
  style?: React.CSSProperties;
  progress?: number;
  d?: string;
}> = ({
  width = 140,
  height = 100,
  color = COLORS.ink,
  rotate = 0,
  style,
  progress = 1,
  d = 'M6 8 C 38 76, 78 94, 127 46',
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 140 100"
    style={{overflow: 'visible', transform: `rotate(${rotate}deg)`, ...style}}
  >
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeDasharray="220"
      strokeDashoffset={220 * (1 - progress)}
    />
    <path
      d="M112 57 L132 44 L129 69"
      fill="none"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="90"
      strokeDashoffset={90 * (1 - progress)}
    />
  </svg>
);

export const CurlyArrow: React.FC<{
  width?: number;
  height?: number;
  color?: string;
  rotate?: number;
  style?: React.CSSProperties;
  progress?: number;
}> = ({width = 150, height = 110, color = COLORS.inkSoft, rotate = 0, style, progress = 1}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 150 110"
    style={{transform: `rotate(${rotate}deg)`, overflow: 'visible', ...style}}
  >
    <path
      d="M8 82 C 30 104, 83 99, 100 61 C 117 24, 83 11, 64 24 C 44 37, 78 57, 139 19"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeDasharray="330"
      strokeDashoffset={330 * (1 - progress)}
    />
    <path
      d="M119 26 L140 18 L135 40"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="60"
      strokeDashoffset={60 * (1 - progress)}
    />
  </svg>
);

export const WavyDots: React.FC<{width?: number; color?: string; style?: React.CSSProperties; rotate?: number}> = ({
  width = 160,
  color = COLORS.inkMuted,
  style,
  rotate = 0,
}) => {
  const dots = [];
  for (let i = 0; i < 8; i++) {
    dots.push([8 + i * (width - 16) / 7, 9 + Math.sin(i * 1.2) * 4]);
  }
  return (
    <svg width={width} height={20} viewBox={`0 0 ${width} 20`} style={{transform: `rotate(${rotate}deg)`, ...style}}>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 7 ? 2.2 : 1.8} fill={color} />
      ))}
    </svg>
  );
};

export const TinyMusicNotes: React.FC<{style?: React.CSSProperties; color?: string; rotate?: number}> = ({
  style,
  color = COLORS.inkMuted,
  rotate = -4,
}) => (
  <svg width="112" height="42" viewBox="0 0 112 42" style={{overflow: 'visible', transform: `rotate(${rotate}deg)`, ...style}}>
    <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M12 29V9l17-4v20" />
      <path d="M12 29c0 4-3 7-7 7s-5-3-2-6 9-5 9-1Z" fill={color} stroke="none" />
      <path d="M29 25c0 4-3 6-7 6s-5-3-2-5 9-5 9-1Z" fill={color} stroke="none" />
      <path d="M67 31V11l17-4v20" />
      <path d="M67 31c0 4-3 7-7 7s-5-3-2-6 9-5 9-1Z" fill={color} stroke="none" />
      <path d="M84 27c0 4-3 6-7 6s-5-3-2-5 9-5 9-1Z" fill={color} stroke="none" />
    </g>
  </svg>
);
