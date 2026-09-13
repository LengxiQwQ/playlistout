import React from 'react';
import { Tape } from './Tape';

export interface StickyNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'yellow' | 'mint' | 'pink' | 'blue';
  rotateDeg?: number;
  showTapes?: boolean;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  color = 'yellow',
  rotateDeg = 0.35,
  showTapes = true,
  className = '',
  style,
  children,
  ...props
}) => {
  const bg =
    color === 'yellow'
      ? 'var(--note-yellow, #fff8bd)'
      : color === 'mint'
      ? 'var(--note-mint, #dff7ef)'
      : color === 'pink'
      ? '#ffebee'
      : 'var(--note-blue, #e8f8ff)';

  const combinedStyle: React.CSSProperties = {
    backgroundColor: bg,
    transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
    position: 'relative',
    ...style,
  };

  return (
    <div
      className={`sticky-note-card hand-drawn-border shadow-cutout ${className}`.trim()}
      style={combinedStyle}
      {...props}
    >
      {showTapes && (
        <>
          <Tape
            color="pink"
            rotateDeg={-12}
            style={{ position: 'absolute', top: '-1rem', left: '-1rem', zIndex: 20 }}
          />
          <Tape
            color="cyan"
            rotateDeg={6}
            style={{ position: 'absolute', bottom: '-1rem', right: '-1.25rem', zIndex: 20 }}
          />
        </>
      )}
      {children}
    </div>
  );
};
