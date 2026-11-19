import React from 'react';
import { useReveal } from '../../hooks/useReveal';

export type RevealEffect =
  | 'fade-up'
  | 'stick'
  | 'toss-left'
  | 'toss-right'
  | 'slide-shelf'
  | 'stamp'
  | 'pop'
  | 'grow-bar'
  | 'draw-line'
  | 'tape';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  effect?: RevealEffect;
  /** ms, added to stagger */
  delay?: number;
  /** settled rotation in deg */
  rot?: number;
  /** when true, direct children with [data-reveal-item] are staggered */
  stagger?: boolean;
  children?: React.ReactNode;
}

export const Reveal: React.FC<RevealProps> = ({
  as = 'div',
  effect = 'fade-up',
  delay = 0,
  rot = 0,
  stagger = false,
  className = '',
  style,
  children,
  ...rest
}) => {
  const { ref, revealed } = useReveal<HTMLElement>();
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      data-reveal={effect}
      data-revealed={revealed ? 'true' : 'false'}
      data-reveal-stagger={stagger ? 'true' : undefined}
      style={{ ...style, '--reveal-delay': `${delay}ms`, '--rot': `${rot}deg` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
