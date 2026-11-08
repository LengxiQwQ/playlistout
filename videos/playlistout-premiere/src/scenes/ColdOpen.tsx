import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { PaperSheet } from '../components/Paper';
import { Tape } from '../components/Doodles';

const CAGE = { x: 1116, y: 190, w: 610, h: 660 };

/**
 * A two-second paper prologue. The cage is drawn line by line while the left
 * side has room to breathe; at 2s the wide shot opens with the same page,
 * already drawn, and the pink note is revealed inside it.
 */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const titleIn = interpolate(frame, [8, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const annotation = interpolate(frame, [28, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 174,
          top: 272,
          width: 860,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 14}px)`,
        }}
      >
        {['你的歌单，', '不该只困在', '一个平台里。'].map((line, i) => (
          <div
            key={line}
            style={{
              fontFamily: F.display,
              fontSize: 122,
              lineHeight: 1.03,
              color: C.ink,
              letterSpacing: '0.006em',
              textShadow: '0 1px 0 rgba(255,255,255,.42)',
              position: 'relative',
              width: 'fit-content',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: CAGE.x,
          top: CAGE.y,
          width: CAGE.w,
          height: CAGE.h,
          transform: 'rotate(1.1deg) scale(1)',
          transformOrigin: 'center center',
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="paper"
          style={{ width: '100%', height: '100%', padding: 0 }}
          radius="5px 12px 7px 14px / 11px 6px 14px 8px"
        >
          <div style={{ position: 'absolute', top: -12, left: 30, transform: 'rotate(-3deg)', zIndex: 5 }}>
            <Tape color="rgba(164,213,224,.62)" width={124} height={30} rotate={-2} />
          </div>
          <div style={{ position: 'absolute', top: 25, right: 24, zIndex: 4 }}>
            <Tape color="rgba(247,192,202,.68)" width={92} height={24} rotate={6} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 30,
              top: 24,
              fontFamily: F.mono,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: C.inkMuted,
              textTransform: 'uppercase',
            }}
          >
            PLAYLIST / KEPT INSIDE
          </div>
          <div
            style={{
              position: 'absolute',
              right: 34,
              top: 22,
              fontFamily: F.hand,
              fontSize: 21,
              color: C.marginRed,
              transform: 'rotate(2deg)',
            }}
          >
            六扇门，一把锁
          </div>

          <svg
            width="100%"
            height="100%"
            viewBox="0 0 610 660"
            fill="none"
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
            aria-hidden="true"
          >
            <path
              d="M64 575V294c0-115 95-190 241-190s241 75 241 190v281"
              stroke="rgba(45,52,54,.73)"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeDasharray="600"
              strokeDashoffset={600 * (1 - draw)}
            />
            <path
              d="M64 575h482M64 300c96 13 386 13 482 0"
              stroke="rgba(45,52,54,.57)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={draw}
            />
            {Array.from({ length: 7 }).map((_, i) => {
              const x = 100 + i * 68;
              const top = i === 3 ? 110 : 142 + Math.abs(3 - i) * 16;
              const local = interpolate(draw, [i * 0.06, 0.3 + i * 0.06], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <path
                  key={i}
                  d={`M${x} ${top + 4}C${x - 3} ${top + 180} ${x + 4} ${top + 320} ${x - 1} 571`}
                  stroke="rgba(45,52,54,.47)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  opacity={local * (0.72 + (i % 2) * 0.12)}
                />
              );
            })}
            {[370, 465, 557].map((y, idx) => (
              <path
                key={y}
                d={`M66 ${y + (idx === 2 ? 10 : 0)}c100 7 378 7 479 0`}
                stroke="rgba(45,52,54,.38)"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity={draw}
              />
            ))}
          </svg>
        </PaperSheet>
      </div>

      <div
        style={{
          position: 'absolute',
          left: CAGE.x + 28,
          top: CAGE.y + 580,
          fontFamily: F.hand,
          fontSize: 24,
          color: C.inkSoft,
          opacity: annotation * 0.7,
          transform: `rotate(${-3 + annotation * 1}deg)`,
        }}
      >
        一把锁，一道门。
      </div>
    </AbsoluteFill>
  );
};
