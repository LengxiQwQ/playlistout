import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from '../App';

describe('Viewport-bound layout selection (Desktop Timeline vs Mobile Pinboard)', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    delete document.documentElement.dataset.layoutDemo;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('uses Desktop Timeline layout (a) when viewport is wider than 768px', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<App />);

    expect(document.documentElement.dataset.layoutDemo).toBe('a');
    expect(container.querySelector('.layout-a-zigzag')).toBeInTheDocument();
    expect(container.querySelector('.layout-b-board')).not.toBeInTheDocument();
    expect(screen.getByText('01 · 卡带上架')).toBeInTheDocument();
  });

  it('uses Mobile Pinboard layout (b) on mobile viewports (<= 768px) and switches dynamically', () => {
    let isMobile = true;
    const listeners = new Set<() => void>();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return isMobile;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<App />);

    expect(document.documentElement.dataset.layoutDemo).toBe('b');
    expect(container.querySelector('.layout-b-board')).toBeInTheDocument();
    expect(container.querySelector('.layout-a-zigzag')).not.toBeInTheDocument();

    act(() => {
      isMobile = false;
      listeners.forEach((cb) => cb());
    });

    expect(document.documentElement.dataset.layoutDemo).toBe('a');
    expect(container.querySelector('.layout-a-zigzag')).toBeInTheDocument();
  });
});
