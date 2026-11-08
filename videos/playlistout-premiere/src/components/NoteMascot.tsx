import React from 'react';

export type MascotExpression = 'happy' | 'wow' | 'focus' | 'sleepy' | 'proud' | 'wink';
export type MascotPose = 'idle' | 'wave' | 'press' | 'point' | 'click';

type Props = {
  size?: number;
  rotation?: number;
  expression?: MascotExpression;
  blink?: boolean;
  pose?: MascotPose;
  /** A small paper sticker behind the character, used on dark terminal panels. */
  backdrop?: boolean;
  style?: React.CSSProperties;
};

const PINK = '#f3b6c2';
const PINK_LIGHT = '#fbd3dc';
const PINK_DEEP = '#de93a7';
const ROSE = '#c96f88';
const INK = '#4b2c38';
const CREAM = '#fff9ea';
const BLUSH = '#ea8fa5';
const YELLOW = '#ffdf85';

const Glove: React.FC<{ x: number; y: number; flip: 1 | -1 }> = ({ x, y, flip }) => (
  <g transform={`translate(${x} ${y}) scale(${flip} 1) rotate(-8)`}>
    <path
      d="M-11-3c-6 0-10 5-10 10 0 7 7 12 16 12 9 0 15-4 15-11 0-4-3-7-8-8 2-3 1-6-2-7-3-1-6 0-7 3-1-2-2-3-4-3Z"
      fill={CREAM}
      stroke={INK}
      strokeWidth="3.4"
      strokeLinejoin="round"
    />
    <path d="M-7 8c4 3 10 3 14 0" stroke={PINK_DEEP} strokeWidth="2" strokeLinecap="round" opacity=".55" />
  </g>
);

/**
 * A pink cat-ear headphone note, built as a paper puppet for the film. The
 * white gloves are rig parts: each pose moves the arm and the glove together,
 * so the character can actually touch a button instead of floating over it.
 */
