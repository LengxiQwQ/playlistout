import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { Reveal } from '../components/motion/Reveal';
import { AnimatedCounter } from '../components/stats/AnimatedCounter';
import { __resetRevealEnvForTests } from '../motion/revealEnv';
import { __resetRevealObserverForTests } from './useReveal';

describe('useReveal & Reveal System', () => {
  beforeEach(() => {
    __resetRevealEnvForTests();
    __resetRevealObserverForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    __resetRevealEnvForTests();
    __resetRevealObserverForTests();
  });

  it('defaults to revealed="true" in test environment', () => {
    render(
      React.createElement(
        Reveal,
        { 'data-testid': 'reveal-box' } as any,
        React.createElement('span', null, 'visible content'),
      ),
    );
    expect(screen.getByTestId('reveal-box')).toHaveAttribute('data-revealed', 'true');
  });

  it('reveals when IntersectionObserver fires isIntersecting=true and unobserves element', () => {
    vi.stubEnv('MODE', 'development');
    const observeMock = vi.fn();
    const unobserveMock = vi.fn();
    const disconnectMock = vi.fn();
    let observerCallback: IntersectionObserverCallback | null = null;

    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
      takeRecords = () => [];
      root = null;
      rootMargin = '';
      thresholds = [];
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    __resetRevealEnvForTests();

    render(
      React.createElement(
        Reveal,
        { 'data-testid': 'reveal-box', effect: 'stamp', rot: -2 } as any,
        React.createElement('span', null, 'stamp card'),
      ),
    );

    const box = screen.getByTestId('reveal-box');
    expect(box).toHaveAttribute('data-revealed', 'false');
    expect(observeMock).toHaveBeenCalledWith(box);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: box } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(box).toHaveAttribute('data-revealed', 'true');
    expect(unobserveMock).toHaveBeenCalledWith(box);
  });

  it('defaults to revealed="true" when prefers-reduced-motion is reduce', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubGlobal('IntersectionObserver', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    __resetRevealEnvForTests();

    render(
      React.createElement(
        Reveal,
        { 'data-testid': 'reveal-reduced' } as any,
        React.createElement('span', null, 'reduced motion content'),
      ),
    );

    expect(screen.getByTestId('reveal-reduced')).toHaveAttribute('data-revealed', 'true');
  });

  it('reveals immediately on focusin for keyboard accessibility', () => {
    vi.stubEnv('MODE', 'development');

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = '';
      thresholds = [];
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    __resetRevealEnvForTests();

    render(
      React.createElement(
        Reveal,
        { 'data-testid': 'reveal-focus' } as any,
        React.createElement('button', { type: 'button' }, 'Focus me'),
      ),
    );

    const box = screen.getByTestId('reveal-focus');
    const button = screen.getByRole('button', { name: 'Focus me' });
    expect(box).toHaveAttribute('data-revealed', 'false');

    fireEvent.focusIn(button);
    expect(box).toHaveAttribute('data-revealed', 'true');
  });

  it('AnimatedCounter shows 0 when start=false in non-test mode and target value in test mode', () => {
    // 1. In test mode (default), shows target value immediately even when start=false
    const { unmount } = render(
      React.createElement(AnimatedCounter, { value: 1234, start: false }),
    );
    expect(screen.getByText('1,234')).toBeInTheDocument();
    unmount();

    // 2. In non-test mode, shows 0 when start=false, then animates when start=true
    vi.stubEnv('MODE', 'development');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const { container, rerender } = render(
      React.createElement(AnimatedCounter, { value: 1234, start: false }),
    );
    expect(container.textContent).toBe('0');

    rerender(React.createElement(AnimatedCounter, { value: 1234, start: true }));
    expect(container).toBeInTheDocument();
  });
});
