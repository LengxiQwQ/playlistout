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
      { index: 1, id: 's1', title: '歌曲 1', artists: ['歌手 1'] },
      { index: 2, id: 's2', title: '歌曲 2', artists: ['歌手 2'] },
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
});
