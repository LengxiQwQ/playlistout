import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easeBackOut, easeInOut, easeOut } from '../anim';
import { ECOSYSTEM_CARDS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { HandCheck, JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';
import { CelebrationFireworks } from '../components/CelebrationFireworks';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.eco.in;

const TOUCHDOWN_PARTICLES = [
  { dx: -95, dy: -50, char: '♪', color: '#FF4757', size: 32, rot: -18 },
  { dx: 95, dy: -55, char: '♫', color: '#2ED573', size: 30, rot: 22 },
  { dx: -125, dy: -25, char: '✦', color: '#FFA502', size: 28, rot: -10 },
  { dx: 125, dy: -30, char: '✦', color: '#00D2D3', size: 28, rot: 25 },
  { dx: -55, dy: -70, char: '★', color: '#FFD700', size: 26, rot: 8 },
  { dx: 55, dy: -75, char: '♫', color: '#A855F7', size: 28, rot: -14 },
];

/**
 * 吉祥物在播放器卡片跳跃落地的轻微互动反馈 (柔和涟漪环 + 飘起微星与音符)
 */
const CardTouchdownSparks: React.FC<{
  frame: number;
  landFrame: number;
  cx: number;
  cy: number;
  accentColor: string;
}> = ({ frame, landFrame, cx, cy, accentColor }) => {
  if (frame < landFrame || frame > landFrame + 28) return null;
  const age = frame - landFrame;
  const progress = age / 28;
  const ringScale = progress * 1.5;
  const ringOpacity = Math.max(0, 1 - progress * 1.3);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
      {/* 柔和扩散涟漪椭圆 (贴合卡片表面与脚底落地接触线) */}
      <svg
        style={{
          position: 'absolute',
          left: cx - 120,
          top: cy + 40,
          width: 240,
          height: 80,
          overflow: 'visible',
        }}
        viewBox="-120 -40 240 80"
      >
        <ellipse
          cx={0}
          cy={0}
          rx={ringScale * 85}
          ry={ringScale * 24}
          fill="none"
          stroke={accentColor}
          strokeWidth={Math.max(1, (1 - progress) * 4.5)}
          strokeDasharray="8 5"
          opacity={ringOpacity * 0.9}
        />
      </svg>

      {/* 6 颗轻盈从脚侧向外环形上浮的小音符与微星 */}
      {TOUCHDOWN_PARTICLES.map((p, idx) => {
        const floatProgress = Math.pow(progress, 0.85);
        const px = cx + p.dx * (0.8 + floatProgress * 0.5);
        const py = cy + 30 + p.dy * floatProgress;
        const opacity = progress < 0.1 ? progress / 0.1 : Math.max(0, 1 - Math.pow(progress, 1.4));
        const scale = progress < 0.15 ? progress / 0.15 : Math.max(0.3, 1 - progress * 0.5);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: `translate(-50%, -50%) rotate(${p.rot + progress * 35}deg) scale(${scale})`,
              opacity,
              color: p.color,
              fontFamily: F.display,
              fontSize: p.size,
              fontWeight: 900,
              textShadow: '1px 1px 0 rgba(45, 52, 54, 0.3)',
              userSelect: 'none',
            }}
          >
            {p.char}
          </div>
        );
      })}
    </div>
  );
};

