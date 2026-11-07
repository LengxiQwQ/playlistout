import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS, PLATFORMS} from '../theme';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {CoverArt, HandDrawnCheck, Paper, Sticker, Tape} from '../components/Stationery';
import {HandArrow, ScribbleUnderline, Sparkle, Star, TinyMusicNotes, WavyDots} from '../components/Doodles';

const TAGS: Record<string, {x: number; y: number; rot: number}> = {
  qqmusic: {x: 588, y: 404, rot: -3.2},
  netease: {x: 1156, y: 392, rot: 2.3},
  kugou: {x: 402, y: 618, rot: -4.8},
  kuwo: {x: 1362, y: 590, rot: 3.8},
  qishui: {x: 568, y: 848, rot: 2.6},
  migu: {x: 1200, y: 844, rot: -3.1},
};

const TAG_SIZE = {
  width: 236,
  height: 58,
};

const Threads: React.FC<{frame: number; cardY: number; snap: number}> = ({frame, cardY, snap}) => {
  const wobble = Math.sin(frame / 7) * 2;
  return (
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <filter id="threadBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>
      {Object.entries(TAGS).map(([id, tag], i) => {
        const tx = tag.x + TAG_SIZE.width / 2;
        const ty = tag.y + TAG_SIZE.height / 2;
        const targetX = 960 + (i % 2 === 0 ? -80 : 80);
        const targetY = cardY + 150 + (i < 2 ? -80 : i > 3 ? 120 : 10);
        const bow = 90 + Math.sin(frame / 15 + i) * 5;
        const pull = clamp(snap - i * 0.02);
        const opacity = 0.8 * (1 - snap);
        return (
          <g key={id} opacity={opacity} filter="url(#threadBlur)">
            <path
              d={`M ${tx} ${ty} C ${tx + (i < 3 ? -bow : bow)} ${ty + wobble * 2}, ${
                targetX + (i < 3 ? 60 : -60)
              } ${targetY - 40}, ${targetX} ${targetY}`}
              fill="none"
              stroke="#ca6e64"
              strokeWidth="2.2"
              strokeDasharray="7 5"
              strokeDashoffset={frame * 0.5 + i * 8}
            />
            <circle cx={targetX} cy={targetY} r={4.2} fill="#c85e54" stroke="#fdf6e9" strokeWidth="1.8" />
            <circle cx={tx + (i < 3 ? 72 : -72)} cy={ty + 10} r={3} fill="#fdf6e9" stroke="#ca6e64" strokeWidth="1.2" />
            {pull > 0 && (
              <path
                d={`M ${tx} ${ty} q ${i < 3 ? -18 : 18} ${-25 - pull * 30} ${i < 3 ? -32 : 32} ${-18}`}
                fill="none"
                stroke="#ca6e64"
                strokeWidth="2"
                opacity={1 - pull}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

const PlatformTag: React.FC<{
  platform: (typeof PLATFORMS)[number];
  x: number;
  y: number;
  rot: number;
  frame: number;
  index: number;
  snap: number;
}> = ({platform, x, y, rot, frame, index, snap}) => {
  const enter = springIn({frame, start: 12 + index * 4, damping: 16, stiffness: 120});
  const kick = interpolate(snap, [0, 0.4, 1], [0, 1, 0.7], {extrapolateRight: 'clamp'});
  const driftX = Math.sin(frame / 24 + index * 1.7) * 5;
  const driftY = Math.cos(frame / 27 + index) * 4;
  const outX = (index % 2 === 0 ? -1 : 1) * kick * (25 + index * 4);
  const outY = (index < 2 ? -1 : 1) * kick * (16 + index * 2);
  return (
    <div
      style={{
        position: 'absolute',
        left: x + driftX + outX,
        top: y + driftY + outY,
        width: TAG_SIZE.width,
        height: TAG_SIZE.height,
        transform: `translateY(${(1 - enter) * -18}px) scale(${0.82 + enter * 0.18}) rotate(${rot + kick * (index % 2 ? 5 : -5)}deg)`,
        opacity: enter,
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: platform.bg,
          border: `2px solid ${platform.border}`,
          borderRadius: 5,
          boxShadow: '4px 5px 0 rgba(45,52,54,0.18)',
          color: platform.ink,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 15px',
          fontFamily: FONTS.sans,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            border: `1.5px solid ${platform.border}`,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONTS.mono,
            fontSize: 9,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <span>{platform.name}</span>
        <span style={{fontSize: 10, opacity: 0.6, fontFamily: FONTS.sans, fontWeight: 500, marginLeft: 'auto'}}>{platform.note}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          width: 70,
          height: 17,
          left: 65,
          top: -10,
          background: index % 2 ? 'rgba(168,218,235,0.56)' : 'rgba(246,211,143,0.61)',
          transform: `rotate(${index % 2 ? -4 : 2}deg)`,
          clipPath: 'polygon(1% 12%, 99% 0%, 100% 90%, 0% 100%)',
        }}
      />
    </div>
  );
};

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const camera = interpolate(seconds, [0, 6], [1.02, 1.055], {extrapolateRight: 'clamp'});
  const snap = between(frame, 108, 128);
  const lift = springIn({frame, start: 106, damping: 17, stiffness: 95});
  const cardY = interpolate(lift, [0, 1], [560, 500]);
  const cardRot = interpolate(lift, [0, 1], [0.8, -3.2]) + Math.sin(frame / 20) * 0.3;
  const titleOut = between(frame, 113, 128);
  const titleIn = between(frame, 132, 146);
  const footnoteOut = between(frame, 105, 125);

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${camera}) translateY(${interpolate(seconds, [0, 6], [0, -6])}px)`,
          transformOrigin: '50% 52%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 212,
            top: 108,
            transform: 'rotate(-7deg)',
            opacity: 0.95,
          }}
        >
          <div
            style={{
              background: '#d9edf7',
              border: '1.5px solid #6a9fb5',
              color: '#2d5969',
              padding: '6px 16px',
              fontFamily: FONTS.mono,
              fontSize: 15,
              boxShadow: '2px 2px 0 rgba(45,52,54,0.2)',
              letterSpacing: '0.03em',
            }}
          >
            ♪ music
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 148,
            textAlign: 'center',
            transform: `translateY(${-titleOut * 35}px)`,
            opacity: 1 - titleOut,
            clipPath: `inset(0 ${Math.max(0, (1 - between(frame, 2, 26)) * 100)}% 0 0)`,
          }}
        >
          <div style={{fontFamily: FONTS.hand, fontSize: 23, color: COLORS.inkSoft, letterSpacing: '0.1em', marginBottom: 4}}>
            一张歌单 · 六个平台
          </div>
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 94,
              lineHeight: 1.14,
              color: COLORS.ink,
              textShadow: '3px 4px 0 rgba(65,48,12,0.14)',
              letterSpacing: '0.015em',
            }}
          >
            好歌单，<span style={{position: 'relative', display: 'inline-block'}}>不该被困住</span>。
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: -5}}>
            <ScribbleUnderline width={460} progress={between(frame, 22, 48)} color="#e6a33e" strokeWidth={5} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 164,
            textAlign: 'center',
            transform: `translateY(${(1 - titleIn) * 42}px)`,
            opacity: titleIn,
          }}
        >
          <div style={{fontFamily: FONTS.handLatin, fontSize: 27, color: COLORS.orangeDeep, letterSpacing: '0.08em', marginBottom: 2}}>
            unplug it, carry it
          </div>
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 103,
              lineHeight: 1.1,
              color: COLORS.ink,
              textShadow: '3px 4px 0 rgba(65,48,12,0.14)',
            }}
          >
            那就，把它<span style={{position: 'relative', display: 'inline-block', color: '#9a5d14'}}>带走</span>。
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: -10}}>
            <ScribbleUnderline width={330} progress={between(frame, 132, 150)} color="#e6a33e" strokeWidth={5} />
          </div>
        </div>

        <Threads frame={frame} cardY={cardY} snap={snap} />

        {PLATFORMS.map((platform, index) => (
          <PlatformTag
            key={platform.id}
            platform={platform}
            x={TAGS[platform.id].x}
            y={TAGS[platform.id].y}
            rot={TAGS[platform.id].rot}
            frame={frame}
            index={index}
            snap={snap}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: 960,
            top: cardY,
            width: 412,
            transform: `translate(-50%, 0) rotate(${cardRot}deg)`,
            zIndex: 30,
          }}
        >
          <Paper
            color={COLORS.paperWhite}
            style={{
              width: 412,
              height: 508,
              padding: '13px 14px 18px',
              boxShadow: '9px 12px 0 rgba(45,52,54,0.20), 0 18px 38px rgba(73,55,30,0.12)',
            }}
          >
            <Tape color="pink" width={104} height={24} rotate={-8} style={{left: 18, top: -12}} opacity={0.8} />
            <Tape color="blue" width={80} height={20} rotate={7} style={{right: 26, top: 2}} opacity={0.65} />
            <div
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: 32,
              }}
            >
              <CoverArt width={336} height={238} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginTop: 17,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: FONTS.hand,
                      fontSize: 36,
                      lineHeight: 1.2,
                      color: COLORS.ink,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    花谱、鎖那、鹿乃
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontWeight: 600,
                      fontSize: 14,
                      color: COLORS.inkSoft,
                      marginTop: 6,
                    }}
                  >
                    创建者：琴心月满
                  </div>
                </div>
                <Sticker
                  bg="#e6f6ee"
                  border="#72b895"
                  ink="#176b48"
                  rotate={4}
                  style={{fontFamily: FONTS.hand, fontSize: 15, padding: '5px 9px'}}
                >
                  104 首
                </Sticker>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 13,
                  color: COLORS.inkMuted,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  borderTop: '1.5px dashed rgba(45,52,54,0.16)',
                  paddingTop: 13,
                }}
              >
                <span style={{width: 9, height: 9, borderRadius: '50%', background: '#27b173'}} />
                QQ 音乐 · 7 小时 6 分钟
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 17,
                right: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{fontFamily: FONTS.handLatin, fontSize: 19, color: COLORS.inkMuted}}>
                a playlist, kept close
              </div>
              <div style={{display: 'flex', gap: -4}}>
                {['✦', '✧', '✦'].map((s, i) => (
                  <span key={i} style={{fontSize: 12 + i * 2, color: '#caa353', marginLeft: -1}}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Paper>

          <div
            style={{
              position: 'absolute',
              left: -74,
              top: 120,
              transform: 'rotate(-8deg)',
              background: COLORS.yellow,
              border: '1.5px solid #caa756',
              padding: '8px 11px',
              fontFamily: FONTS.hand,
              fontSize: 19,
              color: '#7a5c22',
              boxShadow: '3px 3px 0 rgba(45,52,54,0.12)',
              opacity: 0.95,
            }}
          >
            只能留在这里？
            <Sparkle size={18} style={{position: 'absolute', right: -17, top: -13}} opacity={0.8} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 350,
            top: 520,
            transform: 'rotate(-4deg)',
            opacity: footnoteOut * (0.72 + 0.1 * Math.sin(frame / 20)),
          }}
        >
          <div style={{fontFamily: FONTS.handLatin, fontSize: 26, color: COLORS.inkSoft}}>one app?</div>
          <HandArrow width={110} height={74} color="#9a8d7c" progress={between(frame, 18, 44)} style={{marginLeft: 52, marginTop: -4}} />
        </div>

        <div
          style={{
            position: 'absolute',
            right: 256,
            top: 716,
            transform: 'rotate(3.2deg)',
            textAlign: 'right',
            opacity: 0.9,
          }}
        >
          <div style={{fontFamily: FONTS.hand, fontSize: 24, color: COLORS.inkSoft, lineHeight: 1.35}}>
            喜欢的歌，
            <br />
            应该跟着你走。
          </div>
          <WavyDots width={130} color="#ac9f8b" style={{marginLeft: 'auto', marginTop: 4}} rotate={-2} />
        </div>

        <div style={{position: 'absolute', left: 300, top: 922, opacity: 0.7}}>
          <TinyMusicNotes rotate={-6} color="#a89983" />
        </div>
        <Star size={20} color="#d8b15c" filled={false} style={{position: 'absolute', right: 248, top: 300, opacity: 0.75}} rotate={13} />
        <Star size={13} color="#d8b15c" style={{position: 'absolute', left: 330, top: 282, opacity: 0.7}} rotate={-10} />
        <Sparkle size={28} style={{position: 'absolute', right: 392, top: 934, opacity: 0.8}} rotate={18} />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 34,
            display: 'flex',
            justifyContent: 'center',
            opacity: interpolate(seconds, [4.4, 4.9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: FONTS.hand,
              fontSize: 20,
              color: COLORS.inkMuted,
            }}
          >
            <span style={{width: 40, height: 1, background: '#a99d8b'}} />
            粘贴 · 解析 · 导出
            <span style={{width: 40, height: 1, background: '#a99d8b'}} />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 70,
          background: 'linear-gradient(to top, rgba(70,54,31,0.17), transparent)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
