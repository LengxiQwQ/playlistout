import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { ASSETS } from '../assets';
import { F } from '../theme';

type Turn = { at: number; dir: 1 | -1; page: string };

/** Physical page changes that carry the story from spread to spread. */
const TURNS: Turn[] = [
  { at: 170, dir: 1, page: '02' },
  { at: 522, dir: -1, page: '03' },
  { at: 756, dir: 1, page: '04' },
  { at: 1002, dir: -1, page: '05' },
  { at: 1365, dir: 1, page: '06' },
  { at: 1536, dir: -1, page: '07' },
];

const PAPER = '#f8f1e1';

const Sheet: React.FC<{ phase: number; dir: number; page: string }> = ({ phase, dir, page }) => {
  const cover = interpolate(phase, [0, 4, 9, 20], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const x = dir * (1 - cover) * 108;
  const shadow = 0.09 + cover * 0.13;

  return (
    <div
      style={{
        position: 'absolute',
        left: '-4%',
        top: '-4%',
        width: '108%',
        height: '108%',
        transform: `translateX(${x}%) rotate(${dir * -0.55}deg)`,
        background: PAPER,
        boxShadow: `0 0 55px rgba(65, 49, 29, ${shadow}), 0 14px 30px rgba(65, 49, 29, ${shadow * 0.6})`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ASSETS.grain})`,
          backgroundSize: '256px 256px',
          mixBlendMode: 'multiply',
          opacity: 0.34,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(112deg, rgba(255,255,255,.4), transparent 28%, rgba(127,101,62,.045) 66%, rgba(127,101,62,.1))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 96,
          bottom: 0,
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0, transparent 46px, rgba(126,112,91,.11) 46px, rgba(126,112,91,.11) 47px)',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 112,
          background: 'linear-gradient(to right, rgba(105,85,55,.075), transparent)',
          borderRight: '1px solid rgba(238,121,112,.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '36%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: F.display,
            fontSize: 142,
            lineHeight: 1,
            color: 'rgba(45,52,54,.13)',
            letterSpacing: '-.04em',
          }}
        >
          {page}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 4 }}>
          <span style={{ width: 38, height: 1, background: 'rgba(84,72,52,.28)' }} />
          <span style={{ fontFamily: F.hand, fontSize: 28, color: 'rgba(84,72,52,.48)', transform: 'rotate(-1deg)' }}>
            下一页
          </span>
          <span style={{ width: 38, height: 1, background: 'rgba(84,72,52,.28)' }} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 82,
          bottom: 58,
          fontFamily: F.mono,
          fontSize: 10,
          letterSpacing: '.16em',
          color: 'rgba(84,72,52,.4)',
        }}
      >
        PLAYLIST OUT / A LITTLE MUSIC JOURNEY
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 180,
          background: `linear-gradient(90deg, rgba(72,56,34,${0.14 * cover}), transparent)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 54,
          background: 'linear-gradient(270deg, rgba(73,56,32,.12), transparent)',
        }}
      />
    </div>
  );
};

export const PageTurn: React.FC = () => {
  const frame = useCurrentFrame();
  const turn = TURNS.find((t) => frame >= t.at - 7 && frame <= t.at + 13);
  if (!turn) return null;
  return (
    <AbsoluteFill style={{ zIndex: 1500, pointerEvents: 'none', overflow: 'hidden' }}>
      <Sheet phase={frame - (turn.at - 7)} dir={turn.dir} page={turn.page} />
    </AbsoluteFill>
  );
};
