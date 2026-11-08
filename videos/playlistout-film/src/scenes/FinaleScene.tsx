import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ASSETS } from '../assets';
import { easeBackOut, easeOut } from '../anim';
import { PLATFORMS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { CrayonUnderline, JournalCard, SparkleDoodle, StickyBadge } from '../components/Stationery';
import { PlatformLogo } from '../components/BrandLogos';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.finale.in;

// 54 颗盛大闭幕爆炸礼花粒子预设 (伴随 "噔噔噔" 音乐网址弹出瞬间爆发)
const FINALE_FIREWORK_PARTICLES = Array.from({ length: 54 }).map((_, i) => {
  const angleDeg = -175 + (i * 350) / 53 + (((i * 19) % 25) - 12);
  const angleRad = (angleDeg * Math.PI) / 180;
  const dist = 160 + ((i * 43) % 340);
  const colors = ['#FFD700', '#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#FF6B8B', '#A855F7', '#FFFDF0'];
  const color = colors[i % colors.length];
  const types: ('ribbon' | 'star' | 'note' | 'diamond' | 'circle')[] = [
    'ribbon',
    'star',
    'ribbon',
    'note',
    'diamond',
    'star',
    'circle',
  ];
  const type = types[i % types.length];
  const notes = ['♪', '♫', '♬'];
  const noteChar = notes[i % notes.length];
  const rotSpeed = ((i * 57) % 720) - 360;
  return {
    angleRad,
    dist,
    color,
    type,
    noteChar,
    rotSpeed,
    gravity: 0.55 + ((i * 23) % 45) / 100,
    size: 16 + ((i * 13) % 14),
  };
});

const FinaleCelebrationFireworks: React.FC<{ frame: number; burstFrame: number }> = ({
  frame,
  burstFrame,
}) => {
  if (frame < burstFrame || frame > burstFrame + 64) return null;

  const age = frame - burstFrame;
  const progress = Math.min(1, age / 52);
  const shockProgress = Math.min(1, age / 32);

  // 爆炸中心：金色网址卡片中心 (510, 690)
  const cx = 510;
  const cy = 690;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {/* 三重宏大金色、珊瑚粉与天青冲击波 */}
      {shockProgress < 1 && (
        <svg
          style={{
            position: 'absolute',
            left: cx - 400,
            top: cy - 400,
            width: 800,
            height: 800,
            overflow: 'visible',
          }}
          viewBox="-400 -400 800 800"
        >
          <circle
            cx={0}
            cy={0}
            r={shockProgress * 360}
            fill="none"
            stroke="#FFD700"
            strokeWidth={Math.max(1, (1 - shockProgress) * 10)}
            strokeDasharray="22 11"
            opacity={(1 - shockProgress) * 0.95}
          />
          <circle
            cx={0}
            cy={0}
            r={Math.max(0, shockProgress * 270 - 15)}
            fill="none"
            stroke="#FF4757"
            strokeWidth={Math.max(1, (1 - shockProgress) * 7.5)}
            opacity={(1 - shockProgress) * 0.9}
          />
          <circle
            cx={0}
            cy={0}
            r={Math.max(0, shockProgress * 180 - 25)}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={Math.max(1, (1 - shockProgress) * 5.5)}
            opacity={(1 - shockProgress) * 0.88}
          />
        </svg>
      )}

      {/* 54 颗全向绽放的盛大节日彩花、闪耀星芒与音符 */}
      {FINALE_FIREWORK_PARTICLES.map((p, idx) => {
        const flyEase = 1 - Math.pow(1 - progress, 2.5);
        const curDist = p.dist * flyEase;
        const px = cx + Math.cos(p.angleRad) * curDist;
        const py = cy + Math.sin(p.angleRad) * curDist + progress * progress * p.gravity * 115;
        const pRot = progress * p.rotSpeed;
        const pOpacity = progress < 0.08 ? progress / 0.08 : Math.max(0, 1 - Math.pow(progress, 1.5));
        const pScale = progress < 0.1 ? progress / 0.1 : Math.max(0.25, 1 - progress * 0.65);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: `translate(-50%, -50%) rotate(${pRot}deg) scale(${pScale})`,
              opacity: pOpacity,
              color: p.color,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: p.size,
              userSelect: 'none',
              filter: 'drop-shadow(2px 3px 0 rgba(45, 52, 54, 0.45))',
            }}
          >
            {p.type === 'ribbon' && (
              <div
                style={{
                  width: p.size * 1.35,
                  height: p.size * 0.58,
                  borderRadius: 3,
                  backgroundColor: p.color,
                  border: '2px solid #2d3436',
                }}
              />
            )}
            {p.type === 'star' && <span>✦</span>}
            {p.type === 'note' && <span>{p.noteChar}</span>}
            {p.type === 'diamond' && <span>◆</span>}
            {p.type === 'circle' && (
              <div
                style={{
                  width: p.size * 0.85,
                  height: p.size * 0.85,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  border: '2px solid #2d3436',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const FinaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoLand = rel('finale_logo_land');
  const urlPop = rel('finale_url_pop');
  const starWink = rel('finale_star_wink');

  const cardIn = spring({ frame, fps, config: { damping: 17, stiffness: 92 } });
  const urlScale = easeBackOut(frame, urlPop - 8, 20);
  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* ================= CELEBRATION FIREWORKS ON WEBSITE URL POP ("噔噔噔") ================= */}
      <FinaleCelebrationFireworks frame={frame} burstFrame={urlPop} />

      {/* ================= GRAND CLOSING JOURNAL CARD ================= */}
      <div
        style={{
          position: 'absolute',
          left: 176,
          top: 96,
          width: 1648,
          height: 888,
          transform: `translateY(${(1 - cardIn) * 60}px) scale(${0.94 + cardIn * 0.06}) rotate(-0.3deg)`,
          zIndex: 20,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          tapePos="both"
          tapeColor={C.tapeYellow}
          shadow="cutoutLg"
          style={{
            width: '100%',
            height: '100%',
            padding: '48px 64px',
            display: 'grid',
            gridTemplateColumns: '1.25fr 0.75fr',
            gap: 40,
            alignItems: 'center',
          }}
        >
          {/* LEFT: BRAND IDENTITY, TAGLINE, URL & OPEN-SOURCE METADATA */}
          <div>
            {/* Brand Logo + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <img
                src={ASSETS.logo512}
                alt="Playlist Out"
                width={126}
                height={126}
                style={{
                  objectFit: 'contain',
                  filter: 'drop-shadow(3px 5px 0 rgba(45, 52, 54, 0.25))',
                  transform: `rotate(${-3 + Math.sin(frame / 18) * 2}deg)`,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: F.marker,
                      fontSize: 64,
                      color: C.ink,
                      lineHeight: 1,
                    }}
                  >
                    Playlist Out
                  </span>
                  <StickyBadge bg={C.pink} ink={C.pinkDeep} fontSize={22} rotate={3}>
                    MIT 开源
                  </StickyBadge>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: F.sans,
                    fontSize: 25,
                    fontWeight: 800,
                    color: C.inkSoft,
                  }}
                >
                  Paste. Parse. Export. Keep moving.
                </div>
              </div>
            </div>

            {/* Huge Handwritten Title */}
            <div style={{ marginTop: 34, position: 'relative' }}>
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 96,
                  lineHeight: 1.08,
                  color: C.ink,
                }}
              >
                把你的歌单带走
              </div>
              <CrayonUnderline
                width={680}
                color="#f59e0b"
                progress={easeOut(frame, logoLand - 6, 24)}
                style={{ marginTop: 4 }}
              />
              <div
                style={{
                  marginTop: 16,
                  fontFamily: F.sans,
                  fontSize: 30,
                  fontWeight: 800,
                  color: C.inkSoft,
                }}
              >
                你的歌单，不应该只困在一个音乐平台里。
              </div>
            </div>

            {/* Giant Website URL Callout Box */}
            <div
              style={{
                marginTop: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 18,
                padding: '20px 36px',
                borderRadius: 20,
                backgroundColor: C.yellow,
                border: `4px solid ${C.ink}`,
                boxShadow: SHADOW.cutoutLg,
                transform: `scale(${0.85 + urlScale * 0.15}) rotate(-0.8deg)`,
              }}
            >
              <span style={{ fontSize: 38 }}>🌐</span>
              <div>
                <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 800, color: C.yellowDeep }}>
                  在线网页版（打开浏览器即刻使用）
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 44,
                    fontWeight: 900,
                    color: C.ink,
                    letterSpacing: '-0.01em',
                  }}
                >
                  playlistout.com
                </div>
              </div>
            </div>

            {/* GitHub & Capabilities Pills */}
            <div
              style={{
                marginTop: 34,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                opacity: easeOut(frame, urlPop + 6, 18),
              }}
            >
              <StickyBadge bg={C.paperCream} ink={C.ink} fontSize={23} rotate={-1}>
                ⭐ github.com/LengxiQwQ/playlistout
              </StickyBadge>
              <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={23} rotate={1}>
                💻 npm install -g playlistout
              </StickyBadge>
              <StickyBadge bg={C.blue} ink={C.blueDeep} fontSize={23} rotate={-0.8}>
                🔒 纯端侧导出 · 保护隐私
              </StickyBadge>
            </div>
          </div>

          {/* RIGHT: MASCOT HERO STAGE & 6 PLATFORM HALO */}
          <div
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 0',
            }}
          >
            {/* Top Platform Badges Arc */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              {PLATFORMS.map((p, i) => (
                <StickyBadge
                  key={p.id}
                  bg={p.badgeBg}
                  ink={p.badgeInk}
                  fontSize={21}
                  rotate={i % 2 === 0 ? -3 : 3}
                >
                  <PlatformLogo platform={p.id} size={22} shape="squircle" style={{ marginRight: 6 }} />
                  <span>{p.short}</span>
                </StickyBadge>
              ))}
            </div>

            {/* Warm Polaroid / Stage Frame behind Mascot (Mascot lands right here!) */}
            <div
              style={{
                width: 440,
                height: 460,
                borderRadius: 28,
                backgroundColor: C.pink,
                border: `4px dashed ${C.pinkDeep}`,
                display: 'flex',
                 flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 24,
                position: 'relative',
              }}
            >
              <SparkleDoodle
                size={46}
                color="#ffd32a"
                rotate={frame * 4}
                style={{ position: 'absolute', left: 26, top: 28 }}
              />
              <SparkleDoodle
                size={38}
                color="#f498b2"
                rotate={-frame * 5}
                style={{ position: 'absolute', right: 28, top: 36 }}
              />
              <div
                style={{
                  fontFamily: F.kuaile,
                  fontSize: 30,
                  color: C.pinkDeep,
                  backgroundColor: C.paperWhite,
                  padding: '8px 24px',
                  borderRadius: 999,
                  border: `3px solid ${C.ink}`,
                  boxShadow: '3px 3px 0 #2d3436',
                }}
              >
                {frame >= starWink ? '♫ 歌单自由啦，下次见！' : '♫ 音符小助手 · 满载而归'}
              </div>
            </div>

            {/* Bottom Handwritten Signature */}
            <div
              style={{
                fontFamily: F.display,
                fontSize: 34,
                color: C.inkSoft,
              }}
            >
              翻开这本会动的音乐手账 ✦
            </div>
          </div>
        </JournalCard>
      </div>
    </AbsoluteFill>
  );
};
