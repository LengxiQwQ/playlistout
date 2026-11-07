import React from 'react';
import { C, F, SHADOW } from '../theme';
import type { FormatCard, BatchPlaylist, Platform } from '../data';
import { ASSETS } from '../assets';

export type PaperTone = 'white' | 'cream' | 'yellow' | 'blue' | 'pink' | 'mint' | 'lilac' | 'peach' | 'dark';

const toneMap: Record<PaperTone, { bg: string; edge: string; texture: number }> = {
  white: { bg: C.paperWhite, edge: 'rgba(45,52,54,.20)', texture: 0.2 },
  cream: { bg: C.paperCream, edge: 'rgba(45,52,54,.18)', texture: 0.22 },
  yellow: { bg: C.yellow, edge: 'rgba(143,114,39,.28)', texture: 0.24 },
  blue: { bg: C.blue, edge: 'rgba(60,104,119,.23)', texture: 0.16 },
  pink: { bg: C.pink, edge: 'rgba(128,78,91,.23)', texture: 0.16 },
  mint: { bg: C.mint, edge: 'rgba(56,111,75,.22)', texture: 0.16 },
  lilac: { bg: C.lilac, edge: 'rgba(91,71,125,.2)', texture: 0.16 },
  peach: { bg: C.peach, edge: 'rgba(142,96,63,.22)', texture: 0.18 },
  dark: { bg: C.terminal, edge: 'rgba(0,0,0,.62)', texture: 0.09 },
};

export const PaperSheet: React.FC<{
  children?: React.ReactNode;
  tone?: PaperTone;
  rotate?: number;
  shadow?: 'none' | 'soft' | 'paper' | 'lifted';
  style?: React.CSSProperties;
  className?: string;
  texture?: boolean;
  bordered?: boolean;
  radius?: string;
}> = ({
  children,
  tone = 'white',
  rotate = 0,
  shadow = 'paper',
  style,
  className,
  texture = true,
  bordered = true,
  radius = '3px 7px 4px 8px / 7px 4px 8px 3px',
}) => {
  const palette = toneMap[tone];
  const shadowMap = {
    none: 'none',
    soft: SHADOW.soft,
    paper: SHADOW.paper,
    lifted: SHADOW.lifted,
  } as const;
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: palette.bg,
        backgroundImage:
          tone === 'dark'
            ? 'radial-gradient(ellipse at 18% 8%, rgba(243,226,183,.08), transparent 44%), linear-gradient(135deg, rgba(255,255,255,.025), transparent 45%)'
            : 'linear-gradient(145deg, rgba(255,255,255,.58), rgba(255,255,255,0) 32%), linear-gradient(315deg, rgba(156,132,94,.055), transparent 48%)',
        border: bordered ? `1.5px solid ${palette.edge}` : 'none',
        borderRadius: radius,
        boxShadow: shadowMap[shadow],
        transform: `rotate(${rotate}deg)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {texture ? (
        <>
          <div
            className="paper-texture"
            style={{
              opacity: Math.min(0.48, palette.texture + 0.18),
              zIndex: 0,
              backgroundImage: `url(${ASSETS.paperTile})`,
              backgroundSize: '330px 330px',
              mixBlendMode: 'multiply',
            }}
            aria-hidden="true"
          />
          <div
            className="paper-texture"
            style={{ opacity: 0.1, zIndex: 0, backgroundImage: `url(${ASSETS.grain})` }}
            aria-hidden="true"
          />
        </>
      ) : null}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          boxShadow:
            tone === 'dark'
              ? 'inset 0 0 100px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.09)'
              : 'inset 0 0 40px rgba(108,87,54,.035), inset 0 1px 0 rgba(255,255,255,.65)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
};

export const StickerTag: React.FC<{
  children: React.ReactNode;
  tone?: string;
  ink?: string;
  rotate?: number;
  border?: boolean;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, tone = C.yellowLight, ink = C.ink, rotate = -1, border = true, style, className }) => (
  <span
    className={className}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '5px 11px',
      background: tone,
      border: border ? `1.3px solid ${ink}` : '1px solid rgba(45,52,54,.12)',
      borderRadius: '3px 5px 4px 6px / 5px 3px 6px 4px',
      color: ink,
      fontFamily: F.note,
      fontSize: 18,
      lineHeight: 1.15,
      boxShadow: border ? '2px 2px 0 rgba(45,52,54,.16)' : '0 2px 3px rgba(45,52,54,.07)',
      transform: `rotate(${rotate}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: string;
  ink?: string;
  style?: React.CSSProperties;
}> = ({ children, tone = C.white, ink = C.ink, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 999,
      border: `1px solid ${ink}2a`,
      background: tone,
      color: ink,
      fontFamily: F.sans,
      fontSize: 13.5,
      fontWeight: 550,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const PlatformChip: React.FC<{
  platform: Platform;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  rotate?: number;
  style?: React.CSSProperties;
}> = ({ platform, active = false, size = 'md', rotate = 0, style }) => {
  const sizes = {
    sm: { fontSize: 15.5, padding: '4px 8px', dot: 8, mark: 14 },
    md: { fontSize: 19, padding: '6px 11px', dot: 10, mark: 16 },
    lg: { fontSize: 25, padding: '9px 15px', dot: 12, mark: 21 },
  }[size];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: sizes.padding,
        background: active ? platform.color : 'rgba(255,253,246,.86)',
        border: `1.4px solid ${active ? platform.ink : 'rgba(45,52,54,.25)'}`,
        borderRadius: '4px 7px 5px 8px / 7px 4px 8px 5px',
        boxShadow: active ? `2px 3px 0 ${platform.ink}26` : '1px 2px 0 rgba(45,52,54,.09)',
        transform: `rotate(${rotate}deg)`,
        fontFamily: F.sans,
        fontWeight: 560,
        fontSize: sizes.fontSize,
        color: active ? platform.ink : C.inkSoft,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: sizes.dot,
          height: sizes.dot,
          borderRadius: '50%',
          background: platform.ink,
          display: 'grid',
          placeItems: 'center',
          color: platform.color,
          fontSize: sizes.mark,
          lineHeight: 1,
          flexShrink: 0,
          fontFamily: F.mono,
        }}
        aria-hidden="true"
      >
        {platform.mark}
      </span>
      {platform.name}
    </div>
  );
};

