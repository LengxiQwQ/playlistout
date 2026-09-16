import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByPlaceholderText(/粘贴公开歌单链接/)).toBeInTheDocument();
    expect(screen.getByText('民谣流行 (636首)')).toBeInTheDocument();
  });

  it('shows client validation error when submitting empty or invalid input', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    const submitBtn = screen.getByRole('button', { name: '解析' });

    // Try submitting unsupported link
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('status-alert-error')).toBeInTheDocument();
    expect(screen.getByText(/目前支持 QQ 音乐、网易云音乐与酷狗音乐公开歌单/)).toBeInTheDocument();
  });

  it('renders loading state and successful playlist preview with repeated tracks preserved', async () => {
    vi.spyOn(client, 'parsePlaylist').mockResolvedValueOnce({
      success: true,
      data: mockSamplePlaylist,
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
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
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
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

    vi.spyOn(client, 'parsePlaylist').mockImplementation(async (url: string) => {
      if (url.includes('9044196528')) {
        return firstPromise as any;
      }
      return {
        success: true,
        data: {
          ...mockSamplePlaylist,
          name: '最新快速解析结果',
        },
      };
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);

    // Request 1 (slow)
    fireEvent.change(input, { target: { value: 'https://y.qq.com/n/ryqq/playlist/9044196528' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Request 2 (fast)
    fireEvent.change(input, { target: { value: 'https://y.qq.com/n/ryqq/playlist/8079931214' } });
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

  it('numeric input: directly displays when exactly 1 match is found', async () => {
    vi.spyOn(client, 'parsePlaylist').mockImplementation(async (_id, _sig, platform) => {
      if (platform === 'netease') {
        return {
          success: true,
          data: {
            ...mockSamplePlaylist,
            platform: 'netease',
            name: '网易云唯一歌单',
          },
        };
      }
      return {
        success: false,
        error: { code: 'PLAYLIST_NOT_FOUND', message: 'Not found' },
      };
    });

    vi.spyOn(client, 'fetchUserPlaylists').mockResolvedValue({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Not found' },
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: '2756674066' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Expect direct load without modal
    expect(await screen.findByText('网易云唯一歌单')).toBeInTheDocument();
    expect(screen.queryByTestId('disambiguation-modal')).not.toBeInTheDocument();
  });

  it('numeric input: opens disambiguation modal when multiple targets match and allows selection', async () => {
    vi.spyOn(client, 'parsePlaylist').mockImplementation(async (_id, _sig, platform) => {
      if (platform === 'qqmusic') {
        return {
          success: true,
          data: {
            ...mockSamplePlaylist,
            platform: 'qqmusic',
            name: 'QQ冲突歌单',
          },
        };
      }
      return {
        success: true,
        data: {
          ...mockSamplePlaylist,
          platform: 'netease',
          name: '网易云冲突歌单',
        },
      };
    });

    vi.spyOn(client, 'fetchUserPlaylists').mockResolvedValue({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Not found' },
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: '1825474783' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Modal appears with candidates
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('发现多个匹配目标')).toBeInTheDocument();
    expect(screen.getByText('QQ冲突歌单')).toBeInTheDocument();
    expect(screen.getByText('网易云冲突歌单')).toBeInTheDocument();

    // User selects NetEase candidate
    const neteaseCard = screen.getByTestId('disambiguation-card-netease-playlist');
    fireEvent.click(neteaseCard);

    // Modal closes and selected playlist is rendered
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('网易云冲突歌单')).toBeInTheDocument();
  });


  it('renders large lists (1000 tracks) responsibly', { timeout: 15000 }, async () => {
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
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://y.qq.com/n/ryqq/playlist/4177812546' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    expect(await screen.findByText('1000 首大型歌单')).toBeInTheDocument();
    expect(screen.getByText('共 1000 首歌曲')).toBeInTheDocument();
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText('Song 1000')).toBeInTheDocument();
  });

  it('allows opening and closing the Privacy Policy modal via footer and feature cards', async () => {
    render(<App />);

    expect(screen.getByText(/跨平台公开歌单解析/)).toBeInTheDocument();

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

  it('scrolls to top on collection drilldown to show loading and restores collection smoothly without jumping to top', async () => {
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;
    Element.prototype.scrollIntoView = vi.fn();

    vi.spyOn(client, 'fetchUserPlaylists').mockResolvedValueOnce({
      success: true,
      data: {
        platform: 'netease',
        userId: '1825474783',
        nickname: '冷夕QwQ',
        total: 1,
        playlists: [
          {
            id: '2756674066',
            name: '我喜欢的音乐',
            trackCount: 15,
            sourceUrl: 'https://music.163.com/playlist?id=2756674066',
          },
        ],
      },
    });

    vi.spyOn(client, 'parsePlaylist').mockResolvedValueOnce({
      success: true,
      data: mockSamplePlaylist,
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://music.163.com/user/home?id=1825474783' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // 1. Collection view is shown
    expect(await screen.findByText('我喜欢的音乐')).toBeInTheDocument();
    expect(screen.getByText('冷夕QwQ 的音乐手账')).toBeInTheDocument();

    // Reset spy before drilldown
    scrollToSpy.mockClear();

    // 2. Click drilldown "查看歌曲"
    const drilldownBtn = screen.getByText(/查看歌曲/);
    fireEvent.click(drilldownBtn);

    // Should have smoothly scrolled to top to show loading progress
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // 3. Single playlist view lands
    expect(await screen.findByTestId('playlist-summary')).toBeInTheDocument();
    expect(screen.getByText('测试精选歌单')).toBeInTheDocument();

    // 4. Return to collection
    scrollToSpy.mockClear();
    const returnBtn = screen.getAllByText(/返回歌单合集/)[0];
    fireEvent.click(returnBtn);

    // Collection view should be visible again
    expect(await screen.findByText('冷夕QwQ 的音乐手账')).toBeInTheDocument();
    // Must NOT jump to top: 0
    expect(scrollToSpy).not.toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('automatically clears Kugou localStorage credentials when backend returns auth_invalid', async () => {
    localStorage.setItem('kugou_token', 'stale_token_123');
    localStorage.setItem('kugou_userid', 'user_456');

    vi.spyOn(client, 'parsePlaylist').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockSamplePlaylist,
        platform: 'kugou',
        retrieval: {
          mode: 'preview',
          reason: 'auth_invalid',
          message: 'Token expired',
        },
      },
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://m.kugou.com/songlist/gcid_test/' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Verify summary is rendered
    expect(await screen.findByTestId('playlist-summary')).toBeInTheDocument();

    // Verify localStorage was cleared
    expect(localStorage.getItem('kugou_token')).toBeNull();
    expect(localStorage.getItem('kugou_userid')).toBeNull();
  });

  it('preserves ResultPaper during reload with loading overlay and scrolls to top smoothly', async () => {
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;
    Element.prototype.scrollIntoView = vi.fn();

    let resolveSecondParse: (val: any) => void;
    const secondParsePromise = new Promise((resolve) => {
      resolveSecondParse = resolve;
    });

    vi.spyOn(client, 'parsePlaylist')
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...mockSamplePlaylist,
          platform: 'kugou',
          retrieval: {
            mode: 'preview',
            reason: 'auth_required',
          },
        },
      })
      .mockImplementationOnce(() => secondParsePromise as any);

    render(<App />);
    const input = screen.getByPlaceholderText(/粘贴公开歌单链接/);
    fireEvent.change(input, { target: { value: 'https://m.kugou.com/songlist/gcid_kugou_preview/' } });
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // 1. First parse lands in preview mode
    expect(await screen.findByTestId('playlist-summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连接酷狗账号' })).toBeInTheDocument();

    // Clear spy and simulate user scrolled down
    scrollToSpy.mockClear();
    Object.defineProperty(window, 'scrollY', { value: 600, writable: true });

    // 2. Trigger re-parse / reload (click Parse button or reload)
    fireEvent.click(screen.getByRole('button', { name: '解析' }));

    // Verify it smoothly scrolled to top to show search note loading state
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // CRITICAL: ResultPaper MUST NOT be unmounted (no layout collapse)
    expect(screen.getByTestId('playlist-summary')).toBeInTheDocument();
    // And reloading overlay is active
    expect(screen.getByText('正在为您重新解析并解锁完整歌单...')).toBeInTheDocument();

    // 3. Complete second parse
    resolveSecondParse!({
      success: true,
      data: {
        ...mockSamplePlaylist,
        platform: 'kugou',
        trackCount: 500,
        retrieval: {
          mode: 'full',
        },
      },
    });

    // Verify overlay disappears and updated data is present
    await waitFor(() => {
      expect(screen.queryByText('正在为您重新解析并解锁完整歌单...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('共 500 首歌曲')).toBeInTheDocument();
  });
});

