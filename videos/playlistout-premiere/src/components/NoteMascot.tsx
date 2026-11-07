import React from 'react';
import { C, F } from '../theme';

export type MascotExpression = 'happy' | 'wow' | 'focus' | 'sleepy' | 'proud' | 'wink';
export type MascotPose = 'idle' | 'wave' | 'press' | 'point';

type Props = {
  size?: number;
  rotation?: number;
  expression?: MascotExpression;
  blink?: boolean;
  pose?: MascotPose;
  /** A small paper sticker behind the ink, used on dark terminal panels. */
  backdrop?: boolean;
  style?: React.CSSProperties;
};

const INK = '#22211d';
const CREAM = '#fff7df';
const BLUSH = '#e9a2ac';
const YELLOW = '#ffe48f';

/**
 * A hand-cut eighth-note paper doll. The note head is the face; the stem and
 * flag are one continuous ink stroke. Deliberately imperfect, tactile, and
 * small enough to act as a cursor inside the UI.
 */
export const NoteMascot: React.FC<Props> = ({
  size = 160,
  rotation = 0,
  expression = 'happy',
  blink = false,
  pose = 'idle',
  backdrop = false,
  style,
}) => {
  const eyeClosed = blink || expression === 'sleepy' || expression === 'proud';
  const winkRight = expression === 'wink';
  const wideEyes = expression === 'wow';
  const squint = expression === 'focus';

  const mouth =
    expression === 'wow'
      ? 'M116 237c5 8 18 9 24 1'
      : expression === 'focus'
        ? 'M119 239c7 3 15 2 20-1'
        : expression === 'proud'
          ? 'M113 235c5 11 25 12 32 1'
          : expression === 'sleepy'
            ? 'M120 239c4 2 9 2 13 0'
            : 'M116 236c5 8 18 9 24 1';

  const armLeft = pose === 'wave' ? 'M72 205C46 195 35 171 29 150' : pose === 'press' ? 'M72 209C49 219 37 231 31 243' : pose === 'point' ? 'M72 204C48 197 33 191 22 185' : 'M72 206C52 217 42 228 37 238';
  const armRight = pose === 'wave' ? 'M178 201C203 181 217 159 230 132' : pose === 'press' ? 'M178 209C202 220 216 233 225 247' : pose === 'point' ? 'M178 204C204 196 217 190 232 185' : 'M178 207C202 217 214 228 224 238';
  const handLeft = pose === 'press' ? { x: 31, y: 243 } : pose === 'point' ? { x: 22, y: 185 } : { x: 37, y: 238 };
  const handRight = pose === 'press' ? { x: 225, y: 247 } : pose === 'wave' ? { x: 230, y: 132 } : pose === 'point' ? { x: 232, y: 185 } : { x: 224, y: 238 };

  return (
    <div
      style={{
        width: size,
        height: size * 1.16,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0 10px 8px rgba(67,48,24,.20)) drop-shadow(0 2px 1px rgba(67,48,24,.12))',
        ...style,
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 260 302" fill="none">
        {backdrop ? (
          <g transform="rotate(-2 130 190)">
            <ellipse cx="130" cy="190" rx="110" ry="102" fill="#fbf4e2" stroke="#d8c8a8" strokeWidth="1.6" opacity=".98" />
            <ellipse cx="130" cy="190" rx="101" ry="93" fill="none" stroke="rgba(96,76,48,.13)" strokeWidth="1" strokeDasharray="2 5" />
          </g>
        ) : null}
        {/* paper contact shadow */}
        <ellipse cx="130" cy="287" rx="76" ry="10" fill="rgba(65,49,27,.13)" />

        {/* cream die-cut halo keeps the ink silhouette readable on dark cards */}
        <path d="M104 258c-5 10-8 18-8 25" stroke={CREAM} strokeWidth="18" strokeLinecap="round" opacity=".96" />
        <path d="M157 258c5 10 8 18 8 25" stroke={CREAM} strokeWidth="18" strokeLinecap="round" opacity=".96" />
        <ellipse cx="126" cy="204" rx="78" ry="60" fill={CREAM} opacity=".96" />

        {/* legs / little shoes */}
        <path d="M104 258c-5 10-8 18-8 25" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M157 258c5 10 8 18 8 25" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M84 283c10-4 19-3 25 1 2 6-3 10-14 10-10 0-15-4-11-11Z" fill={YELLOW} stroke={INK} strokeWidth="3" />
        <path d="M151 284c10-4 19-2 25 2 1 6-5 9-16 8-10-1-13-4-9-10Z" fill={YELLOW} stroke={INK} strokeWidth="3" />

        {/* body: a chubby note head with an inked rim */}
        <ellipse cx="126" cy="204" rx="73" ry="55" fill={CREAM} stroke={INK} strokeWidth="3" />
        <ellipse cx="126" cy="204" rx="66" ry="49" fill={INK} />

        {/* stem + flag, each with a cream cut edge */}
        <path d="M181 188c6-48 10-84 11-125 0-8 5-13 12-12" stroke={CREAM} strokeWidth="23" strokeLinecap="round" opacity=".96" />
        <path d="M193 51c19-12 38-9 54 7 8 8 11 17 10 28-11-12-24-17-39-15-10 1-18 5-25 10V51Z" fill={CREAM} stroke={CREAM} strokeWidth="12" strokeLinejoin="round" opacity=".96" />
        <path d="M181 188c6-48 10-84 11-125 0-8 5-13 12-12" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        <path d="M193 51c19-12 38-9 54 7 8 8 11 17 10 28-11-12-24-17-39-15-10 1-18 5-25 10V51Z" fill={INK} />
        <path d="M200 57c14-5 29-2 41 8" stroke="rgba(255,247,223,.22)" strokeWidth="3" strokeLinecap="round" />

        {/* yellow scarf / paper cuff */}
        <path d="M158 171c15-7 34-6 48 3l-7 18c-12-7-24-8-36-3l-5-18Z" fill={YELLOW} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M191 188c7 8 11 18 12 28l-13 2c-2-8-5-15-11-21l12-9Z" fill={YELLOW} stroke={INK} strokeWidth="3" strokeLinejoin="round" />

        {/* little arms */}
        <path d={armLeft} stroke={CREAM} strokeWidth="17" strokeLinecap="round" opacity=".96" />
        <path d={armRight} stroke={CREAM} strokeWidth="17" strokeLinecap="round" opacity=".96" />
        <path d={armLeft} stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <path d={armRight} stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <circle cx={handLeft.x} cy={handLeft.y} r="10" fill={CREAM} stroke={INK} strokeWidth="3" />
        <circle cx={handRight.x} cy={handRight.y} r="10" fill={CREAM} stroke={INK} strokeWidth="3" />

        {/* face */}
        <g transform={`translate(0 ${squint ? 3 : 0})`}>
          {/* brows */}
          {squint ? (
            <>
              <path d="M79 180l20 5" stroke={CREAM} strokeWidth="4" strokeLinecap="round" opacity=".9" />
              <path d="M173 180l-19 5" stroke={CREAM} strokeWidth="4" strokeLinecap="round" opacity=".9" />
            </>
          ) : (
            <>
              <path d="M82 178c6-5 14-5 20-1" stroke={CREAM} strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
              <path d="M152 178c6-4 14-4 20 0" stroke={CREAM} strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
            </>
          )}

          {/* eyes */}
          {eyeClosed ? (
            <>
              <path d="M83 200c7 6 17 6 24 0" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
              <path d="M146 199c7 6 17 6 24 0" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <g transform={`translate(95 198) scale(1 ${winkRight ? 1 : 1})`}>
                <ellipse cx="0" cy="0" rx={wideEyes ? 17 : 14} ry={wideEyes ? 21 : 19} fill={CREAM} />
                <ellipse cx={squint ? 2 : 1} cy={squint ? -4 : 2} rx={wideEyes ? 7 : 6} ry={wideEyes ? 9 : 8} fill={INK} />
                <circle cx="5" cy="-5" r="2.5" fill="rgba(255,255,255,.85)" />
              </g>
              {winkRight ? (
                <path d="M146 200c7 6 17 6 24 0" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
              ) : (
                <g transform="translate(158 197)">
                  <ellipse cx="0" cy="0" rx={wideEyes ? 17 : 14} ry={wideEyes ? 21 : 19} fill={CREAM} />
                  <ellipse cx={squint ? 1 : 0} cy={squint ? -4 : 2} rx={wideEyes ? 7 : 6} ry={wideEyes ? 9 : 8} fill={INK} />
                  <circle cx="5" cy="-5" r="2.5" fill="rgba(255,255,255,.85)" />
                </g>
              )}
            </>
          )}

          {/* nose */}
          <path d="M126 216c4-3 8-3 11 0-3 4-7 5-11 0Z" fill={YELLOW} opacity=".9" />
          {/* mouth */}
          <path d={mouth} stroke={CREAM} strokeWidth="3.6" strokeLinecap="round" />
          {/* blush */}
          <circle cx="71" cy="222" r="10" fill={BLUSH} opacity=".72" />
          <circle cx="181" cy="221" r="10" fill={BLUSH} opacity=".72" />
        </g>

        {/* tiny ink flecks, keeping the character hand-cut */}
        <circle cx="72" cy="247" r="1.3" fill="rgba(255,247,223,.22)" />
        <circle cx="190" cy="254" r="1" fill="rgba(255,247,223,.2)" />
        <path d="M172 221c10 2 16 7 19 13" stroke="rgba(255,247,223,.12)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span style={{ display: 'none', fontFamily: F.sans }}>music note</span>
    </div>
  );
};
