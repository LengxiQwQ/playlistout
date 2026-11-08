import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SHADOW } from '../theme';
import { bob, easeInOut, easeOut, seeded } from '../anim';
import { ArrowCurve, ChapterMark, Sparkle, StarDoodle, Tape, Underline } from '../components/Doodles';
import { PaperSheet, PlatformChip, StickerTag } from '../components/Paper';
import { PLATFORMS, PLAYLIST } from '../data';

const CAGE = { x: 1116, y: 190, w: 610, h: 660 };

const tagPlacements = [
  { left: 1006, top: 316, rotate: -5, delay: 6 },
  { left: 1650, top: 298, rotate: 4, delay: 12 },
  { left: 1002, top: 610, rotate: -2.5, delay: 18 },
  { left: 1664, top: 618, rotate: 3, delay: 24 },
  { left: 1194, top: 858, rotate: 2, delay: 30 },
  { left: 1582, top: 856, rotate: -3.5, delay: 36 },
];

const Wire: React.FC<{ d: string; color: string; progress: number; width?: number }> = ({
  d,
  color,
  progress,
  width = 1.8,
}) => (
  <path
    d={d}
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    strokeDasharray="3 7"
    strokeDashoffset={40}
    opacity={0.55}
    pathLength={100}
    style={{
      strokeDashoffset: 100,
      ...(progress > 0 ? { strokeDashoffset: 100 - progress * 100 } : {}),
    }}
  />
);

