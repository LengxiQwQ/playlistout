import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ASSETS } from '../assets';
import { easeBackOut, easeInOut, easeOut } from '../anim';
import { PLATFORMS } from '../data';
import { C, F, SHADOW, SCENES, cue } from '../theme';
import { CrayonUnderline, JournalCard, SparkleDoodle, StickyBadge } from '../components/Stationery';
import { PlatformLogo } from '../components/BrandLogos';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.intro.in;

const CAGE_BOX = { x: 1090, y: 108, w: 730, h: 830 };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 95 } });
  const openFrame = rel('cage_open'); // 96
  const jumpFrame = rel('mascot_jump_out'); // 105
  const platFrame = rel('platforms_pop'); // 141
  const handoffFrame = rel('intro_handoff'); // 222

  const rattle1 =
    frame >= 12 && frame <= 34
      ? Math.sin((frame - 12) * 1.4) * Math.exp(-(frame - 12) / 14) * 7
      : 0;
  const rattle2 =
    frame >= 44 && frame <= 68
      ? Math.sin((frame - 44) * 1.5) * Math.exp(-(frame - 44) / 14) * 8
      : 0;
  const cageShake = rattle1 + rattle2;

  const cageExit = easeInOut(frame, jumpFrame + 8, 26, 0, 1);
  const handoffExit = easeInOut(frame, handoffFrame, 22, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 6, handoffFrame + 6, handoffFrame + 22], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heroBrandIn = easeBackOut(frame, jumpFrame + 6, 26);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${-handoffExit * 90}px) scale(${1 - handoffExit * 0.04})`,
      }}
    >
      {/* ================= LEFT COLUMN: STORY & BRAND HERO ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 96,
          width: 870,
          height: 860,
          transform: `translateY(${(1 - enter) * 45}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StickyBadge bg={C.pink} ink={C.pinkDeep} fontSize={24} rotate={-2}>
            🎵 音乐手账动画短片
          </StickyBadge>
          <StickyBadge bg={C.yellowCard} ink={C.ink} fontSize={22} rotate={1.5}>
            开源 · 本地导出 · 跨平台
          </StickyBadge>
        </div>

        <div style={{ marginTop: 28, position: 'relative' }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 82,
              lineHeight: 1.12,
              color: C.ink,
              letterSpacing: '0.01em',
            }}
          >
            <div>你的歌单，</div>
            <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
              不该被困在平台里。
              <CrayonUnderline
                width={720}
                color="#f59e0b"
                progress={easeOut(frame, 16, 28)}
                style={{ position: 'absolute', left: 4, bottom: -12 }}
              />
            </div>
          </div>
        </div>

        {/* Before Breakout: Problem Sticky Note */}
        {frame < jumpFrame + 18 ? (
          <div
            style={{
              marginTop: 48,
              opacity: 1 - easeInOut(frame, jumpFrame, 16, 0, 1),
              transform: `scale(${1 - easeInOut(frame, jumpFrame, 16, 0, 0.08)})`,
            }}
          >
            <JournalCard
              bg={C.yellowCard}
              rotate={-1.2}
              tapePos="top-left"
              tapeColor={C.tapePink}
              style={{ padding: '34px 38px', width: 820 }}
            >
              <div
                style={{
                  fontFamily: F.kuaile,
                  fontSize: 36,
                  color: C.ink,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <span>🔒</span>
                <span>收藏了几百首歌，换个软件却带不走？</span>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: F.sans,
                  fontSize: 26,
                  fontWeight: 600,
                  color: C.inkSoft,
                  lineHeight: 1.55,
                }}
              >
                平台筑起围栏、接口层层限制……
                <br />
                别急！把锁打开，让音符小助手带你把歌单完整带走！
              </div>
            </JournalCard>
          </div>
        ) : null}

        {/* After Breakout: Playlist Out Hero Brand Card */}
        {frame >= jumpFrame + 2 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 325,
              width: 840,
              opacity: easeOut(frame, jumpFrame + 2, 18),
              transform: `translateY(${(1 - heroBrandIn) * 44}px) rotate(-0.8deg)`,
            }}
          >
            <JournalCard
              bg={C.paperWhite}
              tapePos="both"
              tapeColor={C.tapeYellow}
              shadow="cutoutLg"
              style={{ padding: '32px 38px 34px', minHeight: 480 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <img
                  src={ASSETS.logo512}
                  alt="Playlist Out"
                  width={104}
                  height={104}
                  style={{
                    objectFit: 'contain',
                    filter: 'drop-shadow(2px 4px 0 rgba(45, 52, 54, 0.25))',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: F.marker,
                      fontSize: 52,
                      color: C.ink,
                      lineHeight: 1.05,
                    }}
                  >
                    Playlist Out
                  </div>
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: 42,
                      color: C.pinkDeep,
                      marginTop: 4,
                    }}
                  >
                    把你的歌单带走 ♪
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 26,
                  maxWidth: 465,
                  fontFamily: F.sans,
                  fontSize: 27,
                  fontWeight: 700,
                  color: C.ink,
                  lineHeight: 1.5,
                }}
              >
                粘贴链接 → 秒级解析 → 本地导出多格式，还能带进开源播放器！
              </div>

              <div
                style={{
                  marginTop: 26,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 14,
                  maxWidth: 490,
                }}
              >
                <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={22} rotate={-1.5}>
                  ✓ 网页即开即用
                </StickyBadge>
                <StickyBadge bg={C.blue} ink={C.blueDeep} fontSize={22} rotate={1}>
                  ✓ 桌面 CLI 工具
                </StickyBadge>
                <StickyBadge bg={C.yellowCard} ink={C.yellowDeep} fontSize={22} rotate={-1}>
                  ✓ 纯本地生成文件
                </StickyBadge>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: 34,
                  bottom: 28,
                  width: 255,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: C.pink,
                  border: `3px dashed ${C.pinkDeep}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: F.kuaile,
                  fontSize: 24,
                  color: C.pinkDeep,
                }}
              >
                ♫ 音符小助手已就位！
              </div>
            </JournalCard>
          </div>
        ) : null}
      </div>

      {/* ================= RIGHT COLUMN PHASE A: THE BIRDCAGE (0.0s - 4.2s) ================= */}
      {frame < jumpFrame + 36 ? (
        <div
          style={{
            position: 'absolute',
            left: CAGE_BOX.x,
            top: CAGE_BOX.y,
            width: CAGE_BOX.w,
            height: CAGE_BOX.h,
            opacity: 1 - cageExit,
            transform: `translate(${cageShake + cageExit * 90}px, ${(1 - enter) * 50}px) rotate(${1 + cageShake * 0.18}deg) scale(${1 - cageExit * 0.08})`,
          }}
        >
          <JournalCard
            bg={C.paperCream}
            tapePos="top-center"
            tapeColor={C.tapeCyan}
            shadow="cutoutLg"
            style={{ width: '100%', height: '100%', padding: 28 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StickyBadge bg="#ffebee" ink="#b71c1c" fontSize={23} rotate={-1.5}>
                {frame < openFrame ? '🔒 困在平台围栏里…' : '🔓 围栏已解锁！'}
              </StickyBadge>
              <span
                style={{
                  fontFamily: F.kuaile,
                  fontSize: 28,
                  color: frame < openFrame ? C.marginRed : C.mintDeep,
                }}
              >
                {frame < openFrame ? '「放我出去带走歌单！」' : '「自由啦！出发！」'}
              </span>
            </div>

            {/* Hand-Drawn Crayon Birdcage Back Arch & Base */}
            <svg
              width="670"
              height="680"
              viewBox="0 0 670 680"
              fill="none"
              style={{ position: 'absolute', left: 30, top: 82, overflow: 'visible' }}
            >
              <circle cx="335" cy="28" r="20" stroke={C.ink} strokeWidth="6" fill={C.yellowCard} />
              <line x1="335" y1="48" x2="335" y2="74" stroke={C.ink} strokeWidth="6" strokeLinecap="round" />

              <path
                d="M 115 560 L 115 280 C 115 140, 210 74, 335 74 C 460 74, 555 140, 555 280 L 555 560"
                stroke={C.ink}
                strokeWidth="7"
                strokeLinecap="round"
                fill="rgba(255, 253, 248, 0.55)"
              />

              {[170, 235, 300, 370, 435, 500].map((bx, i) => {
                const topY = 82 + Math.pow((bx - 335) / 220, 2) * 145;
                return (
                  <line
                    key={i}
                    x1={bx}
                    y1={topY}
                    x2={bx}
                    y2={558}
                    stroke="rgba(45, 52, 54, 0.28)"
                    strokeWidth="4"
                    strokeDasharray="10 8"
                  />
                );
              })}

              <rect
                x="88"
                y="556"
                width="494"
                height="46"
                rx="14"
                fill={C.yellowCard}
                stroke={C.ink}
                strokeWidth="6"
              />
              <path d="M 110 579 L 560 579" stroke={C.yellowDeep} strokeWidth="3" strokeDasharray="8 8" />
            </svg>

            {PLATFORMS.map((p, idx) => {
              const positions = [
                { left: 26, top: 175, rot: -5 },
                { left: 500, top: 175, rot: 5 },
                { left: 18, top: 365, rot: -3 },
                { left: 512, top: 365, rot: 4 },
                { left: 56, top: 545, rot: -4 },
                { left: 486, top: 545, rot: 3 },
              ][idx];
              return (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    left: positions.left,
                    top: positions.top,
                    zIndex: 12,
                  }}
                >
                  <StickyBadge
                    bg={p.badgeBg}
                    ink={p.badgeInk}
                    borderColor={C.ink}
                    fontSize={24}
                    rotate={positions.rot}
                  >
                    <PlatformLogo platform={p.id} size={26} shape="squircle" style={{ marginRight: 6 }} />
                    <span>{p.name}</span>
                  </StickyBadge>
                </div>
              );
            })}
          </JournalCard>
        </div>
      ) : null}

      {/* ================= RIGHT COLUMN PHASE B: 6 SUPPORTED PLATFORMS SHOWCASE (4.4s - 8.2s) ================= */}
      {frame >= platFrame - 10 ? (
        <div
          style={{
            position: 'absolute',
            left: 1040,
            top: 96,
            width: 805,
            height: 860,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
              opacity: easeOut(frame, platFrame - 6, 16),
            }}
          >
            <StickyBadge bg={C.yellow} fontSize={26} rotate={-1.5}>
              ✨ 支持六大主流音乐平台
            </StickyBadge>
            <span style={{ fontFamily: F.kuaile, fontSize: 26, color: C.inkSoft }}>
              公开歌单解析 & 批量导出
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 22,
            }}
          >
            {PLATFORMS.map((p, idx) => {
              const cardIn = easeBackOut(frame, platFrame + idx * 4, 20);
              return (
                <div
                  key={p.id}
                  style={{
                    opacity: easeOut(frame, platFrame + idx * 4, 14),
                    transform: `translateY(${(1 - cardIn) * 36}px) scale(${0.9 + cardIn * 0.1})`,
                  }}
                >
                  <JournalCard
                    bg={p.badgeBg}
                    rotate={idx % 2 === 0 ? -1.1 : 1.1}
                    shadow="cutout"
                    style={{
                      padding: '24px 26px',
                      minHeight: 222,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <PlatformLogo
                          platform={p.id}
                          size={54}
                          shape="squircle"
                          style={{
                            border: `3px solid ${C.ink}`,
                            borderRadius: 16,
                            boxShadow: '2px 2px 0 #2d3436',
                          }}
                        />
                        <div
                          style={{
                            fontFamily: F.sans,
                            fontSize: 33,
                            fontWeight: 900,
                            color: C.ink,
                          }}
                        >
                          {p.name}
                        </div>
                      </div>
                      <StickyBadge bg={C.paperWhite} ink={p.badgeInk} fontSize={19} rotate={2}>
                        已支持
                      </StickyBadge>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding: '10px 14px',
                        borderRadius: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.76)',
                        border: `2px dashed ${p.border}`,
                        fontFamily: F.sans,
                        fontSize: 21,
                        fontWeight: 700,
                        color: C.ink,
                        lineHeight: 1.35,
                      }}
                    >
                      {p.note}
                    </div>
                  </JournalCard>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const IntroCageFrontOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const unlockFrame = rel('cage_unlock'); // 87
  const openFrame = rel('cage_open'); // 96
  const jumpFrame = rel('mascot_jump_out'); // 105

  if (frame > jumpFrame + 16) return null;

  const doorOpenProgress = easeInOut(frame, openFrame, 14, 0, 1);
  const fadeOut = interpolate(frame, [jumpFrame, jumpFrame + 14], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const keyIn = easeBackOut(frame, rel('key_arrive'), 16);
  const keyTurn = easeInOut(frame, unlockFrame - 3, 8, 0, 1);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: fadeOut, zIndex: 865 }}>
      <div
        style={{
          position: 'absolute',
          left: CAGE_BOX.x + 30,
          top: CAGE_BOX.y + 82,
          width: 670,
          height: 680,
        }}
      >
        <svg width="670" height="680" viewBox="0 0 670 680" fill="none" style={{ overflow: 'visible' }}>
          {/* Front Cage Door (wide center gap at x=255..415 so Mascot's face is 100% unobstructed!) */}
          <g
            transform={`translate(520 350) scale(${1 - doorOpenProgress * 0.78} 1) translate(-520 -350)`}
            opacity={1 - doorOpenProgress * 0.65}
          >
            {[185, 255, 415, 485].map((bx, i) => (
              <line
                key={i}
                x1={bx}
                y1={140}
                x2={bx}
                y2={554}
                stroke={C.ink}
                strokeWidth="6.5"
                strokeLinecap="round"
              />
            ))}
            <path d="M 122 230 C 240 244, 430 244, 548 230" stroke={C.ink} strokeWidth="6" strokeLinecap="round" />
            <path d="M 122 480 C 240 494, 430 494, 548 480" stroke={C.ink} strokeWidth="6" strokeLinecap="round" />
          </g>

          {/* Big Red Padlock placed at y=490 (below Mascot's feet so face is crystal clear!) */}
          <g
            transform={`translate(335 ${492 + doorOpenProgress * 90}) rotate(${keyTurn * 24 + doorOpenProgress * 45})`}
            opacity={1 - doorOpenProgress}
          >
            <path
              d={`M -20 -8 L -20 ${-26 - keyTurn * 14} A 20 20 0 0 1 20 ${-26 - keyTurn * 14} L 20 -8`}
              stroke={C.ink}
              strokeWidth="7.5"
              strokeLinecap="round"
              fill="none"
            />
            <rect
              x="-35"
              y="-10"
              width="70"
              height="56"
              rx="14"
              fill="#ee5253"
              stroke={C.ink}
              strokeWidth="5.5"
            />
            <circle cx="0" cy="14" r="6.5" fill={C.yellowCard} stroke={C.ink} strokeWidth="3" />
            <path d="M 0 20 L 0 33" stroke={C.yellowCard} strokeWidth="4.5" strokeLinecap="round" />
          </g>

          {/* Golden Musical Key flying in at 2.4s */}
          {frame >= rel('key_arrive') && frame <= openFrame + 10 ? (
            <g
              transform={`translate(${interpolate(keyIn, [0, 1], [140, 285])} ${interpolate(keyIn, [0, 1], [420, 492])}) rotate(${keyTurn * 35})`}
            >
              <circle cx="-36" cy="0" r="22" fill="#ffd32a" stroke={C.ink} strokeWidth="5" />
              <circle cx="-36" cy="0" r="8" fill={C.paperCream} stroke={C.ink} strokeWidth="3.5" />
              <path d="M -14 0 L 36 0 L 36 16 M 20 0 L 20 14" stroke="#ffd32a" strokeWidth="10" strokeLinecap="round" />
              <path d="M -14 0 L 36 0 L 36 16 M 20 0 L 20 14" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" />
            </g>
          ) : null}
        </svg>

        {frame >= unlockFrame && frame <= unlockFrame + 24 ? (
          <div style={{ position: 'absolute', left: 265, top: 515 }}>
            <SparkleDoodle size={52} color="#ffd32a" rotate={frame * 8} />
            <StickyBadge
              bg={C.yellow}
              ink={C.ink}
              fontSize={26}
              rotate={-6}
              style={{ position: 'absolute', left: -40, top: 42 }}
            >
              🔓 咔哒！解锁啦！
            </StickyBadge>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