export const FormatGlyph: React.FC<{
  icon: FormatCard['icon'];
  size?: number;
  color?: string;
  accent?: string;
}> = ({ icon, size = 42, color = C.ink, accent = C.yellowDeep }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  if (icon === 'grid') {
    return (
      <svg {...common}>
        <rect x="4.5" y="8" width="39" height="32" rx="3" stroke={color} strokeWidth="2" />
        <path d="M4.5 17h39M4.5 26h39M4.5 35h39M16 8v32M29.5 8v32" stroke={color} strokeWidth="1.3" opacity=".55" />
        <rect x="7" y="20" width="6" height="4" rx="1" fill={accent} opacity=".75" />
        <rect x="19" y="29" width="7" height="4" rx="1" fill={accent} opacity=".75" />
      </svg>
    );
  }
  if (icon === 'braces') {
    return (
      <svg {...common}>
        <path d="M19 8c-6 0-7 5-7 9v4c0 4-2 6-6 7 4 1 6 3 6 7v5c0 4 1 8 7 8M29 8c6 0 7 5 7 9v4c0 4 2 6 6 7-4 1-6 3-6 7v5c0 4-1 8-7 8" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="24" cy="18" r="2.2" fill={accent} />
        <circle cx="24" cy="30" r="2.2" fill={accent} />
      </svg>
    );
  }
  if (icon === 'lines') {
    return (
      <svg {...common}>
        <rect x="5" y="8.5" width="38" height="31" rx="3" stroke={color} strokeWidth="2" />
        <path d="M5 17h38M18 17v22.5" stroke={color} strokeWidth="1.4" opacity=".55" />
        <path d="M22 24h16M22 29h16M22 34h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="12.7" r="1.2" fill={accent} />
        <circle cx="11" cy="23" r="1.2" fill={accent} />
      </svg>
    );
  }
  if (icon === 'text') {
    return (
      <svg {...common}>
        <path d="M12 7h24v34H12z" stroke={color} strokeWidth="2" />
        <path d="M18 16h12M18 22h12M18 28h12M18 34h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === 'play') {
    return (
      <svg {...common}>
        <rect x="5" y="8" width="38" height="32" rx="4" stroke={color} strokeWidth="2" />
        <path d="M20 18.5 31 24l-11 5.5v-11Z" fill={accent} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11 14h4M11 20h4M11 26h4M11 32h4" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M16 8 8 40M28 8l-8 32M7 18h32M5 30h32" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="35" cy="35" r="4" fill={accent} opacity=".8" />
    </svg>
  );
};

export const MiniCover: React.FC<{
  tone: string;
  deep: string;
  motif: BatchPlaylist['motif'];
  size?: number;
  rotate?: number;
  children?: React.ReactNode;
}> = ({ tone, deep, motif, size = 70, rotate = -2, children }) => (
  <div
    style={{
      width: size,
      height: size,
      background: `linear-gradient(145deg, ${tone}, ${tone} 58%, rgba(255,255,255,.55))`,
      border: `1.5px solid rgba(45,52,54,.35)`,
      borderRadius: '3px 6px 4px 7px',
      boxShadow: `3px 3px 0 ${deep}44`,
      transform: `rotate(${rotate}deg)`,
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block' }} aria-hidden="true">
      {motif === 'flower' && (
        <>
          <circle cx="50" cy="52" r="17" fill={`${deep}55`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="31"
              rx="10"
              ry="16"
              fill="rgba(255,255,255,.45)"
              stroke={deep}
              strokeWidth="1.2"
              transform={`rotate(${i * 60} 50 52)`}
            />
          ))}
          <circle cx="50" cy="52" r="7" fill={deep} opacity=".75" />
          <path d="M10 90c16-16 27 2 42-4s22-12 38-4" stroke={deep} strokeWidth="1.3" opacity=".4" />
        </>
      )}
      {motif === 'moon' && (
        <>
          <path d="M66 20c-13 3-20 15-17 27 3 12 14 19 25 17-7 7-18 10-28 6-13-5-19-20-13-32 5-11 19-18 33-18Z" fill={`${deep}55`} stroke={deep} strokeWidth="1.2" />
          <circle cx="33" cy="27" r="2.2" fill={deep} opacity=".7" />
          <circle cx="74" cy="62" r="1.6" fill={deep} opacity=".6" />
          <path d="M10 83c17-9 30 6 45 0s22-8 35-1" stroke={deep} strokeWidth="1.4" opacity=".42" />
        </>
      )}
      {motif === 'wave' && (
        <>
          <path d="M-5 55c14-18 27 18 42 0s28 15 43 0 22-4 30 0v55H-5V55Z" fill={`${deep}45`} stroke={deep} strokeWidth="1.2" />
          <path d="M-5 67c16-15 28 13 43 0s25 12 39-1 24-5 31 0" stroke={deep} strokeWidth="1.5" opacity=".55" />
          <circle cx="29" cy="30" r="9" fill="rgba(255,255,255,.45)" stroke={deep} strokeWidth="1.2" />
          <path d="M73 24v20M73 24l10 3" stroke={deep} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
    {children}
  </div>
);

export const HandButton: React.FC<{
  children: React.ReactNode;
  tone?: string;
  ink?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
}> = ({ children, tone = C.ink, ink = C.paperWhite, style, size = 'md' }) => {
  const sizes = {
    sm: { padding: '7px 12px', fontSize: 15 },
    md: { padding: '10px 18px', fontSize: 19 },
    lg: { padding: '13px 24px', fontSize: 23 },
  }[size];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: tone,
        color: ink,
        border: `1.6px solid ${C.ink}`,
        borderRadius: '3px 5px 4px 6px / 5px 3px 6px 4px',
        boxShadow: '4px 4px 0 rgba(45,52,54,.22)',
        fontFamily: F.note,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        transform: 'rotate(-.4deg)',
        ...sizes,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const NoteBuddy: React.FC<{
  size?: number;
  rotation?: number;
  style?: React.CSSProperties;
  shadow?: boolean;
  opacity?: number;
}> = ({ size = 104, rotation = -3, style, shadow = true, opacity = 1 }) => (
  <div
    style={{
      width: size,
      height: size,
      transform: `rotate(${rotation}deg)`,
      filter: shadow ? 'drop-shadow(0 11px 10px rgba(66,48,25,.22)) drop-shadow(0 2px 1px rgba(66,48,25,.12))' : undefined,
      opacity,
      ...style,
    }}
    aria-hidden="true"
  >
    <img
      src={ASSETS.logo512}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  </div>
);
