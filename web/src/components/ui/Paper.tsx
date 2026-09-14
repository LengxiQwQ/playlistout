import React, { useRef } from 'react';

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'white' | 'yellow' | 'mint' | 'blue' | 'error';
  borderVariant?: 'default' | 'alt' | 'subtle' | 'none';
  shadow?: 'paper' | 'paper-sm' | 'cutout' | 'cutout-sm' | 'none';
  rotateDeg?: number;
  ruled?: boolean;
  interactive?: boolean;
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
  ruled = false,
  interactive = true,
  as: Component = 'div',
  className = '',
  style,
  children,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const paperRef = useRef<HTMLElement>(null);
  const borderClass = borderClassMap[borderVariant];
  const shadowClass = shadowClassMap[shadow];
  const ruledClass = ruled ? 'ruled' : '';
  const interactiveClass = interactive ? 'is-interactive' : '';

  const { transform: inlineTransform, ...restStyle } = (style || {}) as Record<string, any>;
  let rot = `${rotateDeg}deg`;
  if (inlineTransform && typeof inlineTransform === 'string') {
    const match = inlineTransform.match(/rotate\(([^)]+)\)/);
    if (match) {
      rot = match[1];
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e);
    if (!interactive || !paperRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const rect = paperRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    // Noticeable, tactile 3D orientation for small sticky notes (幅度明显增大):
    const tiltX = -normY * 4.2;
    const tiltY = normX * 4.8;
    const tiltZ = normX * normY * 0.8;

    // Hard, wider warm shadow with noticeable dynamic excursion:
    const shadowX = 4.8 + normX * 2.2;
    const shadowY = 5.8 + normY * 2.5;
    const shadowBlur = 2.0 + Math.abs(normX) * 1.2 + Math.abs(normY) * 1.2;

    const el = paperRef.current;
    el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    el.style.setProperty('--tilt-z', `${tiltZ.toFixed(2)}deg`);
    el.style.setProperty('--mouse-pct-x', `${pctX.toFixed(1)}`);
    el.style.setProperty('--mouse-pct-y', `${pctY.toFixed(1)}`);
    el.style.setProperty('--tape-glare-pos', `${pctX.toFixed(1)}`);
    el.style.setProperty('--tape-glare-opacity', '0.95');

    el.style.setProperty('--paper-shadow-x', `${shadowX.toFixed(1)}px`);
    el.style.setProperty('--paper-shadow-y', `${shadowY.toFixed(1)}px`);
    el.style.setProperty('--paper-shadow-blur', `${shadowBlur.toFixed(1)}px`);

    el.classList.add('is-tracking');
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseEnter?.(e);
    if (!interactive || !paperRef.current) return;
    paperRef.current.classList.add('is-tracking');
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    if (!interactive || !paperRef.current) return;
    const el = paperRef.current;
    el.classList.remove('is-tracking');
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--tilt-z', '0deg');
    el.style.setProperty('--mouse-pct-x', '50');
    el.style.setProperty('--mouse-pct-y', '50');
    el.style.setProperty('--tape-glare-pos', '50');
    el.style.setProperty('--tape-glare-opacity', '0.35');

    el.style.setProperty('--paper-shadow-x', '4.5px');
    el.style.setProperty('--paper-shadow-y', '5.5px');
    el.style.setProperty('--paper-shadow-blur', '2px');
  };

  const combinedStyle: React.CSSProperties = {
    backgroundColor: colorMap[color],
    ['--rot' as any]: rot,
    position: 'relative',
    ...restStyle,
  };

  return (
    <Component
      ref={paperRef as any}
      className={`journal-paper ${borderClass} ${shadowClass} ${ruledClass} ${interactiveClass} ${className}`.trim()}
      style={combinedStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Component>
  );
};
