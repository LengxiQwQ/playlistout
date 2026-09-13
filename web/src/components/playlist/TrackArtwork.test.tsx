import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackArtwork } from './TrackArtwork';

describe('TrackArtwork Component (Phase 6)', () => {
  it('renders lazy-loaded image when valid coverUrl is provided', () => {
    render(<TrackArtwork coverUrl="https://example.com/cover.jpg" title="晴天" size={40} />);

    const img = screen.getByRole('img', { name: '晴天 cover' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders vinyl placeholder when coverUrl is missing', () => {
    render(<TrackArtwork title="No Cover Song" size={40} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('💿')).toBeInTheDocument();
    expect(screen.getByLabelText('No Cover Song cover placeholder')).toBeInTheDocument();
  });

  it('falls back to vinyl placeholder when image triggers onError', () => {
    render(<TrackArtwork coverUrl="https://example.com/broken.jpg" title="Broken Cover Song" size={40} />);

    const img = screen.getByRole('img', { name: 'Broken Cover Song cover' });
    expect(img).toBeInTheDocument();

    // Trigger image error (e.g. 404)
    fireEvent.error(img);

    // Should gracefully switch to placeholder without crashing
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('💿')).toBeInTheDocument();
  });
});
