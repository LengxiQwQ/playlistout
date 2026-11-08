import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { PLAYLIST } from '../data';
import { PaperSheet } from '../components/Paper';
import { Chapter, Footer, STAGE, paperBreath } from './UI';

type Line = { text: string; color?: string; bold?: boolean; gap?: number };

const lines: Line[] = [
  { text: 'Windows PowerShell', color: '#d8d2bf', bold: true },
  { text: 'PS C:\\Users\\LengxiQwQ> playlistout', color: '#d6d1bf' },
  { text: '把你的歌单带走 · 命令行版', color: '#e5bd78', bold: true },
  { text: '平台：QQ / 网易云 / 酷狗 / 酷我 / 汽水 / 咪咕', color: '#9fb7a7' },
  { text: '粘贴歌单链接，或输入平台编号：', color: '#c7c4b7' },
  { text: `> ${PLAYLIST.sourceUrl}`, color: '#c7e3d2' },
  { text: '✅ 已识别：QQ 音乐', color: '#8fcf9e' },
  { text: '🔄 正在获取歌单... 104 首', color: '#d8b174' },
  { text: '📋 歌单详情', color: '#e5bd78', bold: true },
  { text: `歌单：${PLAYLIST.name}`, color: '#d5d0bf' },
  { text: `作者：${PLAYLIST.creator} · 时长：${PLAYLIST.duration} · 状态：${PLAYLIST.status}`, color: '#9a9d91' },
  { text: '导出格式', color: '#e5bd78', bold: true },
  { text: '1  Excel (.xlsx)   适合查看、整理和备份', color: '#d5d0bf' },
  { text: '2  JSON (.json)    适合第三方工具和程序导入', color: '#d5d0bf' },
  { text: '3  CSV (.csv)      适合表格软件和迁移工具', color: '#d5d0bf' },
  { text: '4  TXT (.txt)      简单的歌曲清单', color: '#d5d0bf' },
  { text: '5  M3U8 (.m3u8)    通用播放列表', color: '#d5d0bf' },
  { text: '选择格式，可多选，例如 (1, 2)：', color: '#c7c4b7' },
  { text: '> 1, 2', color: '#c7e3d2' },
  { text: '🚀 正在导出...', color: '#d5c39d' },
  { text: '✅ Excel  「QQ 音乐」花谱、鎖那、鹿乃 - 琴心月满.xlsx', color: '#8fcf9e' },
  { text: '✅ JSON   「QQ 音乐」花谱、鎖那、鹿乃 - 琴心月满.json', color: '#8fcf9e' },
  { text: 'Windows · macOS · Linux 本地运行 · 不下载音频，不抓歌词', color: '#8f9387' },
];

export const V4Cli: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Chapter
        kicker="CLI / THE LOCAL WAY"
        title="不想打开浏览器？终端见。"
        right={
          <>
            本地运行 · 直出文件 · 跨平台
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkMuted, marginTop: 4 }}>TYPE. TAKE. GO.</div>
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
          transform: `translateY(${(1 - enter) * 26}px)`,
          zIndex: 10,
          ...paperBreath(frame),
        }}
      >
        <PaperSheet
          tone="dark"
          shadow="paper"
          radius="7px 12px 8px 12px / 12px 7px 12px 8px"
          style={{ width: '100%', height: '100%', padding: 0, background: C.terminal }}
        >
          <div
            style={{
              height: 42,
              borderBottom: '1px solid rgba(255,255,255,.09)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 18px',
              gap: 8,
              fontFamily: F.mono,
              fontSize: 14,
              color: '#9b9c91',
            }}
          >
            <span style={{ display: 'flex', gap: 7, marginRight: 12 }}>
              {['#cc7b72', '#c2a45a', '#7fac82'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
            </span>
            <span style={{ flex: 1, textAlign: 'center' }}>Windows PowerShell — playlistout</span>
            <span>— □ ×</span>
          </div>
          <div style={{ padding: '14px 22px', fontFamily: F.mono, lineHeight: '1.3' }}>
            {lines.map((line, i) => (
              <div
                key={`${i}-${line.text.slice(0, 18)}`}
                style={{
                  fontFamily: F.mono,
                  fontSize: line.bold ? 25 : 24,
                  lineHeight: 1.3,
                  color: line.color ?? '#d5d0bf',
                  fontWeight: line.bold ? 700 : 400,
                  minHeight: line.gap ?? undefined,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {line.text}
              </div>
            ))}
            <div style={{ marginTop: 5, fontFamily: F.mono, fontSize: 15, color: '#8fcf9e' }}>● READY</div>
          </div>
        </PaperSheet>
      </div>
      <Footer left="不用等浏览器，也不用离开键盘。" right="TYPE. TAKE. GO." />
    </AbsoluteFill>
  );
};
