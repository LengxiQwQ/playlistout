import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackTable } from './TrackTable';
import { LanguageProvider } from '../i18n';
import type { Track } from '../api/types';

const mockTracks: Track[] = [
  {
    id: 'track-1',
    index: 1,
    title: '晴天',
    artists: ['周杰伦'],
    album: '叶惠美',
    durationMs: 269000,
    coverUrl: 'https://example.com/cover.jpg',
    status: 'playable',
  },
  {
    id: 'track-2',
    index: 2,
    title: '夜曲',
    artists: ['周杰伦'],
    album: '十一月的萧邦',
    durationMs: 226000,
    status: 'vip',
    isVip: true,
  },
];

describe('TrackTable Component (Mobile view modes)', () => {
  it('renders track list title and defaults to compact mode', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <TrackTable tracks={mockTracks} />
      </LanguageProvider>
    );

    expect(screen.getByText('歌曲列表 (2)')).toBeInTheDocument();
    const container = screen.getByTestId('track-table-container');
    expect(container).toHaveClass('is-compact-mobile');

    // Index and cover should be rendered
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByAltText('晴天 cover')).toBeInTheDocument();

    // Toggle button should display "显示更多" by default
    const toggleBtn = screen.getByRole('button', { name: '显示更多' });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent('+显示更多');
  });

  it('toggles to expanded mode on button click and back to compact mode', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <TrackTable tracks={mockTracks} />
      </LanguageProvider>
    );

    const container = screen.getByTestId('track-table-container');
    const toggleBtn = screen.getByRole('button', { name: '显示更多' });

    // Click to expand
    fireEvent.click(toggleBtn);
    expect(container).toHaveClass('is-expanded-mobile');
    expect(container).not.toHaveClass('is-compact-mobile');
    expect(screen.getByRole('button', { name: '显示更少' })).toHaveTextContent('−显示更少');

    // Click to collapse
    fireEvent.click(screen.getByRole('button', { name: '显示更少' }));
    expect(container).toHaveClass('is-compact-mobile');
    expect(container).not.toHaveClass('is-expanded-mobile');
    expect(screen.getByRole('button', { name: '显示更多' })).toHaveTextContent('+显示更多');
  });
});
