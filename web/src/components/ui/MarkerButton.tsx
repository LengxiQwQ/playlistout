import React from 'react';

export interface MarkerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ink' | 'sticker' | 'paper';
  rotateDeg?: number;
}

export const MarkerButton: React.FC<MarkerButtonProps> = ({
  variant = 'ink',
  rotateDeg = -0.5,
  disabled = false,
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

  let baseClass = 'font-marker';
  let variantStyle: React.CSSProperties = {
    ['--rot' as any]: rot,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    userSelect: 'none',
  };

  if (variant === 'ink') {
    baseClass += ' hand-drawn-border-alt shadow-cutout-sm marker-btn-ink';
    variantStyle = {
      ...variantStyle,
      backgroundColor: 'var(--ink, #2d3436)',
      color: '#ffffff',
      padding: '0.65rem 1.75rem',
      fontSize: '1.15rem',
    };
  } else if (variant === 'sticker') {
    baseClass += ' sticker font-handwriting marker-btn-sticker';
    variantStyle = {
      ...variantStyle,
      backgroundColor: '#ffffff',
      color: 'var(--ink, #2d3436)',
      padding: '0.45rem 1rem',
      fontSize: '1.05rem',
    };
  } else {
    baseClass += ' hand-drawn-border-subtle marker-btn-paper';
    variantStyle = {
      ...variantStyle,
      backgroundColor: 'var(--paper, #fdfbf7)',
      color: 'var(--ink, #2d3436)',
      padding: '0.5rem 1.25rem',
    };
  }

  return (
    <button
      className={`marker-button ${baseClass} ${className}`.trim()}
      style={{ ...variantStyle, ...restStyle }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
