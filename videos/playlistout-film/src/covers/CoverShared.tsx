import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile } from 'remotion';
import { ASSETS } from '../assets';
import { C, F, SHADOW } from '../theme';
import { PlatformLogo, PlatformId } from '../components/BrandLogos';

const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'ZCOOLKuaiLe', url: staticFile('fonts/ZCOOLKuaiLe-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

export const useCoverAssets = () => {
  const [handle] = useState(() => delayRender('Loading Cover Assets'));

  useEffect(() => {
    const loadAll = async () => {
      try {
        if (typeof document !== 'undefined') {
          await Promise.all(
            fontDefs.map(async (def) => {
              const face = new FontFace(def.family, `url(${def.url})`, {
                weight: def.weight,
                style: 'normal',
              });
              await face.load();
              document.fonts.add(face);
            }),
          );
          await Promise.all([
            document.fonts.ready.catch(() => undefined),
            loadImage(ASSETS.logo512),
            loadImage(ASSETS.grain),
            loadImage(ASSETS.creases),
            loadImage(ASSETS.fibrePage),
            loadImage(ASSETS.covers.folkSong),
            loadImage(ASSETS.covers.folkPlaylist),
            loadImage(ASSETS.covers.animePlaylist),
            loadImage(ASSETS.covers.englishPlaylist),
            ...Object.values(ASSETS.platforms).map((p) => loadImage(p)),
          ]);
        }
      } finally {
        continueRender(handle);
      }
    };
    loadAll();
  }, [handle]);
};

/**
 * 手账高质感纸张背景基底，自适应任意宽高比例 (4:3 或 16:9)
 */
export const CoverPaperBackground: React.FC<{
  width: number;
  height: number;
  gridColor?: string;
  showHoles?: boolean;
}> = ({ width, height, gridColor = 'rgba(215, 195, 160, 0.32)', showHoles = true }) => {
  const holesCount = Math.floor(height / 85);
  const holes = Array.from({ length: holesCount }, (_, i) => i);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.paper,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Paper Fibre Texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ASSETS.fibrePage})`,
          backgroundSize: `${width}px ${height}px`,
          opacity: 0.82,
        }}
      />

      {/* 2. Paper Creases & Fine Grain */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ASSETS.creases}), url(${ASSETS.grain})`,
          backgroundSize: '1024px 1024px, 256px 256px',
          backgroundRepeat: 'repeat, repeat',
          opacity: 0.38,
          mixBlendMode: 'multiply',
        }}
      />

      {/* 3. Subtle Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.85,
        }}
      />

      {/* 4. Left Loose-leaf Binder Holes (手账活页打孔，给封面极强的手账质感) */}
      {showHoles && (
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 0,
            bottom: 0,
            width: 44,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          {holes.map((i) => (
            <div
              key={i}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#d8cbb5',
                border: '2.5px solid #2d3436',
                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Left Vertical Red Margin Line */}
      {showHoles && (
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: 'rgba(238, 111, 101, 0.45)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/**
 * 6 大平台立体贴纸组合列
 */
export const PlatformStickerRow: React.FC<{
  size?: number;
  gap?: number;
  direction?: 'row' | 'wrap';
  style?: React.CSSProperties;
}> = ({ size = 68, gap = 14, direction = 'row', style }) => {
  const platforms: { id: PlatformId; name: string; bg: string; color: string }[] = [
    { id: 'qq', name: 'QQ音乐', bg: '#22d59c', color: '#064e3b' },
    { id: 'netease', name: '网易云', bg: '#e60026', color: '#fff' },
    { id: 'kugou', name: '酷狗', bg: '#0085ff', color: '#fff' },
    { id: 'kuwo', name: '酷我', bg: '#ffc600', color: '#78350f' },
    { id: 'qishui', name: '汽水音乐', bg: '#ffe600', color: '#000' },
    { id: 'migu', name: '咪咕音乐', bg: '#ff2d55', color: '#fff' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: direction === 'wrap' ? 'wrap' : 'nowrap',
        gap,
        alignItems: 'center',
        ...style,
      }}
    >
      {platforms.map((p, idx) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            transform: `rotate(${((idx % 3) - 1) * 2.2}deg)`,
          }}
        >
          <div
            style={{
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              border: '3.5px solid #2d3436',
              boxShadow: SHADOW.cutoutSm,
              overflow: 'hidden',
              backgroundColor: '#fff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <PlatformLogo platform={p.id} size={size} shape="flat" />
          </div>
          <span
            style={{
              fontFamily: F.sans,
              fontSize: 16,
              fontWeight: 800,
              color: '#2d3436',
              backgroundColor: '#fff',
              padding: '2px 8px',
              borderRadius: 6,
              border: '2px solid #2d3436',
              boxShadow: '2px 2px 0 #2d3436',
              whiteSpace: 'nowrap',
            }}
          >
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
};
