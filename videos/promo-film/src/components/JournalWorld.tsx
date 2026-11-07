import React from 'react';
import { Img, staticFile } from 'remotion';
import { WashiTape, JournalSticker } from './Stationery';
import { beatPulse, easeInOutCubic, rangeProgress, springPop } from '../utils/motion';

export interface JournalWorldProps {
  frame: number;
  children: React.ReactNode;
}

/**
 * Compute smooth vertical paper scroll offset across the 56s film so the viewer
 * feels like we are gliding down & across one continuous Music Journal notebook page!
 */
export function getJournalPaperScrollY(frame: number): number {
  const s1 = easeInOutCubic(rangeProgress(frame, 180, 260)) * 76;
  const s2 = easeInOutCubic(rangeProgress(frame, 540, 610)) * 114;
  const s3 = easeInOutCubic(rangeProgress(frame, 815, 880)) * 114;
  const s4 = easeInOutCubic(rangeProgress(frame, 1115, 1180)) * 114;
  const s5 = easeInOutCubic(rangeProgress(frame, 1435, 1495)) * 114;
  const s6 = easeInOutCubic(rangeProgress(frame, 1585, 1635)) * -228;
  return s1 + s2 + s3 + s4 + s5 + s6;
}

function getChapterLabel(frame: number): { num: string; text: string; tag: string } {
  if (frame < 220) {
    return { num: '01', text: '歌单不该被困在单一平台', tag: '六大主流音乐平台公开歌单解析' };
  }
  if (frame < 570) {
    return { num: '02', text: '网页一键解析 · 粘贴即现', tag: '无需注册 · 完整曲目与状态标定' };
  }
  if (frame < 840) {
    return { num: '03', text: '多格式本地导出 · 数据折纸', tag: 'Excel · JSON · CSV · TXT · M3U8 · MD' };
  }
  if (frame < 1140) {
    return { num: '04', text: '用户歌单合集 · 批量打包带走', tag: '多工作表 Excel 合一 & ZIP 归档' };
  }
  if (frame < 1455) {
    return { num: '05', text: '桌面 CLI 独立版 · 跨平台运行', tag: 'Windows · macOS · Linux · 交互 & 命令双模式' };
  }
  if (frame < 1600) {
    return { num: '06', text: '把歌单带进更多地方 ♪', tag: '开源播放器接入 · 迁移交接 · Public API' };
  }
  return { num: '07', text: '把你的歌单带走 · Playlist Out', tag: 'playlistout.lengxiqwq.com · MIT 开源' };
}

