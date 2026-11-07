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

const FORMAT_ITEMS: {
  id: string;
  label: string;
  color: 'green' | 'blue' | 'yellow' | 'pink' | 'purple';
  rot: number;
  checkFrame: number;
}[] = [
  { id: 'xlsx', label: 'Excel (.xlsx)', color: 'green', rot: -1.2, checkFrame: 572 },
  { id: 'json', label: 'JSON', color: 'blue', rot: 1.8, checkFrame: 584 },
  { id: 'txt', label: 'TXT', color: 'yellow', rot: -1.6, checkFrame: 596 },
  { id: 'csv', label: 'CSV', color: 'pink', rot: 1.2, checkFrame: 608 },
  { id: 'm3u8', label: 'M3U8', color: 'purple', rot: -1.0, checkFrame: 620 },
];

export const Act3MultiFormatExport: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 558 || frame > 862) return null;

  const enterFade = easeInOutCubic(rangeProgress(frame, 558, 582));
  const exitProg = easeInOutCubic(rangeProgress(frame, 832, 860));
  const exitFade = 1 - exitProg;

  const checkedCount = FORMAT_ITEMS.filter((f) => frame >= f.checkFrame).length;
  const isClickingExport = frame >= 634 && frame <= 645;
  const origamiStart = 640;

  // Origami fold progress for main hero cards
  const xlsxFold = springPop(frame, 646, { damping: 13, stiffness: 135 });
  const jsonFold = springPop(frame, 658, { damping: 13, stiffness: 135 });
  const toastPop = springPop(frame, 750, { damping: 14, stiffness: 150 });

  // Cursor path
  let cursorX = 500;
  let cursorY = 185;
  let cursorClick = false;
  let cursorLabel: string | undefined = undefined;
  let cursorOpacity = 1;

  if (frame < 626) {
    const p = easeInOutCubic(rangeProgress(frame, 568, 622));
    cursorX = lerp(310, 825, p);
    cursorY = lerp(182, 182, p);
    cursorClick = FORMAT_ITEMS.some((f) => Math.abs(frame - f.checkFrame) <= 2);
    cursorLabel = '可多选格式';
  } else if (frame < 660) {
    const p = easeInOutCubic(rangeProgress(frame, 624, 636));
    cursorX = lerp(825, 1620, p);
    cursorY = lerp(182, 168, p);
    cursorClick = isClickingExport;
    cursorLabel = isClickingExport ? '一键本地导出!' : undefined;
  } else {
    cursorOpacity = 1 - rangeProgress(frame, 652, 675);
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: Math.min(enterFade, exitFade),
        transform: `scale(${1 - exitProg * 0.08})`,
      }}
    >
      {/* 1. Top Docked ExportToolbar Card (Directly continuing from ResultPaper in Act 2!) */}
      <div
        className="hand-border paper-textured shadow-paper"
        style={{
          position: 'absolute',
          left: 132,
          right: 52,
          top: 90,
          backgroundColor: '#ffffff',
          padding: '18px 28px',
          zIndex: 35,
        }}
      >
        <WashiTape
          color="yellow"
          rotateDeg={-4}
          width={96}
          height={22}
          style={{ position: 'absolute', top: -11, left: 32 }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {/* Left: Format Multi-Select Stickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="font-playful" style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>
                选择导出格式（可多选）：
              </span>
              <span
                className="font-sans"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0984e3',
                  backgroundColor: '#eff6ff',
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: '1px dashed #93c5fd',
                }}
              >
                🔒 浏览器本地生成字节 · 零服务端存储
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {FORMAT_ITEMS.map((item) => {
                const isSelected = frame >= item.checkFrame;
                return (
                  <JournalSticker
                    key={item.id}
                    color={item.color}
                    rotateDeg={item.rot}
                    active={isSelected}
                    className="font-mono"
                    style={{
                      fontSize: 15,
                      padding: '7px 15px',
                      opacity: isSelected ? 1 : 0.72,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: isSelected ? '2px solid #2d3436' : '1.5px dashed #636e72',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {isSelected ? <HandCheck size={14} color="#15803d" /> : null}
                    </span>
                    <span>{item.label}</span>
                  </JournalSticker>
                );
              })}

              {/* Quick Clipboard Copy Pills */}
              <div
                style={{
                  marginLeft: 10,
                  paddingLeft: 14,
                  borderLeft: '2px dashed #e2dacd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className="font-sans" style={{ fontSize: 13, fontWeight: 700, color: '#636e72' }}>
                  快捷复制：
                </span>
                <JournalSticker color="white" rotateDeg={-0.6} className="font-playful" style={{ fontSize: 14, padding: '4px 10px' }}>
                  歌名 - 歌手
                </JournalSticker>
                <JournalSticker color="blue" rotateDeg={0.8} className="font-playful" style={{ fontSize: 14, padding: '4px 10px' }}>
                  📋 复制 JSON
                </JournalSticker>
              </div>
            </div>
          </div>

          {/* Right: Big Export Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <span className="font-playful" style={{ fontSize: 22, color: '#7f868a', transform: 'rotate(-2deg)' }}>
              把歌单带走 →
            </span>
            <MarkerBtn
              variant="ink"
              rotateDeg={-1}
              pressed={isClickingExport}
              style={{ fontSize: 23, padding: '12px 30px' }}
            >
              导出 ({Math.max(1, checkedCount)}) ↓
            </MarkerBtn>
          </div>
        </div>
      </div>

      {/* 2. Flying Paper-Strip Song Rows Morphing from Toolbar into the Origami Cards (Frames 636..690) */}
      {frame >= origamiStart && frame <= 705 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 42 }}>
          {[0, 1, 2, 3].map((sIdx) => {
            const p = easeOutCubic(rangeProgress(frame, 638 + sIdx * 4, 672 + sIdx * 4));
            const targetX = sIdx % 2 === 0 ? 520 : 1380;
            const targetY = 470 + (sIdx % 2) * 55;
            const [sx, sy] = quadBezier(p, [960, 210], [targetX, 260], [targetX, targetY]);
            const stripOpacity = p < 0.85 ? 1 : (1 - p) / 0.15;
            return (
              <div
                key={sIdx}
                className="hand-border-subtle"
                style={{
                  position: 'absolute',
                  left: sx - 160,
                  top: sy - 18,
                  width: 320,
                  height: 34,
                  backgroundColor: '#fff8bd',
                  padding: '4px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: stripOpacity,
                  transform: `rotate(${(1 - p) * (sIdx % 2 === 0 ? -14 : 14)}deg) scale(${1 - p * 0.25})`,
                }}
              >
                <span>♪ 00{sIdx + 1} · 花谱 / 鎖那 / 鹿乃</span>
                <span className="font-mono">→ {sIdx % 2 === 0 ? '.XLSX' : '.JSON'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Center Origami Hero Artifacts: Excel (.xlsx) Dual-Sheet Workbook & Canonical JSON (.json) */}
      <div
        style={{
          position: 'absolute',
          left: 132,
          right: 52,
          top: 238,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 28,
          zIndex: 38,
        }}
      >
        {/* HERO CARD A: Excel (.xlsx) Workbook with Tracks & Playlist Info Sheets */}
        <div
          className="hand-border paper-textured shadow-sticky"
          style={{
            backgroundColor: '#f0fdf4',
            padding: '20px 24px 18px',
            position: 'relative',
            transformOrigin: 'top center',
            transform: `perspective(1000px) rotateX(${(1 - xlsxFold) * -55}deg) scale(${0.85 + 0.15 * xlsxFold}) rotate(-1.1deg)`,
            opacity: Math.min(1, xlsxFold * 1.4),
          }}
        >
          <WashiTape
            color="green"
            rotateDeg={-7}
            width={108}
            height={24}
            style={{ position: 'absolute', top: -12, left: 26 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="font-mono"
                style={{
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '2px solid #2d3436',
                }}
              >
                XLSX
              </span>
              <div>
                <div className="font-playful" style={{ fontSize: 24, fontWeight: 700, color: '#14532d' }}>
                  Excel 双工作表工作簿 (.xlsx)
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: '#166534' }}>
                  【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx
                </div>
              </div>
            </div>
            <JournalSticker color="yellow" rotateDeg={2} className="font-playful" style={{ fontSize: 13.5, padding: '3px 10px' }}>
              ★ 推荐归档与筛选
            </JournalSticker>
          </div>

          {/* Mini Spreadsheet Grid */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #2d3436',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '3px 3px 0 rgba(45, 52, 54, 0.18)',
            }}
          >
            <div
              className="font-mono"
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1.3fr 1fr 1fr 64px 78px',
                backgroundColor: '#dcfce7',
                borderBottom: '2px solid #2d3436',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#14532d',
              }}
            >
              <span>A (#)</span>
              <span>B (Title)</span>
              <span>C (Artist)</span>
              <span>D (Album)</span>
              <span>E (Time)</span>
              <span>F (Status)</span>
            </div>

            {[
              ['001', '過去を喰らう', '花谱 (KAF)', '魔法 α', '03:42', 'VIP专享'],
              ['002', '魔法 (feat. 理芽)', '花谱 / 理芽', '不可解弐 Q2', '04:08', '正常'],
              ['003', 'パズル (Puzzle)', '鎖那 (sana)', 'Hush a by', '04:15', '正常'],
              ['004', 'Stella-rium', '鹿乃 (Kano)', 'nowhere', '04:51', '付费专辑'],
              ['005', '心臓と絡繰', '花谱 (KAF)', '观测 β', '03:58', '下架/无版权'],
            ].map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1.3fr 1fr 1fr 64px 78px',
                  padding: '6px 10px',
                  borderBottom: idx < 4 ? '1px solid #e2e8f0' : 'none',
                  fontSize: 12.5,
                  color: idx === 4 ? '#94a3b8' : '#1e293b',
                  backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                }}
              >
                <span className="font-mono" style={{ color: '#64748b' }}>{row[0]}</span>
                <span style={{ fontWeight: 700 }}>{row[1]}</span>
                <span>{row[2]}</span>
                <span style={{ color: '#64748b' }}>{row[3]}</span>
                <span className="font-mono">{row[4]}</span>
                <span style={{ fontWeight: 700, color: idx === 4 ? '#991b1b' : '#15803d' }}>{row[5]}</span>
              </div>
            ))}

            {/* Authentic Bottom Excel Worksheet Tabs (Tracks + Playlist Info) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#f1f5f9',
                borderTop: '2px solid #2d3436',
                padding: '6px 10px 0',
              }}
            >
              <div
                className="font-mono"
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #2d3436',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#15803d',
                }}
              >
                📑 Tracks (104首歌曲纯净表)
              </div>
              <div
                className="font-mono"
                style={{
                  backgroundColor: '#dcfce7',
                  border: '1.5px solid #64748b',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                📑 Playlist Info (歌单元数据)
              </div>
            </div>
          </div>
        </div>

        {/* HERO CARD B: Canonical JSON (.json) Structured Blueprint */}
        <div
          className="hand-border-alt paper-textured shadow-sticky"
          style={{
            backgroundColor: '#eff6ff',
            padding: '20px 24px 18px',
            position: 'relative',
            transformOrigin: 'top center',
            transform: `perspective(1000px) rotateX(${(1 - jsonFold) * -55}deg) scale(${0.85 + 0.15 * jsonFold}) rotate(1.2deg)`,
            opacity: Math.min(1, jsonFold * 1.4),
          }}
        >
          <WashiTape
            color="cyan"
            rotateDeg={6}
            width={108}
            height={24}
            style={{ position: 'absolute', top: -12, right: 26 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="font-mono"
                style={{
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '2px solid #2d3436',
                }}
              >
                JSON
              </span>
              <div>
                <div className="font-playful" style={{ fontSize: 24, fontWeight: 700, color: '#1e3a8a' }}>
                  Canonical JSON 标准数据协议 (.json)
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: '#1d4ed8' }}>
                  六大音乐平台统一 Schema · 开源播放器与脚本直接读取
                </div>
              </div>
            </div>
            <JournalSticker color="white" rotateDeg={-1.5} className="font-mono" style={{ fontSize: 12.5, padding: '3px 10px' }}>
              Schema v1
            </JournalSticker>
          </div>

          {/* Code Blueprint Box */}
          <div
            className="font-mono"
            style={{
              backgroundColor: '#0f172a',
              color: '#e2e8f0',
              border: '2px solid #2d3436',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 12.8,
              lineHeight: 1.52,
              boxShadow: '3px 3px 0 rgba(45, 52, 54, 0.22)',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8' }}>{'{'}</span>
            </div>
            <div style={{ paddingLeft: 16 }}>
              <span style={{ color: '#7dd3fc' }}>"schemaVersion"</span>:{' '}
              <span style={{ color: '#fde047' }}>1</span>,{' '}
              <span style={{ color: '#7dd3fc' }}>"platform"</span>:{' '}
              <span style={{ color: '#86efac' }}>"qqmusic"</span>,
            </div>
            <div style={{ paddingLeft: 16 }}>
              <span style={{ color: '#7dd3fc' }}>"name"</span>:{' '}
              <span style={{ color: '#86efac' }}>"花谱、鎖那、鹿乃 ˗ˋˏ♡ˎˊ˗"</span>,
            </div>
            <div style={{ paddingLeft: 16 }}>
              <span style={{ color: '#7dd3fc' }}>"creator"</span>:{' '}
              <span style={{ color: '#86efac' }}>"琴心月满"</span>,{' '}
              <span style={{ color: '#7dd3fc' }}>"trackCount"</span>:{' '}
              <span style={{ color: '#fde047' }}>104</span>,
            </div>
            <div style={{ paddingLeft: 16 }}>
              <span style={{ color: '#7dd3fc' }}>"tracks"</span>: [
            </div>
            <div style={{ paddingLeft: 32 }}>
              {'{ '}
              <span style={{ color: '#f9a8d4' }}>"index"</span>: 1,{' '}
              <span style={{ color: '#f9a8d4' }}>"title"</span>:{' '}
              <span style={{ color: '#fde047' }}>"過去を喰らう"</span>,{' '}
              <span style={{ color: '#f9a8d4' }}>"artist"</span>:{' '}
              <span style={{ color: '#86efac' }}>"花谱"</span>,
            </div>
            <div style={{ paddingLeft: 44 }}>
              <span style={{ color: '#f9a8d4' }}>"durationMs"</span>: 222000,{' '}
              <span style={{ color: '#f9a8d4' }}>"isVip"</span>: <span style={{ color: '#fb923c' }}>true</span>,{' '}
              <span style={{ color: '#f9a8d4' }}>"status"</span>:{' '}
              <span style={{ color: '#86efac' }}>"playable"</span> {'},'}
            </div>
            <div style={{ paddingLeft: 32, color: '#94a3b8' }}>
              {'// ... 其余 103 首完整曲目与封面/专辑/ISRC元数据'}
            </div>
            <div style={{ paddingLeft: 16 }}>]</div>
            <div>
              <span style={{ color: '#94a3b8' }}>{'}'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Shelf: 4 Tactile Origami Cards for CSV, TXT, M3U8, Markdown (.md) */}
      <div
        style={{
          position: 'absolute',
          left: 132,
          right: 52,
          top: 678,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          zIndex: 36,
        }}
      >
        {[
          {
            ext: 'CSV (.csv)',
            title: 'UTF-8 带 BOM 表格',
            desc: 'Excel 直接打开不乱码；内置 title / artist / album / isrc 通用迁移字段。',
            sample: 'title,artist,album,duration\n過去を喰らう,花谱,魔法 α,222',
            bg: '#fce7f3',
            badgeBg: '#db2777',
            rot: -1.1,
            delay: 682,
          },
          {
            ext: 'TXT (.txt)',
            title: '纯净歌曲清单',
            desc: '每行「歌名 - 歌手 - 专辑」，清爽易读，适合纯文本备份、笔记与分享。',
            sample: '01. 過去を喰らう - 花谱 - 魔法 α\n02. 魔法 - 花谱 / 理芽',
            bg: '#fef9c3',
            badgeBg: '#ca8a04',
            rot: 0.9,
            delay: 694,
          },
          {
            ext: 'M3U8 (.m3u8)',
            title: 'Extended M3U 列表',
            desc: '保留 #EXTM3U 与 #EXTINF 标准时长与曲目头，兼容各类本地音乐播放器。',
            sample: '#EXTM3U\n#EXTINF:222,花谱 - 過去を喰らう',
            bg: '#f3e8ff',
            badgeBg: '#7e22ce',
            rot: -0.8,
            delay: 706,
          },
          {
            ext: 'Markdown (.md)',
            title: '手账表格 & 专用格式',
            desc: '支持导出 Markdown 曲目表，以及洛雪音乐 / Listen 1 播放器专属恢复格式。',
            sample: '| # | 歌名 | 歌手 | 状态 |\n| 01 | 過去を喰らう | 花谱 | VIP |',
            bg: '#dff7ef',
            badgeBg: '#0d9488',
            rot: 1.2,
            delay: 718,
          },
        ].map((card) => {
          const pop = springPop(frame, card.delay, { damping: 13, stiffness: 145 });
          return (
            <div
              key={card.ext}
              className="hand-border-subtle paper-textured shadow-cutout-sm"
              style={{
                backgroundColor: card.bg,
                padding: '14px 16px',
                transform: `translateY(${(1 - pop) * 35}px) scale(${0.9 + 0.1 * pop}) rotate(${card.rot}deg)`,
                opacity: Math.min(1, pop * 1.3),
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="font-mono"
                  style={{
                    backgroundColor: card.badgeBg,
                    color: '#ffffff',
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1.5px solid #2d3436',
                  }}
                >
                  {card.ext}
                </span>
                <span className="font-playful" style={{ fontSize: 17, fontWeight: 700, color: '#2d3436' }}>
                  {card.title}
                </span>
              </div>
              <div className="font-sans" style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.45, fontWeight: 600 }}>
                {card.desc}
              </div>
              <pre
                className="font-mono"
                style={{
                  marginTop: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.78)',
                  border: '1px dashed rgba(45, 52, 54, 0.35)',
                  borderRadius: 5,
                  padding: '5px 8px',
                  fontSize: 11,
                  color: '#1e293b',
                  overflow: 'hidden',
                  whiteSpace: 'pre',
                }}
              >
                {card.sample}
              </pre>
            </div>
          );
        })}
      </div>

      {/* 5. Authentic Export Toast Pill (Matches ExportToolbar.tsx) */}
      {frame >= 750 && (
        <div
          className="hand-border-subtle shadow-cutout font-playful"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 34,
            transform: `translate(-50%, ${(1 - toastPop) * 30}px) scale(${0.9 + 0.1 * toastPop}) rotate(-0.5deg)`,
            backgroundColor: '#ffffff',
            padding: '10px 28px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 700,
            color: '#2d3436',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 80,
          }}
        >
          <span style={{ color: '#16a34a', fontSize: 24 }}>✓</span>
          <span>已成功导出 5 份文件（XLSX, JSON, CSV, TXT, M3U8）</span>
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
