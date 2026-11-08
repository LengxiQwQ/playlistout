import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { ASSETS } from '../assets';
import { PaperSheet } from '../components/Paper';
import { Tape } from '../components/Doodles';
import { paperBreath } from './UI';

export const V4Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const links = interpolate(frame, [32, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 150,
          width: 1320,
          height: 760,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 28}px)`,
          ...paperBreath(frame),
        }}
      >
        <PaperSheet tone="cream" shadow="paper" style={{ width: '100%', height: '100%', padding: 0, background: '#fbf5e7' }} radius="8px 16px 9px 17px / 15px 8px 17px 9px">
          <div style={{ position: 'absolute', left: 70, top: 0, bottom: 0, width: 1, background: 'rgba(45,52,54,.13)' }} />
          <div style={{ position: 'absolute', left: 28, top: 28, fontFamily: F.mono, fontSize: 14, letterSpacing: '.18em', color: C.inkMuted }}>
            A SMALL FILM ABOUT TAKING YOUR PLAYLIST WITH YOU
          </div>
          <div style={{ position: 'absolute', top: -14, left: 150, zIndex: 8 }}>
            <Tape color="rgba(247,192,202,.68)" width={150} height={28} rotate={-3} />
          </div>
          <div style={{ position: 'absolute', top: -10, right: 180, zIndex: 8 }}>
            <Tape color="rgba(164,213,224,.62)" width={150} height={26} rotate={3} />
          </div>

          <div style={{ position: 'absolute', left: 0, right: 0, top: 46, textAlign: 'center' }}>
            <img src={ASSETS.logo512} alt="" style={{ width: 146, height: 146, objectFit: 'contain', transform: 'rotate(-3deg)' }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center' }}>
            <div style={{ fontFamily: F.marker, fontSize: 122, lineHeight: 1, color: C.ink, letterSpacing: '.01em', transform: 'rotate(-.6deg)' }}>
              PLAYLIST OUT
            </div>
            <div style={{ fontFamily: F.display, fontSize: 59, lineHeight: 1.1, color: C.ink, marginTop: 22 }}>
              把你的歌单带走
            </div>
            <div style={{ width: 380, height: 4, background: C.yellowDeep, margin: '24px auto 0', borderRadius: 6, transform: 'rotate(-.6deg)' }} />
          </div>

          <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', opacity: links }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1.4px solid rgba(45,52,54,.28)', borderRadius: 999, padding: '12px 25px', background: 'rgba(255,253,246,.6)', fontFamily: F.mono, fontSize: 28, color: C.ink }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#72b38a' }} />
              playlistout.lengxiqwq.com
              <span style={{ fontSize: 22, color: C.inkMuted }}>↗</span>
            </div>
          </div>

          <div style={{ position: 'absolute', left: 44, right: 44, bottom: 34, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 16, color: C.inkMuted, opacity: links }}>
            <span>github.com/LengxiQwQ/playlistout</span>
            <span>MIT · 2026 · MADE WITH PAPER &amp; BEATS</span>
          </div>
          <div style={{ position: 'absolute', right: 46, bottom: 92, fontFamily: F.hand, fontSize: 22, color: C.inkSoft, opacity: links, transform: 'rotate(-1.5deg)' }}>
            ♪ 第 28 小节，灯还亮着
          </div>
        </PaperSheet>
      </div>
      <div style={{ position: 'absolute', left: 166, bottom: 44, fontFamily: F.mono, fontSize: 14, letterSpacing: '.14em', color: C.inkMuted }}>THE PLAYLIST IS YOURS</div>
      <div style={{ position: 'absolute', right: 160, bottom: 44, fontFamily: F.hand, fontSize: 24, color: C.inkSoft }}>下一首歌，见。</div>
    </AbsoluteFill>
  );
};
