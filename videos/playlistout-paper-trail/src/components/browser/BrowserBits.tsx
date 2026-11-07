import React from 'react';
import {LOGO_128} from '../../assets';
import {COLORS, FONTS, PLATFORMS} from '../../theme';
import {HandDrawnCheck} from '../Stationery';

export const SiteHeader: React.FC<{compact?: boolean}> = ({compact = false}) => (
  <div
    style={{
      height: compact ? 58 : 70,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: compact ? '0 36px' : '0 48px',
      position: 'relative',
      zIndex: 5,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 13}}>
      <img
        src={LOGO_128}
        alt=""
        style={{
          width: compact ? 34 : 42,
          height: compact ? 34 : 42,
          filter: 'drop-shadow(1.5px 2px 0 rgba(45,52,54,0.16))',
          transform: 'rotate(-2deg)',
        }}
      />
      <div>
        <div
          style={{
            fontFamily: FONTS.marker,
            fontSize: compact ? 21 : 25,
            color: COLORS.ink,
            lineHeight: 1.1,
            letterSpacing: '0.01em',
          }}
        >
          Playlist Out
        </div>
        <div
          style={{
            fontFamily: FONTS.handLatin,
            fontSize: compact ? 12 : 14,
            color: COLORS.inkSoft,
            letterSpacing: '0.09em',
            marginTop: -1,
          }}
        >
          粘贴 · 解析 · 导出
        </div>
      </div>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      {['下载桌面版', '☆ Star 支持一下', '字体 ▾', '中 / EN'].map((label, i) => (
        <div
          key={label}
          style={{
            fontFamily: i === 3 ? FONTS.mono : FONTS.sans,
            fontWeight: i === 3 ? 700 : 600,
            fontSize: compact ? 10.5 : 12,
            color: COLORS.ink,
            border: '1.5px solid rgba(45,52,54,0.72)',
            background: i === 1 ? '#fff7cd' : 'rgba(255,253,247,0.72)',
            padding: compact ? '4px 8px' : '5px 10px',
            boxShadow: '1.5px 1.5px 0 rgba(45,52,54,0.75)',
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  </div>
);

export const PlatformChipRow: React.FC<{
  compact?: boolean;
  highlighted?: string | null;
  glow?: number;
}> = ({compact = false, highlighted, glow = 0}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: compact ? 7 : 9, flexWrap: 'wrap'}}>
    {PLATFORMS.map((platform) => {
      const isActive = highlighted === platform.id;
      return (
        <div
          key={platform.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: platform.bg,
            border: `1.3px solid ${isActive ? COLORS.ink : platform.border}`,
            color: platform.ink,
            fontFamily: FONTS.hand,
            fontSize: compact ? 12 : 14,
            padding: compact ? '3px 7px' : '4px 9px',
            borderRadius: 3,
            transform: `rotate(${(PLATFORMS.indexOf(platform) % 2 === 0 ? -0.7 : 0.7)}deg) scale(${isActive ? 1.06 + glow * 0.04 : 1})`,
            boxShadow: isActive ? `2px 2px 0 rgba(45,52,54,0.85)` : '1px 1px 0 rgba(45,52,54,0.12)',
            transition: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {isActive && <span style={{fontSize: 9}}>●</span>}
          {platform.name}
          {!compact && platform.note && (
            <span style={{fontSize: 10, fontFamily: FONTS.sans, fontWeight: 500, opacity: 0.7}}>{platform.note}</span>
          )}
        </div>
      );
    })}
  </div>
);

export const ParseButton: React.FC<{pressed: number; loading: boolean; label?: string}> = ({
  pressed,
  loading,
  label = '解析',
}) => (
  <div
    style={{
      width: 98,
      height: 54,
      background: COLORS.ink,
      color: '#fff9ea',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONTS.hand,
      fontSize: 24,
      letterSpacing: '0.06em',
      border: '1.5px solid #181d1f',
      boxShadow: `${3 - pressed * 2}px ${3 - pressed * 2}px 0 rgba(45,52,54,0.28)`,
      transform: `translate(${pressed * 2}px, ${pressed * 2}px) rotate(${-0.8 + pressed * 0.2}deg)`,
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    <span style={{opacity: loading ? 0.92 : 1}}>{label}</span>
    {loading && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)',
        }}
      />
    )}
  </div>
);

export const Cursor: React.FC<{
  x: number;
  y: number;
  opacity?: number;
  pressed?: number;
  scale?: number;
  rotation?: number;
}> = ({x, y, opacity = 1, pressed = 0, scale = 1, rotation = -8}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity,
      transform: `translate(-3px, -2px) scale(${scale * (1 - pressed * 0.08)}) rotate(${rotation + pressed * 4}deg)`,
      transformOrigin: '0 0',
      zIndex: 200,
      filter: 'drop-shadow(1px 2px 0 rgba(255,255,255,0.9))',
      pointerEvents: 'none',
    }}
  >
    <svg width="35" height="45" viewBox="0 0 35 45">
      <path
        d="M4 3.5 28.5 24l-11.7 1.5-5.1 11.4L4 3.5Z"
        fill={COLORS.ink}
        stroke="#fffdf5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
    {pressed > 0.01 && (
      <div
        style={{
          position: 'absolute',
          left: 2,
          top: 7,
          width: 47,
          height: 47,
          borderRadius: '50%',
          border: `2px solid rgba(45,52,54,${0.38 * (1 - pressed)})`,
          transform: `scale(${0.25 + pressed * 1.25})`,
          opacity: 1 - pressed,
        }}
      />
    )}
  </div>
);

