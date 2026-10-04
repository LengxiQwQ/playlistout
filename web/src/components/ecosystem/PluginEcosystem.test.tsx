import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n';
import { PluginEcosystem } from './PluginEcosystem';

vi.mock('../../utils/clipboard', () => ({
  copyToClipboard: vi.fn(async () => true),
}));

const manifest = {
  schemaVersion: 1,
  name: 'PlaylistOut Multi-Platform Plugin Ecosystem',
  homepage: 'https://playlistout.lengxiqwq.com',
  updatedAt: '2026-10-04T00:00:00.000Z',
  platforms: [
    {
      id: 'musicfree',
      name: 'MusicFree',
      status: 'available',
      version: '1.3.9',
      description: 'MusicFree integration',
      summary: {
        'zh-CN': 'MusicFree 中文简介',
        'en-US': 'MusicFree English summary',
      },
      entrypoint: 'https://example.com/plugins/musicfree/plugin.js',
      artifacts: [
        {
          role: 'entrypoint',
          publicPath: 'plugin.js',
          url: 'https://example.com/plugins/musicfree/plugin.js',
        },
      ],
    },
    {
      id: 'second-player',
      name: 'Second Player',
      status: 'available',
      version: '1.0.0',
      description: 'Second integration',
      summary: {
        'zh-CN': '第二个播放器简介',
        'en-US': 'Second player summary',
      },
      entrypoint: 'https://example.com/plugins/second-player/plugin.mjs',
      artifacts: [
        {
          role: 'entrypoint',
          publicPath: 'plugin.mjs',
          url: 'https://example.com/plugins/second-player/plugin.mjs',
        },
      ],
    },
  ],
};

describe('PluginEcosystem', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => manifest,
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loads all available plugin cards from the generated manifest', async () => {
    const { container } = render(
      <LanguageProvider defaultLanguage="zh-CN">
        <PluginEcosystem />
      </LanguageProvider>,
    );

    expect(await screen.findByText('MusicFree')).toBeInTheDocument();
    expect(screen.getByText('Second Player')).toBeInTheDocument();
    expect(screen.getByText('MusicFree 中文简介')).toBeInTheDocument();
    expect(screen.getByText('第二个播放器简介')).toBeInTheDocument();
    expect(container.querySelector('.plugin-supported-number')).toHaveTextContent('2');

    // Planned/proposed integrations remain a separate static roadmap list.
    expect(screen.getByText('LX Music')).toBeInTheDocument();
    expect(screen.getByText('Moosync')).toBeInTheDocument();
  });

  it('uses manifest-provided localized summaries instead of player-specific UI branches', async () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <PluginEcosystem />
      </LanguageProvider>,
    );

    expect(await screen.findByText('MusicFree English summary')).toBeInTheDocument();
    expect(screen.getByText('Second player summary')).toBeInTheDocument();
  });

  it('keeps copy feedback timers independent for multiple plugins', async () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <PluginEcosystem />
      </LanguageProvider>,
    );

    await screen.findByText('Second Player');
    const buttons = screen.getAllByRole('button', { name: '复制插件地址' });
    expect(buttons).toHaveLength(2);

    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(buttons[0]);
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(buttons[1]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getAllByText('✓ 已复制')).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(2700);
    });

    expect(buttons[0]).toHaveTextContent('复制插件地址');
    expect(buttons[1]).toHaveTextContent('复制插件地址');
  });
});
