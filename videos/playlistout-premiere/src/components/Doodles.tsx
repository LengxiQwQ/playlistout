import React from 'react';
import { C, F } from '../theme';
import { handBoil } from '../anim';

type SvgProps = React.SVGProps<SVGSVGElement>;

export const Sparkle: React.FC<{ size?: number; color?: string; rotate?: number; className?: string }> = ({
  size = 26,
  color = C.yellowDeep,
  rotate = 0,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    style={{ transform: `rotate(${rotate}deg)`, display: 'block' }}
    aria-hidden="true"
  >
    <path
      d="M16.2 2.6c.7 6.2 3.2 10.3 8.9 12.6-5.9 1.8-8.2 5.8-8.8 12.3-.4-6.6-3-10.7-8.9-12.3 6.1-2.1 8.5-6.2 8.8-12.6Z"
      fill={color}
      stroke={C.ink}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const FourStar: React.FC<{ size?: number; color?: string; rotate?: number }> = ({
  size = 24,
  color = C.yellowDeep,
  rotate = 0,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
    <path
      d="M20 2.5 23.1 16 37 20l-13.9 4L20 37.5 16.9 24 3 20l13.9-4L20 2.5Z"
      fill={color}
      stroke={C.ink}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
  </svg>
);

export const Underline: React.FC<{
  width?: number;
  height?: number;
  progress?: number;
  color?: string;
  strokeWidth?: number;
  wobble?: boolean;
  frame?: number;
}> = ({ width = 360, height = 18, progress = 1, color = C.yellowDeep, strokeWidth = 6, wobble = true }) => {
  const length = 800;
  return (
    <svg width={width} height={height} viewBox="0 0 800 38" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M4 23.5c103-9.4 206-12.8 322-9.4 103.3 3 227 11 469 4.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
        opacity="0.9"
        style={{ filter: wobble ? 'url(#under-wobble)' : undefined }}
      />
      <defs>
        <filter id="under-wobble">
          <feTurbulence baseFrequency="0.018" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};

export const Squiggle: React.FC<{
  width?: number;
  color?: string;
  progress?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ width = 160, color = C.inkMuted, progress = 1, strokeWidth = 2.2, className }) => (
  <svg width={width} height={width * 0.18} viewBox="0 0 200 36" fill="none" className={className} aria-hidden="true">
    <path
      d="M3 20c15-15 26 14 42 1s27-13 43 1 29-11 46-1 25 12 41-2 18-2 22 1"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray="240"
      strokeDashoffset={240 * (1 - progress)}
    />
  </svg>
);

export const ArrowCurve: React.FC<{
  width?: number;
  height?: number;
  progress?: number;
  color?: string;
  strokeWidth?: number;
  flip?: boolean;
  className?: string;
}> = ({ width = 260, height = 130, progress = 1, color = C.ink, strokeWidth = 2.4, flip = false, className }) => {
  const length = 560;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 160"
      fill="none"
      className={className}
      style={{ transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        d="M10 138c23-67 78-106 151-112 35-3 64 8 92 27"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
      />
      <path
        d="M230 26c9 7 15 16 18 28M252 53c10-7 18-12 30-15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset={60 * (1 - progress)}
      />
    </svg>
  );
};

export const Tape: React.FC<{
  color?: string;
  rotate?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  opacity?: number;
  className?: string;
}> = ({ color = 'rgba(246, 187, 199, .64)', rotate = -3, width = 126, height = 34, style, opacity = 1, className }) => (
  <div
    className={`tape ${className ?? ''}`}
    style={{
      width,
      height,
      transform: `rotate(${rotate}deg)`,
      ['--tape-color' as any]: color,
      opacity,
      ...style,
    }}
    aria-hidden="true"
  />
);

export const Pin: React.FC<{ color?: string; size?: number; rotate?: number; style?: React.CSSProperties }> = ({
  color = C.marginRed,
  size = 14,
  rotate = 0,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 36% 32%, #fff 0 12%, ${color} 44%, ${color} 58%, rgba(0,0,0,.2) 100%)`,
      boxShadow: '0 3px 4px rgba(45,52,54,.25)',
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
    aria-hidden="true"
  />
);

export const StarDoodle: React.FC<{ frame?: number; size?: number; color?: string; seed?: number; style?: React.CSSProperties }> = ({
  frame = 0,
  size = 20,
  color = C.yellowDeep,
  seed = 1,
  style,
}) => {
  const boil = handBoil(frame, seed, 1.2);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ transform: `translate(${boil.x}px, ${boil.y}px) rotate(${boil.r}deg)`, ...style }}
      aria-hidden="true"
    >
      <path d="M16 3.5 18.9 13 28.5 16l-9.6 3L16 28.5 13.1 19 3.5 16l9.6-3L16 3.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

export const HeartDoodle: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 24,
  color = C.pinkDeep,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 36" fill="none" style={style} aria-hidden="true">
    <path
      d="M20 32.5C17 29 5.5 21.9 4 13.3 2.8 6.6 10.2 2.9 15 6.6c2.1 1.6 3.4 3.3 5 5.5 1.7-2.2 3-4 5-5.5 4.8-3.7 12.2 0 11 6.7-1.5 8.6-13 15.7-16 19.2Z"
      stroke={color}
      strokeWidth="2.3"
      strokeLinejoin="round"
      fill="rgba(255,255,255,.22)"
    />
  </svg>
);

export const CheckDoodle: React.FC<{ size?: number; color?: string; progress?: number; strokeWidth?: number }> = ({
  size = 22,
  color = '#15803d',
  progress = 1,
  strokeWidth = 3,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12.5 9.2 18 20 6.2"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="28"
      strokeDashoffset={28 * (1 - progress)}
    />
  </svg>
);

export const MusicStaffDoodle: React.FC<{
  width?: number;
  lines?: number;
  color?: string;
  gap?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ width = 220, lines = 5, color = C.inkMuted, gap = 9, opacity = 0.4, style }) => (
  <svg width={width} height={gap * (lines - 1) + 8} viewBox={`0 0 ${width} ${gap * (lines - 1) + 8}`} fill="none" style={style} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <path
        key={i}
        d={`M2 ${4 + i * gap}c${width * 0.15} -1 ${width * 0.3} 1.2 ${width * 0.48} 0 ${width * 0.16} -1 ${width * 0.31} 1 ${width * 0.49} 0`}
        stroke={color}
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity={opacity}
      />
    ))}
  </svg>
);

