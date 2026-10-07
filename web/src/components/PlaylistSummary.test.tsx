import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistSummary } from './PlaylistSummary';
import type { Playlist } from '../api/types';

describe('PlaylistSummary Component — Kugou Retrieval Banners & Actions', () => {
  const baseKugouPreviewPlaylist: Playlist = {
    platform: 'kugou',
    id: 'gcid_test',
    name: '酷狗测试歌单',
    creator: '冷汐',
    trackCount: 100,
    tracks: [
      { index: 1, id: 's1', title: '歌曲 1', artist: '歌手 1' },
      { index: 2, id: 's2', title: '歌曲 2', artist: '歌手 2' },
    ],
    retrieval: {
      mode: 'preview',
      reason: 'auth_required',
    },
  };

  it('renders auth_required banner with "连接酷狗账号" action button', () => {
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          retrieval: { mode: 'preview', reason: 'auth_required' },
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/当前为酷狗公开预览，连接酷狗账号后可尝试获取完整歌单/)).toBeInTheDocument();
    const loginBtn = screen.getByRole('button', { name: '连接酷狗账号' });
    expect(loginBtn).toBeInTheDocument();

    // Clicking button opens modal
    fireEvent.click(loginBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders auth_invalid banner with "重新登录" action button', () => {
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          retrieval: { mode: 'preview', reason: 'auth_invalid' },
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/酷狗登录已过期，请重新登录/)).toBeInTheDocument();
    const reLoginBtn = screen.getByRole('button', { name: '重新登录' });
    expect(reLoginBtn).toBeInTheDocument();

    fireEvent.click(reLoginBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders owner_unconfirmed banner with "重新解析" and "切换账号" buttons', () => {
    const handleReload = vi.fn();
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          retrieval: { mode: 'preview', reason: 'owner_unconfirmed' },
        }}
        onReset={vi.fn()}
        onReload={handleReload}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/无法安全确认属于该账号/)).toBeInTheDocument();

    const reparseBtn = screen.getByRole('button', { name: '重新解析' });
    expect(reparseBtn).toBeInTheDocument();
    fireEvent.click(reparseBtn);
    expect(handleReload).toHaveBeenCalledTimes(1);

    const switchBtn = screen.getByRole('button', { name: '切换账号' });
    expect(switchBtn).toBeInTheDocument();
  });

  it('renders owner_mismatch banner with "切换账号" button', () => {
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          retrieval: { mode: 'preview', reason: 'owner_mismatch' },
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/不是该分享歌单的创建账号/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换账号' })).toBeInTheDocument();
  });

  it('renders upstream_unavailable banner with "重试" button without claiming account expired', () => {
    const handleReload = vi.fn();
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          retrieval: { mode: 'preview', reason: 'upstream_unavailable' },
        }}
        onReset={vi.fn()}
        onReload={handleReload}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/酷狗接口暂时无法完成全量读取/)).toBeInTheDocument();
    // Must NOT claim that the login session is expired
    expect(screen.queryByText(/酷狗登录已过期/)).not.toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: '重试' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleReload).toHaveBeenCalledTimes(1);
  });

  it('renders [平台限制提示] in system font block, separated from main playlist description', () => {
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          description: '我的私人歌单简介\n\n[平台限制提示] 受酷狗音乐官方限制，公开分享链接仅提供前 10 首预览（歌单实际共 417 首）。',
        }}
        onReset={vi.fn()}
      />,
    );

    // Main description is rendered in quote block
    expect(screen.getByText('“我的私人歌单简介”')).toBeInTheDocument();

    // Platform restriction notice is rendered in its own system-font container
    const noticeEl = screen.getByTestId('kugou-platform-limit-notice');
    expect(noticeEl).toBeInTheDocument();
    expect(noticeEl).toHaveTextContent('[平台限制提示] 受酷狗音乐官方限制，公开分享链接仅提供前 10 首预览（歌单实际共 417 首）。');
    expect(noticeEl).toHaveClass('font-sans');
    expect(noticeEl.style.fontFamily).toContain('system-ui');
  });

  it('renders identity_unresolved banner when user is logged in but playlist not matched', () => {
    const handleReload = vi.fn();
    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          trackCount: 417,
          tracks: new Array(10).fill({ index: 1, title: '测试', artists: ['测试'] }),
          retrieval: { mode: 'preview', reason: 'identity_unresolved' },
        }}
        onReset={vi.fn()}
        onReload={handleReload}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    expect(screen.getByText(/未匹配到该歌单/)).toBeInTheDocument();
    expect(screen.queryByText(/免登录/)).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: '重新解析' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换账号' })).toBeInTheDocument();
  });

  it('renders logged-in platform_preview banner without falsely claiming "免登录"', () => {
    // Mock user being logged in
    localStorage.setItem('kugou_token', 'test_token');
    localStorage.setItem('kugou_userid', '1425711902');

    render(
      <PlaylistSummary
        playlist={{
          ...baseKugouPreviewPlaylist,
          trackCount: 417,
          tracks: new Array(10).fill({ index: 1, title: '测试', artists: ['测试'] }),
          retrieval: { mode: 'preview', reason: 'platform_preview' },
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('kugou-preview-banner')).toBeInTheDocument();
    // Must NOT say "当前为免登录公开预览模式"
    expect(screen.queryByText(/当前为免登录/)).not.toBeInTheDocument();
    // Must explain that it is connected but restricted by platform
    expect(screen.getByText(/已连接酷狗账号/)).toBeInTheDocument();

    localStorage.clear();
  });
});

