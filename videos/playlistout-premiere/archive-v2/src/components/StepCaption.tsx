import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, F } from '../theme';

type Step = {
  from: number;
  to: number;
  number: string;
  kicker: string;
  text: string;
};

/** The hand-written chapter tab stays legible when the camera is close. */
const STEPS: Step[] = [
  { from: 183, to: 315, number: '01', kicker: 'PASTE / RESOLVE', text: '把链接交给它' },
  { from: 315, to: 522, number: '01', kicker: 'TRACKS / ON PAPER', text: '歌单，落到纸上' },
  { from: 522, to: 756, number: '02', kicker: 'EXPORT / TAKE IT', text: '挑一种方式带走' },
  { from: 756, to: 1002, number: '03', kicker: 'BATCH / THE LIBRARY', text: '整本，一起打包' },
  { from: 1002, to: 1365, number: '04', kicker: 'CLI / THE LOCAL WAY', text: '不打开浏览器，也能带走' },
  { from: 1365, to: 1536, number: '05', kicker: 'NEXT STOP / ECOSYSTEM', text: '带去下一站' },
];

export const StepCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const step = STEPS.find((s) => frame >= s.from && frame < s.to);
  if (!step) return null;
  const inT = Math.min(1, Math.max(0, (frame - step.from) / 5));
  const outT = Math.min(1, Math.max(0, (step.to - frame) / 5));
  const opacity = Math.min(inT, outT);

  return (
    <div
      style={{
        position: 'absolute',
        left: 164,
        bottom: 30,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 16,
        opacity,
        transform: `translateY(${(1 - opacity) * 8}px) rotate(-0.35deg)`,
      }}
      aria-hidden="true"
    >
      <div style={{ position: 'relative', padding: '9px 21px 10px 24px', background: 'rgba(255,250,238,.94)', border: '1px solid rgba(45,52,54,.19)', borderRadius: '3px 7px 4px 8px / 7px 4px 8px 3px', boxShadow: '0 4px 10px rgba(66,52,31,.08), 0 1px 2px rgba(66,52,31,.08)' }}>
        <div
          style={{
            position: 'absolute',
            left: 32,
            top: -9,
            width: 72,
            height: 17,
            background: 'rgba(220,185,185,.55)',
            transform: 'rotate(-1.5deg)',
            opacity: 0.8,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '.12em', color: C.inkMuted }}>
            STEP {step.number}
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '.14em', color: C.inkMuted, opacity: 0.8 }}>
            {step.kicker}
          </span>
        </div>
        <div style={{ fontFamily: F.display, fontSize: 46, lineHeight: 1.12, color: C.ink, marginTop: 1 }}>
          {step.text}
        </div>
      </div>
    </div>
  );
};
