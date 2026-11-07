import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {COLORS} from '../theme';
import {at} from '../timeline';

const CoffeeRing: React.FC = () => (
  <svg width={230} height={230} viewBox="0 0 230 230" style={{position: 'absolute', right: -26, bottom: 24, opacity: 0.17}}>
    <g fill="none" stroke="#8d5b36">
      <circle cx="115" cy="115" r="77" strokeWidth="7" strokeDasharray="380 34 90 18" />
      <circle cx="115" cy="115" r="66" strokeWidth="2" opacity="0.7" />
      <path d="M43 168c19 20 44 31 75 32" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M185 59c-7-11-15-19-25-26" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </g>
  </svg>
);

const Pencil: React.FC = () => (
  <svg width={460} height={160} viewBox="0 0 460 160" style={{position: 'absolute', left: -108, bottom: -10, opacity: 0.4}}>
    <g transform="rotate(-13 210 80)">
      <rect x="44" y="68" width="305" height="27" rx="3" fill="#e9c56f" stroke="#3c352c" strokeWidth="3" />
      <rect x="44" y="68" width="305" height="8" rx="3" fill="#f6df9d" opacity="0.85" />
      <path d="M44 68 L6 81.5 L44 95 Z" fill="#f1d6b9" stroke="#3c352c" strokeWidth="3" />
      <path d="M19 77.2 L6 81.5 L19 85.8 Z" fill="#3c352c" />
      <path d="M349 68 L398 81.5 L349 95 Z" fill="#eba8a2" stroke="#3c352c" strokeWidth="3" />
      <rect x="392" y="74" width="42" height="15" rx="4" fill="#cfc8b8" stroke="#3c352c" strokeWidth="3" />
      <path d="M105 70 L105 93" stroke="#3c352c" strokeWidth="2" opacity="0.32" />
      <path d="M334 69 L340 95" stroke="#3c352c" strokeWidth="2" opacity="0.32" />
    </g>
  </svg>
);

const PaperClip: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <svg width={96} height={150} viewBox="0 0 96 150" style={{position: 'absolute', ...style}}>
    <path
      d="M66 29v72c0 23-14 38-31 38S7 125 7 101V34C7 16 20 5 35 5s25 12 25 29v65c0 14-9 23-20 23s-18-9-18-22V45"
      fill="none"
      stroke="#575b5e"
      strokeWidth="7"
      strokeLinecap="round"
      opacity="0.35"
    />
  </svg>
);

const MaskingTape: React.FC<{x: number; y: number; rotate: number; color: string}> = ({x, y, rotate, color}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 145,
      height: 42,
      background: color,
      opacity: 0.38,
      transform: `rotate(${rotate}deg)`,
      clipPath: 'polygon(2% 10%, 98% 0%, 100% 92%, 0% 100%)',
      backgroundImage:
        'repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 3px, transparent 3px 8px)',
    }}
  />
);

export const NotebookBackdrop: React.FC<{dim?: number; warm?: number}> = ({dim = 0, warm = 0}) => {
  const frame = useCurrentFrame();
  const paperDrift = interpolate(frame, [0, 1680], [0, -10], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.paper, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.paper,
          backgroundImage:
            'linear-gradient(to bottom, transparent 0 50px, rgba(182, 166, 143, 0.40) 50px 51px)',
          backgroundSize: '100% 51px',
          transform: `translateY(${paperDrift}px) scale(1.01)`,
        }}
      />
      <div
        className="paper-texture"
        style={{
          position: 'absolute',
          inset: -20,
          opacity: 0.58,
          mixBlendMode: 'multiply',
          transform: `translateY(${paperDrift}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 70% at 72% -8%, rgba(255,244,206,0.78) 0%, rgba(255,247,224,0.24) 35%, rgba(246,241,229,0) 70%)',
          opacity: 0.9 + warm * 0.1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 90% 80% at 42% 48%, rgba(255,255,255,0) 52%, rgba(85,64,32,0.11) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 54,
          background: 'linear-gradient(to right, rgba(81,59,28,0.16), rgba(81,59,28,0.02) 58%, transparent)',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 164,
          top: 0,
          bottom: 0,
          width: 2.5,
          background: COLORS.margin,
          opacity: 0.68,
          zIndex: 2,
        }}
      />

      {[82, 248, 414, 580, 746, 912].map((top, i) => (
        <div
          key={top}
          style={{
            position: 'absolute',
            left: 62 + (i % 3) * 2,
            top,
            width: 37,
            height: 37,
            borderRadius: '50%',
            background: '#fbf8f1',
            border: '3px solid #7d7b74',
            boxShadow:
              'inset 2px 3px 5px rgba(45,40,30,0.28), inset -2px -2px 3px rgba(255,255,255,0.7), 1px 1px 2px rgba(70,50,25,0.07)',
            opacity: 0.55,
            zIndex: 3,
          }}
        />
      ))}

      <CoffeeRing />
      <Pencil />
      <PaperClip style={{right: 48, top: 34}} />
      <MaskingTape x={-30} y={930} rotate={-9} color="#f5c9cf" />
      <MaskingTape x={1830} y={90} rotate={78} color="#bfe7db" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(25, 22, 18, 0.54)',
          opacity: dim,
          zIndex: 8,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 58% 58% at 50% 48%, rgba(255,192,105,0.11), transparent 72%)',
          opacity: dim,
          zIndex: 9,
        }}
      />
    </AbsoluteFill>
  );
};
