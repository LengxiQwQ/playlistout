import React from 'react';
import { WashiTape, JournalSticker, MarkerBtn, HandCheck, InkCursor } from '../components/Stationery';
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  lerp,
  quadBezier,
  rangeProgress,
  springPop,
} from '../utils/motion';

const BATCH_PLAYLISTS = [
  { id: '01', name: '花谱、鎖那、鹿乃 ˗ˋˏ♡ˎˊ˗', tracks: 104, listens: '2.8万', emoji: '🌌', bg: '#dbeafe', checkFrame: 860 },
  { id: '02', name: '深夜写代码专用 Lo-Fi 器乐', tracks: 186, listens: '5.4万', emoji: '☕', bg: '#fef3c7', checkFrame: 870 },
  { id: '03', name: '2020–2026 年度最爱红心曲库', tracks: 312, listens: '9.1万', emoji: '❤️', bg: '#ffe4e6', checkFrame: 880 },
  { id: '04', name: '日系摇滚与新番动画 OP 精选', tracks: 145, listens: '4.2万', emoji: '🎸', bg: '#f3e8ff', checkFrame: 890 },
  { id: '05', name: '雨天咖啡馆 · 慵懒爵士与 Bossa', tracks: 88, listens: '1.9万', emoji: '🌧️', bg: '#dcfce7', checkFrame: 900 },
  { id: '06', name: '周末公路旅行 · 吹风歌单', tracks: 120, listens: '3.3万', emoji: '🚐', bg: '#cffafe', checkFrame: 910 },
];

