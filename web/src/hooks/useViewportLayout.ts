import { useEffect, useState } from 'react';

export type ViewportLayoutMode = 'a' | 'b';

const MOBILE_LAYOUT_QUERY = '(max-width: 768px)';

/**
 * Resolves layout mode from viewport width:
 * - Desktop (> 768px): 'a' (Zigzag Timeline)
 * - Mobile (<= 768px): 'b' (Pinboard Collage)
 */
export function detectViewportLayoutMode(): ViewportLayoutMode {
  if (typeof window === 'undefined') return 'a';
  if (typeof window.matchMedia === 'function') {
    const mql = window.matchMedia(MOBILE_LAYOUT_QUERY);
    if (mql && typeof mql.matches === 'boolean') {
      return mql.matches ? 'b' : 'a';
    }
  }
  return window.innerWidth <= 768 ? 'b' : 'a';
}

export function useViewportLayout(): ViewportLayoutMode {
  const [mode, setMode] = useState<ViewportLayoutMode>(() => detectViewportLayoutMode());

  useEffect(() => {
    const sync = () => {
      const next = detectViewportLayoutMode();
      setMode(next);
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.layoutDemo = next;
      }
    };

    sync();

    if (typeof window === 'undefined') return undefined;

    if (typeof window.matchMedia === 'function') {
      const mql = window.matchMedia(MOBILE_LAYOUT_QUERY);
      if (mql && typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', sync);
        return () => mql.removeEventListener('change', sync);
      }
      if (mql && typeof mql.addListener === 'function') {
        mql.addListener(sync);
        return () => mql.removeListener(sync);
      }
    }

    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return mode;
}
