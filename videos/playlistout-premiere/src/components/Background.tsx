import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { seeded } from '../anim';
import { ASSETS } from '../assets';

const HOLES = Array.from({ length: 8 }).map((_, i) => ({
  top: 64 + i * 134,
  seed: i + 4,
}));

/**
 * A real sheet of cream notebook paper, not a lit set. The texture does the
 * work here: pulp, fibers, soft creases and the slightly darker cut edge.
 */
export const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      {/* Flat, natural paper tone. No lamp pool, no vignette. */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(118deg, #f8f3e8 0%, #f4eee2 42%, #f2ebde 72%, #efe7d8 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${ASSETS.paperPage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply',
          opacity: 0.75,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 30% 18%, rgba(255,255,255,.2), transparent 58%), radial-gradient(ellipse at 82% 80%, rgba(132,108,72,.04), transparent 64%)',
        }}
      />

      {/* Notebook ruling */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0, transparent 46px, rgba(121,108,88,.16) 46px, rgba(121,108,88,.16) 47px)',
          top: 44,
          bottom: 0,
          opacity: 0.7,
        }}
      />

      {/* Binder spine + punched holes */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 132,
          background:
            'linear-gradient(to right, rgba(119,98,68,.11), rgba(119,98,68,.025) 42%, rgba(255,255,255,.14) 74%, rgba(255,255,255,0) 100%)',
          boxShadow: 'inset -1px 0 0 rgba(96,78,51,.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'rgba(112,97,75,.12)',
        }}
      />
      {HOLES.map((hole) => {
        const wobble = (seeded(hole.seed) - 0.5) * 2;
        return (
          <div
            key={hole.top}
            style={{
              position: 'absolute',
              left: 52,
              top: hole.top,
              width: 27,
              height: 27,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 32%, #e8dfcf 0 18%, #c8bca8 52%, #a99a82 100%)',
              boxShadow:
                'inset 3px 4px 7px rgba(72,58,40,.34), 0 2px 2px rgba(255,255,255,.52), 0 -1px 1px rgba(87,69,44,.12)',
              transform: `rotate(${wobble}deg)`,
            }}
            aria-hidden="true"
          >
            <div
              style={{
                position: 'absolute',
                left: 4,
                top: 5,
                width: 19,
                height: 17,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 40% 34%, #6d6250 0%, #8a7a64 58%, #b1a38e 100%)',
                opacity: 0.52,
              }}
            />
          </div>
        );
      })}

      {/* Red margin line */}
      <div
        style={{
          position: 'absolute',
          left: 146,
          top: 0,
          bottom: 0,
          width: 1.5,
          background: 'rgba(238,121,112,.46)',
        }}
      />

      {/* Page cut edge at the right/bottom, kept physical rather than glowing */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 12,
          background:
            'linear-gradient(to left, rgba(96,78,50,.055), rgba(96,78,50,.014) 48%, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 9,
          background:
            'linear-gradient(to top, rgba(96,78,50,.05), rgba(96,78,50,.012) 55%, transparent)',
        }}
      />

      {/* Paper grain, creases and tiny fibers */}
      <div
        className="paper-texture"
        style={{
          opacity: 0.32,
          backgroundImage: `url(${ASSETS.grain})`,
          backgroundPosition: `${17 + (frame * 0.38) % 64}px ${9 + (frame * 0.24) % 64}px`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${ASSETS.creases})`,
          backgroundSize: '1180px 1180px',
          backgroundPosition: '34% 20%',
          mixBlendMode: 'multiply',
          opacity: 0.2,
        }}
      />
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, opacity: 0.4 }}
        aria-hidden="true"
      >
        {Array.from({ length: 92 }).map((_, i) => {
          const x = seeded(i + 21) * 1920;
          const y = seeded(i + 71) * 1080;
          const len = 5 + seeded(i + 101) * 35;
          const angle = seeded(i + 131) * Math.PI;
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + Math.cos(angle) * len}
              y2={y + Math.sin(angle) * len}
              stroke={i % 4 === 0 ? 'rgba(93,75,49,.26)' : 'rgba(109,91,65,.15)'}
              strokeWidth={i % 7 === 0 ? 0.85 : 0.55}
            />
          );
        })}
        {Array.from({ length: 46 }).map((_, i) => {
          const x = seeded(i + 401) * 1920;
          const y = seeded(i + 503) * 1080;
          const r = 0.5 + seeded(i + 607) * 1.6;
          return (
            <circle
              key={`fleck-${i}`}
              cx={x}
              cy={y}
              r={r}
              fill={i % 3 === 0 ? 'rgba(80,62,39,.16)' : 'rgba(253,247,232,.45)'}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Very restrained top layer: no vignette, no warm bloom, only a little tooth. */
export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  // The page is held still, but the paper tooth keeps breathing. This is not
  // a camera move: the ruling, cards and margins do not shift, only the grain.
  const grainX = (frame * 0.55) % 256;
  const grainY = (frame * 0.37) % 256;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 1000 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ASSETS.grain})`,
          backgroundSize: '256px 256px',
          backgroundPosition: `${grainX}px ${grainY}px`,
          mixBlendMode: 'multiply',
          opacity: 0.045,
        }}
      />
    </AbsoluteFill>
  );
};
