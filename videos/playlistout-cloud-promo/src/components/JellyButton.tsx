import React from 'react';
import { C, F } from '../theme';

interface JellyButtonProps {
  label: string;
  isPressed?: boolean;
  color?: string;
  size?: 'normal' | 'large';
  style?: React.CSSProperties;
}

export const JellyButton: React.FC<JellyButtonProps> = ({
  label,
  isPressed = false,
  color = '#FF6B8B',
  size = 'normal',
  style,
}) => {
  const isLarge = size === 'large';
  const height = isLarge ? 64 : 52;
  const fontSize = isLarge ? 28 : 22;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {/* 冲击波波纹 */}
      {isPressed && (
        <div
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: 36,
            border: '3px solid #FFE07D',
            opacity: 0.8,
            animation: 'none',
            transform: 'scale(1.15)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 底部 3D 阴影垫 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -8,
          height,
          backgroundColor: '#B33951',
          borderRadius: 28,
        }}
      />

      {/* 果冻按钮本体 */}
      <div
        style={{
          position: 'relative',
          height,
          padding: '0 32px',
          backgroundColor: color,
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3.5px solid #2B3942',
          transform: isPressed ? 'translateY(6px) scale(0.97, 0.94)' : 'translateY(0px)',
          transition: 'transform 0.08s ease',
          boxShadow: isPressed
            ? '0 2px 4px rgba(0,0,0,0.2)'
            : '0 6px 14px rgba(255, 107, 139, 0.35)',
          backgroundImage:
            'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.1) 100%)',
          cursor: 'pointer',
        }}
      >
        {/* 顶部白色果冻高光条 */}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 18,
            right: 18,
            height: 10,
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
          }}
        />

        <span
          style={{
            fontFamily: F.kuaile,
            fontSize,
            color: '#FFFFFF',
            fontWeight: 800,
            textShadow: '1px 2px 3px rgba(40, 20, 30, 0.4)',
            letterSpacing: '1px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
