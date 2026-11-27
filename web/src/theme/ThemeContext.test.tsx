import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from './ThemeContext';

const TestConsumer: React.FC = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>Toggle</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Set Light</button>
      <button data-testid="set-auto" onClick={() => setTheme('auto')}>Set Auto</button>
    </div>
  );
};

describe('ThemeContext & ThemeProvider', () => {
  let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[] = [];
  let matchesMock = false;

  beforeEach(() => {
    localStorage.clear();
    mediaQueryListeners = [];
    matchesMock = false;
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeMode;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesMock,
      media: query,
      onchange: null,
      addListener: vi.fn((fn) => mediaQueryListeners.push(fn)),
      removeListener: vi.fn((fn) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== fn);
      }),
      addEventListener: vi.fn((event, fn) => {
        if (event === 'change') mediaQueryListeners.push(fn);
      }),
      removeEventListener: vi.fn((event, fn) => {
        if (event === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter((l) => l !== fn);
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to auto mode and resolves to light when system is light', () => {
    matchesMock = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.themeMode).toBe('auto');
  });

  it('resolves auto mode to dark when system is dark', () => {
    matchesMock = true;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('cycles through auto -> dark -> light -> auto on toggleTheme', () => {
    matchesMock = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-btn');

    // 1st click: auto -> dark
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    // 2nd click: dark -> light
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    // 3rd click: light -> auto
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });

  it('allows setting explicit themes and persists in localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      fireEvent.click(screen.getByTestId('set-light'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('reacts dynamically to system color-scheme change when in auto mode', () => {
    matchesMock = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');

    // Simulate system preference change event to dark
    act(() => {
      mediaQueryListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
