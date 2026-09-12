import React from 'react';
import type { Playlist } from '../api/types';

interface PlaylistSummaryProps {
  playlist: Playlist;
  onReset: () => void;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({ playlist, onReset }) => {
  return (
    <div className="playlist-summary-card" data-testid="playlist-summary">
      <div className="summary-main">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="playlist-cover"
            loading="lazy"
            onError={(e) => {
              // Hide image if cover fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="cover-placeholder" aria-label="无封面">
            🎵
          </div>
        )}

        <div className="summary-info">
          <div className="summary-meta-row">
            <span className="platform-tag">QQ 音乐</span>
            <span className="track-count-badge">共 {playlist.trackCount} 首歌曲</span>
          </div>

          <h2 className="playlist-title" title={playlist.name}>
            {playlist.name}
          </h2>

          {playlist.creator && (
            <p className="playlist-creator">
              创建者：<span>{playlist.creator}</span>
            </p>
          )}

          <div className="summary-actions">
            <a
              href={`https://y.qq.com/n/ryqq/playlist/${playlist.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-small"
            >
              在 QQ 音乐中查看 ↗
            </a>
            <button type="button" onClick={onReset} className="btn-text-small">
              解析其他歌单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
