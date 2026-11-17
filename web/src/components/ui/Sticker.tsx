import React from 'react';

export interface StickerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'white' | 'yellow' | 'pink' | 'cyan' | 'green' | 'blue' | 'purple' | 'red' | 'lime';
  rotateDeg?: number;
  as?: 'button' | 'span' | 'div' | 'a';
  href?: string;
  target?: string;
  rel?: string;
}

const stickerColorMap = {
  white: '#ffffff',
  yellow: '#fff0b3',
  pink: '#ffd8e6',
  cyan: '#c3efe6',
  green: '#cdeee0',
  blue: '#d4defc',
  purple: '#e8ddff',
  red: '#ffd3dc',
  lime: '#e6f5c6',
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
  const { transform: inlineTransform, ...restStyle } = (style || {}) as Record<string, any>;
  let rot = `${rotateDeg}deg`;
  if (inlineTransform && typeof inlineTransform === 'string') {
    const match = inlineTransform.match(/rotate\(([^)]+)\)/);
    if (match) {
      rot = match[1];
    }
  }

  const combinedStyle: React.CSSProperties = {
    backgroundColor: stickerColorMap[color],
    ['--rot' as any]: rot,
    ...restStyle,
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