export const JournalWorld: React.FC<JournalWorldProps> = ({ frame, children }) => {
  const scrollY = getJournalPaperScrollY(frame);
  const pulse = beatPulse(frame, 1);
  const headerEntrance = springPop(frame, 95, { damping: 14, stiffness: 120 });
  const chapter = getChapterLabel(frame);

  // Modulo 76px (2 ruled lines) for infinite seamless binder holes & ruled lines
  const patternOffsetY = -(scrollY % 76);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f6f1e5',
        color: '#2d3436',
        fontFamily: 'var(--font-sans)',
        userSelect: 'none',
      }}
    >
      {/* 1. Continuous Ruled Notebook Paper + Real Paper Grain Texture */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -152,
          bottom: -152,
          transform: `translateY(${patternOffsetY}px)`,
          backgroundImage: `
            url('${staticFile('images/paper-creases.png')}'),
            url('${staticFile('images/paper-grain.png')}'),
            linear-gradient(to bottom, transparent 36.5px, #e2dacd 36.5px, #e2dacd 38px)
          `,
          backgroundSize: '1024px 1024px, 256px 256px, 100% 38px',
          pointerEvents: 'none',
        }}
      />

      {/* 2. Warm Cinema Sunlight & Ambient Paper Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at ${52 + Math.sin(frame * 0.015) * 6}% ${34 + Math.cos(frame * 0.012) * 5}%, rgba(255, 252, 235, 0.52) 0%, rgba(246, 241, 229, 0.08) 58%, rgba(65, 48, 12, 0.11) 100%),
            linear-gradient(128deg, rgba(255, 248, 210, 0.24) 0%, transparent 45%, rgba(45, 52, 54, 0.05) 100%)
          `,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. Left Loose-Leaf Binder Spine Holes (Authentic 30px holes, 76px pitch) */}
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: -76 + patternOffsetY,
          width: 34,
          display: 'flex',
          flexDirection: 'column',
          gap: 46,
          zIndex: 15,
          opacity: 0.56,
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '3px solid #8a8f92',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              boxShadow:
                'inset 2px 2px 3px rgba(45, 52, 54, 0.28), inset -1px -1px 2px rgba(255, 255, 255, 0.6), 1px 1px 2px rgba(45, 52, 54, 0.12)',
            }}
          />
        ))}
      </div>

      {/* 4. Vertical Coral-Red Margin Line */}
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 0,
          bottom: 0,
          width: 2.5,
          backgroundColor: '#ff8a80',
          opacity: 0.82,
          zIndex: 15,
          pointerEvents: 'none',
        }}
      />

      {/* 5. Parallax Background Stationery Doodles (from BackgroundDecorations.tsx) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <div style={{ position: 'absolute', bottom: 26, left: 116 }}>
          <JournalSticker
            color="blue"
            rotateDeg={-4 + Math.sin(frame * 0.04) * 1.2}
            style={{ opacity: 0.78, fontSize: 13, padding: '3px 10px' }}
          >
            🎵 music journal
          </JournalSticker>
        </div>

        <div style={{ position: 'absolute', top: 108, right: 64 }}>
          <WashiTape color="yellow" rotateDeg={22} width={78} height={22} style={{ opacity: 0.68 }} />
        </div>

        <div
          className="font-en-marker"
          style={{
            position: 'absolute',
            top: 235,
            left: 108,
            fontSize: 34,
            color: '#cbd5e1',
            opacity: 0.65,
            transform: `rotate(${-8 + pulse * 4}deg)`,
          }}
        >
          ♪
        </div>

        <div
          style={{
            position: 'absolute',
            top: 470,
            left: 105,
            fontSize: 32,
            color: '#fca5a5',
            opacity: 0.55,
            transform: `rotate(${6 - pulse * 3}deg)`,
          }}
        >
          ❥
        </div>

        <div
          style={{
            position: 'absolute',
            top: 690,
            right: 48,
            fontSize: 38,
            color: '#fde047',
            opacity: 0.85,
            textShadow: '2px 2px 0 rgba(45,52,54,0.18)',
            transform: `scale(${1 + pulse * 0.08}) rotate(12deg)`,
          }}
        >
          ★
        </div>

        <div style={{ position: 'absolute', bottom: 84, left: 112 }}>
          <WashiTape color="pink" rotateDeg={11} width={86} height={24} style={{ opacity: 0.62 }} />
        </div>

        <div style={{ position: 'absolute', bottom: 72, right: 56 }}>
          <JournalSticker
            color="white"
            rotateDeg={-5}
            style={{ opacity: 0.78, fontSize: 13, padding: '3px 10px', fontFamily: 'var(--font-mono)' }}
          >
            PLAYLIST OUT · v3.0
          </JournalSticker>
        </div>
      </div>

      {/* 6. Persistent Top Website Header Bar (matches Screenshot 2 & Header.tsx) */}
      {frame >= 95 && (
        <header
          style={{
            position: 'absolute',
            left: 116,
            right: 56,
            top: 14,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 90,
            opacity: Math.min(1, headerEntrance),
            transform: `translateY(${(1 - headerEntrance) * -28}px)`,
          }}
        >
          {/* Left: Logo + Playlist Out + Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="hand-border-subtle shadow-cutout-sm"
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                backgroundColor: '#fff8bd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transform: 'rotate(-2deg)',
              }}
            >
              <Img
                src={staticFile('images/logo-128.png')}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                className="font-en-marker"
                style={{ fontSize: 24, lineHeight: 1.05, color: '#2d3436', letterSpacing: '0.01em' }}
              >
                Playlist Out
              </span>
              <span
                className="font-playful"
                style={{ fontSize: 14, color: '#636e72', marginTop: 2 }}
              >
                粘贴 · 解析 · 导出
              </span>
            </div>
          </div>

          {/* Center: Subtle Hand-Written Chapter Note Pill */}
          <div
            className="hand-border-subtle paper-textured"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 18px',
              backgroundColor: 'rgba(255, 253, 245, 0.92)',
              boxShadow: '2px 3px 0 rgba(45, 52, 54, 0.18)',
              transform: 'rotate(-0.4deg)',
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: 13,
                fontWeight: 700,
                backgroundColor: '#ffeaa7',
                color: '#2d3436',
                padding: '2px 7px',
                borderRadius: 4,
                border: '1.5px solid #2d3436',
              }}
            >
              #{chapter.num}
            </span>
            <span className="font-playful" style={{ fontSize: 17, color: '#2d3436', fontWeight: 700 }}>
              {chapter.text}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span className="font-sans" style={{ fontSize: 13.5, color: '#576064', fontWeight: 600 }}>
              {chapter.tag}
            </span>
          </div>

          {/* Right: Authentic Header Action Stickers from Screenshot 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <JournalSticker
              color="pink"
              rotateDeg={-0.8}
              className="font-playful"
              style={{ fontSize: 14.5, padding: '5px 12px' }}
            >
              ⬇ 下载桌面版
            </JournalSticker>
            <JournalSticker
              color="white"
              rotateDeg={0.6}
              className="font-playful"
              style={{ fontSize: 14.5, padding: '5px 12px' }}
            >
              ☆ Star 支持一下
            </JournalSticker>
            <JournalSticker
              color="yellow"
              rotateDeg={-0.5}
              className="font-playful"
              style={{ fontSize: 14.5, padding: '5px 12px' }}
            >
              毛笔手账 ▾
            </JournalSticker>
            <JournalSticker
              color="white"
              rotateDeg={0.8}
              className="font-mono"
              style={{ fontSize: 13.5, padding: '5px 10px' }}
            >
              中 / EN
            </JournalSticker>
          </div>
        </header>
      )}

      {/* 7. Main Stage Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
};