export const EcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();

  const hopMf = rel('eco_hop_mf');
  const hopLx = rel('eco_hop_lx');
  const hopL1 = rel('eco_hop_l1');
  const apiBar = rel('eco_api_bar');
  const finaleEnter = rel('finale_enter');

  const exitProgress = easeInOut(frame, finaleEnter - 12, 12, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 10, finaleEnter - 10, finaleEnter - 2], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `scale(${1 - exitProgress * 0.05}) translateY(${-exitProgress * 60}px)`,
      }}
    >
      <SceneHeaderBanner
        stepTag="STEP 05 · 开源播放器与生态互联"
        title="把歌单带进更多地方 ♪"
        subtitle="官方插件 · 播放器互联"
        tagBg={C.yellow}
        style={{
          marginTop: 38,
          opacity: easeOut(frame, 0, 16),
        }}
      />

      {/* ================= 3 LARGE PLAYER INTEGRATION CARDS ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 152,
          width: 1676,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
          zIndex: 20,
        }}
      >
        {ECOSYSTEM_CARDS.map((card, idx) => {
          const cardIn = easeBackOut(frame, 4 + idx * 8, 20);
          const landFrame = idx === 0 ? hopMf : idx === 1 ? hopLx : hopL1;
          const impactAge = frame - landFrame;
          const bounceY =
            impactAge >= 0 && impactAge < 24
              ? Math.sin(impactAge * 0.48) * Math.exp(-impactAge / 5.5) * 11
              : 0;
          const isHighlighted = frame >= landFrame;

          return (
            <div
              key={card.id}
              style={{
                opacity: easeOut(frame, 4 + idx * 8, 14),
                transform: `translateY(${(1 - cardIn) * 50 + bounceY}px) rotate(${(idx - 1) * 0.9}deg)`,
              }}
            >
              <JournalCard
                bg={card.bg}
                tapePos="top-left"
                tapeColor={idx === 0 ? C.tapeCyan : idx === 1 ? C.tapeGreen : C.tapePink}
                shadow="cutoutLg"
                style={{
                  padding: '26px 28px 24px',
                  height: 586,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Status + Kind Row on Left so Top-Right is a clean Mascot Pad! */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StickyBadge bg={C.paperWhite} ink={card.ink} fontSize={19} rotate={-1.5}>
                      <HandCheck size={18} color={card.ink} />
                      <span>{card.status}</span>
                    </StickyBadge>
                    <StickyBadge bg={C.yellowCard} ink={C.ink} fontSize={19} rotate={1}>
                      {card.badge}
                    </StickyBadge>
                  </div>

                  {/* Player Title */}
                  <div
                    style={{
                      marginTop: 22,
                      fontFamily: F.sans,
                      fontSize: 38,
                      fontWeight: 900,
                      color: C.ink,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {card.name}
                  </div>

                  {/* Route Box */}
                  <div
                    style={{
                      marginTop: 18,
                      padding: '15px 18px',
                      borderRadius: 16,
                      backgroundColor: C.paperWhite,
                      border: `3px solid ${C.ink}`,
                      boxShadow: isHighlighted ? SHADOW.cutoutSm : 'none',
                    }}
                  >
                    <div style={{ fontFamily: F.mono, fontSize: 17.5, fontWeight: 700, color: card.ink }}>
                      接入方式 / ROUTE
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        fontFamily: F.sans,
                        fontSize: 24,
                        fontWeight: 900,
                        color: C.ink,
                      }}
                    >
                      {card.method}
                    </div>
                  </div>

                  {/* Detailed Explanation */}
                  <div
                    style={{
                      marginTop: 18,
                      fontFamily: F.sans,
                      fontSize: 22.5,
                      fontWeight: 700,
                      color: C.inkSoft,
                      lineHeight: 1.48,
                    }}
                  >
                    {card.detail}
                  </div>
                </div>

                {/* Bottom Footer */}
                <div
                  style={{
                    paddingTop: 14,
                    borderTop: `2.5px dashed rgba(45, 52, 54, 0.22)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: F.kuaile,
                    fontSize: 24,
                    color: card.ink,
                  }}
                >
                  <span>♫ 歌单自由流动</span>
                  <span>立即体验 →</span>
                </div>
              </JournalCard>
            </div>
          );
        })}
      </div>

      {/* ================= BOTTOM DEVELOPER API & MIGRATION STRIP ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 768,
          width: 1676,
          opacity: easeOut(frame, 10, 14),
          transform: `translateY(${(1 - easeBackOut(frame, 12, 20)) * 40}px)`,
          zIndex: 25,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          shadow="cutoutLg"
          borderColor={C.ink}
          borderWidth={3.5}
          style={{
            padding: '22px 32px',
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: 28,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: 18,
                backgroundColor: C.mint,
                border: `3.2px solid ${C.ink}`,
                boxShadow: SHADOW.cutoutSm,
                display: 'grid',
                placeItems: 'center',
                fontFamily: F.mono,
                fontSize: 26,
                fontWeight: 900,
                color: C.mintDeep,
                flexShrink: 0,
              }}
            >
              API
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 900, color: C.ink }}>
                  给开发者：Public API + Canonical JSON
                </span>
                <StickyBadge bg={C.yellowCard} ink={C.yellowDeep} fontSize={18} rotate={-1}>
                  免注册直接调用
                </StickyBadge>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: F.mono,
                  fontSize: 20.5,
                  fontWeight: 700,
                  color: C.blueDeep,
                }}
              >
                GET /api/v1/resolve?q=&lt;歌单链接或分享文案&gt;
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 20px',
              borderRadius: 16,
              backgroundColor: C.yellowLight,
              border: `2.8px dashed ${C.ink}`,
              fontFamily: F.sans,
              fontSize: 21,
              fontWeight: 800,
              color: C.ink,
              lineHeight: 1.48,
            }}
          >
            <div>⏳ <span style={{ color: C.pinkDeep }}>BBPlayer</span>：原生内置导入即将上线</div>
            <div>🔄 <span style={{ color: C.mintDeep }}>CSV / M3U8</span>：兼容 Soundiiz 等第三方迁移工具</div>
          </div>
        </JournalCard>
      </div>

      {/* ================= 3 CARDS MASCOT TOUCHDOWN FEEDBACK (DELICATE RIPPLE & SPARKLES) ================= */}
      <CardTouchdownSparks frame={frame} landFrame={hopMf} cx={585} cy={565} accentColor="#2ED573" />
      <CardTouchdownSparks frame={frame} landFrame={hopLx} cx={1150} cy={565} accentColor="#00D2D3" />
      <CardTouchdownSparks frame={frame} landFrame={hopL1} cx={1715} cy={565} accentColor="#FF6B8B" />

      {/* 小吉祥物跳入 API 区域触发的金色爆炸礼花 */}
      <CelebrationFireworks
        frame={frame}
        burstFrame={apiBar}
        cx={1000}
        cy={835}
        scale={1.08}
      />
    </AbsoluteFill>
  );
};