export const Act4BatchExport: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 835 || frame > 1160) return null;

  const enterFade = easeInOutCubic(rangeProgress(frame, 835, 860));
  const exitProg = easeInOutCubic(rangeProgress(frame, 1130, 1158));
  const exitFade = 1 - exitProg;

  const binderPop = springPop(frame, 838, { damping: 14, stiffness: 130 });
  const isClickingBatch = frame >= 962 && frame <= 974;

  // Progress bar from frame 972 to 1052 (80 frames = 2.66s)
  const batchProgressRatio = clamp01(rangeProgress(frame, 972, 1052));
  const currentDone = Math.min(12, Math.max(1, Math.ceil(batchProgressRatio * 12)));
  const isBatchComplete = frame >= 1054;

  const multiSheetPop = springPop(frame, 982, { damping: 13, stiffness: 140 });
  const zipParcelPop = springPop(frame, 1002, { damping: 13, stiffness: 140 });

  // Cursor movement
  let cursorX = 880;
  let cursorY = 310;
  let cursorClick = false;
  let cursorLabel: string | undefined = undefined;
  let cursorOpacity = 1;

  if (frame < 930) {
    const p = easeInOutCubic(rangeProgress(frame, 855, 915));
    cursorX = lerp(320, 995, p);
    cursorY = lerp(420, 312, p);
    cursorClick = frame >= 908 && frame <= 918;
    cursorLabel = '✓ 全选 12 个公开歌单';
  } else if (frame < 995) {
    const p = easeInOutCubic(rangeProgress(frame, 930, 964));
    cursorX = lerp(995, 1420, p);
    cursorY = lerp(312, 412, p);
    cursorClick = isClickingBatch;
    cursorLabel = isClickingBatch ? '一键批量打包!' : undefined;
  } else {
    cursorOpacity = 1 - rangeProgress(frame, 985, 1010);
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: Math.min(enterFade, exitFade),
        transform: `translateX(${-exitProg * 80}px)`,
      }}
    >
      {/* Main Batch Layout: Left UserPlaylistsPaper Catalog + Right Batch Convergence Stage */}
      <div
        style={{
          position: 'absolute',
          left: 132,
          right: 52,
          top: 94,
          display: 'grid',
          gridTemplateColumns: '980px 1fr',
          gap: 28,
          alignItems: 'start',
          transform: `translateY(${(1 - binderPop) * 35}px) scale(${0.94 + 0.06 * binderPop})`,
        }}
      >
        {/* LEFT COLUMN: Authentic UserPlaylistsPaper.tsx */}
        <div
          className="hand-border paper-textured shadow-paper"
          style={{
            backgroundColor: '#ffffff',
            padding: '24px 28px',
            position: 'relative',
          }}
        >
          {/* Pink corner tape + Yellow Sparkle from UserPlaylistsPaper.tsx */}
          <WashiTape
            color="pink"
            rotateDeg={-12}
            width={130}
            height={28}
            style={{ position: 'absolute', top: -14, left: -20 }}
          />
          <div
            style={{
              position: 'absolute',
              right: -18,
              top: -28,
              color: '#eab308',
              fontSize: 44,
            }}
          >
            ✦
          </div>

          {/* Binder Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '2px dashed #e2dacd',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <JournalSticker color="green" rotateDeg={-1} className="font-playful" style={{ fontSize: 13.5, padding: '3px 10px' }}>
                  QQ 音乐 · 歌单收藏册
                </JournalSticker>
                <span className="font-mono" style={{ fontSize: 13.5, color: '#576064', fontWeight: 700 }}>
                  QQ 号: 1160951354
                </span>
                <JournalSticker color="red" rotateDeg={1} className="font-playful" style={{ fontSize: 12.5, padding: '2px 8px' }}>
                  亦支持网易云 UID 批量
                </JournalSticker>
                <JournalSticker color="blue" rotateDeg={-0.8} className="font-playful" style={{ fontSize: 12.5, padding: '2px 8px' }}>
                  酷狗扫码个人歌单批量
                </JournalSticker>
              </div>

              <h2 className="font-playful" style={{ fontSize: 34, fontWeight: 700, color: '#2d3436', lineHeight: 1.15 }}>
                琴心月满 的音乐手账
              </h2>

              <div
                className="font-sans"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#576064',
                  display: 'flex',
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <span style={{ color: '#15803d' }}>共 12 个公开歌单</span>
                <span>·</span>
                <span style={{ color: '#1d4ed8' }}>累计 1,420 首歌曲</span>
                <span>·</span>
                <span>单次最多支持勾选 50 个歌单稳定导出</span>
              </div>
            </div>

            <MarkerBtn variant="paper" rotateDeg={0.8} style={{ fontSize: 15, padding: '7px 16px' }}>
              ✎ 解析其他歌单
            </MarkerBtn>
          </div>

          {/* Catalog Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '14px 0 12px',
            }}
          >
            <span className="font-playful" style={{ fontSize: 23, fontWeight: 700, color: '#2d3436' }}>
              公开歌单目录 (12)
            </span>
            <span
              className="font-sans"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'underline',
              }}
            >
              {frame >= 910 ? '✓ 已全选 (12 / 12)' : '全选 (12)'}
            </span>
          </div>

          {/* 2-Column Grid of Playlist Rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            {BATCH_PLAYLISTS.map((pl, idx) => {
              const isChecked = frame >= pl.checkFrame;
              const cardPop = easeOutBack(rangeProgress(frame, 845 + idx * 5, 868 + idx * 5), 1.12);
              return (
                <div
                  key={pl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    border: '2px solid #2d3436',
                    borderRadius: 8,
                    backgroundColor: isChecked ? '#ffffff' : '#f8fafc',
                    boxShadow: isChecked ? '3.5px 3.5px 0 #2d3436' : '1px 1px 0 rgba(45,52,54,0.12)',
                    transform: `scale(${cardPop})`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    {/* Green Checkbox */}
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        border: '2px solid #2d3436',
                        backgroundColor: isChecked ? '#dcfce7' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && <HandCheck size={15} color="#15803d" />}
                    </div>

                    {/* Cover Thumb */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 6,
                        backgroundColor: pl.bg,
                        border: '1.5px solid #2d3436',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      {pl.emoji}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-sans"
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: '#2d3436',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {pl.name}
                      </div>
                      <div className="font-sans" style={{ fontSize: 12.5, color: '#64748b', marginTop: 2, fontWeight: 600 }}>
                        {pl.tracks} 首 · 试听 {pl.listens} 次
                      </div>
                    </div>
                  </div>

                  <span
                    className="font-sans"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #94a3b8',
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    查看 ↗
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="font-playful"
            style={{
              marginTop: 12,
              textAlign: 'center',
              fontSize: 17,
              color: '#636e72',
            }}
          >
            ⋯ 另有 07–12 号公开歌单（共 12 本歌单已全部勾选）⋯
          </div>
        </div>

        {/* RIGHT COLUMN: Batch Export Control Panel + Multi-Sheet Excel & Kraft ZIP Convergence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Batch Control Sticky Note (Matches UserPlaylistsPaper.tsx) */}
          <div
            className="hand-border-alt paper-textured shadow-sticky"
            style={{
              backgroundColor: '#fff8bd',
              padding: '20px 24px',
              position: 'relative',
              transform: 'rotate(0.6deg)',
            }}
          >
            <WashiTape
              color="cyan"
              rotateDeg={7}
              width={96}
              height={22}
              style={{ position: 'absolute', top: -11, right: 24 }}
            />
            <div className="font-playful" style={{ fontSize: 25, fontWeight: 700, color: '#2d3436', marginBottom: 12 }}>
              📦 批量打包导出
            </div>

            {/* Batch Format Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {[
                { label: '✓ Excel 工作簿 (.xlsx / 多表合一)', active: true, bg: '#fed7aa' },
                { label: '✓ ZIP 压缩包 (JSON)', active: frame >= 950, bg: '#dbeafe' },
                { label: 'ZIP 压缩包 (Excel .xlsx)', active: false, bg: '#ffffff' },
                { label: 'ZIP 压缩包 (CSV / TXT / M3U8)', active: false, bg: '#ffffff' },
              ].map((chip, cIdx) => (
                <div
                  key={cIdx}
                  className="font-sans"
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: chip.active ? 700 : 600,
                    backgroundColor: chip.active ? chip.bg : '#ffffff',
                    border: chip.active ? '2px solid #2d3436' : '1.5px dashed #64748b',
                    borderRadius: 6,
                    boxShadow: chip.active ? '2px 2px 0 #2d3436' : 'none',
                  }}
                >
                  {chip.label}
                </div>
              ))}
            </div>

            {/* Action / Progress Area */}
            {frame < 972 ? (
              <MarkerBtn
                variant="ink"
                rotateDeg={-0.6}
                pressed={isClickingBatch}
                style={{ fontSize: 19, padding: '10px 22px', width: '100%' }}
              >
                📥 一键打包导出选中歌单 (12)
              </MarkerBtn>
            ) : (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #2d3436',
                  borderRadius: 8,
                  padding: '10px 14px',
                  boxShadow: '2px 2px 0 #2d3436',
                }}
              >
                <div
                  className="font-sans"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: isBatchComplete ? '#15803d' : '#0f172a',
                    marginBottom: 6,
                  }}
                >
                  <span>
                    {isBatchComplete
                      ? '✅ 批量导出完成：成功 12 / 12 个歌单（1,420 首）'
                      : `正在翻阅整理 [${currentDone}/12] 歌单合集...`}
                  </span>
                  <span className="font-mono">{Math.round(batchProgressRatio * 100)}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 10,
                    backgroundColor: '#e2e8f0',
                    borderRadius: 999,
                    overflow: 'hidden',
                    border: '1px solid #2d3436',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(batchProgressRatio * 100)}%`,
                      height: '100%',
                      backgroundColor: '#22c55e',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Converged Artifact 1: Multi-Sheet Excel Workbook (多工作表合一) */}
          {frame >= 980 && (
            <div
              className="hand-border paper-textured shadow-sticky"
              style={{
                backgroundColor: '#f0fdf4',
                padding: '16px 20px',
                transform: `scale(${multiSheetPop}) rotate(-1deg)`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="font-mono"
                    style={{
                      backgroundColor: '#15803d',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '3px 9px',
                      borderRadius: 5,
                      border: '1.5px solid #2d3436',
                    }}
                  >
                    多表合一 .XLSX
                  </span>
                  <span className="font-playful" style={{ fontSize: 22, fontWeight: 700, color: '#14532d' }}>
                    单文件多工作表 Excel 工作簿
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                  12 Sheets · 1,420 Rows
                </span>
              </div>

              <div className="font-sans" style={{ fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 10 }}>
                每个歌单自动生成独立工作表（重名自动递增编号），一册总览全部收藏：
              </div>

              {/* Visual Fan of Multiple Excel Sheet Tabs */}
              <div
                className="font-mono"
                style={{
                  display: 'flex',
                  gap: 5,
                  flexWrap: 'nowrap',
                  overflow: 'hidden',
                  backgroundColor: '#dcfce7',
                  padding: '6px 8px 0',
                  borderRadius: 6,
                  border: '1.5px solid #2d3436',
                }}
              >
                {[
                  { name: '📑 Summary', active: false },
                  { name: '📑 01_花谱鎖那', active: true },
                  { name: '📑 02_深夜代码', active: false },
                  { name: '📑 03_年度最爱', active: false },
                  { name: '📑 +9 Sheets...', active: false },
                ].map((tab, tIdx) => (
                  <div
                    key={tIdx}
                    style={{
                      backgroundColor: tab.active ? '#ffffff' : '#bbf7d0',
                      border: '1.5px solid #2d3436',
                      borderBottom: 'none',
                      borderRadius: '5px 5px 0 0',
                      padding: '4px 9px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#14532d',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Converged Artifact 2: Kraft-Paper ZIP Archive Parcel */}
          {frame >= 1000 && (
            <div
              className="hand-border-alt paper-textured shadow-sticky"
              style={{
                backgroundColor: '#fef3c7',
                padding: '16px 20px',
                transform: `scale(${zipParcelPop}) rotate(1.1deg)`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="font-mono"
                    style={{
                      backgroundColor: '#b45309',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '3px 9px',
                      borderRadius: 5,
                      border: '1.5px solid #2d3436',
                    }}
                  >
                    批量归档 .ZIP
                  </span>
                  <span className="font-playful" style={{ fontSize: 22, fontWeight: 700, color: '#78350f' }}>
                    ZIP 压缩包一键打包下载
                  </span>
                </div>
                <JournalSticker color="pink" rotateDeg={-2} className="font-mono" style={{ fontSize: 12, padding: '2px 8px' }}>
                  12 Files Packed
                </JournalSticker>
              </div>

              <div
                className="font-mono"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.82)',
                  border: '1.5px dashed #92400e',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#451a03',
                  lineHeight: 1.5,
                }}
              >
                <div>📦 琴心月满_QQ音乐_歌单合集.zip</div>
                <div style={{ color: '#78350f' }}>
                  ├─ 01_花谱、鎖那、鹿乃.json &nbsp;├─ 02_深夜写代码专用.json &nbsp;(+10 份)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flying Mini Playlist Cards Converging from Left Grid into Right Artifacts (Frames 968..1025) */}
      {frame >= 968 && frame <= 1030 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 70 }}>
          {[0, 1, 2, 3].map((fIdx) => {
            const p = easeInOutCubic(rangeProgress(frame, 970 + fIdx * 5, 1005 + fIdx * 5));
            const startX = 420 + (fIdx % 2) * 380;
            const startY = 440 + Math.floor(fIdx / 2) * 140;
            const targetX = 1480;
            const targetY = fIdx % 2 === 0 ? 560 : 760;
            const [fx, fy] = quadBezier(p, [startX, startY], [1050, 320], [targetX, targetY]);
            const op = p < 0.85 ? 1 : (1 - p) / 0.15;
            return (
              <div
                key={fIdx}
                className="hand-border-subtle"
                style={{
                  position: 'absolute',
                  left: fx - 90,
                  top: fy - 20,
                  width: 180,
                  height: 38,
                  backgroundColor: '#fff8bd',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: op,
                  transform: `scale(${1 - p * 0.35}) rotate(${(1 - p) * 15}deg)`,
                }}
              >
                <span>🎵 歌单 #0{fIdx + 1}</span>
                <span className="font-mono">→ 打包</span>
              </div>
            );
          })}
        </div>
      )}

      <InkCursor
        x={cursorX}
        y={cursorY}
        clicking={cursorClick}
        label={cursorLabel}
        opacity={cursorOpacity}
      />
    </div>
  );
};
