import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { ASSETS } from '../assets';
import { C, HEIGHT, WIDTH } from '../theme';

export const PaperBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();

  // 电影级有机轻呼吸与微浮动镜头 (Camera Float / Breathing)
  // 消除全片生硬冻结帧，呈现手账世界温暖活泼的生命力！
  const camX = Math.sin(frame * 0.032) * 3.2;
  const camY = Math.cos(frame * 0.025) * 2.2;
  const camScale = 1.004 + Math.sin(frame * 0.016) * 0.003;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.paper,
        width: WIDTH,
        height: HEIGHT,
        overflow: 'hidden',
        position: 'relative',
        transform: `scale(${camScale}) translate(${camX}px, ${camY}px)`,
        transformOrigin: 'center center',
      }}
    >
      {/* 笔记本横线底纹 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 38px, ${C.notebookLine} 39px, transparent 40px)`,
          opacity: 0.85,
        }}
      />

      {/* 笔记本左侧红线装订页边距 */}
      <div
        style={{
          position: 'absolute',
          left: 95,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: C.notebookMargin,
          boxShadow: '1px 0 3px rgba(239, 107, 107, 0.2)',
        }}
      />

      {/* 活页孔打孔圆环 */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '40px 0',
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#403830',
              border: '3px solid #E1D2BD',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.55), 1px 1px 2px rgba(255,255,255,0.7)',
            }}
          />
        ))}
      </div>

      {/* 真实纸张纤维贴图 */}
      <Img
        src={ASSETS.grain}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.22,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />

      {/* 纸张轻微折痕光影 */}
      <Img
        src={ASSETS.creases}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.12,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* 场景前景层 */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
