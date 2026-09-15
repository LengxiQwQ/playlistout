import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisambiguationModal, DisambiguationItem } from './DisambiguationModal';
import type { Playlist, UserPlaylistsData } from '../../api/types';

describe('DisambiguationModal Component', () => {
  const mockPlaylistQQ: Playlist = {
    id: '123456',
    platform: 'qqmusic',
    name: 'QQ流行精选',
    creator: '周杰伦粉丝',
    trackCount: 50,
    tracks: [],
    coverUrl: 'https://example.com/cover1.jpg',
  };

  const mockUserQQ: UserPlaylistsData = {
    platform: 'qqmusic',
    userId: '123456',
    nickname: 'QQ音乐达人',
    total: 8,
    playlists: [
      {
        id: 'p1',
        name: '我的自建歌单',
        trackCount: 30,
        sourceUrl: 'https://y.qq.com/...',
      },
    ],
  };

  const mockPlaylistNetease: Playlist = {
    id: '123456',
    platform: 'netease',
    name: '网易云纯音乐',
    creator: '云村村民',
    trackCount: 120,
    tracks: [],
  };

  const mockUserNetease: UserPlaylistsData = {
    platform: 'netease',
    userId: '123456',
    nickname: '网易云资深用户',
    total: 5,
    playlists: [
      {
        id: 'p2',
        name: '夜间电台',
        trackCount: 15,
        sourceUrl: 'https://music.163.com/...',
      },
    ],
  };

  const mockCandidates: DisambiguationItem[] = [
    {
      id: '123456',
      platform: 'qqmusic',
      type: 'playlist',
      title: mockPlaylistQQ.name,
      subtitle: `创建者: ${mockPlaylistQQ.creator}`,
      count: 50,
      coverUrl: mockPlaylistQQ.coverUrl,
      data: mockPlaylistQQ,
    },
    {
      id: '123456',
      platform: 'qqmusic',
      type: 'user',
      title: mockUserQQ.nickname,
      subtitle: `包含 ${mockUserQQ.total} 个公开歌单`,
      count: mockUserQQ.total,
      data: mockUserQQ,
    },
    {
      id: '123456',
      platform: 'netease',
      type: 'playlist',
      title: mockPlaylistNetease.name,
      subtitle: `创建者: ${mockPlaylistNetease.creator}`,
      count: 120,
      data: mockPlaylistNetease,
    },
    {
      id: '123456',
      platform: 'netease',
      type: 'user',
      title: mockUserNetease.nickname,
      subtitle: `包含 ${mockUserNetease.total} 个公开歌单`,
      count: mockUserNetease.total,
      data: mockUserNetease,
    },
  ];

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DisambiguationModal
        isOpen={false}
        onClose={vi.fn()}
        queryId="123456"
        candidates={mockCandidates}
        onSelectPlaylist={vi.fn()}
        onSelectUserPlaylists={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all platform groups and candidate cards when open', () => {
    render(
      <DisambiguationModal
        isOpen={true}
        onClose={vi.fn()}
        queryId="123456"
        candidates={mockCandidates}
        onSelectPlaylist={vi.fn()}
        onSelectUserPlaylists={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('发现多个匹配目标')).toBeInTheDocument();
    expect(screen.getByText(/纯数字 ID “123456” 在多个平台或类型中均有匹配/)).toBeInTheDocument();

    // Platforms
    expect(screen.getByText(/QQ 音乐/)).toBeInTheDocument();
    expect(screen.getByText(/网易云音乐/)).toBeInTheDocument();

    // Candidates
    expect(screen.getByText('QQ流行精选')).toBeInTheDocument();
    expect(screen.getByText('QQ音乐达人')).toBeInTheDocument();
    expect(screen.getByText('网易云纯音乐')).toBeInTheDocument();
    expect(screen.getByText('网易云资深用户')).toBeInTheDocument();
  });

  it('calls onSelectPlaylist when clicking a playlist card', () => {
    const handleSelectPlaylist = vi.fn();
    const handleSelectUser = vi.fn();

    render(
      <DisambiguationModal
        isOpen={true}
        onClose={vi.fn()}
        queryId="123456"
        candidates={mockCandidates}
        onSelectPlaylist={handleSelectPlaylist}
        onSelectUserPlaylists={handleSelectUser}
      />,
    );

    const qqPlaylistCard = screen.getByTestId('disambiguation-card-qqmusic-playlist');
    fireEvent.click(qqPlaylistCard);

    expect(handleSelectPlaylist).toHaveBeenCalledWith(mockPlaylistQQ);
    expect(handleSelectUser).not.toHaveBeenCalled();
  });

  it('calls onSelectUserPlaylists when clicking a user card', () => {
    const handleSelectPlaylist = vi.fn();
    const handleSelectUser = vi.fn();

    render(
      <DisambiguationModal
        isOpen={true}
        onClose={vi.fn()}
        queryId="123456"
        candidates={mockCandidates}
        onSelectPlaylist={handleSelectPlaylist}
        onSelectUserPlaylists={handleSelectUser}
      />,
    );

    const neteaseUserCard = screen.getByTestId('disambiguation-card-netease-user');
    fireEvent.click(neteaseUserCard);

    expect(handleSelectUser).toHaveBeenCalledWith(mockUserNetease);
    expect(handleSelectPlaylist).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking cancel button', () => {
    const handleClose = vi.fn();

    render(
      <DisambiguationModal
        isOpen={true}
        onClose={handleClose}
        queryId="123456"
        candidates={mockCandidates}
        onSelectPlaylist={vi.fn()}
        onSelectUserPlaylists={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByText('取消');
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