const CageBack: React.FC<{ frame: number; ready?: boolean }> = ({ frame, ready = false }) => {
  const { fps } = useVideoConfig();
  const enter = ready ? 1 : spring({ frame, fps, config: { damping: 22, stiffness: 90, mass: 0.9 }, durationInFrames: 45 });
  const jolt = frame > 120 ? Math.sin((frame - 120) * 0.9) * Math.exp(-(frame - 120) / 36) * 2.4 : 0;
  const breakT = easeInOut(frame, 150, 18, 0, 1);
  const fade = ready
    ? interpolate(frame, [0, 175, 204], [1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, 5, 175, 204], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  return (
    <div
      style={{
        position: 'absolute',
        left: CAGE.x,
        top: CAGE.y,
        width: CAGE.w,
        height: CAGE.h,
        transform: `translateY(${(1 - enter) * 70 + jolt}px) rotate(${1.1 + jolt * 0.12}deg) scale(${0.96 + enter * 0.04})`,
        opacity: fade,
      }}
    >
      <PaperSheet
        tone="cream"
        rotate={0}
        shadow="paper"
        style={{ width: '100%', height: '100%', padding: 0 }}
        radius="5px 12px 7px 14px / 11px 6px 14px 8px"
      >
        {/* pinned corner label */}
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

        {/* Hand-drawn wire cage, behind the escaping note */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 610 660"
          fill="none"
          style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'visible' }}
          aria-hidden="true"
        >
          <path
            d="M64 575V294c0-115 95-190 241-190s241 75 241 190v281"
            stroke="rgba(45,52,54,.73)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={600 * (1 - enter)}
          />
          <path
            d="M64 575h482M64 300c96 13 386 13 482 0"
            stroke="rgba(45,52,54,.57)"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={enter}
          />
          {Array.from({ length: 7 }).map((_, i) => {
            const x = 100 + i * 68;
            const top = i === 3 ? 110 : 142 + Math.abs(3 - i) * 16;
            return (
              <path
                key={i}
                d={`M${x} ${top + 4}C${x - 3} ${top + 180} ${x + 4} ${top + 320} ${x - 1} 571`}
                stroke="rgba(45,52,54,.47)"
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity={enter * (0.72 + (i % 2) * 0.12)}
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
              opacity={enter}
            />
          ))}

          {/* tag strings */}
          {[
            { d: 'M96 370C42 366 12 338 8 306', color: PLATFORMS[0].ink },
            { d: 'M520 358C570 344 586 318 592 290', color: PLATFORMS[1].ink },
            { d: 'M58 438C22 454 2 480 0 505', color: PLATFORMS[2].ink },
            { d: 'M554 445C592 458 604 488 608 520', color: PLATFORMS[3].ink },
            { d: 'M214 581C210 612 216 634 238 650', color: PLATFORMS[4].ink },
            { d: 'M408 581C420 608 418 634 396 648', color: PLATFORMS[5].ink },
          ].map((wire, i) => (
            <path
              key={i}
              d={wire.d}
              stroke={wire.color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="4 7"
              opacity={interpolate(frame, [68 + i * 5, 85 + i * 5], [0, 0.55], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
              style={{ transform: `translateY(${breakT * (i % 2 === 0 ? -6 : 8)}px)` }}
            />
          ))}

          {/* the lock is drawn in the foreground layer, over the bars and the note */}
        </svg>

        {/* trapped playlist receipt */}
        <div
          style={{
            position: 'absolute',
            left: 178,
            bottom: 34,
            width: 252,
            padding: '11px 16px 10px',
            background: 'rgba(255,253,246,.94)',
            border: '1px dashed rgba(45,52,54,.34)',
            borderRadius: '2px 3px 2px 2px',
            transform: `rotate(${-2.2 + breakT * 5}deg)`,
            boxShadow: '2px 3px 0 rgba(45,52,54,.08)',
            zIndex: 3,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: F.mono, fontSize: 9.5, color: C.inkMuted, letterSpacing: '.14em' }}>TRAPPED PLAYLIST</span>
            <span style={{ fontFamily: F.hand, fontSize: 20, color: C.ink }}>No. 01</span>
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 16, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {PLAYLIST.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontFamily: F.mono, fontSize: 10.5, color: C.inkSoft }}>
            <span>104 TRACKS</span>
            <span>7H 06M</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 26,
            fontFamily: F.hand,
            fontSize: 24,
            color: C.inkMuted,
            transform: 'rotate(-5deg)',
            opacity: 0.85,
            zIndex: 3,
          }}
        >
          ♪ 出不去啦…
        </div>
      </PaperSheet>
    </div>
  );
};

const Ticket: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 20, fps, config: { damping: 19, stiffness: 95 }, durationInFrames: 35 });
  const sway = Math.sin((frame - 20) / 46) * 0.65;
  const exit = easeInOut(frame, 162, 25, 0, 1);
  const opacity = interpolate(frame, [0, 18, 177, 199], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 180,
        top: 794,
        width: 644,
        transform: `translateY(${(1 - enter) * 34 - exit * 28}px) translateX(${exit * 60}px) rotate(${-1.2 + sway - exit * 3}deg) scale(${0.96 + enter * 0.04 - exit * 0.06})`,
        opacity,
      }}
    >
      <PaperSheet tone="yellow" rotate={0} shadow="soft" style={{ width: '100%', padding: '17px 22px 16px' }}>
        <div style={{ position: 'absolute', left: 48, top: -12, zIndex: 4 }}>
          <Tape color="rgba(250,197,204,.7)" width={128} height={28} rotate={-4} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: C.inkSoft }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.marginRed, display: 'inline-block' }} />
              ONE PLAYLIST · ONE PLATFORM
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: F.display,
                fontSize: 36,
                lineHeight: 1.05,
                color: C.ink,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 500,
              }}
            >
              {PLAYLIST.name}
            </div>
            <div style={{ marginTop: 4, fontFamily: F.sans, fontSize: 13.5, color: C.inkSoft }}>
              {PLAYLIST.creator} · 104 首 · 7 小时 06 分
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div
              style={{
                border: `1.5px solid ${C.ink}`,
                borderRadius: '50%',
                width: 54,
                height: 54,
                display: 'grid',
                placeItems: 'center',
                fontFamily: F.display,
                fontSize: 31,
                color: C.ink,
                transform: 'rotate(7deg)',
                background: 'rgba(255,255,255,.32)',
              }}
            >
              104
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[3, 1, 2, 1, 2, 3, 1, 2, 1].map((w, i) => (
                <div key={i} style={{ width: w, height: 16, background: C.ink, opacity: 0.82 }} />
              ))}
            </div>
          </div>
        </div>
      </PaperSheet>
    </div>
  );
};

