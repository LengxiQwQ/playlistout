import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SponsorButton } from './SponsorButton';

describe('SponsorButton Component', () => {
  it('renders closed by default', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor|赞助/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles menu on click', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor|赞助/i });

    // Open
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/sponsor & support|赞助与支持/i)).toBeInTheDocument();

    // Verify all 3 sponsor channels
    const githubLink = screen.getByRole('link', { name: /github sponsors/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/sponsors/LengxiQwQ');

    const afdianLink = screen.getByRole('link', { name: /爱发电/i });
    expect(afdianLink).toHaveAttribute('href', 'https://afdian.com/a/lengxiqwq');

    const qrImage = screen.getByAltText(/微信赞赏码/);
    expect(qrImage).toHaveAttribute('src', '/sponsor/wechat-sponsor.jpg');

    // Close on click again
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes menu when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <SponsorButton />
      </div>,
    );

    const button = screen.getByRole('button', { name: /sponsor|赞助/i });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes menu when pressing Escape key', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor|赞助/i });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes menu when clicking the close button', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor|赞助/i });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('portals centered modal to document.body on mobile viewports so footer transforms cannot clip it', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { container } = render(<SponsorButton />);
      fireEvent.click(screen.getByRole('button', { name: /sponsor|赞助/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('is-mobile-modal');
      expect(container.contains(dialog)).toBe(false);
      expect(document.body.contains(dialog)).toBe(true);

      // Clicking inside dialog must keep it open; clicking backdrop must close it
      fireEvent.mouseDown(dialog);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const backdrop = dialog.parentElement as HTMLElement;
      expect(backdrop).toHaveClass('sponsor-backdrop');
      fireEvent.click(backdrop);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});