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
    { index: 1, title: 'Song 1', artist: 'Artist 1' },
    { index: 2, title: 'Song 2', artist: 'Artist 2' },
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
    const m3u8Btn = screen.getByRole('button', { name: 'M3U8' });
    const copyTitleBtn = screen.getByRole('button', { name: '仅歌名' });

    expect(txtBtn).toBeDisabled();
    expect(csvBtn).toBeDisabled();
    expect(xlsxBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
    expect(m3u8Btn).toBeDisabled();
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

  it('triggers generic JSON clipboard copy and shows third-party guidance', async () => {
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(<ExportToolbar playlist={mockPlaylist} />);

    const copyJsonBtn = screen.getByRole('button', { name: '📋 复制 JSON 数据' });
    expect(copyJsonBtn).not.toBeDisabled();
    expect(
      screen.getByText('适用于通过剪贴板导入歌单的第三方插件、播放器或工具。'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/MusicFree 导入/)).not.toBeInTheDocument();

    fireEvent.click(copyJsonBtn);

    expect(copySpy).toHaveBeenCalled();
    expect(await screen.findByTestId('export-toast')).toHaveTextContent('已复制完整 JSON 歌单数据');
    expect(screen.getByTestId('export-toast')).not.toHaveTextContent('MusicFree');
  });
  it('uses three equally prominent export section titles and removes the legacy MusicFree copy action', () => {
    render(<ExportToolbar playlist={mockPlaylist} />);

    const exportTitle = screen.getByText('选择导出格式（可多选）：');
    const migrationTitle = screen.getByText('第三方歌单迁移 ↗');
    const clipboardTitle = screen.getByText('快捷复制到剪贴板');

    expect(exportTitle).toHaveStyle({ fontSize: '1.5rem', fontWeight: '700' });
    expect(migrationTitle).toHaveStyle({ fontSize: '1.5rem', fontWeight: '700' });
    expect(clipboardTitle).toHaveStyle({ fontSize: '1.5rem', fontWeight: '700' });

    expect(
      screen.queryByText('🎧 一键复制 MusicFree 官方插件链接'),
    ).not.toBeInTheDocument();
  });

  it('labels clipboard actions by plain-text and JSON data type', () => {
    render(<ExportToolbar playlist={mockPlaylist} />);

    expect(screen.getByText('纯文本：')).toBeInTheDocument();
    expect(screen.getByText('JSON 数据：')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '仅歌名' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '歌名 - 歌手' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '歌名 - 歌手 - 专辑' })).toBeEnabled();
    const titleOnly = screen.getByRole('button', { name: '仅歌名' });
    const titleArtist = screen.getByRole('button', { name: '歌名 - 歌手' });
    const titleArtistAlbum = screen.getByRole('button', { name: '歌名 - 歌手 - 专辑' });
    const jsonCopy = screen.getByRole('button', { name: '📋 复制 JSON 数据' });

    expect(titleOnly).toBeEnabled();
    expect(titleArtist).toBeEnabled();
    expect(titleArtistAlbum).toBeEnabled();
    expect(jsonCopy).toBeEnabled();

    expect(titleOnly).toHaveClass('clipboard-copy-button');
    expect(titleArtist).toHaveClass('clipboard-copy-button');
    expect(titleArtistAlbum).toHaveClass('clipboard-copy-button');
    expect(jsonCopy).toHaveClass('clipboard-json-copy-button');

    expect(titleOnly.closest('.clipboard-text-row')).not.toBeNull();
    expect(jsonCopy.closest('.clipboard-json-row')).not.toBeNull();
  });

});
