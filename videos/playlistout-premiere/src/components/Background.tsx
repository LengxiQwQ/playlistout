import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { seeded } from '../anim';
import { ASSETS } from '../assets';

const HOLES = Array.from({ length: 8 }).map((_, i) => ({
  top: 64 + i * 134,
  seed: i + 4,
}));

export const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 180) * 34;
  const driftY = Math.cos(frame / 220) * 24;
  const t = frame / 30;

  const lightX = 985 + Math.sin(t * 0.2) * 38 + driftX * 0.25;
  const lightY = 350 + Math.cos(t * 0.16) * 22 + driftY * 0.2;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      {/* Warm base paper wash */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 90% at 20% 4%, #fbf6ea 0%, #f6f0e3 42%, #f1eadc 72%, #eee5d6 100%)',
        }}
      />

      {/* A slow pool of desk-lamp light */}
      <div
        style={{
          position: 'absolute',
          left: lightX - 760,
          top: lightY - 540,
          width: 1520,
          height: 1080,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,247,216,.52) 0%, rgba(255,244,207,.22) 38%, rgba(255,244,207,0) 72%)',
          filter: 'blur(18px)',
          transform: `rotate(${Math.sin(t * 0.11) * 2}deg)`,
          opacity: 0.95,
        }}
      />

      {/* Notebook ruling */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0, transparent 46px, rgba(126,112,91,.145) 46px, rgba(126,112,91,.145) 47px)',
          top: 44,
          bottom: 0,
          opacity: 0.72,
        }}
      />

      {/* A second, fainter set of rules gives the paper some depth */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,.25), transparent 12%, transparent 88%, rgba(109,90,60,.035))',
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
            'linear-gradient(to right, rgba(119,98,68,.115), rgba(119,98,68,.03) 42%, rgba(255,255,255,.18) 74%, rgba(255,255,255,0) 100%)',
          boxShadow: 'inset -1px 0 0 rgba(96,78,51,.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 0,
          bottom: 0,
          width: 3,
          background: 'rgba(112,97,75,.14)',
          boxShadow: '1px 0 0 rgba(255,255,255,.5)',
        }}
      />
      {HOLES.map((hole) => {
        const wobble = (seeded(hole.seed) - 0.5) * 2;
        return (
          <div
            key={hole.top}
            style={{
              position: 'absolute',
              left: 53,
              top: hole.top,
              width: 25,
              height: 25,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 32%, #e7dfd0 0 18%, #c8bca8 52%, #a99a82 100%)',
              boxShadow:
                'inset 3px 4px 7px rgba(72,58,40,.38), 0 2px 2px rgba(255,255,255,.65), 0 -1px 1px rgba(87,69,44,.14)',
              transform: `rotate(${wobble}deg)`,
            }}
            aria-hidden="true"
          >
            <div
              style={{
                position: 'absolute',
                left: 4,
                top: 5,
                width: 17,
                height: 15,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 40% 34%, #706553 0%, #8b7c65 58%, #b3a58f 100%)',
                opacity: 0.6,
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
          width: 1.6,
          background: 'rgba(240,123,115,.52)',
          boxShadow: '1px 0 0 rgba(255,255,255,.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 143,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'linear-gradient(to right, transparent, rgba(240,123,115,.045), transparent)',
        }}
      />

      {/* Subtle vertical page bend */}
      <div
        style={{
          position: 'absolute',
          left: '62%',
          top: 0,
          bottom: 0,
          width: 2,
          background:
            'linear-gradient(to bottom, transparent, rgba(120,100,70,.05) 15%, rgba(255,255,255,.14) 50%, rgba(120,100,70,.04) 85%, transparent)',
          transform: 'rotate(.2deg)',
        }}
      />

      {/* Paper grain and creases */}
      <div
        className="paper-texture"
        style={{
          opacity: 0.31,
          backgroundImage: `url(${ASSETS.grain})`,
          backgroundPosition: `${(frame / 8) % 256}px ${(frame / 13) % 256}px`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${ASSETS.creases})`,
          backgroundSize: '1100px 1100px',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply',
          opacity: 0.105,
        }}
      />

      {/* Fine fibers in the corners */}
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} aria-hidden="true">
        {Array.from({ length: 25 }).map((_, i) => {
          const x = seeded(i + 21) * 1920;
          const y = seeded(i + 71) * 1080;
          const len = 8 + seeded(i + 101) * 28;
          const angle = seeded(i + 131) * Math.PI;
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + Math.cos(angle) * len}
              y2={y + Math.sin(angle) * len}
              stroke="rgba(109,91,65,.22)"
              strokeWidth="0.7"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame / 6) % 256;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 1000 }}>
      {/* Warm bottom bounce */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(232,209,165,.16), transparent 24%), linear-gradient(to bottom, rgba(255,252,236,.12), transparent 30%)',
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 46%, transparent 45%, rgba(90,75,52,.03) 68%, rgba(73,58,37,.18) 100%)',
        }}
      />
      {/* Very fine moving grain, laid over everything */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ASSETS.grain})`,
          backgroundSize: '256px 256px',
          backgroundPosition: `${drift}px ${drift * 0.45}px`,
          mixBlendMode: 'multiply',
          opacity: 0.09,
        }}
      />
      {/* Gentle exposure breathing */}
      <AbsoluteFill
        style={{
          background: `rgba(255,244,214,${0.03 + Math.sin(frame / 92) * 0.012})`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
