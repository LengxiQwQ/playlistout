import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { easeBackOut, easeInOut, easeOut } from '../anim';
import { DEMO_PLAYLIST, EXPORT_FORMATS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { HandCheck, JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.export.in;

const JSON_PREVIEW_LINES = [
  '{',
  '  "name": "日语动漫",',
  '  "platform": "qqmusic",',
  '  "trackCount": 128,',
  '  "tracks": [',
  '    { "title": "残酷な天使のテーゼ", "artist": "高橋洋子" },',
  '    { "title": "only my railgun", "artist": "fripSide", "vip": true }',
  '  ]',
  '}',
];

export const ExportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const excelFrame = rel('excel_focus');
  const jsonFrame = rel('json_focus');
  const fanFrame = rel('formats_fan');
  const batchEnter = rel('batch_enter');

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 95 } });
  const jsonCardIn = easeBackOut(frame, jsonFrame - 18, 22);
  const exitProgress = easeInOut(frame, batchEnter, 24, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 10, batchEnter + 8, batchEnter + 24], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const excelScrollProgress = easeInOut(frame, excelFrame + 18, 48, 0, 1);
  const excelScrollY = excelScrollProgress * 155;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateX(${-exitProgress * 120}px) scale(${1 - exitProgress * 0.04})`,
      }}
    >
      <SceneHeaderBanner
        stepTag="STEP 02 · 多格式本地导出"
        title="歌单变形：表格归档与标准 JSON"
        subtitle="纯浏览器端本地生成 · 零服务端存储"
        tagBg={C.mint}
        style={{
          marginTop: 38,
          opacity: easeOut(frame, 0, 16),
        }}
      />

      {/* ================= LEFT HERO CARD: EXCEL DUAL-SHEET (.XLSX) ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 140,
          width: 816,
          height: 618,
          transform: `translateX(${(1 - enter) * -60}px) rotate(-0.6deg)`,
          zIndex: 20,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          tapePos="top-left"
          tapeColor={C.tapeGreen}
          shadow="cutoutLg"
          style={{ width: '100%', height: '100%', padding: '24px 28px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottom: `3px dashed ${C.line}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 16,
                  backgroundColor: C.mint,
                  border: `3.2px solid ${C.ink}`,
                  boxShadow: SHADOW.cutoutSm,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: F.mono,
                  fontSize: 19,
                  fontWeight: 900,
                  color: C.mintDeep,
                }}
              >
                XLSX
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 31, fontWeight: 900, color: C.ink }}>
                    Excel 表格归档
                  </span>
                  <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={18} rotate={1}>
                    ★ 推荐长期备份
                  </StickyBadge>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 18.5,
                    fontWeight: 700,
                    color: C.inkSoft,
                    marginTop: 4,
                  }}
                >
                  {DEMO_PLAYLIST.excelFile}
                </div>
              </div>
            </div>
          </div>

          {/* Single-Line Dual Worksheet Tabs */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div
              style={{
                padding: '10px 20px',
                borderRadius: '14px 14px 0 0',
                backgroundColor: C.mint,
                border: `3px solid ${C.ink}`,
                borderBottom: 'none',
                fontFamily: F.sans,
                fontSize: 21,
                fontWeight: 900,
                color: C.mintDeep,
                whiteSpace: 'nowrap',
              }}
            >
              📊 Sheet 1: Tracks 曲目表
            </div>
            <div
              style={{
                padding: '10px 20px',
                borderRadius: '14px 14px 0 0',
                backgroundColor: C.paperCream,
                border: `3px solid ${C.ink}`,
                borderBottom: 'none',
                fontFamily: F.sans,
                fontSize: 21,
                fontWeight: 800,
                color: C.inkSoft,
                whiteSpace: 'nowrap',
              }}
            >
              📋 Sheet 2: Playlist Info 元数据
            </div>
          </div>

          {/* Spreadsheet Grid */}
          <div
            style={{
              border: `3px solid ${C.ink}`,
              borderRadius: '0 14px 14px 14px',
              overflow: 'hidden',
              backgroundColor: C.paperWhite,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1.25fr 0.85fr 1fr 110px',
                padding: '11px 18px',
                backgroundColor: '#e3f5ec',
                borderBottom: `2.5px solid ${C.ink}`,
                fontFamily: F.mono,
                fontSize: 19,
                fontWeight: 700,
                color: C.mintDeep,
              }}
            >
              <span>#</span>
              <span>TITLE</span>
              <span>ARTIST</span>
              <span>ALBUM</span>
              <span>STATUS</span>
            </div>
            <div
              style={{
                height: 228,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `translateY(-${excelScrollY}px)`,
                }}
              >
                {DEMO_PLAYLIST.tracks.slice(0, 8).map((t, i) => {
                  const rowIn = easeOut(frame, excelFrame + Math.min(3, i) * 4, 15);
                  return (
                    <div
                      key={t.index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '64px 1.25fr 0.85fr 1fr 110px',
                        alignItems: 'center',
                        padding: '12px 18px',
                        borderBottom: `2px solid ${C.line}`,
                        backgroundColor: i % 2 === 0 ? 'rgba(223, 246, 236, 0.25)' : C.paperWhite,
                        opacity: rowIn,
                        fontFamily: F.sans,
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.ink,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontFamily: F.mono, fontSize: 19, color: C.inkMuted }}>
                        {String(t.index).padStart(2, '0')}
                      </span>
                      <span style={{ fontWeight: 900 }}>{t.title}</span>
                      <span style={{ color: C.inkSoft }}>{t.artist}</span>
                      <span style={{ fontSize: 19, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.album}
                      </span>
                      <span
                        style={{
                          fontSize: 19,
                          fontWeight: 800,
                          color: t.vip ? C.yellowDeep : C.mintDeep,
                        }}
                      >
                        {t.vip ? 'VIP专享' : '正常'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 16,
            }}
          >
            {['保留原始顺序', '状态 / VIP 标定', '双表分离更兼容'].map((item) => (
              <span
                key={item}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 12,
                  backgroundColor: C.paperCream,
                  border: `2.2px solid ${C.ink}`,
                  fontFamily: F.sans,
                  fontSize: 19.5,
                  fontWeight: 800,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                <HandCheck size={19} color={C.mintDeep} />
                {item}
              </span>
            ))}
          </div>
        </JournalCard>
      </div>

      {/* ================= RIGHT HERO CARD: CANONICAL JSON (.JSON) ================= */}
      <div
        style={{
          position: 'absolute',
          left: 1018,
          top: 140,
          width: 820,
          height: 618,
          opacity: easeOut(frame, jsonFrame - 20, 16),
          transform: `translateX(${(1 - jsonCardIn) * 60}px) rotate(0.6deg)`,
          zIndex: 21,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          tapePos="top-right"
          tapeColor={C.tapeCyan}
          shadow="cutoutLg"
          style={{ width: '100%', height: '100%', padding: '24px 28px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottom: `3px dashed ${C.line}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 16,
                  backgroundColor: C.blue,
                  border: `3.2px solid ${C.ink}`,
                  boxShadow: SHADOW.cutoutSm,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: F.mono,
                  fontSize: 25,
                  fontWeight: 900,
                  color: C.blueDeep,
                }}
              >
                {'{ }'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 31, fontWeight: 900, color: C.ink }}>
                    Canonical JSON 标准格式
                  </span>
                  <StickyBadge bg={C.blue} ink={C.blueDeep} fontSize={18} rotate={-1}>
                    ★ 播放器与程序接入
                  </StickyBadge>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 18.5,
                    fontWeight: 700,
                    color: C.inkSoft,
                    marginTop: 4,
                  }}
                >
                  {DEMO_PLAYLIST.jsonFile}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '18px 24px',
              borderRadius: 16,
              backgroundColor: '#f0f8fc',
              border: `3px solid ${C.ink}`,
              fontFamily: F.mono,
              fontSize: 21,
              fontWeight: 700,
              lineHeight: 1.56,
              color: C.ink,
              overflow: 'hidden',
            }}
          >
            {JSON_PREVIEW_LINES.map((line, i) => {
              const lineIn = easeOut(frame, jsonFrame - 6 + i * 3, 14);
              return (
                <div
                  key={i}
                  style={{
                    opacity: lineIn,
                    transform: `translateX(${(1 - lineIn) * 16}px)`,
                    whiteSpace: 'pre',
                  }}
                >
                  {line.split('"').map((part, idx) =>
                    idx % 2 === 1 ? (
                      <span
                        key={idx}
                        style={{
                          color: part === 'qqmusic' ? '#b84128' : '#1b588c',
                        }}
                      >
                        "{part}"
                      </span>
                    ) : (
                      <span key={idx}>{part}</span>
                    ),
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              padding: '12px 18px',
              borderRadius: 12,
              backgroundColor: C.blue,
              border: `2.5px solid ${C.ink}`,
              fontFamily: F.sans,
              fontSize: 20.5,
              fontWeight: 800,
              color: C.blueDeep,
            }}
          >
            <span>🔌 统一 Schema：跨平台输出同一套标准字段</span>
            <span style={{ fontFamily: F.kuaile, fontSize: 23 }}>一套结构，处处通行 ♪</span>
          </div>
        </JournalCard>
      </div>

      {/* ================= BOTTOM DOCK: ALL 6 SUPPORTED FORMATS FAN ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 792,
          width: 1676,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 18,
          zIndex: 25,
        }}
      >
        {EXPORT_FORMATS.map((fmt, idx) => {
          const pop = easeBackOut(frame, fanFrame - 12 + idx * 4, 18);
          return (
            <div
              key={fmt.id}
              style={{
                opacity: easeOut(frame, fanFrame - 12 + idx * 4, 12),
                transform: `translateY(${(1 - pop) * 44}px) rotate(${idx % 2 === 0 ? -1 : 1}deg)`,
              }}
            >
              <JournalCard
                bg={fmt.bg}
                shadow="cutout"
                style={{
                  padding: '18px 18px',
                  height: 222,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: F.sans,
                        fontSize: 28,
                        fontWeight: 900,
                        color: C.ink,
                      }}
                    >
                      {fmt.name}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: C.paperWhite,
                        border: `2.2px solid ${C.ink}`,
                        fontFamily: F.mono,
                        fontSize: 18.5,
                        fontWeight: 700,
                        color: fmt.ink,
                      }}
                    >
                      {fmt.ext}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: F.sans,
                      fontSize: 19.5,
                      fontWeight: 700,
                      color: C.inkSoft,
                      lineHeight: 1.38,
                    }}
                  >
                    {fmt.desc}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 21,
                    color: fmt.ink,
                  }}
                >
                  ✦ {fmt.tag}
                </div>
              </JournalCard>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
