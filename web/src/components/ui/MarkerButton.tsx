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
  let baseClass = 'font-marker';
  let variantStyle: React.CSSProperties = {
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transform: rotateDeg && !disabled ? `rotate(${rotateDeg}deg)` : undefined,
    userSelect: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
  };

  if (variant === 'ink') {
    baseClass += ' hand-drawn-border-alt shadow-cutout-sm';
    variantStyle = {
      ...variantStyle,
      backgroundColor: 'var(--ink, #2d3436)',
      color: '#ffffff',
      padding: '0.65rem 1.75rem',
      fontSize: '1.15rem',
    };
  } else if (variant === 'sticker') {
    baseClass += ' sticker font-handwriting';
    variantStyle = {
      ...variantStyle,
      backgroundColor: '#ffffff',
      color: 'var(--ink, #2d3436)',
      padding: '0.45rem 1rem',
      fontSize: '1.05rem',
    };
  } else {
    baseClass += ' hand-drawn-border-subtle';
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
      style={{ ...variantStyle, ...style }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
