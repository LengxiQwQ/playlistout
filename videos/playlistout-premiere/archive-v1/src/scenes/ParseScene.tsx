import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { C, F, SCENES, cue, s } from '../theme';
import { ASSETS } from '../assets';
import { blink, easeInOut, easeOut, typeOn } from '../anim';
import {
  ArrowCurve,
  ChapterMark,
  CheckDoodle,
  Sparkle,
  Squiggle,
  StarDoodle,
  Tape,
} from '../components/Doodles';
import {
  Badge,
  FormatGlyph,
  HandButton,
  MiniCover,
  PaperSheet,
  PlatformChip,
  StickerTag,
} from '../components/Paper';
import { FORMATS, PLATFORMS, PLAYLIST } from '../data';

const at = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.parse.in);

const L = {
  browserIn: 0,
  urlStart: at('url_start'),
  urlEnd: at('url_end'),
  click: at('parse_click'),
  loading: at('loading'),
  results: at('results'),
  rowsStart: at('rows_start'),
  rowsEnd: at('rows_end'),
  count: at('count'),
  done: at('done'),
  select: at('export_select'),
  exportClick: at('export_click'),
  peel: at('table_peel'),
};

const browser = { left: 232, top: 118, width: 1456, height: 876, chrome: 46 };
const site = { width: browser.width, height: browser.height - browser.chrome };
const resultBox = { left: 36, top: 82, width: site.width - 72, height: 710 };
const searchBox = { width: 1210, top: 236, height: 224 };
const searchLeft = (site.width - searchBox.width) / 2;
const searchScreenTop = browser.top + browser.chrome + searchBox.top;
const parseButton = {
  x: browser.left + searchLeft + searchBox.width - 28 - 55,
  y: searchScreenTop + 22 + 32 + 13 + 29,
};

