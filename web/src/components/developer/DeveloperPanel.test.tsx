import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DeveloperPanel } from './DeveloperPanel';
import * as clipboardUtils from '../../utils/clipboard';

describe('DeveloperPanel', () => {
  it('exposes API, CLI, JSON, and player integration entry points with stationery styling', () => {
    const { container } = render(<DeveloperPanel />);

    expect(screen.getByRole('heading', { name: '给开发者' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看 API 文档 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/API.md',
    );
    expect(screen.getByRole('link', { name: '查看 CLI 使用说明 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/cli/README.md',
    );
    expect(screen.getByRole('link', { name: '查看 JSON 规范 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/JSON-SCHEMA.md',
    );
    expect(screen.getByRole('link', { name: '查看接入指南 ↗' })).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/blob/main/docs/ECOSYSTEM-INTEGRATION.md',
    );

    // Uses handwritten stationery journal fonts on header/notes while keeping card body clean
    expect(
      container.querySelectorAll('#developers .font-marker, #developers .font-handwriting'),
    ).not.toHaveLength(0);
  });

  it('copies the public API base URL and resets back after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(<DeveloperPanel />);

    const copyBtn = screen.getByRole('button', { name: '复制 API 地址' });
    fireEvent.click(copyBtn);

    expect(copySpy).toHaveBeenCalledWith('https://playlistout-api.lengxiqwq.com');
    expect(await screen.findByRole('button', { name: '已复制 ✓' })).toBeInTheDocument();

    // Fast-forward past 2000ms
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(await screen.findByRole('button', { name: '复制 API 地址' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
