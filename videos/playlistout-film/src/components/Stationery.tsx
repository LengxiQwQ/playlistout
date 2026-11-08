import React from 'react';
import { ASSETS } from '../assets';
import { C, F, SHADOW } from '../theme';

export const WashiTape: React.FC<{
  color?: string;
  width?: number;
  height?: number;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({ color = C.tapePink, width = 140, height = 34, rotate = -3, style }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: color,
      backgroundImage: `url(${ASSETS.grain})`,
      backgroundSize: '180px 180px',
      borderLeft: '2px dashed rgba(255, 255, 255, 0.65)',
      borderRight: '2px dashed rgba(255, 255, 255, 0.65)',
      boxShadow: '0 2px 4px rgba(45, 52, 54, 0.14)',
      transform: `rotate(${rotate}deg)`,
      pointerEvents: 'none',
      ...style,
    }}
  />
);

export const JournalCard: React.FC<{
  children: React.ReactNode;
  bg?: string;
  rotate?: number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: 'cutout' | 'cutoutSm' | 'cutoutLg' | 'paper' | 'lifted';
  tapeColor?: string;
  tapePos?: 'top-left' | 'top-center' | 'top-right' | 'both' | 'none';
  style?: React.CSSProperties;
}> = ({
  children,
  bg = C.paperWhite,
  rotate = 0,
  borderColor = C.ink,
  borderWidth = 3.5,
  shadow = 'cutout',
  tapeColor = C.tapeYellow,
  tapePos = 'none',
  style,
}) => {
  const isDark = bg === C.terminal;
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: bg,
        backgroundImage: isDark
          ? `url(${ASSETS.grain})`
          : `url(${ASSETS.fibreTile}), url(${ASSETS.grain})`,
        backgroundSize: isDark ? '256px 256px' : '640px 640px, 256px 256px',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: '22px 14px 24px 16px / 15px 24px 14px 22px',
        boxShadow: SHADOW[shadow],
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {tapePos === 'top-left' || tapePos === 'both' ? (
        <WashiTape
          color={tapeColor}
          width={136}
          height={32}
          rotate={-4}
          style={{ position: 'absolute', top: -16, left: 32, zIndex: 20 }}
        />
      ) : null}
      {tapePos === 'top-center' ? (
        <WashiTape
          color={tapeColor}
          width={156}
          height={34}
          rotate={-1.5}
          style={{ position: 'absolute', top: -17, left: '50%', marginLeft: -78, zIndex: 20 }}
        />
      ) : null}
      {tapePos === 'top-right' || tapePos === 'both' ? (
        <WashiTape
          color={tapePos === 'both' ? C.tapePink : tapeColor}
          width={136}
          height={32}
          rotate={4.5}
          style={{ position: 'absolute', top: -16, right: 32, zIndex: 20 }}
        />
      ) : null}
      {children}
    </div>
  );
};

export const StickyBadge: React.FC<{
  children: React.ReactNode;
  bg?: string;
  ink?: string;
  borderColor?: string;
  rotate?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  bg = C.yellowCard,
  ink = C.ink,
  borderColor = C.ink,
  rotate = 0,
  fontSize = 22,
  style,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 18px',
      backgroundColor: bg,
      color: ink,
      border: `2.8px solid ${borderColor}`,
      borderRadius: '14px 10px 16px 11px / 11px 15px 10px 14px',
      boxShadow: SHADOW.sticker,
      fontFamily: F.sans,
      fontWeight: 800,
      fontSize,
      lineHeight: 1.2,
      transform: `rotate(${rotate}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

/**
 * 最右上角黄色短横线区域：全片从头到尾永远高亮显示官方网址，随后紧跟当前场景特性
 */
export const TopRightUrlBanner: React.FC<{
  subtitle?: string;
  style?: React.CSSProperties;
}> = ({ subtitle, style }) => (
  <div
    style={{
      fontFamily: F.kuaile,
      fontSize: 23,
      color: C.inkSoft,
      backgroundColor: 'rgba(255, 248, 189, 0.94)',
      padding: '7px 20px',
      borderRadius: 14,
      border: `2.6px dashed ${C.ink}`,
      boxShadow: '2px 3px 0 rgba(45, 52, 54, 0.15)',
      transform: 'rotate(0.8deg)',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      ...style,
    }}
  >
    <span
      style={{
        fontFamily: F.mono,
        fontSize: 24,
        fontWeight: 900,
        color: C.ink,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span>🌐</span>
      <span>playlistout.com</span>
    </span>
    {subtitle ? (
      <>
        <span style={{ color: '#94a3b8', fontWeight: 900 }}>·</span>
        <span style={{ fontSize: 21, color: C.inkSoft }}>{subtitle}</span>
      </>
    ) : null}
  </div>
);

export const SceneHeaderBanner: React.FC<{
  stepTag: string;
  title: string;
  subtitle?: string;
  tagBg?: string;
  style?: React.CSSProperties;
}> = ({ stepTag, title, subtitle, tagBg = C.yellow, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 82px 0 162px',
      ...style,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <StickyBadge bg={tagBg} fontSize={21} rotate={-1.8}>
        {stepTag}
      </StickyBadge>
      <h2
        style={{
          fontFamily: F.display,
          fontSize: 52,
          fontWeight: 400,
          color: C.ink,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          textShadow: '2px 2px 0 rgba(255, 255, 255, 0.8)',
        }}
      >
        {title}
      </h2>
    </div>
    <TopRightUrlBanner subtitle={subtitle} />
  </div>
);

export const CrayonUnderline: React.FC<{
  width?: number;
  color?: string;
  progress?: number;
  style?: React.CSSProperties;
}> = ({ width = 360, color = '#f6b93b', progress = 1, style }) => (
  <svg
    width={width}
    height="20"
    viewBox={`0 0 ${width} 20`}
    fill="none"
    style={{ overflow: 'visible', ...style }}
  >
    <path
      d={`M 6 12 Q ${width * 0.35} 5, ${width * 0.65} 13 T ${width - 6} 9`}
      stroke={color}
      strokeWidth="9"
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray={100}
      strokeDashoffset={100 * (1 - Math.max(0, Math.min(1, progress)))}
    />
  </svg>
);

export const SparkleDoodle: React.FC<{
  size?: number;
  color?: string;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({ size = 34, color = '#f59e0b', rotate = 0, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    style={{ transform: `rotate(${rotate}deg)`, ...style }}
  >
    <path
      d="M 20 2 L 24 16 L 38 20 L 24 24 L 20 38 L 16 24 L 2 20 L 16 16 Z"
      fill={color}
      stroke={C.ink}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const HandCheck: React.FC<{ size?: number; color?: string }> = ({
  size = 26,
  color = '#207544',
}) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <path
      d="M 4 15 L 11 22 L 24 6"
      stroke={color}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
