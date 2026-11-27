import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ThemeMode, ResolvedTheme, ThemeContextValue } from './types';

export const THEME_STORAGE_KEY = 'playlistout-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto';
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'auto') {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'auto';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultTheme?: ThemeMode }> = ({
  children,
  defaultTheme,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => defaultTheme || getInitialTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  // Listen to system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e?: MediaQueryListEvent) => {
      const matches = e && typeof e.matches === 'boolean'
        ? e.matches
        : (window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false);
      setSystemTheme(matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'auto') {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  // Synchronize DOM attributes and meta theme-color
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themeMode = theme;
    root.style.colorScheme = resolvedTheme;

    // Synchronize browser header color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const metaColor = getComputedStyle(root)
      .getPropertyValue(resolvedTheme === 'dark' ? '--theme-meta-dark' : '--theme-meta-light')
      .trim();
    if (metaTheme && metaColor) {
      metaTheme.setAttribute('content', metaColor);
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'auto') return 'dark';
      if (prev === 'dark') return 'light';
      return 'auto';
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if used outside of provider (e.g. isolated test)
    return {
      theme: 'auto',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
