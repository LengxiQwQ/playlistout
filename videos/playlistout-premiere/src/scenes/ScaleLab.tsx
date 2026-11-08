import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import '../global.css';
import { C, F } from '../theme';
import { u, UI_SCALE } from '../scale';
import { Atmosphere, PaperBackground } from '../components/Background';
import { Sparkle, StarDoodle, Tape } from '../components/Doodles';
import { Badge, PaperSheet, StickerTag } from '../components/Paper';
import { NoteMascot } from '../components/NoteMascot';
import { PLATFORMS, PLAYLIST } from '../data';

export const UI = { left: 220, top: 180, width: 1480, height: 820 };
const CHROME = 64;
const HEADER_H = 74;
export const INNER_H = UI.height - CHROME - HEADER_H;

const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });

const waitForAssets = async () => {
  if (typeof document === 'undefined') return;
  await Promise.all(
    fontDefs.map(async (def) => {
      const face = new FontFace(def.family, `url(${def.url})`, { weight: def.weight, style: 'normal' });
      await face.load();
      document.fonts.add(face);
    }),
  );
  await Promise.all([
    document.fonts.ready.catch(() => undefined),
    loadImage(staticFile('textures/paper-grain.png')),
    loadImage(staticFile('textures/paper-creases.png')),
    loadImage(staticFile('textures/paper-fibre-page.png')),
    loadImage(staticFile('textures/paper-fibre-tile.png')),
  ]);
};

export const Chrome: React.FC = () => (
  <div
    style={{
      height: CHROME,
      background: 'linear-gradient(to bottom, #f7f1e2, #eee6d6)',
      borderBottom: '1px solid rgba(45,52,54,.14)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 20,
      position: 'relative',
      zIndex: 5,
    }}
  >
    <div style={{ display: 'flex', gap: 10, width: 86 }}>
      {['#e98f86', '#e5c263', '#89b58d'].map((color) => (
        <div
          key={color}
          style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: color,
            boxShadow: 'inset 0 0 0 .6px rgba(45,52,54,.22)',
          }}
        />
      ))}
    </div>
    <div
      style={{
        flex: 1,
        maxWidth: 760,
        height: 38,
        margin: '0 auto',
        background: 'rgba(255,253,247,.82)',
        border: '1px solid rgba(45,52,54,.16)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: F.mono,
        fontSize: u(11),
        color: '#6b6b61',
        boxShadow: 'inset 0 1px 2px rgba(80,60,30,.05)',
      }}
    >
      playlistout.lengxiqwq.com <span style={{ color: '#b0aa9b', marginLeft: 6 }}>· 本地生成</span>
    </div>
    <div style={{ width: 86, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
      <div style={{ width: 14, height: 14, border: '1.3px solid #908b7d', borderRadius: 2 }} />
      <div style={{ width: 14, height: 14, border: '1.3px solid #908b7d', borderRadius: '50%' }} />
    </div>
  </div>
);

export const SiteHeader: React.FC = () => (
  <div
    style={{
      height: HEADER_H,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 34px',
      borderBottom: '1px dashed rgba(45,52,54,.16)',
      background: 'rgba(250,246,236,.82)',
      position: 'relative',
      zIndex: 4,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: C.yellow,
          border: `2px solid ${C.ink}`,
          display: 'grid',
          placeItems: 'center',
          fontFamily: F.note,
          fontSize: u(16),
          transform: 'rotate(-3deg)',
          boxShadow: '3px 3px 0 rgba(45,52,54,.16)',
        }}
      >
        ♪
      </div>
      <div>
        <div style={{ fontFamily: F.marker, fontSize: u(18), lineHeight: 1, color: C.ink }}>Playlist Out</div>
        <div style={{ fontFamily: F.note, fontSize: u(11), color: C.inkSoft, marginTop: 3 }}>把你的歌单带走</div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      {['GitHub ↗', '下载桌面版', 'Aa'].map((label, i) => (
        <span
          key={label}
          style={{
            border: '1.2px solid rgba(45,52,54,.22)',
            borderRadius: 999,
            padding: `${u(4)}px ${u(8)}px`,
            fontSize: u(10),
            color: C.inkSoft,
            fontFamily: F.sans,
            background: i === 2 ? 'rgba(255,255,255,.4)' : 'transparent',
          }}
        >
          {label}
        </span>
      ))}
    </div>
  </div>
);

const PlatformRow: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: u(9), flexWrap: 'nowrap', marginTop: u(12) }}>
    <span style={{ fontFamily: F.sans, fontSize: u(12), color: C.inkSoft, marginRight: 3 }}>支持公开歌单</span>
    {PLATFORMS.map((p) => (
      <span
        key={p.id}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: F.sans,
          fontSize: u(12),
          color: p.ink,
          borderBottom: `2px solid ${p.ink}55`,
          paddingBottom: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.ink }} />
        {p.name}
      </span>
    ))}
    <span style={{ fontFamily: F.hand, fontSize: u(15), color: C.inkMuted, marginLeft: 'auto' }}>
      粘贴后按 Enter 也可以
    </span>
  </div>
);

