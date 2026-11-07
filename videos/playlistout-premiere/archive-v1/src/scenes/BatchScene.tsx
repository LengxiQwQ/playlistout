import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SCENES, cue } from '../theme';
import { easeInOut, easeOut } from '../anim';
import { ChapterMark, CheckDoodle, Sparkle, Squiggle, StarDoodle, Tape } from '../components/Doodles';
import { Badge, MiniCover, PaperSheet, StickerTag } from '../components/Paper';
import { BATCH_PLAYLISTS, BATCH_TOTAL, PLATFORMS } from '../data';

const rel = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.batch.in);
const L = {
  cards: rel('batch_cards'),
  select: rel('batch_select'),
  click: rel('batch_click'),
  workbook: rel('workbook'),
  zip: rel('zip'),
};

const outer = { left: 200, top: 126, width: 1520, height: 816 };

const HandCheckbox: React.FC<{ checked: number; frame: number }> = ({ checked, frame }) => (
  <div
    style={{
      width: 23,
      height: 23,
      border: `1.6px ${checked > 0.7 ? 'solid' : 'dashed'} rgba(45,52,54,${checked > 0.7 ? 0.72 : 0.4})`,
      borderRadius: 3,
      background: checked > 0.7 ? '#fffdf4' : 'rgba(255,255,255,.36)',
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      transform: `rotate(${-2 + checked}deg)`,
      boxShadow: checked > 0.7 ? '1.5px 1.5px 0 rgba(45,52,54,.14)' : 'none',
    }}
  >
    {checked > 0 ? <CheckDoodle size={16} color="#2f7047" progress={checked} /> : null}
  </div>
);

const CursorArrow: React.FC<{ x: number; y: number; scale?: number; opacity?: number }> = ({ x, y, scale = 1, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, zIndex: 80, opacity, transform: `scale(${scale}) rotate(-7deg)`, transformOrigin: 'top left', filter: 'drop-shadow(0 2px 1px rgba(45,52,54,.2))' }}>
    <svg width="30" height="36" viewBox="0 0 30 36" fill="none">
      <path d="M3 3 26 18.7l-10 2.2-5.2 11.4L3 3Z" fill="#fffdf4" stroke={C.ink} strokeWidth="2.3" strokeLinejoin="round" />
    </svg>
  </div>
);

const PlaylistRow: React.FC<{
  item: (typeof BATCH_PLAYLISTS)[number];
  index: number;
  frame: number;
  enter: number;
  selected: number;
  leaving: number;
}> = ({ item, index, frame, enter, selected, leaving }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        height: 117,
        marginBottom: 12,
        padding: '13px 15px',
        background: index === 0 ? 'rgba(252,246,224,.76)' : 'rgba(255,253,246,.62)',
        border: `1.4px ${index === 1 ? 'dashed' : 'solid'} rgba(45,52,54,${index === 1 ? 0.23 : 0.15})`,
        borderRadius: '4px 8px 5px 8px / 8px 4px 8px 5px',
        boxShadow: '2px 3px 0 rgba(45,52,54,.055)',
        transform: `translateX(${(1 - enter) * (index % 2 === 0 ? -26 : 26) + leaving * 40}px) translateY(${leaving * -18}px) rotate(${(1 - enter) * (index - 1) * 0.5 + leaving * (index - 1) * 0.9}deg) scale(${1 - leaving * 0.05})`,
        opacity: enter * (1 - leaving * 0.9),
        pointerEvents: 'none',
      }}
    >
      <HandCheckbox checked={selected} frame={frame} />
      <MiniCover tone={item.tone} deep={item.deep} motif={item.motif} size={72} rotate={-2 + index * 1.1} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, color: C.ink }}>{item.name}</span>
          {index === 0 ? <Badge tone={C.yellowLight} ink="#82621b">刚刚更新</Badge> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, fontFamily: F.sans, fontSize: 11.5, color: C.inkMuted }}>
          <span>{item.count} 首</span>
          <span>·</span>
          <span>{item.artist}</span>
          <span>·</span>
          <span>公开歌单</span>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
          {['QQ 音乐', '私人收藏', '可直接导出'].map((tag, i) => (
            <span key={tag} style={{ fontFamily: F.sans, fontSize: 8.5, color: i === 0 ? '#566a29' : C.inkSoft, background: i === 0 ? '#e9f1d5' : 'rgba(255,255,255,.5)', border: '1px solid rgba(45,52,54,.12)', padding: '2px 6px', borderRadius: 999 }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ width: 132, height: 5, background: 'rgba(45,52,54,.1)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, item.count / 1.4)}%`, height: '100%', background: item.deep, opacity: 0.62 }} />
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkMuted, letterSpacing: '.09em', marginTop: 7 }}>TRACKS / ARCHIVED</div>
        <div style={{ marginTop: 9, fontFamily: F.hand, fontSize: 18, color: selected > 0.7 ? '#3d7051' : C.inkMuted }}>{selected > 0.7 ? '✓ 已选' : '未选'}</div>
      </div>
      {index === 0 ? <div style={{ position: 'absolute', left: 56, bottom: -5, transform: 'rotate(-2deg)' }}><Tape color="rgba(255,220,130,.42)" width={44} height={12} rotate={1} /></div> : null}
    </div>
  );
};

