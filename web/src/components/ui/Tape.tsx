import React from 'react';

export interface TapeProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'pink' | 'cyan' | 'green' | 'yellow';
  rotateDeg?: number;
  width?: string | number;
  height?: string | number;
}

export const Tape: React.FC<TapeProps> = ({
  color = 'pink',
  rotateDeg = -6,
  width = '8rem',
  height = '1.85rem',
  className = '',
  style,
  ...props
}) => {
  const combinedStyle: React.CSSProperties = {
    width,
    height,
    transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
    ...style,
  };

  return (
    <div
      className={`tape tape-${color} ${className}`.trim()}
      style={combinedStyle}
      aria-hidden="true"
      {...props}
    />
  );
};
