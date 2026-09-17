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
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    const el = noteRef.current;
    el.style.setProperty('--mouse-pct-x', `${pctX.toFixed(1)}`);
    el.style.setProperty('--mouse-pct-y', `${pctY.toFixed(1)}`);
    el.style.setProperty('--tape-glare-pos', `${pctX.toFixed(1)}`);
    el.style.setProperty('--tape-glare-opacity', '0.95');

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
    el.style.setProperty('--mouse-pct-x', '50');
    el.style.setProperty('--mouse-pct-y', '50');
    el.style.setProperty('--tape-glare-pos', '50');
    el.style.setProperty('--tape-glare-opacity', '0.35');
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
