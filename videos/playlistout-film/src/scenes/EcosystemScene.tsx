import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easeBackOut, easeInOut, easeOut } from '../anim';
import { ECOSYSTEM_CARDS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { HandCheck, JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.eco.in;

export const EcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();

  const hopMf = rel('eco_hop_mf');
  const apiBar = rel('eco_api_bar');
  const finaleEnter = rel('finale_enter');

  const exitProgress = easeInOut(frame, finaleEnter, 22, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 10, finaleEnter + 6, finaleEnter + 22], [0, 1, 1, 0], {
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
        subtitle="官方插件 · 专用格式导出 · Public API"
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
          const isHighlighted =
            (idx === 0 && frame >= hopMf) ||
            (idx === 1 && frame >= rel('eco_hop_lx')) ||
            (idx === 2 && frame >= rel('eco_hop_l1'));

          return (
            <div
              key={card.id}
              style={{
                opacity: easeOut(frame, 4 + idx * 8, 14),
                transform: `translateY(${(1 - cardIn) * 50}px) rotate(${(idx - 1) * 0.9}deg)`,
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
          opacity: easeOut(frame, apiBar - 16, 16),
          transform: `translateY(${(1 - easeBackOut(frame, apiBar - 14, 20)) * 40}px)`,
          zIndex: 25,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          shadow="cutoutLg"
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
    </AbsoluteFill>
  );
};