export const NoteMascot: React.FC<Props> = ({
  size = 170,
  rotation = 0,
  expression = 'happy',
  blink = false,
  pose = 'idle',
  backdrop = false,
  style,
}) => {
  const wide = expression === 'wow';
  const squint = expression === 'focus';
  const closed = blink || expression === 'sleepy' || expression === 'proud';
  const winkRight = expression === 'wink';

  const armLeft = pose === 'wave'
    ? 'M74 228C50 214 37 190 31 164'
    : pose === 'press'
      ? 'M74 232C50 240 38 252 34 264'
      : 'M74 229C54 239 43 253 37 266';
  const armRight = pose === 'wave'
    ? 'M227 226C253 206 263 182 270 154'
    : pose === 'press'
      ? 'M227 232C252 241 264 253 270 266'
      : pose === 'point'
        ? 'M227 225C252 216 264 209 278 204'
        : pose === 'click'
          ? 'M227 231C254 241 270 238 284 221'
          : 'M227 230C250 239 262 251 270 264';
  const handLeft = { x: 35, y: 267 };
  const handRight = pose === 'wave'
    ? { x: 270, y: 154 }
    : pose === 'press'
      ? { x: 270, y: 267 }
      : pose === 'point'
        ? { x: 278, y: 204 }
        : pose === 'click'
          ? { x: 284, y: 221 }
          : { x: 270, y: 264 };

  return (
    <div
      style={{
        width: size,
        height: size * 1.16,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0 12px 9px rgba(78,44,42,.18)) drop-shadow(0 2px 2px rgba(78,44,42,.1))',
        ...style,
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 300 348" fill="none">
        {backdrop ? (
          <g transform="rotate(-2 150 205)">
            <ellipse cx="150" cy="205" rx="133" ry="126" fill="#fff7e7" stroke="#dcc6b4" strokeWidth="1.7" opacity=".98" />
            <ellipse cx="150" cy="205" rx="122" ry="115" fill="none" stroke="rgba(92,61,58,.13)" strokeWidth="1" strokeDasharray="2 6" />
          </g>
        ) : null}

        <ellipse cx="150" cy="322" rx="96" ry="13" fill="rgba(79,47,42,.14)" />

        {/* cream cut edge, important on the dark terminal */}
        <ellipse cx="150" cy="206" rx="103" ry="93" fill={CREAM} opacity=".96" />
        <path d="M235 178c5-65 8-110 12-139 1-8 7-12 14-10" stroke={CREAM} strokeWidth="27" strokeLinecap="round" opacity=".96" />
        <path d="M250 36c20-11 37-4 45 13-15 1-27 8-35 20-6-8-9-19-10-33Z" fill={CREAM} stroke={CREAM} strokeWidth="12" strokeLinejoin="round" opacity=".96" />

        {/* musical note stem and flag */}
        <path d="M235 178c5-65 8-110 12-139 1-8 7-12 14-10" stroke={ROSE} strokeWidth="14" strokeLinecap="round" />
        <path d="M250 36c20-11 37-4 45 13-15 1-27 8-35 20-6-8-9-19-10-33Z" fill={ROSE} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M258 40c11-4 21-1 28 6" stroke={PINK_LIGHT} strokeWidth="3" strokeLinecap="round" />

        {/* cat ears and headphone band */}
        <path d="M74 157 54 96c-2-8 5-14 12-10l48 28" fill={PINK} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M226 157 246 96c2-8-5-14-12-10l-48 28" fill={PINK} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M72 139 60 105l27 16Z" fill={PINK_DEEP} opacity=".7" />
        <path d="M228 139 240 105l-27 16Z" fill={PINK_DEEP} opacity=".7" />
        <path d="M63 185c0-55 39-86 87-86s87 31 87 86" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        <path d="M66 180c2-47 38-73 84-73s82 26 84 73" stroke={PINK_DEEP} strokeWidth="7" strokeLinecap="round" />

        {/* head and body */}
        <ellipse cx="150" cy="210" rx="94" ry="86" fill={PINK} stroke={INK} strokeWidth="5" />
        <ellipse cx="150" cy="202" rx="88" ry="78" fill="url(#pinkWash)" stroke="none" opacity=".8" />
        <defs>
          <radialGradient id="pinkWash" cx="0.36" cy="0.28" r="0.82">
            <stop offset="0" stopColor={PINK_LIGHT} />
            <stop offset="0.62" stopColor={PINK} />
            <stop offset="1" stopColor={PINK_DEEP} />
          </radialGradient>
        </defs>

        {/* headphone cups over the cat ears */}
        <g>
          <rect x="25" y="174" width="55" height="76" rx="27" fill={PINK_LIGHT} stroke={INK} strokeWidth="4.5" transform="rotate(-7 52 212)" />
          <rect x="34" y="185" width="36" height="54" rx="18" fill="rgba(255,250,236,.48)" transform="rotate(-7 52 212)" />
          <path d="M45 201c8-6 16-6 23 0M45 219c8-6 16-6 23 0" stroke={ROSE} strokeWidth="3" strokeLinecap="round" opacity=".55" />
          <rect x="220" y="174" width="55" height="76" rx="27" fill={PINK_LIGHT} stroke={INK} strokeWidth="4.5" transform="rotate(7 248 212)" />
          <rect x="230" y="185" width="36" height="54" rx="18" fill="rgba(255,250,236,.48)" transform="rotate(7 248 212)" />
          <g transform="translate(238 204) rotate(7)">
            <ellipse cx="0" cy="9" rx="7" ry="5" fill={INK} />
            <path d="M6 9V-8" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M6-8c8 1 12 5 12 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <circle cx="3" cy="6" r="1.8" fill={YELLOW} />
          </g>
        </g>

        {/* face */}
        <g transform={`translate(0 ${squint ? 3 : 0})`}>
          {squint ? (
            <>
              <path d="M91 192l20 4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <path d="M209 192l-20 4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M95 188c7-5 16-4 22 0" stroke={INK} strokeWidth="3.4" strokeLinecap="round" opacity=".55" />
              <path d="M183 188c7-4 15-4 22 0" stroke={INK} strokeWidth="3.4" strokeLinecap="round" opacity=".55" />
            </>
          )}

          {closed ? (
            <>
              <path d="M95 211c8 7 19 7 27 0" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
              <path d="M178 210c8 7 19 7 27 0" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <g transform="translate(110 209)">
                <ellipse cx="0" cy="0" rx={wide ? 15 : 13} ry={wide ? 19 : 17} fill={INK} />
                <circle cx="-4" cy="-5" r={wide ? 4 : 3.4} fill={CREAM} />
                <circle cx="4" cy="4" r="1.8" fill={CREAM} opacity=".7" />
              </g>
              {winkRight ? (
                <path d="M178 210c8 7 19 7 27 0" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
              ) : (
                <g transform="translate(193 208)">
                  <ellipse cx="0" cy="0" rx={wide ? 15 : 13} ry={wide ? 19 : 17} fill={INK} />
                  <circle cx="-4" cy="-5" r={wide ? 4 : 3.4} fill={CREAM} />
                  <circle cx="4" cy="4" r="1.8" fill={CREAM} opacity=".7" />
                </g>
              )}
            </>
          )}

          <path d="M147 223c4-3 9-3 13 0-4 5-9 5-13 0Z" fill={ROSE} />
          {expression === 'wow' ? (
            <ellipse cx="153" cy="242" rx="9" ry="12" fill={INK} />
          ) : expression === 'proud' ? (
            <path d="M137 238c9 11 27 11 36 0" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          ) : expression === 'focus' ? (
            <path d="M145 243c7 3 14 2 20-1" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M137 236c9 12 27 12 36 0-11 4-25 4-36 0Z" fill={INK} />
          )}
          <path d="M153 247c4 3 8 3 11 0" stroke={PINK_LIGHT} strokeWidth="3" strokeLinecap="round" opacity={expression === 'wow' ? 0 : 0.55} />

          <ellipse cx="83" cy="238" rx="14" ry="9" fill={BLUSH} opacity=".72" />
          <ellipse cx="217" cy="236" rx="14" ry="9" fill={BLUSH} opacity=".72" />
        </g>

        {/* little legs and white shoes */}
        <path d="M116 288c-3 10-5 16-5 22" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M184 288c3 10 5 16 5 22" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M92 311c10-4 20-3 27 1 2 6-4 10-16 10-11 0-16-4-11-11Z" fill={CREAM} stroke={INK} strokeWidth="3.3" />
        <path d="M181 312c10-4 20-2 27 2 1 6-6 9-17 8-11-1-15-4-10-10Z" fill={CREAM} stroke={INK} strokeWidth="3.3" />
        <path d="M99 320h15M191 320h15" stroke={PINK_DEEP} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />

        {/* arms and white gloves */}
        <path d={armLeft} stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <path d={armRight} stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <Glove x={handLeft.x} y={handLeft.y} flip={1} />
        <Glove x={handRight.x} y={handRight.y} flip={-1} />

        <circle cx="104" cy="265" r="1.5" fill="rgba(75,44,56,.28)" />
        <circle cx="200" cy="268" r="1.2" fill="rgba(75,44,56,.24)" />
      </svg>
    </div>
  );
};