export const InputView: React.FC = () => {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '26px 34px' }}>
      <div style={{ textAlign: 'center', marginTop: u(4) }}>
        <div style={{ fontFamily: F.display, fontSize: u(33), lineHeight: 1.03, color: C.ink }}>
          把你的歌单带走
        </div>
        <div style={{ width: u(210), height: 5, margin: '6px auto 0', background: C.yellowDeep, borderRadius: 6, transform: 'rotate(-1deg)' }} />
        <div style={{ fontFamily: F.hand, fontSize: u(14), color: C.inkSoft, marginTop: 7 }}>
          Playlist Out · 为备份与导出而生的手账音乐日记
        </div>
      </div>

      <div style={{ position: 'absolute', left: 50, right: 50, top: 215 }}>
        <PaperSheet
          tone="yellow"
          shadow="paper"
          radius="6px 12px 7px 13px / 11px 6px 13px 7px"
          style={{ padding: `${u(17)}px ${u(26)}px` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: u(10) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: F.note, fontSize: u(22), color: C.ink }}>在这里粘贴歌单链接</span>
              <span style={{ fontFamily: F.hand, fontSize: u(20), color: C.marginRed, transform: 'rotate(5deg)' }}>↓</span>
            </div>
            <StickerTag
              tone="rgba(255,255,255,.52)"
              rotate={1.4}
              style={{ fontSize: u(11), fontFamily: F.sans, padding: `${u(4)}px ${u(8)}px` }}
            >
              提供公开歌单解析
            </StickerTag>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                height: 78,
                background: 'rgba(255,253,246,.84)',
                border: '2px solid #2d3436',
                borderRadius: 6,
                boxShadow: '3px 3px 0 rgba(45,52,54,.12)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: 12,
                fontFamily: F.mono,
                fontSize: u(16),
                color: C.ink,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: u(18), color: '#73736a' }}>↗</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{PLAYLIST.sourceUrl}</span>
            </div>
            <div
              style={{
                width: 176,
                height: 70,
                background: C.ink,
                color: C.paperWhite,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: F.note,
                fontSize: u(20),
                borderRadius: '4px 8px 5px 8px / 7px 5px 8px 5px',
                boxShadow: '4px 4px 0 rgba(45,52,54,.2)',
              }}
            >
              解析 →
            </div>
          </div>
          <PlatformRow />
        </PaperSheet>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 34,
          bottom: 30,
          fontFamily: F.hand,
          fontSize: u(13),
          color: C.inkMuted,
          transform: 'rotate(-1.5deg)',
        }}
      >
        一张链接，就够了。
      </div>
    </div>
  );
};

