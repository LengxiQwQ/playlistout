import React from 'react';
import { staticFile } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { snappySpring, smoothStep } from '../utils/motion';

export type TapeColor = 'pink' | 'cyan' | 'green' | 'yellow' | 'purple';

const TAPE_BG: Record<TapeColor, string> = {
  pink: COLORS.tapePink,
  cyan: COLORS.tapeCyan,
  green: COLORS.tapeGreen,
  yellow: COLORS.tapeYellow,
  purple: COLORS.tapePurple,
};

export const WashiTape: React.FC<{
  color?: TapeColor;
  width?: number;
  height?: number;
  rotateDeg?: number;
  frame?: number;
  appearFrame?: number;
  style?: React.CSSProperties;
}> = ({
  color = 'pink',
  width = 128,
  height = 30,
  rotateDeg = -6,
  frame = 100,
  appearFrame = 0,
  style,
}) => {
  const prog = snappySpring(frame, appearFrame);
  const scale = 1.25 - 0.25 * prog;
  const opacity = Math.min(1, Math.max(0, (frame - appearFrame) / 5));

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: TAPE_BG[color],
        clipPath:
          'polygon(0 8%, 8% 0, 16% 7%, 24% 1%, 32% 8%, 40% 1%, 48% 7%, 56% 0, 64% 8%, 72% 1%, 80% 8%, 88% 0, 100% 7%, 100% 93%, 91% 100%, 83% 93%, 75% 100%, 67% 92%, 59% 100%, 51% 94%, 43% 100%, 35% 93%, 27% 100%, 19% 94%, 11% 100%, 0 93%)',
        boxShadow: '0 2px 3px rgba(45, 52, 54, 0.22)',
        transform: `rotate(${rotateDeg}deg) scale(${scale})`,
        opacity,
        backgroundImage:
          'linear-gradient(115deg, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.52) 50%, rgba(255,255,255,0.08) 80%)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

export const PaperCard: React.FC<{
  children: React.ReactNode;
  bg?: string;
  rotateDeg?: number;
  altBorder?: boolean;
  cutoutShadow?: boolean;
  style?: React.CSSProperties;
}> = ({
  children,
  bg = COLORS.paperWhite,
  rotateDeg = 0,
  altBorder = false,
  cutoutShadow = false,
  style,
}) => {
  const creasesUrl = staticFile('assets/paper-creases.png');
  const grainUrl = staticFile('assets/paper-grain.png');

  return (
    <div
      style={{
        backgroundColor: bg,
        backgroundImage: `url('${creasesUrl}'), url('${grainUrl}')`,
        backgroundSize: '800px 800px, 256px 256px',
        border: `3px solid ${COLORS.ink}`,
        borderRadius: altBorder ? BORDERS.handDrawnAlt : BORDERS.handDrawn,
        boxShadow: cutoutShadow ? SHADOWS.cutout : SHADOWS.paperWarm,
        transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type StickerColor =
  | 'white'
  | 'yellow'
  | 'pink'
  | 'cyan'
  | 'green'
  | 'blue'
  | 'purple'
  | 'red'
  | 'lime';

const STICKER_COLORS: Record<StickerColor, string> = {
  white: COLORS.stickerWhite,
  yellow: COLORS.stickerYellow,
  pink: COLORS.stickerPink,
  cyan: COLORS.stickerCyan,
  green: COLORS.stickerGreen,
  blue: COLORS.stickerBlue,
  purple: COLORS.stickerPurple,
  red: COLORS.stickerRed,
  lime: COLORS.stickerLime,
};

export const StickerBadge: React.FC<{
  children: React.ReactNode;
  color?: StickerColor;
  rotateDeg?: number;
  checked?: boolean;
  font?: 'handwriting' | 'mono' | 'sans' | 'marker';
  style?: React.CSSProperties;
}> = ({
  children,
  color = 'white',
  rotateDeg = 0,
  checked,
  font = 'handwriting',
  style,
}) => {
  const fontFamily =
    font === 'mono'
      ? FONTS.mono
      : font === 'sans'
      ? FONTS.sans
      : font === 'marker'
      ? FONTS.marker
      : FONTS.handwriting;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: STICKER_COLORS[color],
        border: `2.5px solid ${COLORS.ink}`,
        borderRadius: BORDERS.handDrawnSubtle,
        boxShadow: SHADOWS.sticker,
        padding: '6px 16px',
        fontFamily,
        fontSize: 21,
        fontWeight: 700,
        color: COLORS.ink,
        transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {checked !== undefined && (
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            border: checked ? `2px solid ${COLORS.ink}` : `1.5px dashed ${COLORS.inkLight}`,
            backgroundColor: checked ? '#ffffff' : 'rgba(255,255,255,0.55)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {checked && (
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5.2 5.5L20 6" />
            </svg>
          )}
        </span>
      )}
      {children}
    </div>
  );
};

export const MarkerHighlight: React.FC<{
  children: React.ReactNode;
  color?: string;
  frame: number;
  startFrame: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  color = COLORS.highlightYellow,
  frame,
  startFrame,
  durationFrames = 18,
  style,
}) => {
  const prog = smoothStep(frame, startFrame, startFrame + durationFrames, 0, 1);

  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: '0 6px', ...style }}>
      <span
        style={{
          position: 'absolute',
          left: -2,
          right: -2,
          bottom: '8%',
          height: '54%',
          backgroundColor: color,
          borderRadius: '12px 4px 10px 6px',
          transform: `scaleX(${prog}) rotate(-0.8deg)`,
          transformOrigin: 'left center',
          zIndex: 0,
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
};

export const HandDrawnArrow: React.FC<{
  frame: number;
  startFrame: number;
  width?: number;
  height?: number;
  color?: string;
  flip?: boolean;
  style?: React.CSSProperties;
}> = ({
  frame,
  startFrame,
  width = 120,
  height = 54,
  color = COLORS.ink,
  flip = false,
  style,
}) => {
  const prog = smoothStep(frame, startFrame, startFrame + 16, 0, 1);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 54"
      fill="none"
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        overflow: 'visible',
        ...style,
      }}
    >
      <path
        d="M6 38 C 36 8, 78 8, 108 30"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray={140}
        strokeDashoffset={140 * (1 - prog)}
      />
      <path
        d="M96 18 L 111 31 L 92 38"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={prog > 0.7 ? (prog - 0.7) / 0.3 : 0}
      />
    </svg>
  );
};

export const PointerCursor: React.FC<{
  x: number;
  y: number;
  clicking?: boolean;
  frame?: number;
  clickFrame?: number;
}> = ({ x, y, clicking = false, frame = 0, clickFrame = -100 }) => {
  const clickElapsed = frame - clickFrame;
  const showRipple = clickElapsed >= 0 && clickElapsed <= 16;
  const rippleProgress = showRipple ? clickElapsed / 16 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 120,
        pointerEvents: 'none',
        transform: `translate(-6px, -4px) scale(${clicking ? 0.86 : 1})`,
      }}
    >
      {showRipple && (
        <div
          style={{
            position: 'absolute',
            left: -22,
            top: -22,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: `3.5px solid ${COLORS.amber}`,
            transform: `scale(${0.4 + rippleProgress * 1.4})`,
            opacity: 1 - rippleProgress,
          }}
        />
      )}
      <svg width={40} height={44} viewBox="0 0 36 40" fill="none">
        <path
          d="M5 4 L30 17 L19 21 L25 33 L19 36 L13 24 L5 31 Z"
          fill="#ffffff"
          stroke={COLORS.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
