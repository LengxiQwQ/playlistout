import React from 'react';
import { C, F } from '../theme';

interface MechanicalEnterKeyProps {
  isPressed?: boolean;
  size?: number;
  style?: React.CSSProperties;
}

export const MechanicalEnterKey: React.FC<MechanicalEnterKeyProps> = ({
  isPressed = false,
  size = 180,
  style,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size * 0.72,
        ...style,
      }}
    >
      {/* 键帽底座外壳 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#1E242B',
          borderRadius: 24,
          border: '4px solid #0F141A',
          boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
        }}
      />

      {/* 轴体导轨 */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          height: 18,
          backgroundColor: '#334155',
          borderRadius: 14,
        }}
      />

      {/* 实体黄色键帽 (可上下按压 travel) */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          top: isPressed ? 18 : 6,
          height: size * 0.58,
          backgroundColor: '#FACC15',
          borderRadius: 20,
          border: '4px solid #1E293B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isPressed
            ? 'inset 0 3px 6px rgba(0,0,0,0.4)'
            : '0 8px 0 #CA8A04, 0 14px 16px rgba(0,0,0,0.3)',
          transition: 'top 0.06s ease, box-shadow 0.06s ease',
        }}
      >
        <span
          style={{
            fontFamily: F.mono,
            fontWeight: 900,
            fontSize: 32,
            color: '#1E293B',
            lineHeight: 1,
            letterSpacing: '1px',
          }}
        >
          ↵ ENTER
        </span>
        <span
          style={{
            fontFamily: F.kuaile,
            fontSize: 15,
            color: '#854D0E',
            fontWeight: 800,
            marginTop: 4,
          }}
        >
          回车极速导出
        </span>
      </div>

      {/* 按下时的冲击波与星芒 */}
      {isPressed && (
        <div
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: 36,
            border: '4px dashed #FDE047',
            opacity: 0.9,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
