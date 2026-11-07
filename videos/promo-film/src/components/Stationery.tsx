import React from 'react';

export type TapeColor = 'pink' | 'cyan' | 'green' | 'yellow';
export type StickerColor = 'yellow' | 'green' | 'red' | 'blue' | 'pink' | 'purple' | 'lime' | 'cyan' | 'white';

const TAPE_BG: Record<TapeColor, string> = {
  pink: 'rgba(244, 114, 182, 0.58)',
  cyan: 'rgba(103, 232, 249, 0.58)',
  green: 'rgba(134, 239, 172, 0.54)',
  yellow: 'rgba(253, 224, 71, 0.68)',
};

const STICKER_BG: Record<StickerColor, string> = {
  yellow: '#fff8bd',
  green: '#dcfce7',
  red: '#ffe4e6',
  blue: '#dbeafe',
  pink: '#fce7f3',
  purple: '#f3e8ff',
  lime: '#ecfccb',
  cyan: '#cffafe',
  white: '#ffffff',
};

export const WashiTape: React.FC<{
  color?: TapeColor;
  rotateDeg?: number;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}> = ({ color = 'pink', rotateDeg = -8, width = 116, height = 28, style }) => (
  <div
    className="washi-tape"
    style={{
      width,
      height,
      backgroundColor: TAPE_BG[color],
      transform: `rotate(${rotateDeg}deg)`,
      pointerEvents: 'none',
      ...style,
    }}
  />
);

export const JournalSticker: React.FC<{
  color?: StickerColor;
  rotateDeg?: number;
  active?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}> = ({ color = 'yellow', rotateDeg = 0, active = false, style, className = '', children }) => (
  <div
    className={`paper-textured ${className}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      backgroundColor: STICKER_BG[color],
      border: active ? '2.5px solid #2d3436' : '2px solid #2d3436',
      borderRadius: '18px 180px 16px 190px / 190px 16px 180px 18px',
      boxShadow: active ? '4px 4px 0 #2d3436' : '2.5px 3px 0 #2d3436',
      color: '#2d3436',
      fontWeight: 700,
      transform: `rotate(${rotateDeg}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

export const MarkerBtn: React.FC<{
  variant?: 'ink' | 'paper' | 'yellow';
  rotateDeg?: number;
  pressed?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ variant = 'ink', rotateDeg = -1, pressed = false, style, children }) => {
  const bg = variant === 'ink' ? '#2d3436' : variant === 'yellow' ? '#fff8bd' : '#ffffff';
  const fg = variant === 'ink' ? '#ffffff' : '#2d3436';
  return (
    <div
      className="hand-border-alt"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 26px',
        backgroundColor: bg,
        color: fg,
        fontFamily: 'var(--font-playful)',
        fontSize: 22,
        fontWeight: 700,
        boxShadow: pressed ? '1px 1px 0 #2d3436' : '4px 4px 0 #2d3436',
        transform: `translate(${pressed ? 2 : 0}px, ${pressed ? 2 : 0}px) rotate(${rotateDeg}deg)`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const HandCheck: React.FC<{ size?: number; color?: string }> = ({
  size = 15,
  color = '#15803d',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', transform: 'rotate(-4deg)' }}
  >
    <path d="M4 12.5l5.2 5.5L20 6" />
  </svg>
);

export const InkCursor: React.FC<{
  x: number;
  y: number;
  clicking?: boolean;
  label?: string;
  opacity?: number;
}> = ({ x, y, clicking = false, label, opacity = 1 }) => {
  if (opacity <= 0.01) return null;
  const scale = clicking ? 0.86 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        opacity,
        zIndex: 250,
        pointerEvents: 'none',
      }}
    >
      {clicking && (
        <div
          style={{
            position: 'absolute',
            left: -16,
            top: -16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #f59e0b',
            backgroundColor: 'rgba(254, 240, 138, 0.45)',
          }}
        />
      )}
      <svg width="34" height="38" viewBox="0 0 34 38" fill="none">
        <path
          d="M4 3L29 16.5L17.5 19.5L23.5 31L18.5 33.5L12.5 22L5.5 28.5L4 3Z"
          fill="#fff8bd"
          stroke="#2d3436"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          className="font-playful"
          style={{
            position: 'absolute',
            left: 26,
            top: 22,
            backgroundColor: '#2d3436',
            color: '#fff8bd',
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 15,
            whiteSpace: 'nowrap',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
