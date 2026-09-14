import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SponsorButton } from './SponsorButton';

describe('SponsorButton Component', () => {
  it('renders closed by default', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles menu on click', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor/i });

    // Open
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sponsor & Support')).toBeInTheDocument();

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

    const button = screen.getByRole('button', { name: /sponsor/i });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes menu when pressing Escape key', () => {
    render(<SponsorButton />);
    const button = screen.getByRole('button', { name: /sponsor/i });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});