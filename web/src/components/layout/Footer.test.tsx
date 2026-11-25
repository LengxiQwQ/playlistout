import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('renders all footer action links correctly', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    // Brand and Tagline
    expect(screen.getByText('Playlist Out')).toBeInTheDocument();

    // Action Links
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout',
    );
    expect(screen.queryByRole('link', { name: /开发者文档|developer docs/i })).not.toBeInTheDocument();

    const authorBtn = screen.getByRole('button', { name: /作者信息|author/i });
    expect(authorBtn).toBeInTheDocument();
    expect(authorBtn).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByRole('button', { name: /sponsor|赞助/i })).toBeInTheDocument();

    const privacyBtn = screen.getByRole('button', { name: /Privacy Policy|隐私政策/i });
    expect(privacyBtn).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Issues|反馈建议/i })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/issues',
    );
  });

  it('calls onOpenPrivacy when clicking Privacy Policy button', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    const privacyBtn = screen.getByRole('button', { name: /Privacy Policy|隐私政策/i });
    fireEvent.click(privacyBtn);
    expect(onOpenPrivacyMock).toHaveBeenCalledTimes(1);
  });

  it('toggles Author card when clicking Author button', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    const authorBtn = screen.getByRole('button', { name: /作者信息|author/i });
    expect(screen.queryByRole('dialog', { name: /冷汐OωO/i })).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(authorBtn);
    expect(authorBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /冷汐OωO/i })).toBeInTheDocument();

    // Click again to close
    fireEvent.click(authorBtn);
    expect(authorBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: /冷汐OωO/i })).not.toBeInTheDocument();
  });

  it('closes Author card when clicking outside', () => {
    const onOpenPrivacyMock = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <Footer onOpenPrivacy={onOpenPrivacyMock} />
      </div>,
    );

    const authorBtn = screen.getByRole('button', { name: /作者信息|author/i });
    fireEvent.click(authorBtn);
    expect(screen.getByRole('dialog', { name: /冷汐OωO/i })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog', { name: /冷汐OωO/i })).not.toBeInTheDocument();
  });

  it('portals Author card cleanly to document.body on mobile viewports and stays closable', () => {
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
      const { container } = render(<Footer onOpenPrivacy={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /作者信息|author/i }));

      const dialog = screen.getByRole('dialog', { name: /冷汐OωO/i });
      expect(dialog).toHaveClass('is-mobile-modal');
      expect(container.contains(dialog)).toBe(false);
      expect(document.body.contains(dialog)).toBe(true);

      // Clicking inside dialog preserves open state
      fireEvent.mouseDown(dialog);
      expect(screen.getByRole('dialog', { name: /冷汐OωO/i })).toBeInTheDocument();

      // Clicking close button dismisses modal
      const closeBtn = screen.getByRole('button', { name: /关闭便签|close note/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog', { name: /冷汐OωO/i })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
