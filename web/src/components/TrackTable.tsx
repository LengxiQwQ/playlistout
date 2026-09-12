import React from 'react';
import type { Track } from '../api/types';
import { formatDuration } from '../utils/format';

interface TrackTableProps {
  tracks: Track[];
}

export const TrackTable: React.FC<TrackTableProps> = ({ tracks }) => {
  return (
    <div className="track-table-container" data-testid="track-table-container">
      <div className="table-header-info">
        <h3>歌曲列表 ({tracks.length})</h3>
      </div>

      <div className="table-responsive">
        <table className="track-table" aria-label="歌单歌曲列表">
          <thead>
            <tr>
              <th scope="col" className="col-index">#</th>
              <th scope="col" className="col-title">歌曲标题</th>
              <th scope="col" className="col-artist">歌手</th>
              <th scope="col" className="col-album">专辑</th>
              <th scope="col" className="col-duration">时长</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, i) => {
              const artistsText = track.artists && track.artists.length > 0
                ? track.artists.join(' / ')
                : '—';
              const albumText = track.album?.trim() ? track.album : '—';
              const durationText = formatDuration(track.durationMs);

              return (
                <tr key={`${track.id || track.title}-${track.index}-${i}`} className="track-row">
                  <td className="col-index">{track.index}</td>
                  <td className="col-title" title={track.title}>
                    <span className="track-title-text">{track.title}</span>
                  </td>
                  <td className="col-artist" title={artistsText}>
                    {artistsText}
                  </td>
                  <td className="col-album" title={albumText}>
                    {albumText}
                  </td>
                  <td className="col-duration">{durationText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
