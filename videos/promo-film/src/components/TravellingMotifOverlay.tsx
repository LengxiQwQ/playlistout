import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { easeInOutCubic, lerp, rangeProgress } from '../utils/motion';

const FONT_DEFS = [
  { family: 'Ma Shan Zheng', file: 'fonts/MaShanZheng-Regular.woff', weight: '400' },
  { family: 'ZCOOL KuaiLe', file: 'fonts/ZCOOLKuaiLe-Regular.woff', weight: '400' },
  { family: 'Caveat', file: 'fonts/Caveat-Bold.woff', weight: '700' },
  { family: 'Permanent Marker', file: 'fonts/PermanentMarker-Regular.woff', weight: '400' },
  { family: 'Space Mono', file: 'fonts/SpaceMono-Regular.woff', weight: '400' },
  { family: 'Space Mono', file: 'fonts/SpaceMono-Bold.woff', weight: '700' },
];

export const useJournalFontsLoaded = () => {
  const [handle] = useState(() => delayRender('Loading Music Journal Fonts'));

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        if (typeof FontFace !== 'undefined' && typeof document !== 'undefined') {
          await Promise.all(
            FONT_DEFS.map(async (f) => {
              const ff = new FontFace(f.family, `url(${staticFile(f.file)})`, {
                weight: f.weight,
                style: 'normal',
              });
              const loaded = await ff.load();
              document.fonts.add(loaded);
            }),
          );
          await document.fonts.ready;
        }
      } catch (err) {
        console.warn('Font preload warning:', err);
      } finally {
        if (!cancelled) {
          continueRender(handle);
        }
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [handle]);
};

interface BridgeWindow {
  start: number;
  end: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  tag: string;
}

const BRIDGES: BridgeWindow[] = [
  {
    start: 182,
    end: 235,
    fromX: 960,
    fromY: 420,
    toX: 520,
    toY: 225,
    label: '♪ 歌单脱困 · 进入解析栏',
    tag: '104 首',
  },
  {
    start: 552,
    end: 598,
    fromX: 980,
    fromY: 540,
    toX: 740,
    toY: 165,
    label: '♪ 解析完成 · 准备多格式导出',
    tag: 'XLSX / JSON',
  },
  {
    start: 830,
    end: 874,
    fromX: 1180,
    fromY: 490,
    toX: 480,
    toY: 210,
    label: '♪ 不止单张 · 12 张歌单批量汇聚',
    tag: '1,420 首',
  },
  {
    start: 1128,
    end: 1172,
    fromX: 1450,
    fromY: 430,
    toX: 540,
    toY: 465,
    label: '♪ 网页之外 · 终端 CLI 本地直连',
    tag: 'CLI v3.0.0',
  },
  {
    start: 1442,
    end: 1484,
    fromX: 760,
    fromY: 820,
    toX: 460,
    toY: 265,
    label: '♪ 携带导出文件 · 前往开源播放器',
    tag: 'Ecosystem',
  },
  {
    start: 1585,
    end: 1624,
    fromX: 640,
    fromY: 440,
    toX: 960,
    toY: 165,
    label: '♪ 把你的歌单带走',
    tag: 'Playlist Out',
  },
];

export const TravellingMotifOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const activeBridge = BRIDGES.find((b) => frame >= b.start && frame <= b.end);
  if (!activeBridge) return null;

  const t = easeInOutCubic(rangeProgress(frame, activeBridge.start, activeBridge.end));
  const arcLift = Math.sin(t * Math.PI) * -68;
  const x = lerp(activeBridge.fromX, activeBridge.toX, t);
  const y = lerp(activeBridge.fromY, activeBridge.toY, t) + arcLift;
  const rot = Math.sin(t * Math.PI * 2) * 5;
  const opacity = Math.sin(t * Math.PI);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 80,
      }}
    >
      <div
        className="hand-border shadow-cutout"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${0.92 + Math.sin(t * Math.PI) * 0.12})`,
          opacity,
          backgroundColor: '#fff8bd',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            backgroundColor: '#fbbf24',
            border: '2px solid #2d3436',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            color: '#2d3436',
          }}
        >
          ♪
        </span>
        <span className="font-playful" style={{ fontSize: 16, fontWeight: 700, color: '#2d3436' }}>
          {activeBridge.label}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: '#ffffff',
            border: '1.5px solid #2d3436',
            borderRadius: 6,
            padding: '1px 7px',
            color: '#d97706',
          }}
        >
          {activeBridge.tag}
        </span>
      </div>
    </div>
  );
};