export const Intro: React.FC<{ cageReady?: boolean }> = ({ cageReady = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 85, mass: 0.9 }, durationInFrames: 50 });
  const titleOut = easeInOut(frame, 118, 14, 0, 1);
  const secondIn = spring({ frame: frame - 138, fps, config: { damping: 17, stiffness: 100, mass: 0.8 }, durationInFrames: 34 });
  const secondOut = easeInOut(frame, 182, 22, 0, 1);
  const sceneOpacity = cageReady
    ? interpolate(frame, [0, 168, 170], [1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, 5, 168, 170], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
  const shake = frame > 145 && frame < 175 ? Math.sin(frame * 1.8) * Math.exp(-(frame - 145) / 20) * 1.7 : 0;
  const lockBreak = frame > 150;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* the whole spread gets a breath of camera movement */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${Math.sin(frame / 150) * 3 + shake}px, ${Math.cos(frame / 160) * 2}px) scale(${1.006 + enter * 0.004})`,
        }}
      >
        <ChapterMark
          number="00"
          kicker="A PLAYLIST ESCAPE · 00:00"
          title="扉页 · 被困住的歌单"
          style={{
            position: 'absolute',
            left: 182,
            top: 170,
            opacity: interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${(1 - easeOut(frame, 6, 25)) * 12}px)`,
          }}
        />

        {/* opening title */}
        <div
          style={{
            position: 'absolute',
            left: 174,
            top: 272,
            width: 860,
            opacity: 1 - titleOut,
            transform: `translateY(${-titleOut * 22}px) scale(${1 - titleOut * 0.03})`,
            transformOrigin: 'left top',
          }}
        >
          <div style={{ position: 'relative', width: 'fit-content' }}>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 122,
                lineHeight: 1.03,
                color: C.ink,
                letterSpacing: '0.006em',
                textShadow: '0 1px 0 rgba(255,255,255,.42)',
              }}
            >
              你的歌单，
            </div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 122,
                lineHeight: 1.03,
                color: C.ink,
                letterSpacing: '0.006em',
                textShadow: '0 1px 0 rgba(255,255,255,.42)',
              }}
            >
              不该只困在
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div
                style={{
                  position: 'absolute',
                  left: -8,
                  right: -16,
                  bottom: 0,
                  height: '0.64em',
                  background: 'rgba(253,214,93,.58)',
                  borderRadius: '44% 54% 40% 58% / 50% 43% 60% 45%',
                  transform: `rotate(-1.2deg) scaleX(${easeOut(frame, 68, 28)})`,
                  transformOrigin: 'left center',
                  zIndex: -1,
                }}
              />
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 122,
                  lineHeight: 1.03,
                  color: C.ink,
                  letterSpacing: '0.006em',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                一个平台里。
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              opacity: interpolate(frame, [78, 96], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `translateY(${(1 - easeOut(frame, 78, 24)) * 10}px)`,
            }}
          >
            <div style={{ width: 42, height: 1.5, background: C.ink, opacity: 0.55 }} />
            <div style={{ fontFamily: F.hand, fontSize: 27, color: C.inkSoft, letterSpacing: '0.01em' }}>
              换一个 App，就要重新找一遍。
            </div>
          </div>
        </div>

        {/* resolution title, appearing when the note starts to escape */}
        <div
          style={{
            position: 'absolute',
            left: 180,
            top: 348,
            width: 880,
            opacity: secondIn * (1 - secondOut),
            transform: `translateY(${(1 - secondIn) * 48 - secondOut * 26}px) scale(${0.94 + secondIn * 0.06 - secondOut * 0.04})`,
            transformOrigin: 'left center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: F.hand, fontSize: 35, color: C.inkMuted, transform: 'rotate(-2deg)' }}>所以，</div>
            <div style={{ width: 62, height: 1.6, background: C.ink, opacity: 0.45 }} />
          </div>
          <div style={{ fontFamily: F.display, fontSize: 154, lineHeight: 1.02, color: C.ink, letterSpacing: '-0.006em', marginTop: 2 }}>
            把它带走。
          </div>
          <div style={{ position: 'relative', width: 720, marginTop: 2 }}>
            <Underline width={720} height={22} progress={easeOut(frame, 146, 36)} color={C.yellowDeep} strokeWidth={9} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <StickerTag tone={C.mint} ink="#356b49" rotate={-1.6} style={{ fontSize: 18, padding: '6px 12px' }}>
              不下载音频 · 只带走歌单数据
            </StickerTag>
            <div style={{ fontFamily: F.hand, fontSize: 24, color: C.inkSoft, opacity: 0.8 }}>for your next player ♪</div>
          </div>
        </div>

        <Ticket frame={frame} />
        <CageBack frame={frame} ready={cageReady} />

        {/* platform tags holding the cage */}
        {PLATFORMS.map((platform, i) => {
          const placement = tagPlacements[i];
          const pop = spring({
            frame: frame - placement.delay,
            fps,
            config: { damping: 14, stiffness: 130, mass: 0.65 },
            durationInFrames: 28,
          });
          const tug = frame > 76 && frame < 152
            ? Math.sin((frame - 76) / 13 + i * 1.7) * 2.1 * Math.exp(-((frame - 76) % 35) / 20)
            : 0;
          const released = easeInOut(frame, 153 + i * 2, 22, 0, 1);
          const flyX = (i < 2 ? -1 : 1) * released * (90 + i * 14);
          const flyY = released * (i > 3 ? 50 : -50 - i * 5);
          const opacity = interpolate(frame, [placement.delay, placement.delay + 12, 183, 200], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={platform.id}
              style={{
                position: 'absolute',
                left: placement.left,
                top: placement.top,
                opacity,
                transform: `translate(${flyX}px, ${flyY + (1 - pop) * 28}px) rotate(${placement.rotate + tug + released * (i % 2 === 0 ? -6 : 7)}deg) scale(${0.86 + pop * 0.14})`,
                zIndex: 6,
              }}
            >
              <PlatformChip platform={platform} active rotate={0} size="md" />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '100%',
                  width: 1,
                  height: 0,
                  background: platform.ink,
                }}
              />
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: CAGE.x + 202,
            top: CAGE.y + 414,
            fontFamily: F.hand,
            fontSize: 30,
            color: C.inkSoft,
            transform: 'rotate(-6deg)',
            opacity: 0.72,
            zIndex: 3,
          }}
        >
          {lockBreak ? '啪。' : '……'}
        </div>

        {/* a loose doodle and page margin scribbles */}
        <div style={{ position: 'absolute', left: 181, top: 988, display: 'flex', alignItems: 'center', gap: 14, opacity: 0.6 }}>
          <Sparkle size={20} color={C.pinkDeep} rotate={12} />
          <StarDoodle frame={frame} size={13} color={C.yellowDeep} seed={9} />
          <div style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: '.18em', color: C.inkMuted }}>A LITTLE MUSIC JOURNEY</div>
        </div>

        <div style={{ position: 'absolute', right: 84, bottom: 48, fontFamily: F.hand, fontSize: 24, color: C.inkSoft, transform: 'rotate(-3deg)', opacity: 0.62 }}>
          ✦ 有些歌，值得被留下
        </div>

        {/* platform tethers, drawn as loose strings into the cage */}
        <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }} aria-hidden="true">
          {[
            { d: 'M1094 341C1075 356 1087 386 1116 411', color: PLATFORMS[0].ink },
            { d: 'M1636 325C1672 336 1697 356 1709 385', color: PLATFORMS[1].ink },
            { d: 'M1082 632C1100 631 1121 642 1135 667', color: PLATFORMS[2].ink },
            { d: 'M1652 642C1630 644 1610 660 1598 684', color: PLATFORMS[3].ink },
            { d: 'M1270 842C1270 817 1285 797 1310 784', color: PLATFORMS[4].ink },
            { d: 'M1560 838C1548 814 1539 795 1534 776', color: PLATFORMS[5].ink },
          ].map((wire, i) => {
            const draw = easeOut(frame, 55 + i * 5, 25);
            const release = easeInOut(frame, 152 + i, 20, 0, 1);
            return (
              <g key={i} opacity={0.42 * (1 - release)}>
                <path d={wire.d} stroke={wire.color} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="4 6" strokeDashoffset={70 * (1 - draw)} />
                <circle cx={wire.d.includes('M1094') ? 1116 : i === 1 ? 1709 : i === 2 ? 1135 : i === 3 ? 1598 : i === 4 ? 1310 : 1534} cy={i < 2 ? 395 : i < 4 ? 674 : 782} r="2.6" fill={wire.color} opacity={draw} />
              </g>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* Foreground cage: the bars and the big padlock sit over the note. */
export const IntroFrontBars: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > 205) return null;

  const settle = easeOut(frame, 4, 24);
  const shake = frame > 120 && frame < 154 ? Math.sin(frame * 1.9) * Math.exp(-(frame - 120) / 28) * 3.2 : 0;
  const unlock = easeInOut(frame, 138, 12, 0, 1);
  const doorOpen = easeInOut(frame, 146, 16, 0, 1);
  const lockFall = easeInOut(frame, 152, 28, 0, 1);
  const fade = interpolate(frame, [0, 1, 166, 170], [1, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hinge = 1218;
  const doorWidth = 306;
  const doorScale = 1 - doorOpen * 0.84;
  const barXs = [0, 62, 124, 186, 248, 306].map((x) => hinge + x);
  const frontFix = [1156, 1660];

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 900 }}>
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        fill="none"
        style={{ position: 'absolute', inset: 0, opacity: fade, overflow: 'visible' }}
        aria-hidden="true"
      >
        <g transform={`translate(${shake} 0)`}>
          {/* the front frame */}
          <path d="M1136 823c131 22 452 22 586 0" stroke="rgba(45,52,54,.66)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M1136 250c146-23 427-23 586 0" stroke="rgba(45,52,54,.58)" strokeWidth="2" strokeLinecap="round" />
          <path d="M1138 250v573M1721 250v573" stroke="rgba(45,52,54,.64)" strokeWidth="2.4" strokeLinecap="round" />

          {/* fixed bars to the right of the door */}
          {frontFix.map((x) => (
            <path key={x} d={`M${x} 265c-2 180 3 350 -1 542`} stroke="rgba(45,52,54,.7)" strokeWidth="2" strokeLinecap="round" />
          ))}

          {/* hinged door, with bars passing in front of the note */}
          <g transform={`translate(${hinge} 0) scale(${doorScale} 1) translate(${-hinge} 0)`}>
            <path d={`M${hinge} 286v532`} stroke="rgba(45,52,54,.82)" strokeWidth="2.7" strokeLinecap="round" />
            <path d={`M${hinge + doorWidth} 286v532`} stroke="rgba(45,52,54,.82)" strokeWidth="2.7" strokeLinecap="round" />
            <path d={`M${hinge} 291c100-12 208-12 ${doorWidth} 0`} stroke="rgba(45,52,54,.62)" strokeWidth="2" strokeLinecap="round" />
            <path d={`M${hinge} 812c99 12 207 12 ${doorWidth} 0`} stroke="rgba(45,52,54,.6)" strokeWidth="2" strokeLinecap="round" />
            {barXs.slice(1, -1).map((x) => (
              <path key={x} d={`M${x} 292c-2 163 3 340 -1 518`} stroke="rgba(45,52,54,.68)" strokeWidth="2" strokeLinecap="round" />
            ))}
            {/* handle and hinge plates */}
            <circle cx={hinge + 266} cy={556} r="5.5" stroke="rgba(45,52,54,.72)" strokeWidth="1.8" fill="rgba(255,249,234,.55)" />
            <path d={`M${hinge + 6} 385h20M${hinge + 6} 716h20`} stroke="rgba(45,52,54,.52)" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* front bar shadows, very subtle, to give the cage depth */}
          <path d="M1250 292v518M1312 292v518M1374 292v518" stroke="rgba(45,52,54,.07)" strokeWidth="7" strokeLinecap="round" transform="translate(5 7)" />

          {/* the large padlock */}
          <g
            transform={`translate(${hinge + doorWidth + 6} ${462 + shake * 0.5 + lockFall * 210}) rotate(${lockFall * 34} 0 0) scale(1.14)`}
            opacity={1 - lockFall * 0.78}
          >
            <path
              d="M-23 1v-16c0-25 17-39 38-39s38 14 38 39v16"
              stroke={C.ink}
              strokeWidth="5.2"
              strokeLinecap="round"
              fill="none"
              transform={`rotate(${unlock * -26} 15 -35)`}
            />
            <rect x="-38" y="0" width="76" height="86" rx="10" fill={C.marginRed} stroke={C.ink} strokeWidth="4.2" />
            <path d="M-22 19h44" stroke="rgba(255,247,223,.55)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="38" r="7.5" fill={C.ink} />
            <path d="M0 46v18" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M-16 63h32" stroke="rgba(45,52,54,.35)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* the door creaks open after the clasp gives */}
          {frame > 146 && frame < 166 ? (
            <text x={hinge - 34} y={610} fontFamily={F.hand} fontSize="22" fill={C.inkMuted} transform={`rotate(${-8 + doorOpen * 10} ${hinge - 34} 610)`} opacity={1 - doorOpen * 0.7}>
              吱呀——
            </text>
          ) : null}

          {/* the click of the lock */}
          {frame > 136 && frame < 166 ? (
            <g opacity={easeOut(frame, 136, 8) * (1 - easeInOut(frame, 158, 8, 0, 1))}>
              <text x={hinge + 357} y={430} fontFamily={F.hand} fontSize="24" fill={C.marginRed} transform="rotate(7 1500 430)">
                咔哒。
              </text>
              <path d="M1536 447l10-13 5 15 14-8-6 16" stroke={C.yellowDeep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
        </g>

        {/* the open doorway, a visible gap after the door swings */}
        <path
          d={`M${hinge + doorWidth - 12} 302v500`}
          stroke="rgba(255,247,227,.65)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity={doorOpen * 0.45}
        />
        <path
          d={`M1136 823c131 22 452 22 586 0`}
          stroke="rgba(45,52,54,.72)"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity={settle}
        />
      </svg>
    </AbsoluteFill>
  );
};
