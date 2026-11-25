import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type JournalStyleId = 'd' | 'a' | 'b' | 'c' | 'legacy';

export interface JournalStyleOption {
  id: JournalStyleId;
  index: string;
  nameKey: 'dName' | 'aName' | 'bName' | 'cName' | 'legacyName';
  descKey: 'dDesc' | 'aDesc' | 'bDesc' | 'cDesc' | 'legacyDesc';
  swatches: [string, string, string];
}

export const DEFAULT_JOURNAL_STYLE: JournalStyleId = 'b';
export const STYLE_STORAGE_KEY = 'playlistout-journal-style';

export const JOURNAL_STYLES: JournalStyleOption[] = [
  {
    id: 'b',
    index: '01',
    nameKey: 'bName',
    descKey: 'bDesc',
    swatches: ['#f3e6d6', '#fff9df', '#ffedf2'],
  },
  {
    id: 'a',
    index: '02',
    nameKey: 'aName',
    descKey: 'aDesc',
    swatches: ['#ffd6e0', '#fffdf8', '#cdefe3'],
  },
  {
    id: 'd',
    index: '03',
    nameKey: 'dName',
    descKey: 'dDesc',
    swatches: ['#d8f1ff', '#ffd8e6', '#fff6cf'],
  },
  {
    id: 'c',
    index: '04',
    nameKey: 'cName',
    descKey: 'cDesc',
    swatches: ['#fff3f6', '#fffdf8', '#d4ecff'],
  },
  {
    id: 'legacy',
    index: '05',
    nameKey: 'legacyName',
    descKey: 'legacyDesc',
    swatches: ['#fdf6ec', '#fff4c7', '#ec7f9f'],
  },
];

const STYLE_ALIASES: Record<string, JournalStyleId> = {
  d: 'd',
  sky: 'd',
  sticky: 'd',
  a: 'a',
  diary: 'a',
  zigzag: 'a',
  b: 'b',
  pinboard: 'b',
  bento: 'b',
  c: 'c',
  planner: 'c',
  sidebar: 'c',
  legacy: 'legacy',
  old: 'legacy',
  default: 'legacy',
  classic: 'legacy',
  original: 'legacy',
};

export function normalizeJournalStyle(raw: string | null | undefined): JournalStyleId | null {
  if (!raw) return null;
  return STYLE_ALIASES[raw.toLowerCase().trim()] ?? null;
}

export function resolveInitialJournalStyle(): JournalStyleId {
  if (typeof window === 'undefined') return DEFAULT_JOURNAL_STYLE;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalizeJournalStyle(params.get('style') || params.get('layout'));
    if (fromQuery) return fromQuery;

    const hashMatch = window.location.hash.toLowerCase().match(/^#?\/?(?:style|layout)[-=_]?([a-z]+)$/);
    const fromHash = normalizeJournalStyle(hashMatch?.[1]);
    if (fromHash) return fromHash;
  } catch {
    // Ignore malformed URLs
  }

  try {
    const stored = normalizeJournalStyle(window.localStorage?.getItem(STYLE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Ignore storage access restrictions
  }

  return DEFAULT_JOURNAL_STYLE;
}

export function applyJournalStyleToDocument(styleId: JournalStyleId): void {
  if (typeof document === 'undefined') return;
  if (styleId === 'legacy') {
    delete document.documentElement.dataset.layoutDemo;
  } else {
    document.documentElement.dataset.layoutDemo = styleId;
  }
}

interface StyleContextValue {
  styleId: JournalStyleId;
  setStyleId: (next: JournalStyleId) => void;
  styleSwitchCount: number;
}

const StyleContext = createContext<StyleContextValue | null>(null);

export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [styleId, setStyleIdState] = useState<JournalStyleId>(() => resolveInitialJournalStyle());
  const [styleSwitchCount, setStyleSwitchCount] = useState(0);

  useEffect(() => {
    applyJournalStyleToDocument(styleId);
  }, [styleId]);

  const setStyleId = useCallback((next: JournalStyleId) => {
    setStyleIdState(next);
    setStyleSwitchCount((c) => c + 1);
    applyJournalStyleToDocument(next);

    try {
      window.localStorage?.setItem(STYLE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }

    // If the user arrived via an explicit ?style= or ?layout= query param, keep the URL in sync
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('layout') || url.searchParams.has('style')) {
          url.searchParams.delete('layout');
          url.searchParams.set('style', next);
          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        }
      } catch {
        // Ignore history errors
      }
    }
  }, []);

  // Sync on popstate / hashchange (e.g., browser back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const next = resolveInitialJournalStyle();
      setStyleIdState(next);
      setStyleSwitchCount((c) => c + 1);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  return (
    <StyleContext.Provider value={{ styleId, setStyleId, styleSwitchCount }}>
      {children}
    </StyleContext.Provider>
  );
};

/**
 * Reads the active journal style. Falls back gracefully to local state if rendered
 * outside StyleProvider (e.g. isolated component unit tests).
 */
export function useJournalStyle(): StyleContextValue {
  const ctx = useContext(StyleContext);
  const [fallbackStyle, setFallbackStyle] = useState<JournalStyleId>(() =>
    resolveInitialJournalStyle(),
  );
  const [fallbackCount, setFallbackCount] = useState(0);

  useEffect(() => {
    if (!ctx) {
      applyJournalStyleToDocument(fallbackStyle);
    }
  }, [ctx, fallbackStyle]);

  const setFallback = useCallback((next: JournalStyleId) => {
    setFallbackStyle(next);
    setFallbackCount((c) => c + 1);
    applyJournalStyleToDocument(next);
    try {
      window.localStorage?.setItem(STYLE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  if (ctx) return ctx;
  return {
    styleId: fallbackStyle,
    setStyleId: setFallback,
    styleSwitchCount: fallbackCount,
  };
}