const Workbook: React.FC<{ frame: number; enter: number; zipT: number }> = ({ frame, enter, zipT }) => {
  const tabs = ['【目录】歌单索引', '花谱 BEST', '鎖那 · 深夜散步', '日系女声私藏'];
  return (
    <div
      style={{
        position: 'absolute',
        left: 256,
        top: 218,
        width: 714,
        height: 566,
        opacity: enter * (1 - zipT * 0.2),
        transform: `translateY(${(1 - enter) * 46}px) rotate(${-1.4 + (1 - enter) * 3}deg) scale(${0.9 + enter * 0.1})`,
        zIndex: 40,
      }}
    >
      <div style={{ position: 'absolute', top: -15, left: 80, zIndex: 8 }}>
        <Tape color="rgba(157,216,188,.62)" width={150} height={28} rotate={-3} />
      </div>
      <PaperSheet tone="white" shadow="lifted" style={{ width: '100%', height: '100%', padding: 20, background: '#fffef9' }} radius="4px 9px 5px 10px / 8px 4px 10px 5px">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed rgba(45,52,54,.2)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, background: '#e5f0e2', border: '1px solid #aac6a0', display: 'grid', placeItems: 'center' }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: '#4b6f41' }}>XLSX</span>
            </div>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 17, fontWeight: 700 }}>多 Sheet 工作簿</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.inkMuted, marginTop: 2 }}>3 playlists + 1 index · 151 tracks</div>
            </div>
          </div>
          <StickerTag tone="#e7f3e5" ink="#376944" rotate={1} style={{ fontFamily: F.sans, fontSize: 10.5, padding: '4px 8px' }}>
            <CheckDoodle size={10} color="#376944" /> 打包完成
          </StickerTag>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 12, border: '1px solid rgba(45,52,54,.14)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: 150, background: 'rgba(236,242,230,.56)', borderRight: '1px solid rgba(45,52,54,.12)', padding: '10px 9px' }}>
            {[
              ['INDEX', '目录索引'],
              ['01', '花谱 BEST'],
              ['02', '鎖那 · 深夜散步'],
              ['03', '日系女声私藏'],
            ].map(([n, label], i) => (
              <div key={n} style={{ padding: '8px 8px', marginBottom: 4, borderRadius: 3, background: i === 0 ? '#dfeddc' : 'transparent', fontFamily: F.sans, fontSize: 9, color: i === 0 ? '#3f6848' : C.inkSoft }}>
                <span style={{ fontFamily: F.mono, marginRight: 7, fontSize: 8 }}>{n}</span>{label}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.sans, fontSize: 9, fontWeight: 700, color: C.inkMuted, padding: '4px 0 7px', borderBottom: '1px solid rgba(45,52,54,.12)' }}>
              <span>INDEX / 歌单索引</span><span>3 PLAYLISTS · 151 TRACKS</span>
            </div>
            {BATCH_PLAYLISTS.map((p, i) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 55px 65px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(45,52,54,.07)', fontFamily: F.sans, fontSize: 9.5 }}>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.inkMuted }}>0{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: C.inkMuted }}>{p.count} 首</span>
                <span style={{ color: '#3e7650', fontFamily: F.hand, fontSize: 16, textAlign: 'right' }}>✓ 已写入</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 15 }}>
              {tabs.map((tab, i) => (
                <div key={tab} style={{ padding: '5px 8px', background: i === 0 ? '#fffef9' : '#e9f0e3', border: '1px solid rgba(45,52,54,.15)', borderBottom: 'none', borderRadius: '3px 3px 0 0', fontFamily: F.sans, fontSize: 7.5, color: i === 0 ? C.ink : C.inkMuted, whiteSpace: 'nowrap', transform: i === 3 ? 'rotate(1deg)' : undefined }}>
                  {tab}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(45,52,54,.15)', height: 1 }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ fontFamily: F.hand, fontSize: 20, color: C.inkSoft, transform: 'rotate(-1deg)' }}>每一个歌单，都有自己的那张表。</div>
          <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkMuted, letterSpacing: '.12em' }}>DATE 2026.11.07 · SHEET 4 / 4</div>
        </div>
      </PaperSheet>
    </div>
  );
};

