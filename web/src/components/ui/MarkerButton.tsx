import React from 'react';

export interface MarkerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ink' | 'sticker' | 'paper';
  rotateDeg?: number;
}

const LAYOUT_STYLE_KEYS = new Set([
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'justifySelf',
  'gridColumn',
  'gridRow',
  'order',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
]);

function splitHitboxStyles(style?: React.CSSProperties): {
  hitboxStyle: React.CSSProperties;
  faceStyle: React.CSSProperties;
} {
  const hitboxStyle: React.CSSProperties = {};
  const faceStyle: React.CSSProperties = {};
  if (!style) return { hitboxStyle, faceStyle };

  for (const [key, value] of Object.entries(style)) {
    if (key === 'transform' || key === 'transition') continue;
    if (LAYOUT_STYLE_KEYS.has(key)) {
      (hitboxStyle as Record<string, unknown>)[key] = value;
    } else {
      (faceStyle as Record<string, unknown>)[key] = value;
    }
  }
  return { hitboxStyle, faceStyle };
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
  const { transform: inlineTransform } = (style || {}) as Record<string, any>;
  let rot = `${rotateDeg}deg`;
  if (inlineTransform && typeof inlineTransform === 'string') {
    const match = inlineTransform.match(/rotate\(([^)]+)\)/);
    if (match) {
      rot = match[1];
    }
  }

  let baseClass = 'font-marker';
  let variantFaceStyle: React.CSSProperties = {
    ['--rot' as any]: rot,
    userSelect: 'none',
  };

  if (variant === 'ink') {
    baseClass += ' hand-drawn-border-alt shadow-cutout-sm marker-btn-ink';
    variantFaceStyle = {
      ...variantFaceStyle,
      backgroundColor: 'var(--btn-primary-bg, #ec7f9f)',
      color: 'var(--btn-primary-ink, #ffffff)',
      padding: '0.65rem 1.75rem',
      fontSize: '1.15rem',
    };
  } else if (variant === 'sticker') {
    baseClass += ' sticker font-handwriting marker-btn-sticker';
    variantFaceStyle = {
      ...variantFaceStyle,
      backgroundColor: '#ffffff',
      color: 'var(--ink, #5a4a42)',
      padding: '0.45rem 1rem',
      fontSize: '1.05rem',
    };
  } else {
    baseClass += ' hand-drawn-border-subtle marker-btn-paper';
    variantFaceStyle = {
      ...variantFaceStyle,
      backgroundColor: 'var(--paper, #fffcf6)',
      color: 'var(--ink, #5a4a42)',
      padding: '0.5rem 1.25rem',
    };
  }

  const { hitboxStyle, faceStyle } = splitHitboxStyles(style);

  return (
    <button
      className={`ui-hitbox marker-button ${baseClass} ${className}`.trim()}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...hitboxStyle,
      }}
      disabled={disabled}
      {...props}
    >
      <span
        className={`ui-face marker-button-face ${baseClass}`.trim()}
        style={{ ...variantFaceStyle, ...faceStyle }}
      >
        {children}
      </span>
    </button>
  );
};