export const ReceiptIcon: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 30,
  color = C.ink,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style} aria-hidden="true">
    <path d="M7 3.5h18v24l-3-2-3 2-3-2-3 2-3-2-3 2v-24Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 10h8M12 15h8M12 20h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const SproutDoodle: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 34,
  color = C.mintDeep,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={style} aria-hidden="true">
    <path d="M20 35V19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M20 23c-7-1-11-5-11-11 7 0 11 4 11 11Z" fill="rgba(126,188,147,.26)" stroke={color} strokeWidth="2" />
    <path d="M20 19c6.5-1 10-4.5 10-10-6.5 0-10 4-10 10Z" fill="rgba(126,188,147,.26)" stroke={color} strokeWidth="2" />
  </svg>
);

export const ChapterMark: React.FC<{
  number: string;
  kicker: string;
  title: string;
  color?: string;
  align?: 'left' | 'center';
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({ number, kicker, title, color = C.ink, align = 'left', compact = false, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: compact ? 12 : 16,
      color,
      fontFamily: F.sans,
      textAlign: align,
      ...style,
    }}
  >
    <div
      style={{
        width: compact ? 34 : 42,
        height: compact ? 34 : 42,
        borderRadius: '50% 44% 47% 40%',
        border: `1.7px solid ${color}`,
        display: 'grid',
        placeItems: 'center',
        fontFamily: F.mono,
        fontSize: compact ? 12 : 14,
        transform: 'rotate(-4deg)',
        flexShrink: 0,
        background: 'rgba(255, 253, 246, .45)',
      }}
    >
      <span style={{ fontFamily: F.display, fontSize: compact ? 19 : 23, lineHeight: 1 }}>♪</span>
    </div>
    <div style={{ lineHeight: 1.15, minWidth: 0 }}>
      <div
        style={{
          fontFamily: F.mono,
          fontSize: compact ? 10 : 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginBottom: compact ? 2 : 4,
          whiteSpace: 'nowrap',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: F.display,
          fontSize: compact ? 23 : 28,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </div>
    </div>
  </div>
);
