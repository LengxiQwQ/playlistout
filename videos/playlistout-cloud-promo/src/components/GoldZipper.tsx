import React from 'react';

interface GoldZipperProps {
  progress?: number; // 0.0 (未拉开) 到 1.0 (一拉到底拉齐)
  width?: number;
  style?: React.CSSProperties;
}

export const GoldZipper: React.FC<GoldZipperProps> = ({
  progress = 0,
  width = 640,
  style,
}) => {
  const p = Math.max(0, Math.min(1, progress));
  const sliderX = 30 + p * (width - 60);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 48,
        ...style,
      }}
    >
      {/* 拉链底布边带 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 14,
          height: 20,
          backgroundColor: '#4B3F35',
          borderRadius: 6,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
        }}
      />

      {/* 齿牙行 (未拉与已拉) */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: 18,
          height: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 10,
              backgroundColor: i / 48 < p ? '#F59E0B' : '#E5C07B',
              borderRadius: 2,
              border: '1px solid #78350F',
            }}
          />
        ))}
      </div>

      {/* 金色金属拉头与拉片 (随 progress 滑移) */}
      <div
        style={{
          position: 'absolute',
          left: sliderX - 22,
          top: 4,
          width: 44,
          height: 40,
          pointerEvents: 'none',
        }}
      >
        <svg width="44" height="54" viewBox="0 0 44 54">
          {/* 拉头本体 */}
          <path
            d="M 6 4 L 38 4 L 30 26 L 14 26 Z"
            fill="#FBBF24"
            stroke="#78350F"
            strokeWidth={3}
          />
          {/* 拉片转轴环 */}
          <circle cx="22" cy="24" r="6" fill="#F59E0B" stroke="#78350F" strokeWidth={2.5} />
          {/* 垂下的金属拉片 */}
          <path
            d="M 17 26 L 27 26 L 29 48 C 29 52 15 52 15 48 Z"
            fill="#FBBF24"
            stroke="#78350F"
            strokeWidth={3}
          />
          <rect x="19" y="34" width="6" height="10" rx="3" fill="#78350F" />
        </svg>
      </div>
    </div>
  );
};
