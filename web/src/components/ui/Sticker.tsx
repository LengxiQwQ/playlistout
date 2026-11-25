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

  const classTokens = className.split(/\s+/).filter(Boolean);
  const isInteractive =
    Component === 'button' ||
    Component === 'a' ||
    Boolean(props.onClick) ||
    props.role === 'button' ||
    classTokens.includes('clickable');

  if (!isInteractive) {
    const staticStyle: React.CSSProperties = {
      backgroundColor: stickerColorMap[color],
      ['--rot' as any]: rot,
      ...restStyle,
    };

    return (
      <Component
        className={`sticker is-static ${className}`.trim()}
        style={staticStyle}
        {...(props as any)}
      >
        {children}
      </Component>
    );
  }

  const { hitboxStyle, faceStyle } = splitHitboxStyles(style);
  const combinedFaceStyle: React.CSSProperties = {
    backgroundColor: stickerColorMap[color],
    ['--rot' as any]: rot,
    ...faceStyle,
  };

  return (
    <Component
      className={`ui-hitbox sticker-hitbox ${className}`.trim()}
      style={{
        cursor: props.disabled ? 'not-allowed' : hitboxStyle.cursor ?? faceStyle.cursor ?? 'pointer',
        ...hitboxStyle,
      }}
      {...(props as any)}
    >
      <span className="ui-face sticker-face sticker" style={combinedFaceStyle}>
        {children}
      </span>
    </Component>
  );
};
