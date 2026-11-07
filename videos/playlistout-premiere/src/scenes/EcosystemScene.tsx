import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SCENES, cue } from '../theme';
import { easeInOut, easeOut } from '../anim';
import { ChapterMark, CheckDoodle, HeartDoodle, Sparkle, Squiggle, Tape } from '../components/Doodles';
import { Badge, PaperSheet, StickerTag } from '../components/Paper';
import { PLAYER_CARDS } from '../data';

const rel = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.eco.in);
const L = { cards: rel('eco_cards'), api: rel('api'), migration: rel('migration') };

const PlayerGlyph: React.FC<{ id: (typeof PLAYER_CARDS)[number]['logo']; ink: string }> = ({ id, ink }) => {
  if (id === 'musicfree') {
    return (
      <svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="25" stroke={ink} strokeWidth="2.2" opacity=".35" />
        <path d="M23 44V22l20-4v20" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="18" cy="46" rx="7" ry="5" fill={ink} opacity=".75" />
        <ellipse cx="38" cy="40" rx="7" ry="5" fill={ink} opacity=".75" />
        <path d="M43 18c5 4 7 10 5 16" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'lx') {
    return (
      <svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="18" width="48" height="28" rx="14" stroke={ink} strokeWidth="2" opacity=".38" />
        <path d="M17 32h4l4-11 5 22 5-17 4 10 3-6h6" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 24v-4a18 18 0 0 1 36 0v4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="10" y="23" width="10" height="18" rx="4" stroke={ink} strokeWidth="2" />
      <rect x="44" y="23" width="10" height="18" rx="4" stroke={ink} strokeWidth="2" />
      <path d="M46 41c-2 6-7 9-14 9" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

const PlayerCardView: React.FC<{
  card: (typeof PLAYER_CARDS)[number];
  frame: number;
  index: number;
  enter: number;
  exit: number;
}> = ({ card, frame, index, enter, exit }) => {
  const float = Math.sin((frame + index * 19) / 34) * 1.6;
  const hover = 1 + Math.sin((frame + index * 24) / 42) * 0.0015;
  return (
    <div
      style={{
        position: 'absolute',
        left: 300 + index * 430,
        top: 308 + (index === 1 ? 18 : index === 2 ? 7 : 0) + (1 - enter) * 55 + float,
        width: 392,
        height: 426,
        zIndex: 20 + index,
        opacity: enter * (1 - exit),
        transform: `translateY(${exit * -60}px) rotate(${(index - 1) * 1.4 + (1 - enter) * (index - 1) * 3 - exit * (index - 1) * 2}deg) scale(${(0.9 + enter * 0.1) * hover * (1 - exit * 0.06)})`,
        transformOrigin: 'center bottom',
      }}
    >
      <div style={{ position: 'absolute', top: -11, left: 50, zIndex: 8 }}>
        <Tape color={index === 0 ? 'rgba(150,211,206,.6)' : index === 1 ? 'rgba(253,210,143,.62)' : 'rgba(207,192,232,.6)'} width={125} height={25} rotate={index === 2 ? 3 : -3} />
      </div>
      <PaperSheet
        tone={index === 0 ? 'blue' : index === 1 ? 'yellow' : 'lilac'}
        shadow="paper"
        style={{ width: '100%', height: '100%', padding: '22px 23px 18px' }}
        radius="4px 8px 5px 9px / 7px 4px 9px 5px"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 74, height: 74, borderRadius: '18px 15px 16px 18px', background: 'rgba(255,255,255,.51)', border: '1.2px solid rgba(45,52,54,.24)', display: 'grid', placeItems: 'center', transform: 'rotate(-3deg)', boxShadow: '2px 2px 0 rgba(45,52,54,.09)' }}>
              <PlayerGlyph id={card.logo} ink={card.ink} />
            </div>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 800, lineHeight: 1.12, color: C.ink, letterSpacing: '-.02em' }}>{card.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: card.ink, letterSpacing: '.12em', marginTop: 4 }}>{card.id === 'musicfree' ? 'OPEN-SOURCE PLAYER' : card.id === 'lx' ? 'LX MUSIC' : 'LISTEN 1'}</div>
            </div>
          </div>
          <div style={{ marginTop: 1 }}>
            <StickerTag tone="rgba(235,250,232,.76)" ink="#3d764e" rotate={1.5} style={{ fontFamily: F.sans, fontSize: 10.5, padding: '4px 7px' }}>
              <CheckDoodle size={10} color="#3d764e" /> {card.status}
            </StickerTag>
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>接入方式</span>
          <span style={{ height: 1, flex: 1, background: 'rgba(45,52,54,.17)' }} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted, letterSpacing: '.08em' }}>{card.kind}</span>
        </div>

        <div style={{ marginTop: 12, fontFamily: F.hand, fontSize: 27, lineHeight: 1.25, color: C.ink, minHeight: 76 }}>
          {card.id === 'musicfree' ? '把歌单，交给下一首播放。' : card.id === 'lx' ? '导入一张列表，继续换源播放。' : '从一份备份，捡回整张歌单。'}
        </div>

        <div style={{ marginTop: 14, background: 'rgba(255,253,246,.57)', border: '1px dashed rgba(45,52,54,.23)', borderRadius: 5, padding: '10px 12px' }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted, letterSpacing: '.12em' }}>HOW TO BRING IT IN</div>
          <div style={{ fontFamily: F.sans, fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginTop: 5 }}>{card.route}</div>
        </div>

        <div style={{ position: 'absolute', left: 23, right: 23, bottom: 17, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 15, height: 15, borderRadius: 3, border: '1px solid rgba(45,52,54,.27)', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 6, color: C.inkMuted }}>{index === 0 ? 'MF' : index === 1 ? 'LX' : 'L1'}</span>
            <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{index === 0 ? '官方插件' : index === 1 ? '专用 JSON' : '备份 JSON'}</span>
          </div>
          <span style={{ fontFamily: F.hand, fontSize: 18, color: C.inkMuted }}>{index === 0 ? 'install →' : 'import →'}</span>
        </div>
      </PaperSheet>
    </div>
  );
};

