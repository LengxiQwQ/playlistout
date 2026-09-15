import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserPlaylistsPaper } from './UserPlaylistsPaper';
import { LanguageProvider } from '../../i18n';
import type { UserPlaylistsData } from '../../api/types';

describe('UserPlaylistsPaper Component', () => {
  const mockUserData: UserPlaylistsData = {
    platform: 'qqmusic',
    userId: '10001',
    nickname: '音乐爱好者小明',
    total: 2,
    playlists: [
      {
        id: '1001',
        name: '民谣时光',
        trackCount: 25,
        listenNum: 1200,
        sourceUrl: 'https://y.qq.com/n/ryqq/playlist/1001',
      },
      {
        id: '1002',
        name: '经典老歌',
        trackCount: 40,
        listenNum: 5400,
        sourceUrl: 'https://y.qq.com/n/ryqq/playlist/1002',
      },
    ],
  };

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('renders user header, count, playlists, and export options', () => {
    const handleReset = vi.fn();
    const handleSelectSingle = vi.fn();

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <UserPlaylistsPaper
          userData={mockUserData}
          onReset={handleReset}
          onSelectSinglePlaylist={handleSelectSingle}
        />
      </LanguageProvider>,
    );

    // Check title and sticker
    expect(screen.getByText(/歌单收藏册/)).toBeInTheDocument();
    expect(screen.getByText(/QQ 号: 10001/)).toBeInTheDocument();
    expect(screen.getByText('音乐爱好者小明 的音乐手账')).toBeInTheDocument();
    expect(screen.getByText(/共 2 个公开歌单/)).toBeInTheDocument();
    expect(screen.getByText(/累计 65 首歌曲/)).toBeInTheDocument();

    // Check playlist rows
    expect(screen.getByText('民谣时光')).toBeInTheDocument();
    expect(screen.getByText('经典老歌')).toBeInTheDocument();

    // Check batch export button
    expect(screen.getByText(/一键打包导出选中歌单/)).toBeInTheDocument();
  });

  it('supports selecting single playlist to drilldown', () => {
    const handleSelectSingle = vi.fn();

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <UserPlaylistsPaper
          userData={mockUserData}
          onReset={vi.fn()}
          onSelectSinglePlaylist={handleSelectSingle}
        />
      </LanguageProvider>,
    );

    const drilldownButtons = screen.getAllByText(/查看歌曲/);
    expect(drilldownButtons.length).toBe(2);
    fireEvent.click(drilldownButtons[0]);
    expect(handleSelectSingle).toHaveBeenCalledWith(
      mockUserData.playlists[0].sourceUrl || mockUserData.playlists[0].id,
      'qqmusic',
    );
  });

  it('shows collision banner when hasSinglePlaylistCollision is true', () => {
    const handleSelectSingle = vi.fn();

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <UserPlaylistsPaper
          userData={mockUserData}
          onReset={vi.fn()}
          onSelectSinglePlaylist={handleSelectSingle}
          hasSinglePlaylistCollision={true}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText(/当前数字也存在单个同名歌单/)).toBeInTheDocument();
    const switchBtn = screen.getByText(/切换为单歌单解析/);
    fireEvent.click(switchBtn);
    expect(handleSelectSingle).toHaveBeenCalledWith('10001', 'qqmusic');
  });

  it('renders NetEase user header with NetEase UID and brand sticker', () => {
    const mockNeteaseUser: UserPlaylistsData = {
      platform: 'netease',
      userId: '1825474783',
      nickname: '冷夕QwQ',
      total: 1,
      playlists: [
        {
          id: '2756674066',
          name: '我喜欢的音乐',
          trackCount: 15,
          listenNum: 300,
          sourceUrl: 'https://music.163.com/#/playlist?id=2756674066',
        },
      ],
    };

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <UserPlaylistsPaper
          userData={mockNeteaseUser}
          onReset={vi.fn()}
          onSelectSinglePlaylist={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('网易云音乐 · 歌单收藏册')).toBeInTheDocument();
    expect(screen.getByText(/网易云 UID: 1825474783/)).toBeInTheDocument();
    expect(screen.getByText('冷夕QwQ 的音乐手账')).toBeInTheDocument();
  });
});
