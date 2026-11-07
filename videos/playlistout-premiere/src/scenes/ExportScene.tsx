import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SCENES, cue, s } from '../theme';
import { easeInOut, easeOut, seeded } from '../anim';
import { ChapterMark, CheckDoodle, Sparkle, Squiggle, StarDoodle, Tape, Underline } from '../components/Doodles';
import { Badge, FormatGlyph, PaperSheet, StickerTag } from '../components/Paper';
import { FORMATS, PLAYLIST } from '../data';

const rel = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.export.in);

const L = {
  fan: rel('files_fan'),
  excel: rel('excel'),
  json: rel('json'),
  more: rel('more_formats'),
  stamp: rel('export_stamp'),
};

const folder = { left: 666, top: 210, width: 1016, height: 658 };
const excelBox = { left: 706, top: 278, width: 510, height: 520 };
const jsonBox = { left: 1218, top: 314, width: 470, height: 480 };

const RoundStamp: React.FC<{ text: string; sub: string; value: string; size?: number; color?: string; }> = ({
  text,
  sub,
  value,
  size = 86,
  color = C.marginRed,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `2.4px solid ${color}`,
      boxShadow: `inset 0 0 0 3px rgba(255,250,238,.6), inset 0 0 0 4px ${color}55`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color,
      background: 'rgba(255,250,239,.72)',
      fontFamily: F.marker,
      lineHeight: 0.95,
      transform: 'rotate(-9deg)',
    }}
  >
    <span style={{ fontSize: 8, letterSpacing: '.15em', fontFamily: F.mono }}>{text}</span>
    <span style={{ fontSize: size * 0.33, marginTop: 2 }}>{value}</span>
    <span style={{ fontSize: 8, letterSpacing: '.07em', fontFamily: F.sans, marginTop: 2 }}>{sub}</span>
  </div>
);

