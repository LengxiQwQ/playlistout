import React, { useRef } from 'react';
import { Tape } from './Tape';

export interface StickyNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'yellow' | 'mint' | 'pink' | 'blue';
  rotateDeg?: number;
  showTapes?: boolean;
  interactive?: boolean;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  color = 'yellow',
  rotateDeg = 0.35,
  showTapes = true,
  interactive = true,
  className = '',
  style,
  children,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const noteRef = useRef<HTMLDivElement>(null);

  const bg =
    color === 'yellow'
      ? 'var(--note-yellow, #fff8bd)'
      : color === 'mint'
      ? 'var(--note-mint, #dff7ef)'
      : color === 'pink'
      ? '#ffebee'
      : 'var(--note-blue, #e8f8ff)';

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
    if (!interactive || !noteRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const rect = noteRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    // Subtle, restrained paper 3D orientation (幅度小一点):
    const tiltX = -normY * 1.6;
    const tiltY = normX * 1.8;
    const tiltZ = normX * normY * 0.3;

    // Hard, wider warm shadow (阴影宽一点):
    const shadowX = 4.5 + normX * 0.8;
    const shadowY = 5.5 + normY * 1.0;
    const shadowBlur = 2.0 + Math.abs(normX) * 0.5 + Math.abs(normY) * 0.5;

    const el = noteRef.current;
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
    if (!interactive || !noteRef.current) return;
    noteRef.current.classList.add('is-tracking');
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    if (!interactive || !noteRef.current) return;
    const el = noteRef.current;
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
    backgroundColor: bg,
    ['--rot' as any]: rot,
    position: 'relative',
    ...restStyle,
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note-card hand-drawn-border ${className}`.trim()}
      style={combinedStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {showTapes && (
        <>
          <Tape
            color="pink"
            rotateDeg={-12}
            className="tape-top-left"
            style={{ position: 'absolute', top: '-1rem', left: '-1rem', zIndex: 20 }}
          />
          <Tape
            color="cyan"
            rotateDeg={6}
            className="tape-bottom-right"
            style={{ position: 'absolute', bottom: '-1rem', right: '-1.25rem', zIndex: 20 }}
          />
        </>
      )}
      {children}
    </div>
  );
};
