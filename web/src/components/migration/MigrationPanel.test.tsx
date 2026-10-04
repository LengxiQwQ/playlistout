import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Playlist } from '../../api/types';
import { MigrationPanel } from './MigrationPanel';
import { createSoundiizMigration } from '../../services/migration/soundiiz';

vi.mock('../../services/migration/soundiiz', () => ({
  SOUNDIIZ_MAX_TRACKS: 200,
  createSoundiizMigration: vi.fn(),
}));

const playlist: Playlist = {
  platform: 'qqmusic',
  id: '123',
  name: '测试歌单',
  trackCount: 2,
  tracks: [
    { index: 1, title: 'Song 1', artists: ['Artist 1'] },
    { index: 2, title: 'Song 2', artists: ['Artist 2'] },
  ],
};

describe('MigrationPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows compact migration services instead of destination music platforms', () => {
    render(<MigrationPanel playlist={playlist} />);

    expect(screen.getByText('Soundiiz')).toBeInTheDocument();
    expect(screen.getByText('TuneMyMusic')).toBeInTheDocument();
    expect(screen.getByText('FreeYourMusic')).toBeInTheDocument();
    expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
    expect(screen.getAllByText(/前往迁移/)).toHaveLength(3);
  });

  it('sends the tracklist to Soundiiz without preselecting a destination', async () => {
    const replace = vi.fn();
    const close = vi.fn();
    const popup = {
      opener: null,
      document: {
        title: '',
        body: { textContent: '' },
      },
      closed: false,
      location: { replace },
      close,
    } as unknown as Window;

    vi.spyOn(window, 'open').mockReturnValue(popup);
    vi.mocked(createSoundiizMigration).mockResolvedValue({
      shareUrl: 'https://soundiiz.com/go/import-playlist/abc123',
      nbTracks: 2,
    });

    render(<MigrationPanel playlist={playlist} />);
    fireEvent.click(screen.getByRole('button', { name: '一键迁移' }));

    await waitFor(() => {
      expect(createSoundiizMigration).toHaveBeenCalledWith(playlist, null);
    });
    expect(replace).toHaveBeenCalledWith('https://soundiiz.com/go/import-playlist/abc123');
  });

  it('disables one-click transfer above 200 parsed tracks but keeps provider links available', () => {
    const largePlaylist: Playlist = {
      ...playlist,
      trackCount: 201,
      tracks: Array.from({ length: 201 }, (_, index) => ({
        index: index + 1,
        title: `Song ${index + 1}`,
        artists: ['Artist'],
      })),
    };

    render(<MigrationPanel playlist={largePlaylist} />);

    expect(screen.getByRole('button', { name: '一键迁移' })).toBeDisabled();
    expect(screen.getAllByText(/前往迁移/)).toHaveLength(3);
    expect(screen.getByText(/超过 Soundiiz 一键迁移的 200 首限制/)).toBeInTheDocument();
  });

  it('reveals concise import guidance from the question-mark help button', () => {
    render(<MigrationPanel playlist={playlist} />);

    const help = screen.getByRole('button', { name: '查看 TuneMyMusic 使用说明' });
    fireEvent.mouseEnter(help);

    expect(
      screen.getByText(/推荐先从 Playlist Out 导出 M3U8 或 CSV/),
    ).toBeInTheDocument();
  });
});
