import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';
import * as client from './api/client';
import type { Playlist } from './api/types';



const mockSamplePlaylist: Playlist = {
  platform: 'qqmusic',
  id: '9044196528',
  name: '测试精选歌单',
  creator: '歌单达人',
  coverUrl: 'https://example.com/cover.jpg',
  trackCount: 3,
  tracks: [
    {
      index: 1,
      id: 'song_1',
      title: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      durationMs: 269000,
    },
    {
      index: 2,
      id: 'song_2',
      title: '珊瑚海',
      artists: ['周杰伦', 'Lara梁心颐'],
      album: '十一月的萧邦',
      durationMs: 256000,
    },
    {
      index: 3,
      id: 'song_1', // Legitimate duplicate track
      title: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      durationMs: 269000,
    },
  ],
};

describe('App Frontend Parse Flow (Phase 3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial idle state with heading, input and sample links', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PlaylistOut');
    expect(screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/)).toBeInTheDocument();
    expect(screen.getByText('民谣流行 (636首)')).toBeInTheDocument();
  });

  it('shows client validation error when submitting empty or invalid input', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/);
    const submitBtn = screen.getByRole('button', { name: '解析' });

    // Try submitting unsupported link
    fireEvent.change(input, { target: { value: 'https://music.163.com/playlist?id=123' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('status-alert-error')).toBeInTheDocument();
    expect(screen.getByText(/仅支持 QQ 音乐公开歌单/)).toBeInTheDocument();
  });

  it('renders loading state and successful playlist preview with repeated tracks preserved', async () => {
    vi.spyOn(client, 'parsePlaylist').mockResolvedValueOnce({
      success: true,
      data: mockSamplePlaylist,
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://y.qq.com/n/ryqq/playlist/9044196528' } });

    const submitBtn = screen.getByRole('button', { name: '解析' });
    fireEvent.click(submitBtn);

    // Verify summary card appears
    expect(await screen.findByTestId('playlist-summary')).toBeInTheDocument();
    expect(screen.getByText('测试精选歌单')).toBeInTheDocument();
    expect(screen.getByText('创建者：')).toBeInTheDocument();
    expect(screen.getByText('歌单达人')).toBeInTheDocument();
    expect(screen.getByText('共 3 首歌曲')).toBeInTheDocument();

    // Verify track list table
    const tableContainer = screen.getByTestId('track-table-container');
    expect(tableContainer).toBeInTheDocument();

    // Multi-artist display
    expect(screen.getByText('周杰伦 / Lara梁心颐')).toBeInTheDocument();

    // Both copies of legitimate duplicate '晴天' survive
    const qingtianRows = screen.getAllByText('晴天');
    expect(qingtianRows).toHaveLength(2);
  });

  it('handles API errors and supports retry', async () => {
    const parseSpy = vi
      .spyOn(client, 'parsePlaylist')
      .mockResolvedValueOnce({
        success: false,
        error: {
          code: 'PLAYLIST_NOT_FOUND',
          message: 'Playlist not found',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: mockSamplePlaylist,
      });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://y.qq.com/n/ryqq/playlist/9044196528' } });

    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Verify friendly error message
    expect(await screen.findByTestId('status-alert-error')).toBeInTheDocument();
    expect(screen.getByText(/未找到该歌单/)).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: '重试' });
    fireEvent.click(retryBtn);

    // Should succeed on retry
    expect(await screen.findByTestId('playlist-summary')).toBeInTheDocument();
    expect(parseSpy).toHaveBeenCalledTimes(2);
  });

  it('prevents stale slower responses from overwriting newer requests', async () => {
    let resolveFirst: (val: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.spyOn(client, 'parsePlaylist')
      .mockImplementationOnce(() => firstPromise as any)
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...mockSamplePlaylist,
          name: '最新快速解析结果',
        },
      });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/);

    // Request 1 (slow)
    fireEvent.change(input, { target: { value: '9044196528' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Request 2 (fast)
    fireEvent.change(input, { target: { value: '8079931214' } });
    fireEvent.click(screen.getByRole('button', { name: /解析/ }));


    // Request 2 completes and displays
    expect(await screen.findByText('最新快速解析结果')).toBeInTheDocument();

    // Now Request 1 resolves later
    resolveFirst!({
      success: true,
      data: {
        ...mockSamplePlaylist,
        name: '过期的旧结果',
      },
    });

    // Wait slightly to ensure it doesn't overwrite
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('过期的旧结果')).not.toBeInTheDocument();
    expect(screen.getByText('最新快速解析结果')).toBeInTheDocument();
  });

  it('renders large lists (1000 tracks) responsibly', async () => {
    const largeTracks = Array.from({ length: 1000 }, (_, i) => ({
      index: i + 1,
      id: `song_${i + 1}`,
      title: `Song ${i + 1}`,
      artists: [`Artist ${i + 1}`],
      album: `Album ${i + 1}`,
      durationMs: 180000,
    }));

    const largePlaylist: Playlist = {
      platform: 'qqmusic',
      id: '4177812546',
      name: '1000 首大型歌单',
      trackCount: 1000,
      tracks: largeTracks,
    };

    vi.spyOn(client, 'parsePlaylist').mockResolvedValueOnce({
      success: true,
      data: largePlaylist,
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴 QQ 音乐公开歌单链接/);
    fireEvent.change(input, { target: { value: '4177812546' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    expect(await screen.findByText('1000 首大型歌单')).toBeInTheDocument();
    expect(screen.getByText('共 1000 首歌曲')).toBeInTheDocument();
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText('Song 1000')).toBeInTheDocument();
  });

  it('allows opening and closing the Privacy Policy modal via footer and feature cards', async () => {
    render(<App />);

    expect(screen.getByText(/QQ 音乐公开歌单解析 · MVP/)).toBeInTheDocument();

    // 1. Open via feature card link
    const featureLink = screen.getByText('查看数据说明');
    fireEvent.click(featureLink);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('隐私政策与数据说明')).toBeInTheDocument();

    // Close via modal button
    fireEvent.click(screen.getByText('我知道了'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Open via footer link
    const footerLink = screen.getByText('Privacy Policy');
    fireEvent.click(footerLink);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close via Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
