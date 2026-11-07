import React from 'react';
import { interpolate } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  MarkerHighlight,
  PaperCard,
  StickerBadge,
  WashiTape,
  type StickerColor,
} from '../components/JournalPrimitives';

interface SecondaryFormatCard {
  ext: string;
  title: string;
  badge: string;
  desc: string;
  snippet: string;
  color: StickerColor;
  bg: string;
  rot: number;
  appearFrame: number;
}

const SECONDARY_FORMATS: SecondaryFormatCard[] = [
  {
    ext: '.csv',
    title: 'CSV 通用表格',
    badge: 'UTF-8 BOM 防乱码',
    desc: '适合迁移工具、数据分析与跨软件导入',
    snippet: 'title,artist,album,isrc,duration,vip,status',
    color: 'pink',
    bg: COLORS.notePink,
    rot: -1.6,
    appearFrame: 735,
  },
  {
    ext: '.txt',
    title: 'TXT 纯文本清单',
    badge: '清爽人类可读',
    desc: '适合快速查看、记事本备份与文本分享',
    snippet: '春日影 - MyGO!!!!! - 跡暖空',
    color: 'yellow',
    bg: COLORS.noteYellow,
    rot: 1.2,
    appearFrame: 750,
  },
  {
    ext: '.m3u8',
    title: 'M3U8 播放列表',
    badge: 'Extended M3U 标准',
    desc: '适合兼容 M3U8 的本地播放器与媒体库',
    snippet: '#EXTINF:258,MyGO!!!!! - 春日影',
    color: 'purple',
    bg: COLORS.noteLavender,
    rot: -1.1,
    appearFrame: 765,
  },
  {
    ext: '.md',
    title: 'Markdown 笔记',
    badge: 'GFM 表格直存',
    desc: '完美兼容 Obsidian、Notion 与个人博客',
    snippet: '| # | 歌曲名 | 歌手 | 专辑 | 状态 |',
    color: 'green',
    bg: COLORS.noteMint,
    rot: 1.5,
    appearFrame: 780,
  },
];

