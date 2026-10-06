import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { BinderSpine } from './BinderSpine';

describe('BinderSpine Component', () => {
  it('renders binder holes container with aria-hidden', () => {
    const { container } = render(<BinderSpine />);
    const spine = container.querySelector('.binder-holes');
    expect(spine).toBeInTheDocument();
    expect(spine).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders binder hole items', () => {
    const { container } = render(<BinderSpine />);
    const holes = container.querySelectorAll('.binder-hole');
    expect(holes.length).toBeGreaterThanOrEqual(15);
  });

  it('cleans up event listeners and observer on unmount', () => {
    const disconnectMock = vi.fn();
    const observeMock = vi.fn();

    // Vitest 5 no longer treats vi.fn().mockImplementation(() => object) as a
    // constructable class. Use a real class because BinderSpine calls
    // `new ResizeObserver(...)`.
    const originalResizeObserver = window.ResizeObserver;
    class MockResizeObserver {
      observe = observeMock;
      disconnect = disconnectMock;
      unobserve = vi.fn();
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    try {
      const { unmount } = render(<BinderSpine />);
      unmount();

      expect(disconnectMock).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      removeEventListenerSpy.mockRestore();
      window.ResizeObserver = originalResizeObserver;
    }
  });
});