const ZipPackage: React.FC<{ frame: number; enter: number; zip: number }> = ({ frame, enter, zip }) => {
  const teeth = Array.from({ length: 17 }).map((_, i) => i);
  return (
    <div
      style={{
        position: 'absolute',
        left: 1000,
        top: 358,
        width: 514,
        height: 386,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 54}px) rotate(${2.1 + (1 - enter) * 2}deg) scale(${0.9 + enter * 0.1})`,
        zIndex: 42,
      }}
    >
      <div style={{ position: 'absolute', top: -14, right: 58, zIndex: 8 }}>
        <Tape color="rgba(255,196,168,.66)" width={130} height={27} rotate={4} />
      </div>
      <PaperSheet tone="cream" shadow="lifted" style={{ width: '100%', height: '100%', padding: 0, background: '#f2e3c8' }} radius="5px 8px 6px 7px / 8px 5px 7px 6px">
        <div style={{ position: 'absolute', left: 28, top: 24, right: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: 'rgba(90,67,36,.6)' }}>QQ MUSIC / PLAYLIST ARCHIVE</div>
          <div style={{ width: 27, height: 27, borderRadius: '50%', border: '1.2px solid rgba(90,67,36,.36)', display: 'grid', placeItems: 'center', fontFamily: F.hand, fontSize: 16, color: 'rgba(90,67,36,.7)' }}>♪</div>
        </div>
        <div style={{ position: 'absolute', left: 28, top: 62, width: 300 }}>
          <div style={{ fontFamily: F.display, fontSize: 34, color: '#4f3f29' }}>整本歌单簿</div>
          <div style={{ fontFamily: F.sans, fontSize: 10.5, color: 'rgba(80,60,34,.63)', marginTop: 2 }}>【QQ 音乐】琴心月满 · 共 3 个歌单 (XLSX) · 151 首</div>
        </div>
        <div style={{ position: 'absolute', right: 29, top: 72, width: 106, height: 80, border: '1.2px dashed rgba(92,66,34,.35)', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 8.5, color: 'rgba(92,66,34,.55)', transform: 'rotate(2deg)' }}>
          <div style={{ fontFamily: F.marker, fontSize: 23, color: 'rgba(92,66,34,.72)' }}>ZIP</div>
          <span>3 FILES · 151 TRACKS</span>
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 162, height: 1.5, borderTop: '2px dashed rgba(92,66,34,.27)' }} />
        <div style={{ position: 'absolute', left: 28, right: 28, top: 174, height: 55 }}>
          {BATCH_PLAYLISTS.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.sans, fontSize: 9, color: '#604a2c', marginBottom: 4, opacity: 0.7 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.deep }} />
              <span>{p.name} - {p.artist}.xlsx</span>
              <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 7.5, color: 'rgba(80,60,34,.48)' }}>{p.count} TRACKS</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, bottom: 36, height: 42 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 18, height: 2, background: 'rgba(88,64,34,.28)', borderTop: '1px dashed rgba(88,64,34,.38)' }} />
          {teeth.map((t) => (
            <div key={t} style={{ position: 'absolute', left: 2 + t * 27, top: 17, width: 9, height: 5, background: '#d5bf9d', border: '1px solid rgba(88,64,34,.24)', transform: 'rotate(3deg)' }} />
          ))}
          <div
            style={{
              position: 'absolute',
              left: zip * 400 - 8,
              top: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid rgba(88,64,34,.42)',
              background: '#e6d3b3',
              display: 'grid',
              placeItems: 'center',
              opacity: zip > 0 ? 1 : 0.4,
              transform: `rotate(${zip * 360}deg)`,
            }}
          >
            <div style={{ width: 2, height: 11, background: 'rgba(88,64,34,.6)' }} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: 30, bottom: 9, fontFamily: F.hand, fontSize: 20, color: 'rgba(80,60,34,.55)', transform: 'rotate(-1deg)' }}>把整本，收进一只信封。</div>
        <div style={{ position: 'absolute', right: 30, bottom: 11, fontFamily: F.mono, fontSize: 7.5, letterSpacing: '.1em', color: 'rgba(80,60,34,.45)' }}>ZIP / BATCH EXPORT</div>
      </PaperSheet>
    </div>
  );
};

export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 21, stiffness: 90, mass: 0.9 }, durationInFrames: 42 });
  const exit = easeInOut(frame, 226, 26, 0, 1);
  const outerOpacity = interpolate(frame, [0, 3, 232, 248], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cards = spring({ frame: frame - L.cards, fps, config: { damping: 18, stiffness: 100 }, durationInFrames: 46 });
  const selected = easeOut(frame, L.cards + 12, 26);
  const clickProgress = easeInOut(frame, L.click, 26, 0, 1);
  const workbookIn = spring({ frame: frame - L.workbook, fps, config: { damping: 18, stiffness: 90, mass: 0.9 }, durationInFrames: 42 });
  const zipIn = spring({ frame: frame - L.zip, fps, config: { damping: 17, stiffness: 100 }, durationInFrames: 40 });
  const zipClose = easeInOut(frame, L.zip + 8, 28, 0, 1);
  const focus = easeInOut(frame, L.click + 12, 50, 0, 1);
  const buttonPress = frame >= L.click - 2 && frame < L.click + 10;
  const cursorX = 1290 + clickProgress * 106;
  const cursorY = 632 + clickProgress * 18;
  const floating = Math.sin(frame / 24) * 1.6;

  return (
    <AbsoluteFill style={{ opacity: outerOpacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - enter) * 38 - exit * 22 + focus * 6}px) scale(${0.985 + enter * 0.015 - focus * 0.012 + exit * 0.012})`,
          transformOrigin: 'center center',
        }}
      >
        <ChapterMark
          number="03"
          kicker="BATCH / THE WHOLE LITTLE LIBRARY"
          title="一本歌单簿，也能一起带走。"
          compact
          style={{ position: 'absolute', left: 169, top: 56, opacity: easeOut(frame, 4, 20) }}
        />
        <div style={{ position: 'absolute', right: 166, top: 63, textAlign: 'right', fontFamily: F.hand, fontSize: 22, color: C.inkSoft, transform: 'rotate(1.4deg)' }}>
          多个歌单 · 多张工作表 · 一个压缩包
        </div>

        <div style={{ position: 'absolute', left: outer.left, top: outer.top, width: outer.width, height: outer.height, transform: `rotate(${0.2 + (1 - enter) * 0.7}deg)` }}>
          <PaperSheet
            tone="white"
            shadow="lifted"
            style={{ width: '100%', height: '100%', padding: '24px 30px', background: '#fffdf6' }}
            radius="4px 9px 5px 11px / 8px 4px 11px 5px"
          >
            <div style={{ position: 'absolute', top: -13, left: 92, zIndex: 8 }}>
              <Tape color="rgba(255,184,199,.66)" width={118} height={27} rotate={-3} style={{ marginLeft: 335 }} />
            </div>
            <div style={{ position: 'absolute', top: -9, right: 140, zIndex: 8 }}>
              <Tape color="rgba(160,211,222,.62)" width={118} height={24} rotate={4} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, borderBottom: '1px dashed rgba(45,52,54,.22)', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <StickerTag tone={C.yellow} ink="#7b5e1d" rotate={-1.4} style={{ fontFamily: F.sans, fontSize: 10, padding: '4px 9px' }}>
                    QQ 音乐 · 歌单收藏册
                  </StickerTag>
                  <span style={{ fontFamily: F.mono, fontSize: 8.5, color: C.inkMuted, letterSpacing: '.12em' }}>PUBLIC LIBRARY</span>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 41, lineHeight: 1.05, color: C.ink }}>琴心月满的公开歌单</div>
                <div style={{ display: 'flex', gap: 17, alignItems: 'center', marginTop: 8, fontFamily: F.sans, fontSize: 11.5, color: C.inkSoft }}>
                  <span>{BATCH_PLAYLISTS.length} 个歌单</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.inkMuted }} />
                  <span>{BATCH_TOTAL} 首歌曲</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.inkMuted }} />
                  <span>全部为公开歌单</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.inkMuted }} />
                  <span style={{ color: '#3f7651' }}>默认已全选</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'right', fontFamily: F.mono, fontSize: 8.5, color: C.inkMuted, lineHeight: 1.7 }}>
                  <div>SELECTED</div>
                  <div style={{ fontFamily: F.hand, fontSize: 25, color: C.ink, marginTop: 1 }}>3 / 3</div>
                </div>
                <StarDoodle frame={frame} size={26} color={C.yellowDeep} seed={6} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
              <div style={{ width: 902 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700 }}>选择要打包的歌单</div>
                  <div style={{ fontFamily: F.hand, fontSize: 18, color: C.inkMuted, transform: 'rotate(-1deg)' }}>勾选后，一起翻页 ♪</div>
                </div>
                {BATCH_PLAYLISTS.map((item, i) => {
                  const cardIn = easeOut(frame, L.cards + i * 6, 26);
                  const rowSelected = Math.min(1, Math.max(0, (selected - i * 0.1) * 1.22));
                  const leaving = easeInOut(frame, L.workbook + i * 3, 24, 0, 1);
                  return (
                    <PlaylistRow
                      key={item.id}
                      item={item}
                      index={i}
                      frame={frame}
                      enter={cardIn}
                      selected={rowSelected}
                      leaving={leaving}
                    />
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7, fontFamily: F.sans, fontSize: 10, color: C.inkMuted, opacity: cards }}>
                  <Sparkle size={13} color={C.pinkDeep} />
                  单次最多批量导出 50 个歌单；公开歌单无需登录，酷狗批量需登录。
                </div>
              </div>

              <div
                style={{
                  width: 542,
                  minHeight: 458,
                  background: 'rgba(248,250,245,.88)',
                  border: '1.6px solid rgba(45,52,54,.55)',
                  borderRadius: '5px 9px 5px 8px / 8px 5px 9px 5px',
                  boxShadow: '4px 4px 0 rgba(45,52,54,.13)',
                  padding: '20px 20px 17px',
                  transform: `rotate(${-0.8 + Math.sin(frame / 52) * 0.12}deg)`,
                  opacity: cards,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 27, height: 27, borderRadius: '50%', background: C.yellow, display: 'grid', placeItems: 'center', fontFamily: F.hand, fontSize: 17 }}>✦</div>
                  <div>
                    <div style={{ fontFamily: F.note, fontSize: 25, lineHeight: 1.1 }}>批量打包导出</div>
                    <div style={{ fontFamily: F.sans, fontSize: 9.5, color: C.inkMuted, marginTop: 2 }}>一次整理选中的 {BATCH_PLAYLISTS.length} 个歌单</div>
                  </div>
                </div>

                <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, letterSpacing: '.06em', marginTop: 16, marginBottom: 7 }}>打包方式</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: '多 Sheet Excel', active: true, tone: '#e1f0de', ink: '#42714b' },
                    { label: 'ZIP 包（XLSX）', active: false, tone: 'rgba(255,255,255,.7)', ink: C.inkSoft },
                  ].map((option) => (
                    <div
                      key={option.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 10px',
                        background: option.active ? option.tone : 'rgba(255,255,255,.54)',
                        border: option.active ? '1.4px solid #7ca578' : '1px dashed rgba(45,52,54,.28)',
                        borderRadius: 4,
                        fontFamily: F.sans,
                        fontSize: 11,
                        color: option.ink,
                        boxShadow: option.active ? '1.5px 1.5px 0 rgba(45,52,54,.12)' : 'none',
                      }}
                    >
                      <span style={{ width: 13, height: 13, borderRadius: '50%', border: option.active ? '4px solid #4f8957' : '1.2px solid #a6a59a', background: '#fffdf7', display: 'inline-block' }} />
                      {option.label}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 16 }}>
                  <div style={{ padding: '11px 12px', background: 'rgba(236,243,232,.7)', border: '1px solid rgba(81,121,87,.2)', borderRadius: 4 }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, color: '#4a7050', letterSpacing: '.11em' }}>OUTPUT A</div>
                    <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 700, marginTop: 4 }}>1 个工作簿</div>
                    <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, marginTop: 2 }}>目录 + 3 张歌单表</div>
                  </div>
                  <div style={{ padding: '11px 12px', background: 'rgba(250,240,219,.72)', border: '1px solid rgba(157,118,54,.19)', borderRadius: 4 }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, color: '#886c30', letterSpacing: '.11em' }}>OUTPUT B</div>
                    <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 700, marginTop: 4 }}>1 个 ZIP</div>
                    <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, marginTop: 2 }}>每个歌单一个文件</div>
                  </div>
                </div>

                <div style={{ marginTop: 17, height: 8, background: 'rgba(45,52,54,.09)', borderRadius: 9, overflow: 'hidden' }}>
                  <div style={{ width: `${clickProgress * 100}%`, height: '100%', background: 'linear-gradient(to right, #8dbb8b, #5e946d)', borderRadius: 9 }} />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    background: C.ink,
                    color: '#fffdf7',
                    padding: '13px 12px',
                    borderRadius: '3px 6px 4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    fontFamily: F.note,
                    fontSize: 23,
                    boxShadow: '4px 4px 0 rgba(45,52,54,.18)',
                    transform: `translate(${buttonPress ? 2 : 0}px, ${buttonPress ? 2 : 0}px) scale(${buttonPress ? 0.97 : 1})`,
                  }}
                >
                  {clickProgress > 0.1 ? '正在打包…' : `一键打包导出选中歌单 (${BATCH_PLAYLISTS.length})`}
                  {clickProgress > 0.1 ? <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', transform: `rotate(${frame * 15}deg)` }} /> : <span style={{ fontFamily: F.hand, fontSize: 25 }}>↓</span>}
                </div>
                <div style={{ textAlign: 'center', marginTop: 9, fontFamily: F.hand, fontSize: 17, color: C.inkMuted, transform: 'rotate(-1deg)' }}>
                  3 个歌单 · {BATCH_TOTAL} 首 · 一次整理 ♪
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', left: 36, bottom: 138, fontFamily: F.hand, fontSize: 28, color: C.inkSoft, transform: 'rotate(-1.3deg)', opacity: 0.8 }}>
              整本带走，不用一张张点。
            </div>

            {/* a little preview of the two packing outcomes, filling the lower page */}
            <div
              style={{
                position: 'absolute',
                left: 29,
                right: 29,
                bottom: 20,
                height: 98,
                borderTop: '1px dashed rgba(45,52,54,.22)',
                paddingTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: cards,
              }}
            >
              <div style={{ width: 154, flexShrink: 0 }}>
                <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '.13em', color: C.inkMuted }}>AFTER PACKING</div>
                <div style={{ fontFamily: F.note, fontSize: 21, color: C.ink, marginTop: 4, whiteSpace: 'nowrap' }}>打包后会得到</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, padding: '10px 12px', background: 'rgba(228,241,224,.6)', border: '1px solid rgba(91,130,85,.21)', borderRadius: 4, transform: 'rotate(-.4deg)' }}>
                  <div style={{ width: 33, height: 38, borderRadius: 3, background: '#e2f0dd', border: '1px solid #aac69e', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 7.5, color: '#4a7148' }}>XLSX</div>
                  <div>
                    <div style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700 }}>1 个工作簿</div>
                    <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, marginTop: 2 }}>目录 + 3 张歌单表</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, padding: '10px 12px', background: 'rgba(249,239,220,.62)', border: '1px solid rgba(151,117,61,.2)', borderRadius: 4, transform: 'rotate(.4deg)' }}>
                  <div style={{ width: 33, height: 38, borderRadius: 3, background: '#f2e5c8', border: '1px solid #c8ae7e', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 7.5, color: '#806431' }}>ZIP</div>
                  <div>
                    <div style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700 }}>1 个压缩包</div>
                    <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, marginTop: 2 }}>每个歌单一个文件</div>
                  </div>
                </div>
              </div>
              <div style={{ width: 185, flexShrink: 0, fontFamily: F.mono, fontSize: 8, color: C.inkMuted, letterSpacing: '.08em', lineHeight: 1.65 }}>
                MULTI-SHEET EXCEL<br />
                OR ZIP ARCHIVE<br />
                3 PLAYLISTS · {BATCH_TOTAL} TRACKS
              </div>
            </div>
          </PaperSheet>
        </div>

        {/* focus dim, then outputs */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(243,237,225,.82)', opacity: focus, zIndex: 25 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(65,58,43,.08)', opacity: focus, zIndex: 25 }} />
        <div
          style={{
            position: 'absolute',
            left: 192,
            top: 156,
            zIndex: 26,
            transform: `translateY(${(1 - focus) * 20}px)`,
            opacity: focus,
          }}
        >
          <StickerTag tone={C.yellowLight} ink={C.ink} rotate={-1.3} style={{ fontFamily: F.sans, fontSize: 11, padding: '6px 11px' }}>
            BATCH RESULT / 已选 3 个歌单
          </StickerTag>
        </div>
        {workbookIn > 0.01 ? <Workbook frame={frame} enter={workbookIn} zipT={zipClose} /> : null}
        {zipIn > 0.01 ? <ZipPackage frame={frame} enter={zipIn} zip={zipClose} /> : null}

        <div
          style={{
            position: 'absolute',
            left: 485,
            bottom: 45,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 17px',
            background: '#fffdf5',
            border: '1.4px solid rgba(45,52,54,.7)',
            borderRadius: 999,
            boxShadow: '3px 3px 0 rgba(45,52,54,.18)',
            fontFamily: F.sans,
            fontSize: 12,
            color: C.ink,
            opacity: easeOut(frame, L.zip + 4, 14) * (1 - exit),
            transform: `translateY(${(1 - easeOut(frame, L.zip + 4, 14)) * 14}px) rotate(-.5deg)`,
            zIndex: 60,
          }}
        >
          <span style={{ color: '#2d7b49' }}>✓</span> 已打包 3 个歌单 · {BATCH_TOTAL} 首 · 多 Sheet Excel + ZIP
        </div>

        <div style={{ position: 'absolute', left: 166, bottom: 48, fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: C.inkMuted, opacity: 0.7 }}>
          P.04 / THE WHOLE LIBRARY, FOLDED NEATLY
        </div>
        <div style={{ position: 'absolute', right: 166, top: 122, fontFamily: F.hand, fontSize: 22, color: C.inkSoft, transform: 'rotate(2deg)', opacity: 0.75 }}>
          整本打包，不用一张张点。
        </div>
      </div>
    </AbsoluteFill>
  );
};