export const EcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 88, mass: 0.9 }, durationInFrames: 40 });
  const exit = easeInOut(frame, 148, 30, 0, 1);
  const outerOpacity = interpolate(frame, [0, 1, 148, 168], [1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headline = easeOut(frame, 4, 24);
  const apiIn = spring({ frame: frame - L.api, fps, config: { damping: 17, stiffness: 100 }, durationInFrames: 36 });
  const migrationIn = easeOut(frame, L.migration, 22);
  const route = easeOut(frame, L.cards + 8, 36);

  return (
    <AbsoluteFill style={{ opacity: outerOpacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - enter) * 24 - exit * 20}px) scale(${0.98 + enter * 0.02 - exit * 0.012}) rotate(${exit * 0.5}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <ChapterMark number="05" kicker="THE NEXT STOP / OPEN ECOSYSTEM" title="歌单，还能继续往前走。" compact style={{ position: 'absolute', left: 168, top: 54, opacity: headline }} />
        <div style={{ position: 'absolute', right: 167, top: 63, fontFamily: F.hand, fontSize: 22, color: C.inkSoft, transform: 'rotate(1deg)', opacity: headline }}>
          3 款已支持 · 不只是一份文件
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, top: 114, textAlign: 'center', opacity: headline, transform: `translateY(${(1 - headline) * 14}px)` }}>
          <div style={{ fontFamily: F.display, fontSize: 67, lineHeight: 1.02, color: C.ink }}>歌单的下一站，不止一个。</div>
          <div style={{ width: 490, margin: '1px auto 0' }}>
            <Squiggle width={490} color={C.yellowDeep} progress={easeOut(frame, 18, 26)} strokeWidth={6} />
          </div>
          <div style={{ marginTop: 8, fontFamily: F.hand, fontSize: 25, color: C.inkSoft }}>官方插件 · 专用 JSON · Public API —— 让音乐继续流动。</div>
        </div>

        {/* dotted paths from file to cards */}
        <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
          {[
            { d: 'M478 761C480 680 487 590 496 494', color: '#579599' },
            { d: 'M960 771C960 690 960 590 960 498', color: '#9a7b38' },
            { d: 'M1438 761C1434 680 1425 590 1416 496', color: '#816ca4' },
          ].map((path, i) => (
            <g key={i} opacity={route * 0.62}>
              <path d={path.d} stroke={path.color} strokeWidth="1.7" strokeDasharray="5 8" strokeLinecap="round" strokeDashoffset={(1 - route) * 120} />
              <path d={`M${path.d.split(' ')[0].slice(1)} 478 l-4 9 l9 -3`} stroke={path.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            </g>
          ))}
          <path d="M480 788C710 830 1200 831 1420 789" stroke="rgba(45,52,54,.17)" strokeWidth="1.2" strokeDasharray="2 9" opacity={easeOut(frame, L.api - 10, 20)} />
        </svg>

        {PLAYER_CARDS.map((card, i) => {
          const cardIn = spring({ frame: frame - (L.cards + i * 30), fps, config: { damping: 16, stiffness: 110, mass: 0.8 }, durationInFrames: 38 });
          const cardExit = easeInOut(frame, 147 + i * 5, 28, 0, 1);
          return <PlayerCardView key={card.id} card={card} frame={frame} index={i} enter={cardIn} exit={cardExit} />;
        })}

        <div
          style={{
            position: 'absolute',
            left: 300,
            top: 774,
            width: 1320,
            height: 132,
            background: 'rgba(255,253,245,.84)',
            border: '1.2px solid rgba(45,52,54,.18)',
            borderRadius: '4px 8px 5px 7px / 7px 4px 8px 5px',
            boxShadow: '2px 3px 0 rgba(45,52,54,.07)',
            opacity: apiIn * (1 - exit),
            transform: `translateY(${(1 - apiIn) * 26}px) rotate(${-.2 + (1 - apiIn) * 1}deg)`,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            gap: 22,
          }}
        >
          <div style={{ width: 76, height: 76, background: C.mint, border: '1px solid rgba(45,52,54,.2)', borderRadius: '9px 7px 8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-3deg)', flexShrink: 0 }}>
            <span style={{ fontFamily: F.mono, fontSize: 15, color: '#3a6b50' }}>{'{ }'}</span>
            <span style={{ fontFamily: F.mono, fontSize: 6.5, letterSpacing: '.08em', color: '#567c62', marginTop: 3 }}>CANONICAL</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ fontFamily: F.sans, fontSize: 19.5, fontWeight: 750 }}>给开发者 / Public API + Canonical JSON</div>
              <Badge tone={C.yellowLight} ink="#80621e">无需注册</Badge>
              <Badge tone={C.blue} ink="#356676">统一数据结构</Badge>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkSoft, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              GET&nbsp;&nbsp;https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=...
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 11.5, color: C.inkMuted, marginTop: 5 }}>把同一张歌单，接进你的播放器、插件、脚本和下一个想法。</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted, letterSpacing: '.12em' }}>OPEN FOR BUILDERS</span>
            <span style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, transform: 'rotate(-2deg)' }}>API / JSON / CLI →</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 300,
            bottom: 58,
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            opacity: migrationIn * (1 - exit),
            transform: `translateY(${(1 - migrationIn) * 12}px)`,
          }}
        >
          <HeartDoodle size={21} color={C.pinkDeep} />
          <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 650, color: C.inkSoft }}>第三方迁移工具</span>（如 Soundiiz）可读取导出的 CSV / JSON，属于外部服务，非内置合作。
            <br />
            Soundiiz 一键迁移上限 200 首；BBPlayer 适配待上线。
          </div>
        </div>
        <div style={{ position: 'absolute', right: 303, bottom: 62, fontFamily: F.hand, fontSize: 24, color: C.inkSoft, transform: 'rotate(-2deg)', opacity: migrationIn }}>
          歌单不是终点，是下一首歌的起点。
        </div>
        <div style={{ position: 'absolute', left: 166, bottom: 46, fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: C.inkMuted, opacity: 0.7 }}>
          P.06 / PASS IT ON
        </div>
      </div>
    </AbsoluteFill>
  );
};
