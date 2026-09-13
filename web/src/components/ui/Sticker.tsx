import React from 'react';

export interface StickerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'white' | 'yellow' | 'pink' | 'cyan' | 'green' | 'blue' | 'purple' | 'red';
  rotateDeg?: number;
  as?: 'button' | 'span' | 'div';
}

const stickerColorMap = {
  white: '#ffffff',
  yellow: '#fef08a',
  pink: '#fbcfe8',
  cyan: '#81ecec',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  purple: '#e9d5ff',
  red: '#fecaca',
};

export const Sticker: React.FC<StickerProps> = ({
  color = 'white',
  rotateDeg = 0,
  as: Component = 'button',
  className = '',
  style,
  children,
  ...props
}) => {
  const combinedStyle: React.CSSProperties = {
    backgroundColor: stickerColorMap[color],
    transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
    ...style,
  };

  return (
    <Component
      className={`sticker ${className}`.trim()}
      style={combinedStyle}
      {...(props as any)}
    >
      {children}
    </Component>
  );
};
