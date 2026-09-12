import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportToolbar } from './ExportToolbar';

import * as exportUtils from '../utils/export';
import * as clipboardUtils from '../utils/clipboard';
import type { Playlist } from '../api/types';

const mockPlaylist: Playlist = {
  platform: 'qqmusic',
  id: '123',
  name: '测试歌单',
  trackCount: 2,
  tracks: [
    { index: 1, title: 'Song 1', artists: ['Artist 1'] },
    { index: 2, title: 'Song 2', artists: ['Artist 2'] },
  ],
};

describe('ExportToolbar Component (Phase 4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled buttons when playlist is null', () => {
    render(<ExportToolbar playlist={null} />);

    const txtBtn = screen.getByRole('button', { name: 'TXT' });
    const csvBtn = screen.getByRole('button', { name: 'CSV' });
    const xlsxBtn = screen.getByRole('button', { name: /Excel/ });
    const jsonBtn = screen.getByRole('button', { name: 'JSON' });
    const copyTitleBtn = screen.getByRole('button', { name: '仅歌名' });

    expect(txtBtn).toBeDisabled();
    expect(csvBtn).toBeDisabled();
    expect(xlsxBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
    expect(copyTitleBtn).toBeDisabled();
  });

  it('triggers export and displays toast feedback when clicking export buttons', () => {
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockReturnValue({
      filename: '测试歌单.xlsx',
    });

    render(<ExportToolbar playlist={mockPlaylist} />);

    const xlsxBtn = screen.getByRole('button', { name: /Excel/ });
    expect(xlsxBtn).not.toBeDisabled();

    fireEvent.click(xlsxBtn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'xlsx');
    expect(screen.getByTestId('export-toast')).toHaveTextContent('已成功导出 测试歌单.xlsx');
  });

  it('triggers clipboard copy and displays toast feedback when clicking copy buttons', async () => {
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(<ExportToolbar playlist={mockPlaylist} />);

    const copyBtn = screen.getByRole('button', { name: '歌名 - 歌手' });
    expect(copyBtn).not.toBeDisabled();

    fireEvent.click(copyBtn);

    expect(copySpy).toHaveBeenCalled();
    expect(await screen.findByTestId('export-toast')).toHaveTextContent('已复制 2 首歌曲（歌名 - 歌手）到剪贴板！');
  });
});
