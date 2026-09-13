import React from 'react';

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'white' | 'yellow' | 'mint' | 'blue' | 'error';
  borderVariant?: 'default' | 'alt' | 'subtle' | 'none';
  shadow?: 'paper' | 'paper-sm' | 'cutout' | 'cutout-sm' | 'none';
  rotateDeg?: number;
  as?: 'div' | 'section' | 'article';
}

const colorMap = {
  white: '#ffffff',
  yellow: 'var(--note-yellow, #fff8bd)',
  mint: 'var(--note-mint, #dff7ef)',
  blue: 'var(--note-blue, #e8f8ff)',
  error: 'var(--note-error, #ffebee)',
};

const borderClassMap = {
  default: 'hand-drawn-border',
  alt: 'hand-drawn-border-alt',
  subtle: 'hand-drawn-border-subtle',
  none: '',
};

const shadowClassMap = {
  paper: 'paper-shadow',
  'paper-sm': 'paper-shadow-sm',
  cutout: 'shadow-cutout',
  'cutout-sm': 'shadow-cutout-sm',
  none: '',
};

export const Paper: React.FC<PaperProps> = ({
  color = 'white',
  borderVariant = 'default',
  shadow = 'paper',
  rotateDeg = 0,
  as: Component = 'div',
  className = '',
  style,
  children,
  ...props
}) => {
  const borderClass = borderClassMap[borderVariant];
  const shadowClass = shadowClassMap[shadow];

  const combinedStyle: React.CSSProperties = {
    backgroundColor: colorMap[color],
    transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
    ...style,
  };

  return (
    <Component
      className={`journal-paper ${borderClass} ${shadowClass} ${className}`.trim()}
      style={combinedStyle}
      {...props}
    >
      {children}
    </Component>
  );
};
