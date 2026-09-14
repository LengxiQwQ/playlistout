import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const xlsxBtn = screen.getByRole('button', { name: 'Excel (.xlsx)' });
    const jsonBtn = screen.getByRole('button', { name: 'JSON' });
    const copyTitleBtn = screen.getByRole('button', { name: '仅歌名' });

    expect(txtBtn).toBeDisabled();
    expect(csvBtn).toBeDisabled();
    expect(xlsxBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
    expect(copyTitleBtn).toBeDisabled();
  });

  it('toggles format selection and triggers export via export action button', () => {
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockReturnValue({
      filename: '测试歌单.xlsx',
    });

    render(<ExportToolbar playlist={mockPlaylist} />);

    const exportBtn = screen.getByRole('button', { name: /导出/ });
    expect(exportBtn).not.toBeDisabled();

    fireEvent.click(exportBtn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'xlsx');
    expect(screen.getByTestId('export-toast')).toHaveTextContent('已成功导出 测试歌单.xlsx');
  });

  it('supports multi-format selection and batch export', async () => {
    const exportSpy = vi.spyOn(exportUtils, 'exportPlaylist').mockImplementation((_, format) => ({
      filename: `测试歌单.${format}`,
    }));

    render(<ExportToolbar playlist={mockPlaylist} />);

    // By default xlsx is selected, click TXT to select it as well
    const txtBtn = screen.getByRole('button', { name: 'TXT' });
    fireEvent.click(txtBtn);

    const exportBtn = screen.getByRole('button', { name: /导出 \(2\)/ });
    expect(exportBtn).not.toBeDisabled();

    fireEvent.click(exportBtn);

    expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'xlsx');
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith(mockPlaylist, 'txt');
    });
    expect(await screen.findByTestId('export-toast')).toHaveTextContent('已成功导出 2 份文件');
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