const ExcelPreview: React.FC<{ frame: number; open: number; cardW: number }> = ({ frame, open, cardW }) => {
  const headers = ['#', 'TITLE', 'ARTIST', 'ALBUM', 'TIME'];
  const colWidths = ['8%', '31%', '20%', '28%', '13%'];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#e8f4ea', border: '1px solid #b9d8c0', borderRadius: 4, padding: '4px 8px', fontFamily: F.sans, fontSize: 9.5, color: '#366a48', whiteSpace: 'nowrap' }}>
          <CheckDoodle size={10} color="#366a48" /> Tracks
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, whiteSpace: 'nowrap' }}>Playlist Info</div>
        <div style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 8.5, color: C.inkMuted, letterSpacing: '.05em' }}>TRACKS!A1:E8</div>
      </div>
      <div style={{ border: '1px solid rgba(45,52,54,.25)', borderRadius: 3, overflow: 'hidden', background: '#fffefa' }}>
        <div style={{ display: 'grid', gridTemplateColumns: colWidths.join(' '), background: '#e2efd9', borderBottom: '1px solid #b8cbaa' }}>
          {headers.map((header, i) => (
            <div key={header} style={{ padding: '5px 6px', fontFamily: F.mono, fontSize: 7.2, color: '#4e6840', borderRight: i < 4 ? '1px solid rgba(80,105,65,.18)' : undefined, whiteSpace: 'nowrap' }}>{header}</div>
          ))}
        </div>
        {PLAYLIST.tracks.slice(0, 7).map((track, r) => {
          const reveal = easeOut(frame, L.excel + 6 + r * 4, 20);
          return (
            <div
              key={track.index}
              style={{
                display: 'grid',
                gridTemplateColumns: colWidths.join(' '),
                background: r % 2 === 0 ? 'rgba(238,243,232,.45)' : '#fffefa',
                borderBottom: '1px solid rgba(45,52,54,.07)',
                opacity: reveal,
                transform: `translateY(${(1 - reveal) * 7}px)`,
              }}
            >
              {[String(track.index).padStart(2, '0'), track.title, track.artist, track.album, track.duration].map((value, i) => (
                <div key={i} style={{ padding: '4px 6px', fontFamily: i === 0 || i === 4 ? F.mono : F.sans, fontSize: i === 0 || i === 4 ? 7.5 : 8.5, color: i === 0 || i === 4 ? C.inkMuted : C.ink, borderRight: i < 4 ? '1px solid rgba(45,52,54,.06)' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              ))}
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', fontFamily: F.mono, fontSize: 7, color: C.inkMuted }}>
          <span>97 more rows…</span><span>sheet 1 / 2</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9, fontFamily: F.sans, fontSize: 9, color: C.inkSoft }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckDoodle size={9} /> 原始顺序</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckDoodle size={9} /> 状态 / VIP</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckDoodle size={9} /> 双工作表</span>
      </div>
    </div>
  );
};

const codeLines = [
  { text: '{', color: C.ink },
  { text: '  "name": "花谱、鎖那、鹿乃、春猿火",', color: C.ink },
  { text: '  "platform": "qqmusic",', color: C.ink },
  { text: '  "trackCount": 104,', color: C.ink },
  { text: '  "tracks": [', color: C.ink },
  { text: '    {', color: C.inkSoft },
  { text: '      "title": "不可解",', color: C.ink },
  { text: '      "artist": "花譜",', color: C.ink },
  { text: '      "status": "vip"', color: C.ink },
  { text: '    },', color: C.inkSoft },
  { text: '    // … 103 more', color: '#8a9b8a' },
  { text: '  ]', color: C.ink },
  { text: '}', color: C.ink },
];

const JsonPreview: React.FC<{ frame: number; open: number; cardW: number }> = ({ frame, open }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#e7f0f4', border: '1px solid #b3ccd7', borderRadius: 4, padding: '4px 8px', fontFamily: F.sans, fontSize: 9.5, color: '#315e6b', whiteSpace: 'nowrap' }}>
        <CheckDoodle size={10} color="#315e6b" /> Canonical JSON
      </div>
      <div style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 8, color: C.inkMuted }}>schema v1</div>
    </div>
    <div style={{ background: 'rgba(238,247,249,.76)', border: '1px solid rgba(45,52,54,.16)', borderRadius: 4, padding: '10px 10px 8px', minHeight: 326 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d8a7a1' }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#dcc384' }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a9c6a1' }} />
      </div>
      {codeLines.map((line, i) => {
        const reveal = easeOut(frame, L.json + i * 2.3, 18);
        return (
          <div
            key={i}
            style={{
              fontFamily: F.mono,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: line.color === C.ink && line.text.includes('"') ? '#48646b' : line.color,
              opacity: reveal,
              transform: `translateX(${(1 - reveal) * 8}px)`,
              whiteSpace: 'pre',
              letterSpacing: '-.025em',
            }}
          >
            {line.text.split('"').map((part, index) => index % 2 === 1 ? <span key={index} style={{ color: '#b0655c' }}>"{part}"</span> : <span key={index}>{part}</span>)}
          </div>
        );
      })}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: F.sans, fontSize: 9, color: C.inkSoft }}>
      <span>给播放器、程序、脚本</span>
      <span style={{ fontFamily: F.hand, fontSize: 16, color: C.inkMuted, transform: 'rotate(-1deg)' }}>一套字段，通行 ♪</span>
    </div>
  </div>
);

const FileCard: React.FC<{
  children: React.ReactNode;
  tone: string;
  ink: string;
  title: string;
  ext: string;
  file: string;
  glyph: 'xlsx' | 'json';
  style: React.CSSProperties;
  frame: number;
  tabIndex: number;
  fanProgress: number;
}> = ({ children, tone, ink, title, ext, file, glyph, style, frame, tabIndex, fanProgress }) => (
  <div style={{ position: 'absolute', ...style }}>
    <div style={{ position: 'absolute', top: -12, left: 88, zIndex: 10 }}>
      <Tape color={glyph === 'xlsx' ? 'rgba(148,216,190,.64)' : 'rgba(158,210,229,.62)'} width={116} height={25} rotate={glyph === 'xlsx' ? -2 : 2} />
    </div>
    <PaperSheet
      tone="white"
      shadow="lifted"
      style={{
        width: '100%',
        height: '100%',
        padding: '14px 16px 14px',
        background: '#fffef8',
        transform: `rotate(${glyph === 'xlsx' ? -1.2 : 1.2}deg)`,
      }}
      radius="4px 8px 5px 9px / 8px 4px 9px 5px"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 9, borderBottom: '1px solid rgba(45,52,54,.13)' }}>
        <div style={{ width: 37, height: 37, background: tone, border: `1px solid ${ink}55`, borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <FormatGlyph icon={glyph === 'xlsx' ? 'grid' : 'braces'} size={27} color={ink} accent={ink} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15.5, color: C.ink, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {title}
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkMuted, fontWeight: 400 }}>{ext}</span>
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{file}</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.2px solid rgba(45,52,54,.2)', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 8, color: C.inkMuted, transform: 'rotate(6deg)' }}>LOCAL</div>
      </div>
      <div style={{ marginTop: 10 }}>
        {children}
      </div>
      <div style={{ position: 'absolute', bottom: 7, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 6.8, color: 'rgba(45,52,54,.4)', letterSpacing: '.06em' }}>
        <span>PLAYLIST OUT · EXPORT</span>
        <span>NO AUDIO · DATA ONLY</span>
      </div>
    </PaperSheet>
  </div>
);

