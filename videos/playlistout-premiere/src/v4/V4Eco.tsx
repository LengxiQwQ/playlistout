import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { PLAYER_CARDS } from '../data';
import { PaperSheet } from '../components/Paper';
import { BigChip, Chapter, Footer, STAGE, paperBreath } from './UI';

export const V4Eco: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Chapter
        kicker="THE NEXT STOP / OPEN ECOSYSTEM"
        title="歌单的下一站，不止一个。"
        right={
          <>
            3 款已支持 · 不只是一份文件
            <div style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, marginTop: 5 }}>官方插件 · 专用 JSON · Public API</div>
          </>
        }
      />
      <div style={{ position: 'absolute', left: STAGE.left, top: STAGE.top + 20, width: STAGE.width, opacity: enter, transform: `translateY(${(1 - enter) * 24}px)`, ...paperBreath(frame) }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22 }}>
          {PLAYER_CARDS.map((card, i) => (
            <PaperSheet
              key={card.id}
              tone={i === 0 ? 'blue' : i === 1 ? 'yellow' : 'lilac'}
              shadow="lifted"
              style={{ height: 470 + (i === 1 ? 10 : 0), padding: '22px 22px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    background: 'rgba(255,253,246,.55)',
                    border: '1.4px solid rgba(45,52,54,.25)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: F.note,
                    fontSize: 30,
                    color: card.ink,
                  }}
                >
                  {i === 0 ? '♫' : i === 1 ? '≈' : '♪'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 34, fontWeight: 800, lineHeight: 1.08, color: C.ink }}>{card.name}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 15, color: card.ink, letterSpacing: '.08em', marginTop: 4 }}>{card.kind}</div>
                </div>
                <BigChip tone="rgba(235,250,232,.7)" ink="#3d764e">✓ {card.status}</BigChip>
              </div>
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: F.sans, fontSize: 16, color: C.inkMuted }}>接入方式</span>
                <span style={{ height: 1, flex: 1, background: 'rgba(45,52,54,.18)' }} />
                <span style={{ fontFamily: F.mono, fontSize: 14, color: C.inkMuted, letterSpacing: '.08em' }}>{card.kind}</span>
              </div>
              <div style={{ marginTop: 14, fontFamily: F.hand, fontSize: 30, lineHeight: 1.25, color: C.ink, minHeight: 96 }}>{card.route}</div>
              <div style={{ marginTop: 16, background: 'rgba(255,253,246,.5)', border: '1px dashed rgba(45,52,54,.24)', borderRadius: 5, padding: '12px 14px' }}>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.inkMuted, letterSpacing: '.12em' }}>HOW TO BRING IT IN</div>
                <div style={{ fontFamily: F.sans, fontSize: 18, color: C.inkSoft, lineHeight: 1.55, marginTop: 5 }}>
                  {card.id === 'musicfree' ? '插件设置 → 从网络安装' : card.id === 'lx' ? '我的列表 → 导入列表' : '设置 → 备份与恢复'}
                </div>
              </div>
              <div style={{ position: 'absolute', left: 22, right: 22, bottom: 18, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 14, color: C.inkMuted }}>
                <span>{i === 0 ? 'OFFICIAL PLUGIN' : 'IMPORT / EXPORT'}</span>
                <span>{i === 0 ? 'install →' : 'open →'}</span>
              </div>
            </PaperSheet>
          ))}
        </div>

        <PaperSheet tone="cream" shadow="soft" style={{ marginTop: 20, padding: '13px 18px' }} radius="5px 8px 5px 9px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 5, background: 'rgba(228,241,224,.7)', border: '1px solid #aac69e', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 18, color: '#4a7148' }}>{'{}'}</div>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.ink }}>给开发者 / Public API + Canonical JSON</div>
              <div style={{ fontFamily: F.mono, fontSize: 14, color: C.inkSoft, marginTop: 3 }}>GET https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=...</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <BigChip>无需注册</BigChip>
              <div style={{ fontFamily: F.hand, fontSize: 22, color: C.inkSoft, marginTop: 7 }}>把一首歌单，接进你的播放器、插件、脚本或下一个想法。</div>
            </div>
          </div>
        </PaperSheet>

        <div style={{ marginTop: 14, fontFamily: F.sans, fontSize: 18, color: C.inkMuted, lineHeight: 1.45 }}>
          BBPlayer 即将上线 · Soundiiz / TuneMyMusic / FreeYourMusic 为第三方迁移服务；Soundiiz 单次约 200 首。
        </div>
      </div>
      <Footer left="歌单不是终点，是下一首歌的起点。" right="PASS IT ON · API / JSON / CLI" />
    </AbsoluteFill>
  );
};
