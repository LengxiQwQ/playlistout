import React from 'react';
import { C } from '../theme';

interface VintageCageProps {
  doorAngle?: number;     // 笼门打开角度 (0 = 紧闭, 110 = 弹开)
  showLock?: boolean;     // 红色大锁是否挂在上面
  lockFallProgress?: number; // 锁打开跌落进度 (0 = 挂着, 1 = 掉出画面)
  keyProgress?: number;   // 金钥匙飞入进度 (0 = 未出现, 0.8 = 插入, 1 = 发光消散)
}

export const VintageCageBack: React.FC<{ width?: number; height?: number }> = ({
  width = 380,
  height = 460,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 380 460"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 笼子背部阴影与底座后半部 */}
      <ellipse cx={190} cy={425} rx={160} ry={24} fill="#D4BC93" opacity={0.65} />
      <path
        d="M 40 410 C 40 435 340 435 340 410 L 320 400 C 320 385 60 385 60 400 Z"
        fill="#8A7662"
        stroke="#3D3228"
        strokeWidth={4}
      />

      {/* 笼子后方铁栅栏 (位于小困云背后) */}
      {[-120, -80, -40, 0, 40, 80, 120].map((offset) => {
        const x = 190 + offset;
        const topY = 70 + Math.abs(offset) * 0.35;
        return (
          <line
            key={`bar-back-${offset}`}
            x1={x}
            y1={topY}
            x2={x}
            y2={400}
            stroke="#5A4E42"
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}

      {/* 穹顶后半圆弧梁 */}
      <path
        d="M 50 160 C 50 40 330 40 330 160"
        fill="none"
        stroke="#6E5F52"
        strokeWidth={6}
      />
    </svg>
  );
};

export const VintageCageFront: React.FC<VintageCageProps & { width?: number; height?: number }> = ({
  doorAngle = 0,
  showLock = true,
  lockFallProgress = 0,
  keyProgress = 0,
  width = 380,
  height = 460,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 380 460"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 笼子顶部华丽复古吊环与穹顶外壳 */}
      <circle cx={190} cy={35} r={22} fill="none" stroke="#3D3228" strokeWidth={6} />
      <circle cx={190} cy={35} r={14} fill="none" stroke="#D4AF37" strokeWidth={3} />
      <path
        d="M 170 55 L 210 55 L 200 70 L 180 70 Z"
        fill="#D4AF37"
        stroke="#3D3228"
        strokeWidth={3.5}
      />

      {/* 前景穹顶弧线 */}
      <path
        d="M 38 160 C 38 35 342 35 342 160"
        fill="none"
        stroke="#3D3228"
        strokeWidth={7}
      />
      <path
        d="M 45 160 C 45 45 335 45 335 160"
        fill="none"
        stroke="#E6C658"
        strokeWidth={3}
      />

      {/* 两侧固定栏杆 */}
      {[-130, -95, 95, 130].map((offset) => {
        const x = 190 + offset;
        const topY = 75 + Math.abs(offset) * 0.4;
        return (
          <g key={`bar-front-${offset}`}>
            <line
              x1={x}
              y1={topY}
              x2={x}
              y2={410}
              stroke="#3D3228"
              strokeWidth={6.5}
              strokeLinecap="round"
            />
            <line
              x1={x - 1}
              y1={topY}
              x2={x - 1}
              y2={410}
              stroke="#D4AF37"
              strokeWidth={2}
            />
          </g>
        );
      })}

      {/* 底部前景基座 */}
      <path
        d="M 30 405 C 30 435 350 435 350 405 L 340 395 C 340 375 40 375 40 395 Z"
        fill="#A68D74"
        stroke="#3D3228"
        strokeWidth={5}
      />

      {/* 可活动旋转的笼门组 (铰链在左侧 x=125, y=140) */}
      <g
        transform={`translate(125, 270) rotate(${-doorAngle}) translate(-125, -270)`}
        style={{ transformOrigin: '125px 270px' }}
      >
        {/* 门框 */}
        <rect
          x={125}
          y={130}
          width={130}
          height={270}
          rx={8}
          fill="none"
          stroke="#3D3228"
          strokeWidth={6.5}
        />
        {/* 门栏杆 */}
        {[-32, 0, 32].map((offset) => (
          <line
            key={`door-bar-${offset}`}
            x1={190 + offset}
            y1={135}
            x2={190 + offset}
            y2={395}
            stroke="#3D3228"
            strokeWidth={5.5}
          />
        ))}
        {/* 铰链螺丝 */}
        <circle cx={125} cy={165} r={5} fill="#D4AF37" stroke="#3D3228" strokeWidth={2} />
        <circle cx={125} cy={370} r={5} fill="#D4AF37" stroke="#3D3228" strokeWidth={2} />
      </g>

      {/* 红色发光大挂锁 */}
      {showLock && (
        <g
          transform={`translate(255, ${260 + lockFallProgress * 220}) rotate(${
            lockFallProgress * 45
          })`}
          opacity={Math.max(0, 1 - lockFallProgress * 1.5)}
        >
          {/* 锁梁 */}
          <path
            d="M 12 0 C 12 -22 36 -22 36 0 L 36 12"
            fill="none"
            stroke="#666666"
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* 锁身 */}
          <rect
            x={0}
            y={8}
            width={48}
            height={40}
            rx={8}
            fill="#EF4444"
            stroke="#3D3228"
            strokeWidth={4.5}
          />
          {/* 钥匙孔 */}
          <circle cx={24} cy={24} r={4.5} fill="#3D3228" />
          <path d="M 22 26 L 26 26 L 27 34 L 21 34 Z" fill="#3D3228" />
        </g>
      )}

      {/* 金色发光钥匙 (swoop in 插入解锁) */}
      {keyProgress > 0 && keyProgress < 1 && (
        <g
          transform={`translate(${380 - keyProgress * 125}, ${160 + keyProgress * 105}) rotate(${
            -35 + keyProgress * 35
          }) scale(${0.8 + keyProgress * 0.4})`}
        >
          {/* 金色星芒发光圈 */}
          <circle cx={0} cy={0} r={28} fill="#FFE07D" opacity={0.45} />
          {/* 钥匙手柄 */}
          <circle cx={-18} cy={0} r={14} fill="#F59E0B" stroke="#3D3228" strokeWidth={3.5} />
          <circle cx={-18} cy={0} r={7} fill="#FFFBEB" stroke="#3D3228" strokeWidth={2.5} />
          {/* 钥匙杆 */}
          <rect x={-4} y={-3.5} width={34} height={7} rx={2} fill="#F59E0B" stroke="#3D3228" strokeWidth={3} />
          {/* 钥匙齿 */}
          <rect x={18} y={3.5} width={6} height={10} fill="#F59E0B" stroke="#3D3228" strokeWidth={2.5} />
          <rect x={26} y={3.5} width={5} height={7} fill="#F59E0B" stroke="#3D3228" strokeWidth={2.5} />
        </g>
      )}
    </svg>
  );
};
