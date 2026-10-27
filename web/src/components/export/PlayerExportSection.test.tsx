import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerExportSection } from './PlayerExportSection';
import * as exportUtils from '../../utils/export';
import type { Playlist } from '../../api/types';

const mockPlaylist: Playlist = {
  platform: 'qqmusic',
  id: 'test_123',
  name: '测试开源播放器歌单',
  trackCount: 2,
  tracks: [
    { index: 1, title: '夜曲', artist: '周杰伦', id: '001', durationMs: 220000 },
    { index: 2, title: '发如雪', artist: '周杰伦', id: '002', durationMs: 300000 },
  ],
};

describe('PlayerExportSection Component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled buttons when playlist is null', () => {
    render(
      <PlayerExportSection
        playlist={null}
        onExportSuccess={vi.fn()}
        onExportError={vi.fn()}
      />,
    );

    const lxBtn = screen.getByRole('button', { name: /洛雪音乐/ });
    const l1Btn = screen.getByRole('button', { name: /Listen 1/ });
    const mfBtn = screen.getByRole('button', { name: /MusicFree/ });

    expect(lxBtn).toBeDisabled();
    expect(l1Btn).toBeDisabled();
    expect(mfBtn).toBeDisabled();
    expect(
      screen.getByRole('link', { name: /前往「把歌单带进更多地方」/ }),
    ).toHaveAttribute('href', '#ecosystem');
  });

  it('triggers LX Music export when clicking LX Music button', () => {
    const onExportSuccess = vi.fn();
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockReturnValue({
      filename: '【洛雪音乐】测试开源播放器歌单.json',
    });

    render(
      <PlayerExportSection
        playlist={mockPlaylist}
        onExportSuccess={onExportSuccess}
        onExportError={vi.fn()}
      />,
    );

    const lxBtn = screen.getByRole('button', { name: /洛雪音乐/ });
    expect(lxBtn).not.toBeDisabled();

    fireEvent.click(lxBtn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'lx-music');
    expect(onExportSuccess).toHaveBeenCalledWith('【洛雪音乐】测试开源播放器歌单.json');
  });

  it('triggers Listen 1 export when clicking Listen 1 button', () => {
    const onExportSuccess = vi.fn();
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockReturnValue({
      filename: '【Listen 1】测试开源播放器歌单.json',
    });

    render(
      <PlayerExportSection
        playlist={mockPlaylist}
        onExportSuccess={onExportSuccess}
        onExportError={vi.fn()}
      />,
    );

    const l1Btn = screen.getByRole('button', { name: /Listen 1/ });
    expect(l1Btn).not.toBeDisabled();

    fireEvent.click(l1Btn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'listen1');
    expect(onExportSuccess).toHaveBeenCalledWith('【Listen 1】测试开源播放器歌单.json');
  });

  it('triggers MusicFree JSON export when clicking MusicFree button', () => {
    const onExportSuccess = vi.fn();
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockReturnValue({
      filename: '【QQ 音乐】测试开源播放器歌单.json',
    });

    render(
      <PlayerExportSection
        playlist={mockPlaylist}
        onExportSuccess={onExportSuccess}
        onExportError={vi.fn()}
      />,
    );

    const mfBtn = screen.getByRole('button', { name: /MusicFree/ });
    expect(mfBtn).not.toBeDisabled();

    fireEvent.click(mfBtn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'json');
    expect(onExportSuccess).toHaveBeenCalledWith('【QQ 音乐】测试开源播放器歌单.json');
  });

  it('handles export error gracefully', () => {
    const onExportError = vi.fn();
    vi.spyOn(exportUtils, 'exportPlaylist').mockImplementation(() => {
      throw new Error('Export error');
    });

    render(
      <PlayerExportSection
        playlist={mockPlaylist}
        onExportSuccess={vi.fn()}
        onExportError={onExportError}
      />,
    );

    const lxBtn = screen.getByRole('button', { name: /洛雪音乐/ });
    fireEvent.click(lxBtn);

    expect(onExportError).toHaveBeenCalled();
  });

  it('smoothly scrolls to #ecosystem when clicking the ecosystem link', () => {
    const scrollIntoViewMock = vi.fn();
    const ecosystemEl = document.createElement('div');
    ecosystemEl.id = 'ecosystem';
    ecosystemEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(ecosystemEl);

    render(
      <PlayerExportSection
        playlist={mockPlaylist}
        onExportSuccess={vi.fn()}
        onExportError={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: /前往「把歌单带进更多地方」/ });
    fireEvent.click(link);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(ecosystemEl);
  });
});
