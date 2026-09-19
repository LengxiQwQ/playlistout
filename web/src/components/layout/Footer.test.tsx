import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('renders all footer action links correctly', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    // Brand and Tagline
    expect(screen.getByText('PlaylistOut')).toBeInTheDocument();

    // Action Links
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout',
    );

    const authorBtn = screen.getByRole('button', { name: /联系作者|contact author/i });
    expect(authorBtn).toBeInTheDocument();
    expect(authorBtn).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByRole('button', { name: /sponsor/i })).toBeInTheDocument();

    const privacyBtn = screen.getByRole('button', { name: /Privacy Policy/i });
    expect(privacyBtn).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Issues/i })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/issues',
    );
  });

  it('calls onOpenPrivacy when clicking Privacy Policy button', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    const privacyBtn = screen.getByRole('button', { name: /Privacy Policy/i });
    fireEvent.click(privacyBtn);
    expect(onOpenPrivacyMock).toHaveBeenCalledTimes(1);
  });

  it('toggles Author card when clicking Author button', () => {
    const onOpenPrivacyMock = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacyMock} />);

    const authorBtn = screen.getByRole('button', { name: /联系作者|contact author/i });
    expect(screen.queryByRole('dialog', { name: /联系作者|contact author/i })).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(authorBtn);
    expect(authorBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /联系作者|contact author/i })).toBeInTheDocument();

    // Click again to close
    fireEvent.click(authorBtn);
    expect(authorBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: /联系作者|contact author/i })).not.toBeInTheDocument();
  });

  it('closes Author card when clicking outside', () => {
    const onOpenPrivacyMock = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <Footer onOpenPrivacy={onOpenPrivacyMock} />
      </div>,
    );

    const authorBtn = screen.getByRole('button', { name: /联系作者|contact author/i });
    fireEvent.click(authorBtn);
    expect(screen.getByRole('dialog', { name: /联系作者|contact author/i })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog', { name: /联系作者|contact author/i })).not.toBeInTheDocument();
  });
});
