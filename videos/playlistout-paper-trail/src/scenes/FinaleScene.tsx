import React from 'react';
import {LOGO_128, LOGO_512} from '../assets';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {HandLine, Sticker, Tape} from '../components/Stationery';
import {Sparkle, Star, TinyMusicNotes, WavyDots} from '../components/Doodles';

const FourPointStar: React.FC<{size: number; color: string; style?: React.CSSProperties}> = ({size, color, style}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={style}>
    <path d="M10 1.5 11.8 8.2 18.5 10 11.8 11.8 10 18.5 8.2 11.8 1.5 10 8.2 8.2Z" fill={color} />
  </svg>
);

export const FinaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1540) return null;

  const coverIn = easeInOutCubic(between(frame, 1540, 1558));
  const logoIn = springIn({frame, start: 1542, damping: 13, stiffness: 150});
  const titleIn = between(frame, 1544, 1560);
  const cnIn = between(frame, 1548, 1564);
  const urlIn = springIn({frame, start: 1550, damping: 16, stiffness: 140});
  const footerIn = between(frame, 1556, 1574);
  const noteIn = between(frame, 1560, 1580);
  const glow = between(frame, 1582, 1640);
  const drift = interpolate(frame, [1540, 1680], [1.018, 1.0], {extrapolateRight: 'clamp'});
  const finalFade = between(frame, 1670, 1680);

  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 200}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - coverIn) * 100}%)`,
          background: '#f1e2c5',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 78% 72% at 50% 32%, rgba(255,253,240,0.78), rgba(248,235,207,0.45) 48%, rgba(223,199,158,0.32) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(to bottom, transparent 0 59px, rgba(151,126,89,0.14) 59px 60px)',
            backgroundSize: '100% 60px',
            opacity: 0.65,
            transform: `scale(${drift})`,
            transformOrigin: '50% 48%',
          }}
        />
        <div className="paper-texture" style={{position: 'absolute', inset: 0, opacity: 0.55, mixBlendMode: 'multiply'}} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 150px rgba(91,66,31,0.16)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 52,
            top: 0,
            bottom: 0,
            width: 64,
            background: 'linear-gradient(to right, rgba(135,101,53,0.15), rgba(255,255,255,0.04))',
            borderRight: '1px solid rgba(120,92,47,0.16)',
          }}
        />
        {[112, 288, 464, 640, 816, 992].map((top, i) => (
          <div
            key={top}
            style={{
              position: 'absolute',
              left: 80,
              top,
              width: 21,
              height: 21,
              borderRadius: '50%',
              background: '#f8eedb',
              border: '2px solid rgba(119,91,49,0.38)',
              boxShadow: 'inset 1px 2px 3px rgba(90,65,31,0.18)',
              opacity: 0.8,
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: 122,
            top: 155,
            width: 1676,
            height: 770,
            border: '2px solid rgba(45,52,54,0.58)',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 136,
            top: 168,
            width: 1648,
            height: 744,
            border: '1px dashed rgba(45,52,54,0.25)',
            borderRadius: 3,
            pointerEvents: 'none',
          }}
        />
        <div style={{position: 'absolute', right: 145, top: 152, width: 154, height: 42, transform: 'rotate(-6deg)'}}>
          <Tape color="pink" width={154} height={35} rotate={-4} opacity={0.64} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 182,
            top: 342,
            bottom: 150,
            width: 2,
            background:
              'repeating-linear-gradient(to bottom, rgba(190,104,90,0.42) 0 10px, transparent 10px 17px)',
            opacity: 0.7,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 118,
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: 13,
            letterSpacing: '0.34em',
            color: '#8c7b60',
            opacity: footerIn,
          }}
        >
          A LITTLE BOOK FOR YOUR SONGS · 2026
        </div>

        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 406,
            transform: `translate(-50%, -50%) scale(${0.55 + logoIn * 0.45}) rotate(${-2.4 + (1 - logoIn) * 8}deg)`,
            opacity: clamp(logoIn),
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: 176,
              height: 176,
              borderRadius: 8,
              background: '#f8e8ae',
              border: '2px solid rgba(45,52,54,0.9)',
              boxShadow: '7px 8px 0 rgba(45,52,54,0.9)',
              padding: 9,
              transform: 'rotate(1.5deg)',
            }}
          >
            <img src={LOGO_512} alt="Playlist Out logo" style={{width: '100%', height: '100%', objectFit: 'contain', display: 'block'}} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: -18,
              top: -18,
              width: 62,
              height: 22,
              background: 'rgba(235,198,135,0.72)',
              transform: 'rotate(-9deg)',
              clipPath: 'polygon(1% 10%, 99% 0%, 100% 90%, 0% 100%)',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 500,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.marker,
              fontSize: 98,
              lineHeight: 1.1,
              color: COLORS.ink,
              textShadow: '4px 5px 0 rgba(255,251,237,0.52)',
              opacity: clamp(titleIn),
              clipPath: `inset(0 ${Math.max(0, (1 - titleIn) * 100)}% 0 0)`,
            }}
          >
            Playlist Out
          </div>
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 56,
              lineHeight: 1.2,
              color: '#3d3830',
              marginTop: 1,
              opacity: cnIn,
              transform: `translateY(${(1 - cnIn) * 12}px)`,
              letterSpacing: '0.03em',
            }}
          >
            把你的歌单带走
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 724,
            transform: `translate(-50%, -50%) translateY(${(1 - urlIn) * 16}px) rotate(-1.1deg) scale(${0.9 + urlIn * 0.1})`,
            opacity: clamp(urlIn),
            zIndex: 6,
          }}
        >
          <div
            style={{
              background: COLORS.ink,
              color: '#fff8e8',
              border: '1.4px solid #1c2224',
              borderRadius: 3,
              padding: '13px 28px',
              fontFamily: FONTS.mono,
              fontSize: 24,
              letterSpacing: '0.01em',
              boxShadow: '5px 6px 0 rgba(45,52,54,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{fontSize: 14, color: '#ebc477'}}>♪</span>
            playlistout.lengxiqwq.com
            <span style={{fontSize: 14, color: '#ebc477'}}>↗</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 795,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            opacity: footerIn,
          }}
        >
          <span style={{width: 66, height: 1, background: 'rgba(77,67,52,0.34)'}} />
          <span style={{fontFamily: FONTS.hand, fontSize: 20, color: '#625746'}}>
            开源 · 为每一张歌单留一条出去的路
          </span>
          <span style={{width: 66, height: 1, background: 'rgba(77,67,52,0.34)'}} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 184,
            bottom: 62,
            textAlign: 'left',
            opacity: footerIn,
          }}
        >
          <div style={{fontFamily: FONTS.mono, fontSize: 12, letterSpacing: '0.03em', color: '#5d5345'}}>
            github.com/LengxiQwQ/playlistout
          </div>
          <div style={{fontFamily: FONTS.sans, fontSize: 10.5, color: '#8e806b', marginTop: 3}}>
            MIT License · © 2026 LengxiQwQ · Playlist Out
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 178,
            bottom: 52,
            transform: 'rotate(-2.4deg)',
            textAlign: 'center',
            opacity: footerIn,
          }}
        >
          <div
            style={{
              width: 100,
              height: 69,
              border: '1.5px solid rgba(45,52,54,0.64)',
              borderRadius: 3,
              background: 'rgba(255,251,238,0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              boxShadow: '2px 2px 0 rgba(45,52,54,0.16)',
            }}
          >
            <TinyMusicNotes style={{width: 61, height: 24}} color="#645b4b" />
            <span style={{fontFamily: FONTS.handLatin, fontSize: 15, color: '#5f5546'}}>next song?</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 287,
            top: 646,
            transform: 'rotate(-5deg)',
            opacity: footerIn * 0.9,
          }}
        >
          <div style={{fontFamily: FONTS.handLatin, fontSize: 25, color: '#7b6a50'}}>keep the little things.</div>
          <WavyDots width={130} color="#a48f6f" style={{marginTop: 4}} rotate={-2} />
        </div>

        <div
          style={{
            position: 'absolute',
            right: 287,
            top: 592,
            transform: 'rotate(4deg)',
            opacity: footerIn * 0.9,
            textAlign: 'right',
          }}
        >
          <div style={{fontFamily: FONTS.hand, fontSize: 22, color: '#6e604b', lineHeight: 1.3}}>
            下次见，
            <br />
            记得带上歌。
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 38% 34% at 50% 36%, rgba(255,241,191,0.34), transparent 72%)',
            opacity: glow,
            pointerEvents: 'none',
          }}
        />

        {[0, 1, 2, 3, 4, 5].map((i) => {
          const appear = between(frame, 1620 + i * 4, 1636 + i * 4);
          const positions = [
            [786, 286, 16],
            [1142, 278, 13],
            [1212, 514, 17],
            [724, 550, 14],
            [860, 760, 12],
            [1068, 760, 15],
          ][i];
          return (
            <FourPointStar
              key={i}
              size={positions[2]}
              color="#cfa24b"
              style={{
                position: 'absolute',
                left: positions[0],
                top: positions[1],
                opacity: appear * 0.72,
                transform: `rotate(${i * 17}deg) scale(${0.7 + appear * 0.3})`,
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: 960,
            bottom: 27,
            transform: 'translateX(-50%)',
            fontFamily: FONTS.hand,
            fontSize: 15,
            color: 'rgba(74,63,48,0.55)',
            letterSpacing: '0.16em',
            opacity: noteIn,
          }}
        >
          ♪ 致每一个认真收藏音乐的人 ♪
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#f3e4c8',
            opacity: finalFade * 0.08,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 48,
          transform: `translateY(${(1 - coverIn) * 100}vh)`,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(221,198,161,0.1))',
          boxShadow: '0 10px 20px rgba(85,61,29,0.16)',
          opacity: 1 - coverIn,
          borderRadius: '50% 50% 0 0 / 18px 18px 0 0',
        }}
      />
    </AbsoluteFill>
  );
};
