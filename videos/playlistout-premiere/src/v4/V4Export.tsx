import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { FORMATS, PLAYLIST } from '../data';
import { PaperSheet } from '../components/Paper';
import { Tape } from '../components/Doodles';
import { BigButton, BigChip, Chapter, Footer, STAGE, paperBreath } from './UI';

const ExcelCard: React.FC = () => (
  <PaperSheet tone="white" shadow="lifted" style={{ padding: '20px 22px' }} radius="5px 10px 6px 11px / 9px 5px 11px 6px">
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 34, height: 34, borderRadius: 5, background: '#e2f0dd', border: '1px solid #aac69e', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 12, color: '#4a7148' }}>
        XLSX
      </span>
      <div>
        <div style={{ fontFamily: F.note, fontSize: 30, color: C.ink, lineHeight: 1.1 }}>Excel 工作簿</div>
        <div style={{ fontFamily: F.mono, fontSize: 16, color: C.inkMuted, marginTop: 3 }}>.xlsx · 目录 + 3 张歌单表</div>
      </div>
      <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 13, color: C.inkMuted }}>LOCAL</span>
    </div>
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(45,52,54,.13)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr .85fr .55fr', gap: 8, padding: '7px 6px', fontFamily: F.mono, fontSize: 14, color: C.inkMuted }}>
        <span>TITLE</span><span>ARTIST</span><span>STATUS</span><span>TIME</span>
      </div>
      {PLAYLIST.tracks.slice(0, 5).map((track) => (
        <div key={track.index} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr .85fr .55fr', gap: 8, alignItems: 'center', minHeight: 42, borderTop: '1px solid rgba(45,52,54,.07)', fontFamily: F.sans, fontSize: 18 }}>
          <span style={{ fontWeight: 600 }}>{track.title}</span>
          <span style={{ color: C.inkSoft }}>{track.artist}</span>
          <span style={{ color: track.vip ? C.marginRed : '#47785a', fontSize: 15 }}>{track.status}</span>
          <span style={{ fontFamily: F.mono, fontSize: 14, color: C.inkMuted }}>{track.duration}</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 12, display: 'flex', gap: 12, fontFamily: F.sans, fontSize: 16, color: C.inkSoft }}>
      <span>✓ 原始顺序</span><span>✓ 状态 / VIP</span><span>✓ 双工作表</span>
    </div>
  </PaperSheet>
);

const JsonCard: React.FC = () => (
  <PaperSheet tone="blue" shadow="lifted" style={{ padding: '20px 20px' }} radius="6px 9px 7px 12px / 10px 6px 12px 7px">
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 34, height: 34, borderRadius: 5, background: '#e7f0f4', border: '1px solid #a9c6d1', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 12, color: '#3c6170' }}>
        {'{}'}
      </span>
      <div>
        <div style={{ fontFamily: F.note, fontSize: 30, color: C.ink, lineHeight: 1.1 }}>Canonical JSON</div>
        <div style={{ fontFamily: F.mono, fontSize: 16, color: C.inkMuted, marginTop: 3 }}>.json · schema v1</div>
      </div>
      <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 13, color: C.inkMuted }}>LOCAL</span>
    </div>
    <div style={{ marginTop: 14, background: 'rgba(255,253,246,.54)', border: '1px solid rgba(45,52,54,.13)', borderRadius: 5, padding: '12px 14px', fontFamily: F.mono, fontSize: 16, lineHeight: 1.8, color: '#3e565f', whiteSpace: 'pre-wrap' }}>
      {'{\n  "name": "花谱、鎖那、鹿乃、春猿火",\n  "platform": "qqmusic",\n  "trackCount": 104,\n  "tracks": [ ... ]\n}'}
    </div>
    <div style={{ marginTop: 12, fontFamily: F.hand, fontSize: 22, color: C.inkSoft, transform: 'rotate(-1deg)' }}>
      给播放器、程序与脚本。
    </div>
  </PaperSheet>
);

export const V4Export: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Chapter
        kicker="EXPORT / STRAIGHT FROM THE BROWSER"
        title="让你的歌单，变成可以带走的文件。"
        right={
          <>
            点一下，五张纸一起落下来 ↓
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted, marginTop: 4 }}>NO CLOUD · NO ACCOUNT</div>
          </>
        }
      />
      <div
        style={{
          position: 'absolute',
          left: STAGE.left,
          top: STAGE.top,
          width: STAGE.width,
          height: STAGE.height,
          zIndex: 10,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
          ...paperBreath(frame),
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="paper"
          radius="7px 14px 8px 15px / 13px 7px 15px 8px"
          style={{ width: '100%', height: '100%', padding: '22px 30px', background: '#f8f3e7' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 15, color: C.inkMuted, letterSpacing: '.14em' }}>EXPORTS / ONE LITTLE PLAYLIST / 2026</div>
              <div style={{ fontFamily: F.display, fontSize: 44, lineHeight: 1.08, color: C.ink, marginTop: 5 }}>
                一张歌单，五种打开方式。
              </div>
            </div>
            <div style={{ fontFamily: F.hand, fontSize: 25, color: C.inkSoft, transform: 'rotate(1.5deg)', marginTop: 4 }}>
              导出之后，歌单就不再被锁在某个标签页里。
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 18 }}>
            <ExcelCard />
            <JsonCard />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'nowrap' }}>
            <span style={{ fontFamily: F.note, fontSize: 24, color: C.ink, marginRight: 4 }}>另外三种</span>
            {FORMATS.filter((f) => ['csv', 'txt', 'm3u8'].includes(f.id)).map((f) => (
              <BigChip key={f.id} tone={f.tone} ink={C.inkSoft}>
                {f.name} {f.ext}
              </BigChip>
            ))}
            <span style={{ fontFamily: F.sans, fontSize: 16, color: C.inkMuted, marginLeft: 6 }}>
              Markdown 为源码内置导出器
            </span>
            <div style={{ marginLeft: 'auto' }}>
              <BigButton>导出 5 个文件 ↓</BigButton>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: F.mono, fontSize: 13, color: C.inkMuted, letterSpacing: '.08em' }}>
            <span>全部在浏览器生成 · 不上传服务器</span>
            <span>104 首 / 7 小时 06 分</span>
          </div>
          <div style={{ position: 'absolute', top: -14, left: 30, zIndex: 15 }}>
            <Tape color="rgba(250,201,173,.68)" width={168} height={26} rotate={-4} />
          </div>
          <div style={{ position: 'absolute', right: 36, bottom: -14, zIndex: 15 }}>
            <Tape color="rgba(167,215,225,.6)" width={126} height={24} rotate={4} />
          </div>
        </PaperSheet>
      </div>
      <Footer left="导出之后，歌单就不再被锁在某个标签页里。" right="TAKE THE PAPER, LEAVE THE PLATFORM" />
    </AbsoluteFill>
  );
};