export const FormatSticker: React.FC<{
  label: string;
  color: string;
  border: string;
  ink: string;
  selected: boolean;
  tick?: number;
  rotate?: number;
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({label, color, border, ink, selected, tick = 1, rotate = 0, compact = false, style}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: compact ? '5px 9px' : '7px 11px',
      borderRadius: 4,
      background: color,
      border: selected ? `2px solid ${COLORS.ink}` : `1.3px dashed ${border}`,
      boxShadow: selected ? '2px 2px 0 rgba(45,52,54,0.82)' : 'none',
      fontFamily: FONTS.mono,
      fontSize: compact ? 11.5 : 13.5,
      color: ink,
      transform: `rotate(${rotate}deg) translateY(${selected ? -1 : 0}px)`,
      opacity: selected ? 1 : 0.66,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        border: selected ? '1.8px solid rgba(45,52,54,0.9)' : '1.3px dashed rgba(45,52,54,0.4)',
        borderRadius: 3,
        display: 'grid',
        placeItems: 'center',
        background: selected ? '#fffdf7' : 'rgba(255,255,255,0.45)',
        flexShrink: 0,
      }}
    >
      {selected && <HandDrawnCheck size={14} progress={tick} />}
    </span>
    {label}
  </div>
);

export const InkSpinner: React.FC<{size?: number; speed?: number; frame: number}> = ({size = 26, speed = 8, frame}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{transform: `rotate(${frame * speed}deg)`}}>
    <path
      d="M16 3.4c6.9 0 12.5 5.7 12.5 12.6"
      fill="none"
      stroke={COLORS.ink}
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M16 28.6C9.1 28.6 3.5 22.9 3.5 16"
      fill="none"
      stroke="rgba(45,52,54,0.24)"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const TableStatus: React.FC<{kind: 'normal' | 'vip' | 'unavailable' | 'paid'}> = ({kind}) => {
  const config = {
    normal: {label: '正常', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0'},
    vip: {label: 'VIP', bg: '#fef3c7', color: '#92400e', border: '#fcd34d'},
    unavailable: {label: '下架/无版权', bg: '#fef2f2', color: '#991b1b', border: '#fecaca'},
    paid: {label: '付费专辑', bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe'},
  }[kind];
  return (
    <span
      style={{
        fontFamily: FONTS.sans,
        fontSize: 10.5,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: 3,
        padding: '2px 5px',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
};

export const MiniCover: React.FC<{color: string; ink: string; size?: number}> = ({color, ink, size = 32}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 3,
      background: color,
      border: '1px solid rgba(45,52,54,0.18)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: '1px 1.5px 0 rgba(45,52,54,0.13)',
    }}
  >
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d="M0 22 Q8 16 16 22 T32 20 V32 H0Z" fill={ink} opacity="0.28" />
      <circle cx="22" cy="10" r="5" fill="#fff7d5" opacity="0.9" />
      <path d="M5 26 11 16 17 26Z" fill={ink} opacity="0.25" />
    </svg>
  </div>
);
