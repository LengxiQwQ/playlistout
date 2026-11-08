import React from 'react';
import { C } from '../theme';

interface WashiTapeProps {
  color?: string;
  width?: number | string;
  height?: number;
  rotate?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  pattern?: 'stripes' | 'dots' | 'plain';
}

export const WashiTape: React.FC<WashiTapeProps> = ({
  color = C.tapeYellow,
  width = 160,
  height = 36,
  rotate = -2,
  style,
  children,
  pattern = 'stripes',
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        backgroundColor: color,
        transform: `rotate(${rotate}deg)`,
        position: 'relative',
        boxShadow: '1px 3px 6px rgba(40, 30, 20, 0.16)',
        backgroundImage:
          pattern === 'stripes'
            ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 8px, transparent 8px, transparent 16px)'
            : pattern === 'dots'
            ? 'radial-gradient(rgba(255,255,255,0.35) 20%, transparent 20%)'
            : 'none',
        backgroundSize: pattern === 'dots' ? '12px 12px' : 'auto',
        clipPath:
          'polygon(0% 12%, 4% 0%, 96% 0%, 100% 14%, 97% 50%, 100% 86%, 96% 100%, 3% 100%, 0% 88%, 3% 50%)',
        opacity: 0.94,
        padding: '0 14px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
