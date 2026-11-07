import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SCENES, cue } from '../theme';
import { easeInOut, easeOut } from '../anim';
import { Sparkle, Squiggle, StarDoodle, Tape, Underline } from '../components/Doodles';
import { Badge, PaperSheet, StickerTag } from '../components/Paper';
import { ASSETS } from '../assets';
import { GITHUB_DISPLAY, URL_DISPLAY } from '../data';

const rel = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.finale.in);
const L = {
  logo: rel('finale_logo'),
  title: rel('finale_title'),
  url: rel('finale_url'),
  meta: rel('finale_meta'),
  sparkle: rel('finale_sparkle'),
};

export const FinaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgIn = easeOut(frame, 2, 20);
  const cardIn = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 84, mass: 1 }, durationInFrames: 54 });
  const logoIn = spring({ frame: frame - (L.logo - 22), fps, config: { damping: 12, stiffness: 120, mass: 0.72 }, durationInFrames: 45 });
  const titleIn = spring({ frame: frame - (L.title - 14), fps, config: { damping: 20, stiffness: 100, mass: 0.8 }, durationInFrames: 40 });
  const urlIn = spring({ frame: frame - L.url, fps, config: { damping: 18, stiffness: 115 }, durationInFrames: 38 });
  const metaIn = easeOut(frame, L.meta, 24);
  const sparkleIn = easeOut(frame, L.sparkle, 20);
  const slowPush = 1 + easeInOut(frame, 0, 144, 0, 0.025);
  const drift = Math.sin(frame / 58) * 1.2;
  const endLineIn = easeOut(frame, L.meta + 16, 24);

  return (
    <AbsoluteFill style={{ opacity: bgIn }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${slowPush}) translateY(${-frame * 0.012}px) rotate(${drift * 0.03}deg)`,
          transformOrigin: 'center center',
        }}
      >
        {/* the warmest light in the film */}
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 260,
            width: 800,
            height: 620,
            background: 'radial-gradient(ellipse at center, rgba(255,239,176,.55), rgba(255,244,208,.22) 42%, transparent 74%)',
            filter: 'blur(30px)',
            transform: `translateY(${Math.sin(frame / 70) * 6}px)`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 376,
            top: 154,
            width: 1168,
            height: 720,
            opacity: cardIn,
            transform: `translateY(${(1 - cardIn) * 48}px) rotate(${-.35 + (1 - cardIn) * 1.5}deg) scale(${0.94 + cardIn * 0.06})`,
            transformOrigin: 'center bottom',
          }}
        >
          <div style={{ position: 'absolute', top: -14, left: 132, zIndex: 9 }}>
            <Tape color="rgba(249,188,191,.72)" width={178} height={30} rotate={-4} />
          </div>
          <div style={{ position: 'absolute', top: -9, right: 150, zIndex: 9 }}>
            <Tape color="rgba(153,210,221,.62)" width={120} height={25} rotate={5} />
          </div>

          <PaperSheet
            tone="cream"
            shadow="lifted"
            style={{ width: '100%', height: '100%', padding: 0, background: '#fcf6e7' }}
            radius="4px 10px 6px 12px / 10px 4px 12px 6px"
          >
            {/* faint ruled guide and pencil frame */}
            <div style={{ position: 'absolute', inset: 25, border: '1px dashed rgba(45,52,54,.13)', borderRadius: '2px 5px 3px 4px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 62, top: 0, bottom: 0, width: 1, background: 'rgba(241,126,118,.18)' }} />
            <div style={{ position: 'absolute', left: 24, top: 30, fontFamily: F.mono, fontSize: 8, letterSpacing: '.18em', color: 'rgba(45,52,54,.3)', transform: 'rotate(-90deg)', transformOrigin: 'left top' }}>THE LITTLE MUSIC JOURNAL · FINAL PAGE</div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 40, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 152,
                  height: 152,
                  transform: `translateY(${(1 - logoIn) * -120}px) rotate(${-4 + logoIn * 3.6}deg) scale(${0.6 + logoIn * 0.4})`,
                  opacity: logoIn,
                  filter: 'drop-shadow(0 14px 13px rgba(67,49,25,.22))',
                }}
              >
                <img src={ASSETS.logo512} alt="Playlist Out logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 188, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: F.marker,
                  fontSize: 122,
                  lineHeight: 1,
                  color: C.ink,
                  letterSpacing: '-.015em',
                  opacity: titleIn,
                  transform: `translateY(${(1 - titleIn) * 20}px) scale(${0.94 + titleIn * 0.06})`,
                  textShadow: '0 1px 0 rgba(255,255,255,.4)',
                }}
              >
                Playlist Out
              </div>
              <div
                style={{
                  marginTop: 15,
                  fontFamily: F.display,
                  fontSize: 59,
                  lineHeight: 1.08,
                  color: C.ink,
                  opacity: titleIn,
                  transform: `translateY(${(1 - titleIn) * 14}px)`,
                }}
              >
                把你的歌单带走
              </div>
              <div style={{ width: 560, margin: '3px auto 0', opacity: titleIn }}>
                <Underline width={560} height={16} progress={easeOut(frame, L.title + 6, 26)} color={C.yellowDeep} strokeWidth={8} />
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 418,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: urlIn,
                transform: `translateY(${(1 - urlIn) * 18}px)`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  background: 'rgba(255,251,237,.82)',
                  border: '1.4px solid rgba(45,52,54,.25)',
                  borderRadius: 999,
                  padding: '11px 23px',
                  boxShadow: '3px 3px 0 rgba(45,52,54,.11)',
                  transform: 'rotate(-.7deg)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mintDeep, boxShadow: '0 0 0 3px rgba(126,188,147,.14)' }} />
                <span style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: '-.03em', color: C.ink }}>{URL_DISPLAY}</span>
                <span style={{ fontFamily: F.hand, fontSize: 21, color: C.inkMuted }}>↗</span>
              </div>

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, opacity: metaIn, transform: `translateY(${(1 - metaIn) * 12}px)` }}>
                <StickerTag tone={C.yellow} ink="#6d541a" rotate={-1.2} style={{ fontFamily: F.sans, fontSize: 10.5, padding: '5px 10px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6d541a' }} /> GITHUB · 开源
                </StickerTag>
                <StickerTag tone={C.mint} ink="#356b49" rotate={0.8} style={{ fontFamily: F.sans, fontSize: 10.5, padding: '5px 10px' }}>
                  MIT LICENSE
                </StickerTag>
                <span style={{ fontFamily: F.mono, fontSize: 9.5, color: C.inkMuted, letterSpacing: '.02em' }}>{GITHUB_DISPLAY}</span>
              </div>

              <div style={{ marginTop: 24, fontFamily: F.hand, fontSize: 26, color: C.inkSoft, transform: 'rotate(-.6deg)', opacity: metaIn }}>
                你的歌单，应该属于你。
              </div>
              <div style={{ marginTop: 5, fontFamily: F.sans, fontSize: 10.5, color: C.inkMuted, letterSpacing: '.03em', opacity: metaIn }}>
                为每一个音符，留一页可以带走的纸。
              </div>
            </div>

            {/* tiny marginal details */}
            <div style={{ position: 'absolute', left: 66, bottom: 48, transform: 'rotate(-4deg)', opacity: 0.65, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Sparkle size={18} color={C.pinkDeep} />
              <span style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '.12em', color: C.inkMuted }}>A SMALL FILM ABOUT TAKING YOUR PLAYLIST WITH YOU</span>
            </div>
            <div style={{ position: 'absolute', right: 64, bottom: 46, transform: 'rotate(2deg)', textAlign: 'right', opacity: 0.7 }}>
              <div style={{ fontFamily: F.hand, fontSize: 20, color: C.inkSoft }}>♪ 第 28 小节，灯还亮着</div>
              <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkMuted, letterSpacing: '.12em', marginTop: 2 }}>PLAYLIST OUT · 2026</div>
            </div>

            <div style={{ position: 'absolute', right: 48, top: 42, transform: `rotate(8deg) scale(${0.7 + metaIn * 0.3})`, opacity: metaIn, border: '1.6px solid rgba(193,77,67,.52)', borderRadius: 5, color: 'rgba(193,77,67,.7)', padding: '4px 7px', fontFamily: F.marker, fontSize: 10, letterSpacing: '.05em' }}>
              MADE WITH CARE
            </div>
          </PaperSheet>
        </div>

        {/* final end-of-page rule */}
        <div style={{ position: 'absolute', left: 160, right: 160, top: 944, opacity: endLineIn * 0.85, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ height: 1.5, flex: 1, background: 'rgba(241,126,118,.74)' }} />
          <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '.22em', color: 'rgba(203,93,89,.84)' }}>✦ END OF PAGE ✦</span>
          <div style={{ height: 1.5, flex: 1, background: 'rgba(241,126,118,.74)' }} />
        </div>
        <div style={{ position: 'absolute', left: 172, bottom: 56, fontFamily: F.mono, fontSize: 9, letterSpacing: '.17em', color: C.inkMuted, opacity: 0.7 }}>
          THE PLAYLIST IS YOURS
        </div>
        <div style={{ position: 'absolute', right: 173, bottom: 56, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.8 }}>
          <StarDoodle frame={frame} size={14} color={C.yellowDeep} seed={14} />
          <span style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, transform: 'rotate(-1.5deg)' }}>下一首歌，见。</span>
          <div style={{ opacity: sparkleIn }}>
            <Sparkle size={25} color={C.pinkDeep} rotate={12} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
