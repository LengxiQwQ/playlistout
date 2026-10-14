import { useState, useRef, useCallback } from 'react';

export type ViewMode = 'single' | 'batch';

export interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  lastCollectionScrollPosRef: React.MutableRefObject<number | null>;
  saveScrollPosition: (pos?: number) => void;
  returnToBatch: (hasUserPlaylists: boolean) => void;
  resetViewMode: () => void;
}

export function useViewMode(initialMode: ViewMode = 'single'): UseViewModeReturn {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const lastCollectionScrollPosRef = useRef<number | null>(null);

  const saveScrollPosition = useCallback((pos?: number) => {
    lastCollectionScrollPosRef.current =
      pos !== undefined ? pos : typeof window !== 'undefined' ? window.scrollY : null;
  }, []);

  const returnToBatch = useCallback((hasUserPlaylists: boolean) => {
    if (!hasUserPlaylists) return;
    setViewMode('batch');
    const savedPos = lastCollectionScrollPosRef.current;
    setTimeout(() => {
      if (
        typeof window !== 'undefined' &&
        savedPos !== null &&
        savedPos > 0 &&
        typeof window.scrollTo === 'function'
      ) {
        window.scrollTo({ top: savedPos, behavior: 'smooth' });
      } else if (typeof document !== 'undefined') {
        const el = document.getElementById('user-playlists');
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 50);
  }, []);

  const resetViewMode = useCallback(() => {
    setViewMode('single');
    lastCollectionScrollPosRef.current = null;
  }, []);

  return {
    viewMode,
    setViewMode,
    lastCollectionScrollPosRef,
    saveScrollPosition,
    returnToBatch,
    resetViewMode,
  };
}