export const ExportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 92, mass: 0.85 }, durationInFrames: 40 });
  const exit = easeInOut(frame, 210, 34, 0, 1);
  const outerOpacity = interpolate(frame, [0, 1, 232, 234], [1, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fanSpring = spring({ frame: frame - L.fan, fps, config: { damping: 17, stiffness: 100, mass: 0.9 }, durationInFrames: 50 });
  const fan = Math.max(0, fanSpring);
  const excelOpen = spring({ frame: frame - L.excel, fps, config: { damping: 19, stiffness: 90 }, durationInFrames: 38 });
  const jsonOpen = spring({ frame: frame - L.json, fps, config: { damping: 19, stiffness: 90 }, durationInFrames: 38 });
  const moreIn = spring({ frame: frame - L.more, fps, config: { damping: 15, stiffness: 130, mass: 0.7 }, durationInFrames: 34 });
  const stampIn = spring({ frame: frame - L.stamp, fps, config: { damping: 13, stiffness: 140, mass: 0.6 }, durationInFrames: 28 });
  const toastIn = spring({ frame: frame - L.stamp - 5, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: 28 });
  const sceneRotate = (1 - enter) * 1.2 + Math.sin(frame / 150) * 0.08 - exit * 0.4;
  const thumbnails = (() => {
    const base = { left: 870, top: 390, rotate: -7, scale: 0.86 };
    return base;
  })();

  return (
    <AbsoluteFill style={{ opacity: outerOpacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - enter) * 24 - exit * 18}px) rotate(${sceneRotate}deg) scale(${0.985 + enter * 0.015 + exit * 0.012})`,
          transformOrigin: 'center center',
        }}
      >
        <ChapterMark
          number="02"
          kicker="EXPORT / STRAIGHT FROM THE BROWSER"
          title="让歌单，变成可以带走的文件。"
          compact
          style={{ position: 'absolute', left: 169, top: 58, opacity: interpolate(frame, [2, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}
        />

        <div style={{ position: 'absolute', left: 162, top: 196, width: 520 }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 68,
              lineHeight: 1.06,
              color: C.ink,
              opacity: easeOut(frame, 6, 25),
              transform: `translateY(${(1 - easeOut(frame, 6, 25)) * 16}px)`,
              letterSpacing: '-.005em',
            }}
          >
            一张歌单，
            <br />
            <div style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>五种打开方式。</span>
              <div style={{ position: 'absolute', left: -5, right: -8, bottom: 2, height: '0.52em', background: 'rgba(255,226,121,.58)', borderRadius: '40% 55% 42% 58%', zIndex: 0, transform: `rotate(-1deg) scaleX(${easeOut(frame, 30, 28)})`, transformOrigin: 'left center' }} />
            </div>
          </div>
          <div style={{ marginTop: 20, fontFamily: F.hand, fontSize: 27, lineHeight: 1.4, color: C.inkSoft, maxWidth: 470, opacity: easeOut(frame, 22, 26), transform: `translateY(${(1 - easeOut(frame, 22, 26)) * 10}px)` }}>
            Excel 归档、JSON 给程序、TXT 给未来的自己。
            <br />
            每一条曲目，都能落在自己的纸上。
          </div>
          <div style={{ width: 260, marginTop: -1, marginLeft: -4 }}>
            <Squiggle width={260} color={C.yellowDeep} progress={easeOut(frame, 32, 26)} strokeWidth={5} />
          </div>

          <div style={{ marginTop: 27, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              '文件在浏览器里生成，不走服务器',
              '104 首 / 顺序 / VIP / 时长 都在',
              '单选或多选，一次下载',
            ].map((line, i) => (
              <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: easeOut(frame, 46 + i * 6, 20), transform: `translateX(${(1 - easeOut(frame, 46 + i * 6, 20)) * -10}px)` }}>
                <span style={{ width: 16, height: 16, border: '1px solid rgba(45,52,54,.35)', borderRadius: 3, background: 'rgba(255,255,255,.4)', display: 'grid', placeItems: 'center' }}>
                  <CheckDoodle size={12} color="#3e7650" progress={easeOut(frame, 50 + i * 6, 18)} />
                </span>
                <span style={{ fontFamily: F.sans, fontSize: 13, color: C.inkSoft }}>{line}</span>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', left: 4, top: 574, transform: 'rotate(-2deg)', width: 380, padding: '11px 14px', border: '1px dashed rgba(45,52,54,.24)', borderRadius: 5, background: 'rgba(255,253,246,.38)' }}>
            <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '.15em', color: C.inkMuted }}>THE LITTLE PRINT</div>
            <div style={{ marginTop: 4, fontFamily: F.sans, fontSize: 10, lineHeight: 1.55, color: C.inkSoft }}>
              界面开放 5 种格式 · 源码内置 Markdown 导出器<br />
              只导出歌单数据，不下载音频
            </div>
          </div>
        </div>

        {/* folder mat */}
        <div
          style={{
            position: 'absolute',
            left: folder.left - 8 + (1 - enter) * 24,
            top: folder.top - 8 + (1 - enter) * 16,
            width: folder.width + 16,
            height: folder.height + 16,
            transform: 'rotate(-1.4deg)',
            opacity: interpolate(enter, [0, 1], [0, 1]),
          }}
        >
          <div style={{ position: 'absolute', left: 20, top: -24, width: 314, height: 48, background: '#e7d1a9', border: '1.4px solid rgba(132,102,61,.28)', borderRadius: '6px 9px 0 0', transform: 'rotate(-.4deg)', boxShadow: '0 -4px 10px rgba(70,50,20,.04)' }} />
          <PaperSheet
            tone="peach"
            shadow="lifted"
            style={{ width: '100%', height: '100%', background: '#ecdbb9', padding: 0 }}
            radius="4px 9px 5px 6px / 5px 4px 6px 5px"
          >
            <div style={{ position: 'absolute', left: 29, top: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: '.17em', color: 'rgba(83,64,37,.62)' }}>EXPORTS / ONE LITTLE PLAYLIST / 2026</div>
            <div style={{ position: 'absolute', right: 32, top: 19, transform: 'rotate(2deg)' }}>
              <StickerTag tone="rgba(255,249,233,.68)" rotate={0} style={{ fontSize: 11, fontFamily: F.sans, padding: '3px 8px', borderColor: 'rgba(83,64,37,.35)' }}>
                全部本地生成
              </StickerTag>
            </div>
            <div style={{ position: 'absolute', left: 28, right: 30, top: 42, height: 1, background: 'rgba(97,74,42,.16)' }} />
            <div style={{ position: 'absolute', left: 34, bottom: 23, fontFamily: F.hand, fontSize: 23, color: 'rgba(83,64,37,.62)', transform: 'rotate(-1deg)' }}>
              这些纸，都是你的。
            </div>
            <div style={{ position: 'absolute', right: 34, bottom: 21, fontFamily: F.mono, fontSize: 8, color: 'rgba(83,64,37,.52)', letterSpacing: '.12em' }}>
              NO CLOUD · NO ACCOUNT
            </div>
          </PaperSheet>
        </div>

        {/* initial stack: the track rows become paper files */}
        {[
          { x: 0, y: 0, r: -6, w: 500, h: 470, z: 3 },
          { x: 33, y: 18, r: 3, w: 490, h: 460, z: 4 },
          { x: 68, y: 8, r: -3, w: 510, h: 470, z: 5 },
        ].map((stack, i) => {
          const pop = spring({ frame: frame - (i * 2), fps, config: { damping: 16, stiffness: 90 }, durationInFrames: 36 });
          const fade = 1 - easeInOut(frame, L.fan + 10, 18, 0, 1);
          if (fade <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 850 + stack.x,
                top: 320 + stack.y,
                width: stack.w,
                height: stack.h,
                zIndex: stack.z,
                opacity: fade * pop,
                transform: `translateY(${(1 - pop) * 36}px) rotate(${stack.r + Math.sin(frame / 36 + i) * 0.4}deg) scale(${0.92 + pop * 0.08})`,
              }}
            >
              <PaperSheet tone="white" shadow="paper" style={{ width: '100%', height: '100%', padding: 18, background: '#fffdf7' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(45,52,54,.12)', paddingBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 4, background: i === 2 ? C.mint : i === 1 ? C.blue : C.yellowLight, display: 'grid', placeItems: 'center' }}>
                    <span style={{ fontFamily: F.mono, fontSize: 14, color: C.inkSoft }}>{i === 2 ? 'XLSX' : i === 1 ? 'JSON' : 'CSV'}</span>
                  </div>
                  <div style={{ height: 8, width: 160, background: 'rgba(45,52,54,.12)', borderRadius: 4 }} />
                  <div style={{ marginLeft: 'auto', height: 8, width: 48, background: 'rgba(45,52,54,.08)', borderRadius: 4 }} />
                </div>
                {Array.from({ length: 6 }).map((_, row) => (
                  <div key={row} style={{ display: 'flex', gap: 11, padding: '10px 0', borderBottom: '1px solid rgba(45,52,54,.06)', opacity: 0.39 }}>
                    <div style={{ width: 16, height: 6, background: 'rgba(45,52,54,.12)', borderRadius: 4 }} />
                    <div style={{ width: `${110 + (row % 3) * 34}px`, height: 7, background: 'rgba(45,52,54,.13)', borderRadius: 4 }} />
                    <div style={{ width: 70, height: 7, background: 'rgba(45,52,54,.08)', borderRadius: 4 }} />
                  </div>
                ))}
              </PaperSheet>
            </div>
          );
        })}

        {/* Excel is the first door */}
        <div
          style={{
            position: 'absolute',
            left: excelBox.left,
            top: excelBox.top + (1 - fan) * (280 - excelBox.top) + Math.sin(frame / 90) * 2,
            width: excelBox.width,
            height: excelBox.height,
            zIndex: 20,
            opacity: frame < L.fan ? 0 : 1,
            transform: `translate(${(1 - fan) * 360}px, ${(1 - fan) * 120}px) rotate(${-2.3 + (1 - fan) * 8 + excelOpen * 0.4}deg) scale(${0.82 + fan * 0.18 + excelOpen * 0.03})`,
            transformOrigin: 'center top',
          }}
        >
          <FileCard
            tone={C.mint}
            ink="#477358"
            title="Excel 工作簿"
            ext=".xlsx"
            file={PLAYLIST.filename}
            glyph="xlsx"
            style={{ position: 'relative', width: '100%', height: '100%' }}
            frame={frame}
            tabIndex={0}
            fanProgress={fan}
          >
            <ExcelPreview frame={frame} open={excelOpen} cardW={excelBox.width} />
          </FileCard>
          <div style={{ position: 'absolute', top: 65, right: -22, transform: `rotate(8deg) scale(${0.6 + stampIn * 0.4})`, opacity: stampIn, zIndex: 20 }}>
            <RoundStamp text="LOCAL" sub="表格归档" value="XLSX" size={78} color="#3f7651" />
          </div>
        </div>

        {/* JSON is the second door */}
        <div
          style={{
            position: 'absolute',
            left: jsonBox.left,
            top: jsonBox.top + (1 - fan) * (240 - jsonBox.top) + Math.sin(frame / 80 + 2) * 2,
            width: jsonBox.width,
            height: jsonBox.height,
            zIndex: 22,
            opacity: frame < L.fan ? 0 : 1,
            transform: `translate(${(1 - fan) * -330}px, ${(1 - fan) * 130}px) rotate(${2.2 - (1 - fan) * 7 - jsonOpen * 0.3}deg) scale(${0.82 + fan * 0.18 + jsonOpen * 0.035})`,
            transformOrigin: 'center top',
          }}
        >
          <FileCard
            tone={C.blue}
            ink="#3d6875"
            title="Canonical JSON"
            ext=".json"
            file="【QQ 音乐】花谱、鎖那、鹿乃、春猿火 - 琴心月满.json"
            glyph="json"
            style={{ position: 'relative', width: '100%', height: '100%' }}
            frame={frame}
            tabIndex={1}
            fanProgress={fan}
          >
            <JsonPreview frame={frame} open={jsonOpen} cardW={jsonBox.width} />
          </FileCard>
          <div style={{ position: 'absolute', bottom: -16, left: 26, transform: `rotate(-4deg) scale(${moreIn})`, opacity: moreIn, zIndex: 24 }}>
            <StickerTag tone={C.pink} ink="#8e4e5a" rotate={0} style={{ fontFamily: F.sans, fontSize: 11, padding: '5px 9px' }}>
              给播放器、程序与脚本
            </StickerTag>
          </div>
        </div>

        {/* other little doors */}
        <div style={{ position: 'absolute', left: 702, top: 826, width: 956, height: 108, zIndex: 26 }}>
          <div style={{ position: 'absolute', left: 6, top: -18, fontFamily: F.hand, fontSize: 21, color: '#5d5a4d', transform: 'rotate(-1deg)', opacity: moreIn }}>
            还有它们的出口
          </div>
          {[
            { format: FORMATS[2], x: 16, y: 9, r: -2 },
            { format: FORMATS[3], x: 234, y: 5, r: 1.6 },
            { format: FORMATS[4], x: 452, y: 10, r: -1.3 },
          ].map((item, i) => {
            const pop = spring({ frame: frame - (L.more + i * 5), fps, config: { damping: 14, stiffness: 150, mass: 0.65 }, durationInFrames: 30 });
            return (
              <div
                key={item.format.id}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: 196,
                  height: 82,
                  background: item.format.tone,
                  border: `1.4px solid ${item.format.toneDeep}88`,
                  borderRadius: '4px 8px 4px 7px / 7px 4px 8px 4px',
                  boxShadow: '4px 4px 0 rgba(45,52,54,.12)',
                  transform: `translateY(${(1 - pop) * 22}px) rotate(${item.r}deg) scale(${0.88 + pop * 0.12})`,
                  opacity: pop * moreIn,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', height: '100%' }}>
                  <FormatGlyph icon={item.format.icon} size={35} color={item.format.toneDeep} accent={item.format.toneDeep} />
                  <div>
                    <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 16, color: C.ink, display: 'flex', alignItems: 'baseline', gap: 5 }}>{item.format.name}<span style={{ fontFamily: F.mono, fontSize: 8, color: item.format.toneDeep }}>{item.format.ext}</span></div>
                    <div style={{ fontFamily: F.sans, fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>{item.format.blurb}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', right: 4, top: 26, width: 210, fontFamily: F.sans, fontSize: 10, lineHeight: 1.6, color: C.inkMuted, opacity: moreIn, transform: 'rotate(-1deg)' }}>
            五种常用格式同时选中，
            <br />
            一次生成五份文件。
          </div>
        </div>

        {/* little annotations and physical marks */}
        <div style={{ position: 'absolute', left: 165, top: 883, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.8 }}>
          <Sparkle size={20} color={C.pinkDeep} />
          <div style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, transform: 'rotate(-1deg)' }}>导出之后，歌单就不再被锁在某个标签页里。</div>
        </div>
        <div style={{ position: 'absolute', left: 150, bottom: 48, fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: C.inkMuted, opacity: 0.72 }}>
          P.03 / TAKE THE PAPER, LEAVE THE PLATFORM
        </div>
        <div style={{ position: 'absolute', right: 122, top: 132, fontFamily: F.hand, fontSize: 25, color: C.inkSoft, transform: 'rotate(3deg)', opacity: 0.72 }}>
          点一下，五张纸一起落下来 ↓
        </div>

        {/* exported toast */}
        <div
          style={{
            position: 'absolute',
            left: 650,
            bottom: 32,
            padding: '10px 18px',
            background: '#fffdf6',
            border: '1.5px solid rgba(45,52,54,.8)',
            borderRadius: 999,
            boxShadow: '4px 4px 0 rgba(45,52,54,.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: F.sans,
            fontSize: 13.5,
            color: C.ink,
            opacity: toastIn,
            transform: `translateY(${(1 - toastIn) * 18}px) rotate(-.4deg)`,
            zIndex: 40,
          }}
        >
          <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#e6f4e7', display: 'grid', placeItems: 'center' }}>
            <CheckDoodle size={13} color="#2c7a46" />
          </span>
          已成功导出 5 份文件 · XLSX / JSON / CSV / TXT / M3U8
        </div>
      </div>
    </AbsoluteFill>
  );
};
