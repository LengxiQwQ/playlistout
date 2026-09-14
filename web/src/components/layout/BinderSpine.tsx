import React, { useState, useEffect, useRef } from 'react';

interface BinderSpineProps {
  dependencies?: unknown[];
}

export const BinderSpine: React.FC<BinderSpineProps> = ({ dependencies = [] }) => {
  // 30px hole + 46px gap = 76px pitch (exactly 2 ruled lines of 38px)
  const PITCH = 76;
  const TOP_OFFSET = 4;

  const [count, setCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const initialHeight = Math.max(window.innerHeight, 1200);
      return Math.max(15, Math.ceil((initialHeight - TOP_OFFSET) / PITCH));
    }
    return 35;
  });

  const prevCountRef = useRef(count);

  useEffect(() => {
    const updateCount = () => {
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight,
      );
      const needed = Math.max(15, Math.ceil((docHeight - TOP_OFFSET) / PITCH));
      if (needed !== prevCountRef.current) {
        prevCountRef.current = needed;
        setCount(needed);
      }
    };

    updateCount();
    const animId = requestAnimationFrame(updateCount);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(updateCount);
      });
    }

    window.addEventListener('resize', updateCount);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        requestAnimationFrame(updateCount);
      });
      observer.observe(document.body);
      const container = document.querySelector('.journal-container');
      if (container) {
        observer.observe(container);
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCount);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return (
    <div className="binder-holes" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="binder-hole" />
      ))}
    </div>
  );
};
