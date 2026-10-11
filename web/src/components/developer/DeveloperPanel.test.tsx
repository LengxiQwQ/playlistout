import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeveloperPanel } from './DeveloperPanel';
import * as clipboardUtils from '../../utils/clipboard';

describe('DeveloperPanel', () => {
  it('exposes API, JSON, local CLI, and integration entry points', () => {
    const { container } = render(<DeveloperPanel />);

    expect(screen.getByRole('heading', { name: '给开发者 / For Developers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看 JSON 规范 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/JSON-SCHEMA.md',
    );
    expect(screen.getByRole('link', { name: '查看 API 文档 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/API.md',
    );
    expect(screen.getByRole('link', { name: '查看 CLI 使用说明 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout#python-cli--命令行',
    );
    expect(screen.getByRole('link', { name: '查看接入指南 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/ECOSYSTEM-INTEGRATION.md',
    );

    // The section itself is the only paper surface. Inner methods stay flat.
    expect(container.querySelectorAll('#developers .journal-paper')).toHaveLength(0);
  });

  it('copies the public API base URL', async () => {
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(<DeveloperPanel />);

    fireEvent.click(screen.getByRole('button', { name: '复制 API 地址' }));

    expect(copySpy).toHaveBeenCalledWith('https://playlistout-api.lengxiqwq.com');
    expect(await screen.findByRole('button', { name: '已复制 ✓' })).toBeInTheDocument();
  });
});