export const Act3MultiFormatExport: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 560 || frame > 872) return null;

  const enterProg = smoothStep(frame, 560, 584, 0, 1);
  const exitProg = smoothStep(frame, 845, 870, 0, 1);
  const sceneOpacity = enterProg * (1 - exitProg);

  // Origami unfold for Excel (starts at 575) and JSON (starts at 610)
  const excelUnfold = journalSpring(frame, 575, { damping: 13, stiffness: 140 });
  const jsonUnfold = journalSpring(frame, 608, { damping: 13, stiffness: 140 });

  // Dual-tab toggle on Excel card: shows Tracks first, then reveals Playlist Info tab at frame 660
  const showInfoSplit = smoothStep(frame, 655, 682, 0, 1);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        transform: `translateY(${(1 - enterProg) * 45 - exitProg * 55}px)`,
      }}
    >
      {/* Top Section Title */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 60,
          top: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
          opacity: smoothStep(frame, 574, 588, 0, 1) * (1 - smoothStep(frame, 840, 854, 0, 1)),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, whiteSpace: 'nowrap' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: FONTS.handwriting,
              fontSize: 44,
              fontWeight: 700,
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            一份歌单，折成你需要的{' '}
            <MarkerHighlight frame={frame} startFrame={582} color={COLORS.highlightYellow}>
              任何格式
            </MarkerHighlight>
          </h2>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 19,
              fontWeight: 600,
              color: COLORS.inkLight,
              whiteSpace: 'nowrap',
            }}
          >
            浏览器本地生成 · 支持多选一键导出与剪贴板快捷复制
          </span>
        </div>

        <StickerBadge color="cyan" rotateDeg={1.5} font="mono" style={{ fontSize: 16 }}>
          🔒 本地内存构建 · 零云端上传
        </StickerBadge>
      </div>

      {/* ==================== HERO FORMATS ROW: EXCEL (.XLSX) & CANONICAL JSON ==================== */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 65,
          top: 162,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 34,
          perspective: 1400,
        }}
      >
        {/* 1. LEFT HERO: EXCEL (.XLSX) DUAL-WORKSHEET CARD */}
        <div
          style={{
            transform: `rotateY(${(1 - excelUnfold) * -35}deg) rotateX(${(1 - excelUnfold) * 20}deg) scale(${0.86 + 0.14 * excelUnfold}) rotate(-0.6deg)`,
            transformOrigin: 'center top',
            position: 'relative',
          }}
        >
          <WashiTape
            color="green"
            width={140}
            height={30}
            rotateDeg={-6}
            frame={frame}
            appearFrame={585}
            style={{ position: 'absolute', top: -14, left: 36, zIndex: 25 }}
          />

          <PaperCard bg="#ffffff" cutoutShadow={true} style={{ padding: '24px 28px', height: 445 }}>
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      backgroundColor: '#15803d',
                      color: '#fff',
                      fontFamily: FONTS.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: 6,
                      border: `2px solid ${COLORS.ink}`,
                    }}
                  >
                    Excel (.xlsx)
                  </span>
                  <StickerBadge color="green" rotateDeg={1} style={{ fontSize: 16, padding: '2px 12px' }}>
                    ★ 推荐 · 曲库整理与长期归档
                  </StickerBadge>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: FONTS.mono,
                    fontSize: 17,
                    fontWeight: 700,
                    color: COLORS.inkLight,
                  }}
                >
                  📄 【QQ 音乐】花谱、鎖那、鹿乃精选 - 琴心月满.xlsx
                </div>
              </div>
            </div>

            {/* Dual Worksheet Visual Container */}
            <div style={{ marginTop: 14, position: 'relative', height: 270 }}>
              {/* Sheet 1: Tracks Table */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: `2px solid ${COLORS.ink}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  transform: `translateY(${showInfoSplit * -6}px) scale(${1 - showInfoSplit * 0.03})`,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1.1fr 1.1fr 70px 95px',
                    backgroundColor: '#dcfce7',
                    borderBottom: `2px solid ${COLORS.ink}`,
                    padding: '7px 14px',
                    fontFamily: FONTS.mono,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#14532d',
                  }}
                >
                  <span>title</span>
                  <span>artist</span>
                  <span>album</span>
                  <span>vip</span>
                  <span>status</span>
                </div>
                {[
                  ['春日影', 'MyGO!!!!!', '跡暖空', 'false', 'playable'],
                  ['命に嫌われている', '花谱', '観測 α', 'true', 'playable'],
                  ['どんな結末がお望みだい?', '鎖那', 'Hush a by', 'false', 'playable'],
                  ['夜に駆ける (Acoustic)', '鹿乃', 'yuanfen', 'false', 'unplayable'],
                ].map((row, rIdx) => (
                  <div
                    key={rIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1.1fr 1.1fr 70px 95px',
                      padding: '7px 14px',
                      borderBottom: rIdx < 3 ? '1px solid #e2e8f0' : 'none',
                      fontFamily: FONTS.sans,
                      fontSize: 16,
                      fontWeight: 600,
                      color: row[4] === 'unplayable' ? '#991b1b' : COLORS.ink,
                      backgroundColor: row[4] === 'unplayable' ? '#fef2f2' : '#ffffff',
                    }}
                  >
                    <span>{row[0]}</span>
                    <span style={{ color: COLORS.inkLight }}>{row[1]}</span>
                    <span style={{ color: COLORS.inkMuted }}>{row[2]}</span>
                    <span style={{ fontFamily: FONTS.mono, color: row[3] === 'true' ? '#b45309' : '#64748b' }}>
                      {row[3]}
                    </span>
                    <span style={{ fontFamily: FONTS.mono, fontWeight: 700 }}>{row[4]}</span>
                  </div>
                ))}
              </div>

              {/* Sheet 2: Playlist Info Pop-up Drawer (Unfolds at frame 655) */}
              {frame >= 650 && (
                <div
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: 8,
                    width: 440,
                    backgroundColor: COLORS.noteYellow,
                    border: `2.5px solid ${COLORS.ink}`,
                    borderRadius: 10,
                    boxShadow: '4px 4px 0 #2d3436',
                    padding: '10px 16px',
                    transform: `scale(${0.85 + 0.15 * showInfoSplit}) rotate(1.2deg)`,
                    opacity: showInfoSplit,
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#854d0e',
                      marginBottom: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>🗂️ Sheet 2: Playlist Info (元数据独立分表)</span>
                    <span>不污染歌曲行 ✓</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr',
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      color: COLORS.ink,
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: COLORS.inkLight }}>name:</span>
                    <span>花谱、鎖那、鹿乃精选</span>
                    <span style={{ color: COLORS.inkLight }}>platform:</span>
                    <span>qqmusic (104 tracks)</span>
                    <span style={{ color: COLORS.inkLight }}>exportedAt:</span>
                    <span>2026-11-07 Local Browser</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Excel Worksheet Tabs Bar */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                <div
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#dcfce7',
                    border: `2px solid ${COLORS.ink}`,
                    borderRadius: '6px 6px 0 0',
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#166534',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sheet 1: Tracks (曲目表)
                </div>
                <div
                  style={{
                    padding: '5px 12px',
                    backgroundColor: showInfoSplit > 0.3 ? COLORS.noteYellowDark : '#f1f5f9',
                    border: `2px solid ${COLORS.ink}`,
                    borderRadius: '6px 6px 0 0',
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.ink,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sheet 2: Playlist Info (元数据)
                </div>
              </div>
              <span
                style={{
                  fontFamily: FONTS.handwriting,
                  fontSize: 19,
                  color: '#15803d',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                双工作表设计 · 兼顾阅读与导入
              </span>
            </div>
          </PaperCard>
        </div>

        {/* 2. RIGHT HERO: CANONICAL JSON (.JSON) CARD */}
        <div
          style={{
            transform: `rotateY(${(1 - jsonUnfold) * 35}deg) rotateX(${(1 - jsonUnfold) * 20}deg) scale(${0.86 + 0.14 * jsonUnfold}) rotate(0.6deg)`,
            transformOrigin: 'center top',
            position: 'relative',
          }}
        >
          <WashiTape
            color="cyan"
            width={140}
            height={30}
            rotateDeg={5}
            frame={frame}
            appearFrame={615}
            style={{ position: 'absolute', top: -14, right: 36, zIndex: 25 }}
          />

          <PaperCard bg="#ffffff" altBorder={true} cutoutShadow={true} style={{ padding: '24px 28px', height: 445 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      backgroundColor: '#1d4ed8',
                      color: '#fff',
                      fontFamily: FONTS.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: 6,
                      border: `2px solid ${COLORS.ink}`,
                    }}
                  >
                    Canonical JSON (.json)
                  </span>
                  <StickerBadge color="blue" rotateDeg={-1} style={{ fontSize: 16, padding: '2px 12px' }}>
                    ★ 推荐 · 播放器、插件与脚本标准协议
                  </StickerBadge>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: FONTS.mono,
                    fontSize: 17,
                    fontWeight: 700,
                    color: COLORS.inkLight,
                  }}
                >
                  🧩 【QQ 音乐】花谱、鎖那、鹿乃精选 - 琴心月满.json
                </div>
              </div>
            </div>

            {/* Structured JSON Code Block with Warm Stationery Callouts */}
            <div
              style={{
                marginTop: 14,
                backgroundColor: '#181c22',
                border: `2.5px solid ${COLORS.ink}`,
                borderRadius: 12,
                padding: '16px 22px',
                fontFamily: FONTS.mono,
                fontSize: 16,
                lineHeight: 1.52,
                color: '#e2e8f0',
                position: 'relative',
                height: 270,
              }}
            >
              <div>
                <span style={{ color: '#94a3b8' }}>{'{'}</span>
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span style={{ color: '#7dd3fc' }}>"name"</span>:{' '}
                <span style={{ color: '#fde047' }}>"花谱、鎖那、鹿乃 · 日系女声精选集"</span>,
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span style={{ color: '#7dd3fc' }}>"platform"</span>:{' '}
                <span style={{ color: '#86efac' }}>"qqmusic"</span>,{' '}
                <span style={{ color: '#7dd3fc' }}>"trackCount"</span>:{' '}
                <span style={{ color: '#f472b6' }}>104</span>,
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span style={{ color: '#7dd3fc' }}>"tracks"</span>: [
              </div>
              <div style={{ paddingLeft: 40 }}>
                {'{ '}
                <span style={{ color: '#7dd3fc' }}>"title"</span>:{' '}
                <span style={{ color: '#fde047' }}>"春日影"</span>,{' '}
                <span style={{ color: '#7dd3fc' }}>"artist"</span>:{' '}
                <span style={{ color: '#fde047' }}>"MyGO!!!!!"</span>,
              </div>
              <div style={{ paddingLeft: 48 }}>
                <span style={{ color: '#7dd3fc' }}>"album"</span>:{' '}
                <span style={{ color: '#fde047' }}>"跡暖空"</span>,{' '}
                <span style={{ color: '#7dd3fc' }}>"vip"</span>:{' '}
                <span style={{ color: '#f472b6' }}>false</span>,{' '}
                <span style={{ color: '#7dd3fc' }}>"status"</span>:{' '}
                <span style={{ color: '#86efac' }}>"playable"</span>
                {' },'}
              </div>
              <div style={{ paddingLeft: 40, color: '#94a3b8' }}>
                // ... 6 大音乐平台统一字段，零冗余嵌套
              </div>
              <div style={{ paddingLeft: 20 }}>]</div>
              <div>
                <span style={{ color: '#94a3b8' }}>{'}'}</span>
              </div>

              {/* Pinned Sticky Callout on JSON */}
              <div
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 14,
                  backgroundColor: COLORS.noteBlue,
                  border: `2px solid ${COLORS.ink}`,
                  borderRadius: 8,
                  boxShadow: '3px 3px 0 #000',
                  padding: '6px 14px',
                  fontFamily: FONTS.handwriting,
                  fontSize: 21,
                  fontWeight: 700,
                  color: '#1e3a8a',
                  transform: 'rotate(-2deg)',
                }}
              >
                一套 Schema · 读遍六大平台 ✦
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: FONTS.sans,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.inkLight,
              }}
            >
              <span>✓ 平铺通用字段 (title / artist / album / isrc)</span>
              <span style={{ fontFamily: FONTS.handwriting, fontSize: 21, color: '#1d4ed8', fontWeight: 700 }}>
                开源播放器与自动化脚本即插即用
              </span>
            </div>
          </PaperCard>
        </div>
      </div>

      {/* ==================== 4 SUPPORTING FORMAT CARDS ROW (CSV, TXT, M3U8, MARKDOWN) ==================== */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 65,
          top: 642,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
        }}
      >
        {SECONDARY_FORMATS.map((fmt) => {
          const pop = snappySpring(frame, fmt.appearFrame);
          const vis = Math.min(1, Math.max(0, (frame - fmt.appearFrame) / 6));

          return (
            <div
              key={fmt.ext}
              style={{
                backgroundColor: fmt.bg,
                border: `3px solid ${COLORS.ink}`,
                borderRadius: BORDERS.handDrawnSubtle,
                boxShadow: SHADOWS.cutoutSm,
                padding: '18px 22px',
                opacity: vis,
                transform: `translateY(${(1 - pop) * 35}px) scale(${0.85 + 0.15 * pop}) rotate(${fmt.rot}deg)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 225,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.ink,
                      backgroundColor: '#ffffff',
                      padding: '2px 10px',
                      borderRadius: 6,
                      border: `2px solid ${COLORS.ink}`,
                    }}
                  >
                    {fmt.ext}
                  </span>
                  <StickerBadge color={fmt.color} rotateDeg={0} style={{ fontSize: 15, padding: '2px 10px' }}>
                    {fmt.badge}
                  </StickerBadge>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontFamily: FONTS.sans,
                    fontSize: 22,
                    fontWeight: 800,
                    color: COLORS.ink,
                  }}
                >
                  {fmt.title}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontFamily: FONTS.sans,
                    fontSize: 16,
                    lineHeight: 1.4,
                    color: COLORS.inkLight,
                    fontWeight: 600,
                  }}
                >
                  {fmt.desc}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(255,255,255,0.78)',
                  border: `1.5px dashed ${COLORS.inkLight}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontFamily: FONTS.mono,
                  fontSize: 13.5,
                  color: COLORS.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fmt.snippet}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Quick-Copy & Player-Format Ribbon */}
      {frame >= 790 && (
        <div
          style={{
            position: 'absolute',
            left: 155,
            right: 65,
            bottom: 34,
            display: 'flex',
            justifyContent: 'center',
            opacity: smoothStep(frame, 790, 810, 0, 1),
            transform: `scale(${0.92 + 0.08 * snappySpring(frame, 790)})`,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.paperCream,
              border: `2.5px solid ${COLORS.ink}`,
              borderRadius: 999,
              boxShadow: '3px 3px 0 #2d3436',
              padding: '8px 28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 18,
              fontFamily: FONTS.sans,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.ink,
            }}
          >
            <span>📋 还支持剪贴板一键复制：</span>
            <span style={{ color: COLORS.qqGreen }}>「仅歌名」</span>
            <span>·</span>
            <span style={{ color: COLORS.kugouBlue }}>「歌名 - 歌手」</span>
            <span>·</span>
            <span style={{ color: COLORS.amber }}>「歌名 - 歌手 - 专辑」</span>
            <span>·</span>
            <span style={{ color: COLORS.miguPink }}>「洛雪 / Listen 1 专用格式直出」</span>
          </div>
        </div>
      )}
    </div>
  );
};