const Cursor: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 1 }) => {
  const start = s(8.45) - SCENES.parse.in;
  const click = s(8.82) - SCENES.parse.in;
  const travel = easeInOut(frame, start, click - start, 0, 1);
  const press = interpolate(frame, [click - 2, click + 3, click + 14], [1, 0.86, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fade = interpolate(frame, [start - 4, start + 4, cue('results') - SCENES.parse.in + 12], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const startX = 1040;
  const startY = 714;
  const x = startX + (parseButton.x - startX) * travel;
  const y = startY + (parseButton.y - startY) * travel - Math.sin(travel * Math.PI) * 36;
  const ripples = [0, 7, 14].map((d) => interpolate(frame, [click + d, click + d + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <>
      {ripples.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: parseButton.x - 30,
            top: parseButton.y - 30,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `2px solid rgba(45,52,54,${0.36 * (1 - p)})`,
            transform: `scale(${0.4 + p * 1.4 + i * 0.2})`,
            opacity: frame > click ? 1 - p : 0,
            zIndex: 70,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: x - 5,
          top: y - 2,
          width: 28,
          height: 34,
          transform: `scale(${press}) rotate(-8deg)`,
          opacity: opacity * fade,
          zIndex: 71,
          filter: 'drop-shadow(0 2px 2px rgba(45,52,54,.24))',
        }}
      >
        <svg viewBox="0 0 28 34" width="28" height="34" fill="none" aria-hidden="true">
          <path d="M2.5 2.5 24 17.2l-9.4 2.1-4.8 10.7L2.5 2.5Z" fill={C.paperWhite} stroke={C.ink} strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
};

const BrowserChrome: React.FC = () => (
  <div
    style={{
      height: browser.chrome,
      background: 'linear-gradient(to bottom, #f7f1e2, #eee6d6)',
      borderBottom: '1px solid rgba(45,52,54,.14)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 17px',
      position: 'relative',
    }}
  >
    <div style={{ display: 'flex', gap: 7, width: 62 }}>
      {['#e98f86', '#e5c263', '#89b58d'].map((color) => (
        <div key={color} style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: 'inset 0 0 0 .5px rgba(45,52,54,.2)' }} />
      ))}
    </div>
    <div
      style={{
        width: 640,
        height: 26,
        margin: '0 auto',
        background: 'rgba(255,253,247,.8)',
        border: '1px solid rgba(45,52,54,.16)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: F.mono,
        fontSize: 11,
        color: '#6b6b61',
        boxShadow: 'inset 0 1px 2px rgba(80,60,30,.05)',
      }}
    >
      <svg width="10" height="11" viewBox="0 0 12 14" fill="none" aria-hidden="true">
        <rect x="1.2" y="5.4" width="9.6" height="7.2" rx="1.8" stroke="#767368" strokeWidth="1" />
        <path d="M3.4 5.2V3.7a2.6 2.6 0 0 1 5.2 0v1.5" stroke="#767368" strokeWidth="1" strokeLinecap="round" />
      </svg>
      playlistout.lengxiqwq.com
      <span style={{ color: '#b0aa9b', marginLeft: 2 }}>· 本地生成</span>
    </div>
    <div style={{ width: 62, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <div style={{ width: 11, height: 11, border: '1.2px solid #908b7d', borderRadius: 2 }} />
      <div style={{ width: 11, height: 11, border: '1.2px solid #908b7d', borderRadius: '50%' }} />
    </div>
  </div>
);

const SiteHeader: React.FC = () => (
  <div
    style={{
      height: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      borderBottom: '1px dashed rgba(45,52,54,.16)',
      position: 'relative',
      zIndex: 30,
      background: 'rgba(250,246,236,.8)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={ASSETS.logo128} alt="" width={32} height={32} style={{ objectFit: 'contain', transform: 'rotate(-2deg)' }} />
      <div>
        <div style={{ fontFamily: F.marker, fontSize: 22, lineHeight: 1, color: C.ink, letterSpacing: '.01em' }}>Playlist Out</div>
        <div style={{ fontFamily: F.note, fontSize: 13, lineHeight: 1.2, color: C.inkSoft }}>把你的歌单带走</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: F.sans }}>
      {['GitHub ↗', '下载桌面版', 'Aa'].map((label, i) => (
        <span
          key={label}
          style={{
            border: '1px solid rgba(45,52,54,.22)',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 10.5,
            color: i === 0 ? C.ink : C.inkSoft,
            fontWeight: 550,
            background: i === 2 ? 'rgba(255,255,255,.38)' : 'transparent',
          }}
        >
          {label}
        </span>
      ))}
    </div>
  </div>
);

const Hero: React.FC<{ frame: number }> = ({ frame }) => {
  const vanish = easeInOut(frame, L.results - 10, 26, 0, 1);
  const enter = easeOut(frame, 2, 26);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 58,
        textAlign: 'center',
        opacity: enter * (1 - vanish),
        transform: `translateY(${(1 - enter) * 18 - vanish * 42}px) scale(${1 - vanish * 0.025})`,
        zIndex: 5,
      }}
    >
      <div
        style={{
          fontFamily: F.display,
          fontSize: 63,
          lineHeight: 1.02,
          color: C.ink,
          letterSpacing: '.01em',
          transform: 'rotate(-.3deg)',
        }}
      >
        把你的歌单带走
      </div>
      <div style={{ width: 300, margin: '0 auto', marginTop: -2 }}>
        <Squiggle width={300} color={C.yellowDeep} progress={easeOut(frame, 10, 26)} strokeWidth={6} />
      </div>
      <div style={{ marginTop: 5, fontFamily: F.hand, fontSize: 22, color: C.inkSoft }}>
        Playlist Out · 为备份与导出而生的手账音乐日记
      </div>
      <div
        style={{
          position: 'absolute',
          right: 92,
          top: 6,
          fontFamily: F.hand,
          fontSize: 19,
          color: C.inkSoft,
          transform: 'rotate(4deg)',
          opacity: 0.8,
        }}
      >
        无需注册 · 干净清爽 ♪
      </div>
      <Sparkle size={18} color={C.yellowDeep} rotate={12} className="hero-spark" />
    </div>
  );
};

const initialSearchNote: React.FC<{ frame: number }> = ({ frame }) => {
  const typeStart = L.urlStart;
  const uri = 'https://y.qq.com/n/ryqq/playlist/9140654872';
  const typed = typeOn(uri, frame, typeStart, 23.5);
  const focused = frame >= typeStart - 6 && frame < L.click + 10;
  const isLoading = frame >= L.loading && frame < L.results - 2;
  const buttonActive = typed.length >= uri.length && frame < L.results;
  const buttonPressed = frame >= L.click - 2 && frame < L.click + 9;
  const loadingWave = 1 + Math.sin(frame * 0.4) * 0.003;
  const enter = spring({ frame, fps: 30, config: { damping: 18, stiffness: 100, mass: 0.75 }, durationInFrames: 34 });
  const fold = easeInOut(frame, L.results - 8, 22, 0, 1);
  const loading = interpolate(frame, [L.loading, L.loading + 10, L.results - 4, L.results + 2], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: searchLeft,
        top: searchBox.top,
        width: searchBox.width,
        height: searchBox.height,
        opacity: 1 - fold,
        transform: `translateY(${(1 - enter) * 32 + fold * 8}px) scaleY(${1 - fold * 0.96}) rotate(${fold * 0.5}deg) scale(${loadingWave})`,
        transformOrigin: 'bottom center',
        zIndex: 12,
        perspective: 800,
      }}
    >
      <PaperSheet
        tone="yellow"
        shadow="paper"
        style={{ width: '100%', height: '100%', padding: '21px 28px', transform: 'rotate(-.18deg)' }}
        radius="4px 9px 5px 10px / 8px 4px 10px 5px"
      >
        <div style={{ position: 'absolute', top: -13, left: 62, zIndex: 8 }}>
          <Tape color="rgba(158,213,225,.6)" width={128} height={28} rotate={-2.5} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: F.note, fontSize: 26, color: C.ink, fontWeight: 400 }}>在这里粘贴歌单链接</span>
            <span style={{ fontFamily: F.hand, fontSize: 27, color: C.marginRed, transform: 'rotate(5deg)' }}>↓</span>
          </div>
          <StickerTag tone="rgba(255,255,255,.5)" rotate={1.4} style={{ fontSize: 12.5, fontFamily: F.sans, padding: '3px 8px', boxShadow: '1px 1px 0 rgba(45,52,54,.1)' }}>
            提供公开歌单解析
          </StickerTag>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              height: 56,
              background: 'rgba(255,253,246,.82)',
              border: focused ? '1.6px solid #2d3436' : '1.2px dashed rgba(45,52,54,.4)',
              borderRadius: '4px 6px 4px 5px',
              boxShadow: focused ? '0 0 0 3px rgba(255,255,255,.28), 2px 2px 0 rgba(45,52,54,.13)' : 'inset 0 1px 3px rgba(45,52,54,.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 10,
              fontFamily: F.mono,
              fontSize: 14.5,
              color: typed ? C.ink : C.inkMuted,
              letterSpacing: '-.015em',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
              <path d="M9.5 14.5 14.5 9.5M8 16l-2.5 2.5a3.9 3.9 0 0 1-5.5-5.5L5 8M16 8l2.5-2.5A3.9 3.9 0 0 1 24 11l-5 5" stroke="#73736a" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typed || 'https://music.163.com/playlist?id=...'}
              {focused && Math.floor(frame / 16) % 2 === 0 ? <span style={{ borderLeft: '1.5px solid #2d3436', marginLeft: 1 }}> </span> : null}
            </span>
          </div>
          <div
            style={{
              width: 114,
              height: 50,
              background: isLoading ? '#4d5c42' : buttonActive ? C.ink : '#b9b3a4',
              color: C.paperWhite,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              fontFamily: F.note,
              fontSize: 22,
              borderRadius: '3px 6px 4px 6px / 6px 4px 7px 4px',
              border: `1.5px solid ${buttonActive || isLoading ? C.ink : 'rgba(45,52,54,.45)'}`,
              boxShadow: '3px 3px 0 rgba(45,52,54,.18)',
              transform: `translate(${buttonPressed ? 2 : 0}px, ${buttonPressed ? 2 : 0}px) rotate(-.8deg) scale(${buttonPressed ? 0.96 : 1})`,
            }}
          >
            {isLoading ? (
              <>
                <span style={{ display: 'inline-flex', width: 13, height: 13, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', transform: `rotate(${frame * 12}deg)` }} />
                解析中
              </>
            ) : typed ? '解析 →' : '解析'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 13, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <div style={{ fontFamily: F.sans, fontSize: 10.5, color: C.inkSoft, marginRight: 2 }}>支持公开歌单</div>
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: F.sans,
                fontSize: 10.5,
                color: p.ink,
                borderBottom: `1.5px solid ${p.ink}55`,
                paddingBottom: 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: p.ink }} />
              {p.name}
            </div>
          ))}
          <div style={{ fontFamily: F.hand, fontSize: 17, color: C.inkMuted, marginLeft: 'auto', transform: 'rotate(-1.5deg)' }}>粘贴后按 Enter 也可以</div>
        </div>
        {loading > 0.01 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 42,
              background: 'rgba(255,253,245,.92)',
              borderTop: '1px dashed rgba(45,52,54,.23)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
              gap: 12,
              opacity: loading,
            }}
          >
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: 7 + Math.sin(frame * 0.35 + i) * 6,
                    background: C.ink,
                    borderRadius: 4,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 11.5, color: C.inkSoft }}>
              正在解析公开歌单 · 曲目顺序完整保留
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 9, color: C.inkMuted, letterSpacing: '.12em' }}>
              {Math.min(100, Math.round(((frame - L.loading) / Math.max(1, L.results - L.loading)) * 100))}%
            </div>
          </div>
        ) : null}
      </PaperSheet>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = C.ink }) => (
  <div style={{ minWidth: 68, paddingLeft: 14, borderLeft: '1px dashed rgba(45,52,54,.2)' }}>
    <div style={{ fontFamily: F.sans, fontSize: 9.5, color: C.inkMuted, letterSpacing: '.09em', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, color: tone, marginTop: 3, whiteSpace: 'nowrap' }}>{value}</div>
  </div>
);

