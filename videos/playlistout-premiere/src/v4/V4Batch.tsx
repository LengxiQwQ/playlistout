import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { BATCH_PLAYLISTS, BATCH_TOTAL } from '../data';
import { PaperSheet } from '../components/Paper';
import { BigButton, BigChip, Chapter, Footer, STAGE, paperBreath } from './UI';

const Row: React.FC<{
  name: string;
  count: number;
  artist: string;
  tone: string;
  deep: string;
  index: number;
  enter: number;
}> = ({ name, count, artist, tone, deep, index, enter }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      minHeight: 122,
      padding: '13px 16px',
      marginBottom: 12,
      background: 'rgba(255,253,246,.64)',
      border: '1px solid rgba(45,52,54,.13)',
      borderRadius: 6,
      opacity: enter,
      transform: `translateY(${(1 - enter) * 22}px)`,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 6,
        background: tone,
        border: `1.5px solid ${deep}`,
        display: 'grid',
        placeItems: 'center',
        fontFamily: F.note,
        fontSize: 26,
        color: deep,
      }}
    >
      {['花', '月', '波'][index]}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: F.sans, fontSize: 30, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      <div style={{ fontFamily: F.sans, fontSize: 18, color: C.inkSoft, marginTop: 4 }}>
        {count} 首 · {artist} · 公开歌单 · 默认已选
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
        <BigChip>QQ 音乐</BigChip>
        <BigChip>私人收藏</BigChip>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: F.hand, fontSize: 24, color: '#3d7651' }}>✓ 已选</div>
      <div style={{ fontFamily: F.mono, fontSize: 14, color: C.inkMuted, marginTop: 5 }}>{String(index + 1).padStart(2, '0')}</div>
    </div>
  </div>
);

export const V4Batch: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Chapter
        kicker="BATCH / THE WHOLE LITTLE LIBRARY"
        title="一本歌单簿，也能一起带走。"
        right={
          <>
            多个歌单 · 多张工作表 · 一个压缩包
            <div style={{ fontFamily: F.hand, fontSize: 22, color: C.inkSoft, marginTop: 6 }}>整本打包，不用一张张点。</div>
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
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
          zIndex: 10,
          ...paperBreath(frame),
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="paper"
          radius="7px 14px 8px 15px / 13px 7px 15px 8px"
          style={{ width: '100%', height: '100%', padding: '22px 28px', background: '#f8f3e7' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <BigChip tone={C.yellow} ink="#7b5e1d">QQ 音乐 · 歌单收藏册</BigChip>
                <span style={{ fontFamily: F.mono, fontSize: 14, color: C.inkMuted, letterSpacing: '.1em' }}>PUBLIC LIBRARY</span>
              </div>
              <div style={{ fontFamily: F.display, fontSize: 40, color: C.ink, lineHeight: 1.08, marginTop: 7 }}>琴心月满的公开歌单</div>
              <div style={{ fontFamily: F.sans, fontSize: 18, color: C.inkSoft, marginTop: 5 }}>
                3 个歌单 · {BATCH_TOTAL} 首歌曲 · 全部为公开歌单 · 默认已全选
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted, letterSpacing: '.12em' }}>SELECTED</div>
              <div style={{ fontFamily: F.hand, fontSize: 34, color: C.ink, marginTop: 2 }}>3 / 3</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, marginTop: 18 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 700, color: C.ink }}>选择要打包的歌单</span>
                <span style={{ fontFamily: F.hand, fontSize: 22, color: C.inkMuted, transform: 'rotate(-1deg)' }}>勾选后，一起翻页 ♪</span>
              </div>
              {BATCH_PLAYLISTS.map((item, i) => (
                <Row
                  key={item.id}
                  name={item.name}
                  count={item.count}
                  artist={item.artist}
                  tone={item.tone}
                  deep={item.deep}
                  index={i}
                  enter={interpolate(frame, [6 + i * 5, 24 + i * 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
                />
              ))}
              <div style={{ fontFamily: F.sans, fontSize: 16, color: C.inkMuted, marginTop: 2 }}>
                ✦ 单次最多批量导出 50 个歌单；公开歌单无需登录，酷狗批量需登录。
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,253,246,.58)',
                border: '1.4px solid rgba(45,52,54,.35)',
                borderRadius: 7,
                padding: '16px 17px',
                minHeight: 420,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.yellow, display: 'grid', placeItems: 'center', fontFamily: F.hand, fontSize: 22 }}>✦</div>
                <div>
                  <div style={{ fontFamily: F.note, fontSize: 28, color: C.ink, lineHeight: 1.1 }}>批量打包导出</div>
                  <div style={{ fontFamily: F.sans, fontSize: 15, color: C.inkMuted, marginTop: 3 }}>一次整理选中的 3 个歌单</div>
                </div>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 15, color: C.inkMuted, marginTop: 18, marginBottom: 7 }}>打包方式</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <BigChip active tone="#e1f0de" ink="#3f6d48">● 多 Sheet Excel</BigChip>
                <BigChip>○ ZIP 包（XLSX）</BigChip>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 14 }}>
                <div style={{ padding: '10px 11px', background: 'rgba(228,241,224,.58)', borderRadius: 5 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: '#4a7148', letterSpacing: '.1em' }}>OUTPUT A</div>
                  <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, marginTop: 4 }}>1 个工作簿</div>
                  <div style={{ fontFamily: F.sans, fontSize: 14, color: C.inkMuted, marginTop: 2 }}>目录 + 3 张歌单表</div>
                </div>
                <div style={{ padding: '10px 11px', background: 'rgba(250,240,219,.66)', borderRadius: 5 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: '#886c30', letterSpacing: '.1em' }}>OUTPUT B</div>
                  <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, marginTop: 4 }}>1 个 ZIP</div>
                  <div style={{ fontFamily: F.sans, fontSize: 14, color: C.inkMuted, marginTop: 2 }}>每个歌单一个文件</div>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <BigButton style={{ width: '100%', fontSize: 25 }}>一键打包导出选中歌单 (3) ↓</BigButton>
              </div>
              <div style={{ textAlign: 'center', fontFamily: F.hand, fontSize: 21, color: C.inkMuted, marginTop: 10 }}>
                3 个歌单 · {BATCH_TOTAL} 首 · 一次整理 ♪
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, borderTop: '1px dashed rgba(45,52,54,.18)', paddingTop: 12 }}>
            <span style={{ fontFamily: F.sans, fontSize: 16, color: C.inkSoft }}>打包后会得到</span>
            <BigChip tone="rgba(228,241,224,.6)" ink="#3f6d48">XLSX 1 个工作簿</BigChip>
            <BigChip tone="rgba(250,240,219,.65)" ink="#806431">ZIP 1 个压缩包</BigChip>
            <span style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted, marginLeft: 'auto', letterSpacing: '.08em' }}>MULTI-SHEET EXCEL · 3 PLAYLISTS · {BATCH_TOTAL} TRACKS</span>
          </div>
        </PaperSheet>
      </div>
      <Footer left="整本带走，不用一张张点。" right="THE WHOLE LIBRARY, FOLDED NEATLY" />
    </AbsoluteFill>
  );
};