describe('PlaylistSummary Component — Qishui & Douyin Dual Channel Switcher', () => {
  const baseQishuiPlaylist: Playlist = {
    platform: 'qishui',
    id: '7087507348697186339',
    name: '冷汐OωO在抖音收藏的音乐',
    creator: '冷汐OωO',
    trackCount: 136,
    tracks: [
      { index: 1, id: 't1', title: '我李逍遥可以对天发誓', artist: 'Watch with Caution' },
    ],
    channel: 'qishui',
    availableChannels: ['qishui', 'douyin'],
  };

  it('renders channel switcher banner when availableChannels includes douyin', () => {
    const handleSwitchChannel = vi.fn();
    render(
      <PlaylistSummary
        playlist={baseQishuiPlaylist}
        onReset={vi.fn()}
        onSwitchChannel={handleSwitchChannel}
      />,
    );

    const banner = screen.getByTestId('qishui-channel-banner');
    expect(banner).toBeInTheDocument();

    // In Qishui mode: displays top badge 汽水音乐 · 官方歌曲
    expect(screen.getByText('汽水音乐 · 官方歌曲')).toBeInTheDocument();

    // Official tab is active, Douyin tab is inactive
    const officialTab = screen.getByTestId('qishui-tab-official');
    const douyinTab = screen.getByTestId('qishui-tab-douyin');
    expect(officialTab).toHaveClass('is-active');
    expect(douyinTab).not.toHaveClass('is-active');

    // Explanatory note text is present in the banner
    expect(banner).toHaveTextContent('汽水官方仅收录正式歌曲');

    fireEvent.click(douyinTab);
    expect(handleSwitchChannel).toHaveBeenCalledWith('douyin');
  });

  it('renders switch to Qishui and active Douyin tab when in douyin channel mode', () => {
    const handleSwitchChannel = vi.fn();
    render(
      <PlaylistSummary
        playlist={{
          ...baseQishuiPlaylist,
          channel: 'douyin',
          trackCount: 830,
        }}
        onReset={vi.fn()}
        onSwitchChannel={handleSwitchChannel}
      />,
    );

    const banner = screen.getByTestId('qishui-channel-banner');
    expect(banner).toBeInTheDocument();

    // In Douyin mode: displays top badge 汽水音乐 · 包含视频原声
    expect(screen.getByText('汽水音乐 · 包含视频原声')).toBeInTheDocument();

    // Douyin tab is active, Official tab is inactive
    const officialTab = screen.getByTestId('qishui-tab-official');
    const douyinTab = screen.getByTestId('qishui-tab-douyin');
    expect(douyinTab).toHaveClass('is-active');
    expect(officialTab).not.toHaveClass('is-active');

    fireEvent.click(officialTab);
    expect(handleSwitchChannel).toHaveBeenCalledWith('qishui');
  });

  it('does NOT render channel switcher banner for standard non-synced Qishui playlists', () => {
    render(
      <PlaylistSummary
        playlist={{
          ...baseQishuiPlaylist,
          availableChannels: ['qishui'],
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('qishui-channel-banner')).not.toBeInTheDocument();
  });
});