export const ResultView: React.FC = () => {
  const rows = PLAYLIST.tracks.slice(0, 6);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '22px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: u(16) }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 8,
            background: C.yellow,
            border: `2px solid ${C.ink}`,
            display: 'grid',
            placeItems: 'center',
            fontFamily: F.note,
            fontSize: u(24),
            transform: 'rotate(-2deg)',
            boxShadow: '3px 3px 0 rgba(45,52,54,.15)',
          }}
        >
          花
        </div>
        <div>
          <Badge style={{ fontSize: u(10), padding: `${u(3)}px ${u(7)}px` }} tone={C.pink} ink="#8c3c4a">
            QQ 音乐 · 公开歌单
          </Badge>
          <div style={{ fontFamily: F.display, fontSize: u(27), color: C.ink, lineHeight: 1.08, marginTop: 5 }}>
            {PLAYLIST.name}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: u(12), color: C.inkSoft, marginTop: 5 }}>
            作者 {PLAYLIST.creator} · {PLAYLIST.trackCount} 首 · {PLAYLIST.duration}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: u(18), paddingRight: 12 }}>
          {[
            ['TRACKS', `${PLAYLIST.trackCount} 首`],
            ['DURATION', PLAYLIST.duration],
            ['STATUS', PLAYLIST.status],
          ].map(([label, value]) => (
            <div key={label} style={{ borderLeft: '1px dashed rgba(45,52,54,.2)', paddingLeft: 12 }}>
              <div style={{ fontFamily: F.mono, fontSize: u(10), color: C.inkMuted, letterSpacing: '.08em' }}>{label}</div>
              <div style={{ fontFamily: F.sans, fontSize: u(17), fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: u(13), borderTop: '1px dashed rgba(45,52,54,.24)', borderBottom: '1px dashed rgba(45,52,54,.24)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '42px 1.65fr 1fr 1.25fr .8fr .55fr', gap: 10, padding: `${u(7)}px 10px`, fontFamily: F.mono, fontSize: u(10), color: C.inkMuted, letterSpacing: '.08em' }}>
          <span>#</span><span>TITLE</span><span>ARTIST</span><span>ALBUM</span><span>STATUS</span><span>TIME</span>
        </div>
        {rows.map((track) => (
          <div
            key={track.index}
            style={{
              display: 'grid',
              gridTemplateColumns: '42px 1.65fr 1fr 1.25fr .8fr .55fr',
              gap: 10,
              alignItems: 'center',
              minHeight: 50,
              padding: '0 10px',
              borderTop: '1px solid rgba(45,52,54,.08)',
              fontFamily: F.sans,
              fontSize: u(15),
              color: C.ink,
            }}
          >
            <span style={{ fontFamily: F.mono, fontSize: u(10), color: C.inkMuted }}>{String(track.index).padStart(2, '0')}</span>
            <span style={{ fontWeight: 600 }}>{track.title}</span>
            <span style={{ color: C.inkSoft }}>{track.artist}</span>
            <span style={{ color: C.inkSoft }}>{track.album}</span>
            <span style={{ color: track.vip ? C.marginRed : '#47785a', fontSize: u(12) }}>{track.status}</span>
            <span style={{ fontFamily: F.mono, fontSize: u(11), color: C.inkMuted }}>{track.duration}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: u(14) }}>
        <span style={{ fontFamily: F.note, fontSize: u(16), color: C.ink }}>挑一种方式带走</span>
        {['Excel', 'JSON', 'CSV', 'TXT', 'M3U8'].map((label, i) => (
          <span
            key={label}
            style={{
              fontFamily: F.mono,
              fontSize: u(10),
              padding: `${u(5)}px ${u(9)}px`,
              background: i === 0 ? C.mint : 'rgba(255,255,255,.5)',
              border: i === 0 ? '1.4px solid #6ca477' : '1px dashed rgba(45,52,54,.28)',
              borderRadius: 4,
              color: i === 0 ? '#3d6b49' : C.inkSoft,
            }}
          >
            {label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', background: C.ink, color: C.paperWhite, fontFamily: F.note, fontSize: u(15), padding: `${u(9)}px ${u(16)}px`, borderRadius: 5, boxShadow: '3px 3px 0 rgba(45,52,54,.18)' }}>
          导出 (Excel) ↓
        </span>
      </div>
    </div>
  );
};

/**
 * A scale-only visual lab. It is deliberately separate from the film so the
 * user can approve the size before the whole 58 s timeline is rebuilt.
 */
export const ScaleLab: React.FC = () => {
  const frame = useCurrentFrame();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading scale lab fonts and paper'));
  const result = interpolate(frame, [84, 96], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bob = Math.sin((frame / 30) * Math.PI * 4) * 2;

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 15000));
    Promise.race([waitForAssets(), timeout]).finally(() => {
      if (cancelled) return;
      continueRender(handle);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!ready) {
    return <AbsoluteFill style={{ background: C.paper }} />;
  }

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <PaperBackground />

      <div style={{ position: 'absolute', left: 173, top: 52, display: 'flex', alignItems: 'center', gap: 15 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50% 44% 47% 40%',
            border: `1.8px solid ${C.ink}`,
            display: 'grid',
            placeItems: 'center',
            fontFamily: F.note,
            fontSize: 22,
            transform: 'rotate(-4deg)',
          }}
        >
          ♪
        </div>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: '.18em', color: C.inkMuted, marginBottom: 3 }}>
            SINGLE PLAYLIST · SCALE LAB 1.75×
          </div>
          <div style={{ fontFamily: F.display, fontSize: 30, lineHeight: 1.1, color: C.ink }}>
            粘贴，解析，收好。
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 188,
          top: 60,
          textAlign: 'right',
          fontFamily: F.hand,
          fontSize: 25,
          color: C.inkSoft,
          transform: 'rotate(1deg)',
        }}
      >
        手机横屏 · UI 1.75× 样张
        <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted, letterSpacing: '.16em', marginTop: 4 }}>
          UI_SCALE / {UI_SCALE.toFixed(2)}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: UI.left,
          top: UI.top,
          width: UI.width,
          height: UI.height,
          zIndex: 10,
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="paper"
          radius="7px 14px 8px 15px / 13px 7px 15px 8px"
          style={{ width: '100%', height: '100%', padding: 0, background: '#f8f3e7' }}
        >
          <Chrome />
          <SiteHeader />
          <div style={{ position: 'relative', height: INNER_H, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - result }}>
              <InputView />
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: result }}>
              <ResultView />
            </div>
          </div>
        </PaperSheet>
        <div style={{ position: 'absolute', left: 30, top: -13, zIndex: 15 }}>
          <Tape color="rgba(250,201,173,.68)" width={168} height={26} rotate={-4} />
        </div>
        <div style={{ position: 'absolute', right: 36, bottom: -13, zIndex: 15 }}>
          <Tape color="rgba(167,215,225,.6)" width={126} height={24} rotate={4} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 1710,
          top: 430 + bob,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <NoteMascot size={190} rotation={-2} expression="happy" pose="wave" backdrop />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 158,
          bottom: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          fontFamily: F.hand,
          fontSize: 26,
          color: C.inkSoft,
          transform: 'rotate(-1deg)',
        }}
      >
        <Sparkle size={18} color={C.yellowDeep} />
        大字不是拉大，是让整个 UI 换一套逻辑分辨率。
      </div>
      <div
        style={{
          position: 'absolute',
          right: 150,
          bottom: 47,
          fontFamily: F.mono,
          fontSize: 14,
          letterSpacing: '.14em',
          color: C.inkMuted,
        }}
      >
        SCALE LAB · 1920 × 1080
      </div>
      <div style={{ position: 'absolute', left: 186, bottom: 132, transform: 'rotate(-4deg)', opacity: 0.72 }}>
        <StarDoodle frame={frame} size={24} color={C.yellowDeep} seed={31} />
      </div>

      <Atmosphere />
    </AbsoluteFill>
  );
};