const TrackRow: React.FC<{
  track: (typeof PLAYLIST.tracks)[number];
  frame: number;
  index: number;
  peel: number;
}> = ({ track, frame, index, peel }) => {
  const start = L.rowsStart + index * 6;
  const enter = easeOut(frame, start, 20);
  const isVip = track.status === 'VIP专享';
  const staggerPeel = easeInOut(frame, L.peel + index * 2, 26, 0, 1);
  const highlight = index === 0 ? Math.min(1, Math.max(0, (frame - L.rowsStart - 30) / 18)) : 0;
  const float = Math.sin((frame + index * 17) / 42) * 1.2;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '42px 52px 1.55fr 1fr 1.4fr 90px 58px',
        alignItems: 'center',
        height: 46,
        padding: '0 6px',
        borderBottom: '1px solid rgba(45,52,54,.075)',
        fontFamily: F.sans,
        fontSize: 14.5,
        color: C.ink,
        opacity: enter * (1 - staggerPeel),
        transform: `translateY(${(1 - enter) * 14 - staggerPeel * (52 + index * 7) + float * (1 - staggerPeel)}px) rotate(${staggerPeel * (index % 2 === 0 ? -2.4 : 2.1)}deg) scale(${1 - staggerPeel * 0.015})`,
        transformOrigin: 'left center',
        position: 'relative',
        background: highlight > 0 ? `linear-gradient(to right, rgba(255,224,120,${0.26 * highlight * (1 - staggerPeel)}), transparent 72%)` : 'transparent',
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMuted, textAlign: 'center' }}>{String(track.index).padStart(2, '0')}</div>
      <div
        style={{
          width: 31,
          height: 31,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${['#f7e0a1', '#d6e8ee', '#efd5db', '#dbeadc'][track.index % 4]}, rgba(255,255,255,.82))`,
          border: '1px solid rgba(45,52,54,.22)',
          display: 'grid',
          placeItems: 'center',
          color: 'rgba(45,52,54,.55)',
          fontSize: 13,
          fontFamily: F.mono,
          flexShrink: 0,
        }}
      >
        ♪
      </div>
      <div style={{ paddingRight: 8, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
      <div style={{ color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{track.artist}</div>
      <div style={{ color: C.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{track.album}</div>
      <div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10.5,
            color: isVip ? '#7a5315' : '#3e7650',
            background: isVip ? '#fcf1cd' : '#edf8ee',
            border: `1px solid ${isVip ? '#e8ce84' : '#bfe2c5'}`,
            padding: '2px 6px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {isVip ? 'VIP' : '✓'} {isVip ? '专享' : '正常'}
        </span>
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMuted, textAlign: 'right' }}>{track.duration}</div>
    </div>
  );
};

const ResultPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const unfold = easeInOut(frame, L.results - 4, 30, 0, 1);
  const enterSpring = spring({ frame: frame - (L.results - 3), fps: 30, config: { damping: 20, stiffness: 92, mass: 0.9 }, durationInFrames: 36 });
  const done = spring({ frame: frame - L.done, fps: 30, config: { damping: 12, stiffness: 140, mass: 0.6 }, durationInFrames: 24 });
  const formatsIn = easeOut(frame, L.select, 22);
  const pressed = frame >= L.exportClick - 2 && frame < L.exportClick + 10;
  const countValue = Math.round(interpolate(frame, [L.results + 3, L.count], [0, PLAYLIST.trackCount], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
  const exit = easeInOut(frame, L.peel + 20, 44, 0, 1);
  const rows = PLAYLIST.tracks.slice(0, 7);

  return (
    <div
      style={{
        position: 'absolute',
        left: resultBox.left,
        top: resultBox.top,
        width: resultBox.width,
        height: resultBox.height,
        zIndex: 20,
        opacity: 1 - exit,
        transform: `translateY(${(1 - unfold) * 92 - exit * 20}px) scale(${0.965 + enterSpring * 0.035 + exit * 0.012}) rotate(${(1 - unfold) * 0.2 - exit * 0.25}deg)`,
        clipPath: `inset(0 0 ${Math.max(0, 100 - unfold * 100)}% 0 round 8px)`,
        filter: exit > 0 ? `blur(${exit * 2.4}px)` : undefined,
      }}
    >
      <PaperSheet
        tone="white"
        shadow="paper"
        style={{ width: '100%', height: '100%', padding: '22px 28px 20px', background: '#fffdf7' }}
        radius="4px 8px 5px 9px / 8px 4px 9px 5px"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ display: 'flex', gap: 15, minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <MiniCover tone="#e9d6ad" deep="#b68a4b" motif="flower" size={81} rotate={-1.4} />
              {frame >= L.done - 2 ? (
                <div
                  style={{
                    position: 'absolute',
                    right: -15,
                    bottom: -12,
                    width: 52,
                    height: 52,
                    border: '2px solid rgba(193,77,67,.66)',
                    borderRadius: '50%',
                    color: 'rgba(193,77,67,.82)',
                    background: 'rgba(255,251,242,.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `rotate(-13deg) scale(${0.55 + done * 0.45})`,
                    opacity: Math.min(1, done * 1.4) * (1 - exit),
                    fontFamily: F.marker,
                    fontSize: 11,
                    lineHeight: 1.05,
                    letterSpacing: '.04em',
                    zIndex: 4,
                  }}
                >
                  <span>DONE</span>
                  <span style={{ fontFamily: F.hand, fontSize: 15, marginTop: 2 }}>✓</span>
                </div>
              ) : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <StickerTag tone="#f6d4d8" ink="#964652" rotate={-1.2} style={{ fontSize: 11, fontFamily: F.sans, padding: '3px 8px', boxShadow: 'none' }}>
                  QQ 音乐 · 公开歌单
                </StickerTag>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkMuted, letterSpacing: '.08em' }}>RESOLVED ✓</span>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 650 }}>
                {PLAYLIST.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, fontFamily: F.sans, fontSize: 12.5, color: C.inkSoft }}>
                <span>作者</span>
                <span style={{ color: C.ink, fontWeight: 650 }}>{PLAYLIST.creator}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>创建于 2025-03-18</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>公开歌单 · 曲目顺序完整保留</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, flexShrink: 0, paddingTop: 3 }}>
            <Stat label="TRACKS" value={`${countValue} 首`} tone={C.ink} />
            <Stat label="DURATION" value="7 小时 06 分" />
            <Stat label="STATUS" value={<span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e0a93b' }} />VIP 2</span>} />
          </div>
        </div>

        <div style={{ marginTop: 15, borderTop: '1px dashed rgba(45,52,54,.22)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 6px' }}>
            <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700 }}>曲目列表 <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted, marginLeft: 4, fontWeight: 400 }}>TRACKS</span></div>
            <div style={{ fontFamily: F.hand, fontSize: 17, color: C.inkMuted, transform: 'rotate(-1deg)' }}>按原歌单顺序 · 保留重复歌曲</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '42px 52px 1.55fr 1fr 1.4fr 90px 58px',
              padding: '0 6px 5px',
              borderBottom: '1.2px solid rgba(45,52,54,.22)',
              fontFamily: F.sans,
              fontSize: 9.5,
              fontWeight: 650,
              letterSpacing: '.06em',
              color: C.inkMuted,
              textTransform: 'uppercase',
            }}
          >
            <span style={{ textAlign: 'center' }}>#</span>
            <span>COVER</span>
            <span>TITLE</span>
            <span>ARTIST</span>
            <span>ALBUM</span>
            <span>STATUS</span>
            <span style={{ textAlign: 'right' }}>TIME</span>
          </div>
          {rows.map((track, i) => (
            <TrackRow key={track.index} track={track} frame={frame} index={i} peel={easeInOut(frame, L.peel, 28)} />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', fontFamily: F.sans, fontSize: 10.5, color: C.inkMuted }}>
            <span>显示 7 / 104 首 · 完整歌单将全部写入导出文件</span>
            <span style={{ fontFamily: F.hand, fontSize: 17, color: C.inkSoft }}>还有 97 首，正排队等你 ♪</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            bottom: 18,
            borderTop: '1px dashed rgba(45,52,54,.24)',
            paddingTop: 11,
            opacity: formatsIn,
            transform: `translateY(${(1 - formatsIn) * 12}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
              <span style={{ fontFamily: F.note, fontSize: 22, marginRight: 2 }}>挑一种方式带走它</span>
              {FORMATS.slice(0, 5).map((format, i) => {
                const selected = i === 0;
                return (
                  <div
                    key={format.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 8px',
                      background: selected ? format.tone : 'rgba(255,255,255,.55)',
                      border: selected ? `1.2px solid ${format.toneDeep}` : '1px dashed rgba(45,52,54,.22)',
                      borderRadius: '3px 5px 3px 5px',
                      fontFamily: F.mono,
                      fontSize: 10.5,
                      color: selected ? format.toneDeep : C.inkSoft,
                      boxShadow: selected ? '1px 1px 0 rgba(45,52,54,.12)' : 'none',
                      transform: selected ? 'translateY(-1px)' : undefined,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selected ? <CheckDoodle size={11} color={format.toneDeep} /> : null}
                    {format.name}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: pressed ? '#44503c' : C.ink,
                color: C.paperWhite,
                padding: '9px 18px',
                borderRadius: '3px 6px 4px 6px / 6px 4px 7px 4px',
                boxShadow: '3px 3px 0 rgba(45,52,54,.2)',
                transform: `translate(${pressed ? 2 : 0}px, ${pressed ? 2 : 0}px) scale(${pressed ? 0.97 : 1})`,
                fontFamily: F.note,
                fontSize: 20,
                whiteSpace: 'nowrap',
              }}
            >
              导出 (Excel) ↓
              {pressed ? <span style={{ position: 'absolute', left: '50%', top: '50%', width: 10, height: 10, borderRadius: '50%', background: C.yellow, transform: `translate(-50%,-50%) scale(${(frame - L.exportClick) / 5})`, opacity: 0.7 }} /> : null}
            </div>
          </div>
          <div style={{ marginTop: 7, fontFamily: F.sans, fontSize: 9.5, color: C.inkMuted }}>
            所有文件在浏览器本地生成 · 只带走歌单数据，不下载音频
          </div>
        </div>

        {/* a small bridge between reading the list and choosing a destination */}
        {frame >= s(13.0) - SCENES.parse.in && frame < L.results + 155 ? (
          <div
            style={{
              position: 'absolute',
              left: 28,
              right: 28,
              bottom: 142,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px dashed rgba(45,52,54,.16)',
              opacity:
                Math.min(
                  easeOut(frame, s(13.0) - SCENES.parse.in, 20),
                  1 - easeOut(frame, L.select - 8, 16),
                ) * (1 - exit),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: F.hand, fontSize: 25, color: C.inkSoft, transform: 'rotate(-1deg)' }}>接下来，挑一个能把它带走的方式</span>
              <span style={{ fontFamily: F.hand, fontSize: 28, color: C.yellowDeep }}>↓</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.62 }}>
              {['XLSX', 'JSON', 'CSV', 'TXT', 'M3U8'].map((format, i) => (
                <span
                  key={format}
                  style={{
                    width: 43,
                    height: 55,
                    border: '1px solid rgba(45,52,54,.22)',
                    borderRadius: 3,
                    background: 'rgba(255,255,255,.48)',
                    transform: `rotate(${(i - 2) * 1.5}deg)`,
                    fontFamily: F.mono,
                    fontSize: 7.5,
                    color: C.inkMuted,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 5,
                    boxShadow: '1px 2px 0 rgba(45,52,54,.08)',
                  }}
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </PaperSheet>
    </div>
  );
};

export const ParseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const browserIn = spring({ frame, fps, config: { damping: 20, stiffness: 88, mass: 0.95 }, durationInFrames: 42 });
  const push = easeInOut(frame, L.results - 8, 120, 0, 1);
  const exit = easeInOut(frame, L.peel + 6, 34, 0, 1);
  const outerOpacity = interpolate(frame, [0, 8, 330, 356], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const chapterFade = interpolate(frame, [0, 14, L.peel + 25, L.peel + 50], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity: outerOpacity }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 112,
          opacity: chapterFade,
          transform: `translateY(${(1 - browserIn) * -10}px)`,
        }}
      >
        <ChapterMark
          number="01"
          kicker="SINGLE PLAYLIST · COPY / PASTE / PARSE"
          title="粘贴，解析，收好。"
          compact
          style={{ position: 'absolute', left: 173, top: 54 }}
        />
        <div style={{ position: 'absolute', right: 188, top: 61, textAlign: 'right' }}>
          <div style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, transform: 'rotate(1deg)' }}>无需注册 · 公开歌单</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkMuted, letterSpacing: '.18em', marginTop: 4 }}>ONE LINK. ONE LITTLE ESCAPE.</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: browser.left,
          top: browser.top,
          width: browser.width,
          height: browser.height,
          opacity: 1,
          transform: `translateY(${(1 - browserIn) * 88 - exit * 30 - push * 12}px) scale(${0.955 + browserIn * 0.045 - exit * 0.015 + push * 0.018}) rotate(${(1 - browserIn) * -0.5 + exit * 0.25}deg)`,
          filter: `blur(${exit * 1.3}px)`,
          transformOrigin: 'center top',
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="lifted"
          style={{ width: '100%', height: '100%', padding: 0, background: '#f8f3e7' }}
          radius="5px 10px 6px 11px / 10px 5px 11px 6px"
        >
          <BrowserChrome />
          <div style={{ position: 'relative', width: site.width, height: site.height, overflow: 'hidden' }}>
            <SiteHeader />
            <Hero frame={frame} />
            {initialSearchNote({ frame })}
            <div
              style={{
                position: 'absolute',
                left: 70,
                right: 70,
                top: 493,
                height: 1.2,
                background: 'rgba(45,52,54,.12)',
                opacity: 1 - easeInOut(frame, L.results - 15, 20),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 80,
                right: 80,
                top: 530,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                opacity: interpolate(frame, [0, 12, L.results - 16, L.results], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                transform: `translateY(${easeOut(frame, 6, 24) * 0}px)`,
              }}
            >
              <div>
                <div style={{ fontFamily: F.hand, fontSize: 24, color: C.inkSoft }}>把散落在不同平台里的歌单，重新贴回一本手账。</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 11, fontFamily: F.mono, fontSize: 9, color: C.inkMuted, letterSpacing: '.12em' }}>
                  <span>EXCEL</span><span style={{ opacity: 0.35 }}>·</span><span>JSON</span><span style={{ opacity: 0.35 }}>·</span><span>CSV</span><span style={{ opacity: 0.35 }}>·</span><span>TXT</span><span style={{ opacity: 0.35 }}>·</span><span>M3U8</span>
                </div>
              </div>
              <div style={{ transform: 'rotate(8deg)', opacity: 0.7 }}>
                <StarDoodle frame={frame} size={22} color={C.yellowDeep} seed={24} />
              </div>
              <div style={{ textAlign: 'right', fontFamily: F.hand, fontSize: 18, color: C.inkMuted, transform: 'rotate(-2deg)', maxWidth: 260 }}>
                没有臃肿后台<br />没有复杂流程
              </div>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 650, bottom: 0, pointerEvents: 'none', opacity: interpolate(frame, [0, 20, L.results - 8, L.results + 2], [0, 0.6, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              <MusicLittleStaff frame={frame} />
            </div>

            <ResultPanel frame={frame} />
            <Cursor frame={frame} />
          </div>
        </PaperSheet>
        <div style={{ position: 'absolute', left: 28, top: -12, zIndex: 8 }}>
          <Tape color="rgba(250,201,173,.68)" width={168} height={25} rotate={-4} />
        </div>
        <div style={{ position: 'absolute', right: 38, bottom: -13, zIndex: 8 }}>
          <Tape color="rgba(167,215,225,.6)" width={126} height={23} rotate={4} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 158,
          bottom: 48,
          opacity: chapterFade * 0.85,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Sparkle size={17} color={C.yellowDeep} />
        <span style={{ fontFamily: F.hand, fontSize: 22, color: C.inkSoft, transform: 'rotate(-1deg)' }}>一张链接，就够了。</span>
      </div>
      <div style={{ position: 'absolute', right: 150, bottom: 48, opacity: chapterFade * 0.6, fontFamily: F.mono, fontSize: 9, letterSpacing: '.18em', color: C.inkMuted }}>
        P.02 / PARSED IN A FEW BEATS
      </div>
    </AbsoluteFill>
  );
};

const MusicLittleStaff: React.FC<{ frame: number }> = ({ frame }) => (
  <svg width="100%" height="100%" viewBox="0 0 1460 300" fill="none" preserveAspectRatio="none" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d={`M80 ${84 + i * 28}c210 -12 380 11 590 0s380 -12 620 -1`}
        stroke="rgba(45,52,54,.18)"
        strokeWidth="1"
        strokeDasharray={i === 2 ? '1 8' : undefined}
      />
    ))}
    {[
      { x: 550, y: 81, note: '♪' },
      { x: 1068, y: 138, note: '♫' },
    ].map((item, i) => (
      <g key={item.x} transform={`translate(${item.x} ${item.y + Math.sin((frame + i * 20) / 25) * 4})`}>
        <text fill="rgba(45,52,54,.24)" fontSize="66" fontFamily="MaShan"> {item.note}</text>
      </g>
    ))}
    <path d="M120 230c210-97 360 34 540-30s226 15 350-28 260-30 370 3" stroke="rgba(45,52,54,.12)" strokeWidth="1.3" strokeDasharray="5 8" />
  </svg>
);
