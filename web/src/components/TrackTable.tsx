import React from 'react';
import type { Track } from '../api/types';
import { formatDuration } from '../utils/format';
import { useTranslation } from '../i18n';
import { TrackArtwork } from './playlist/TrackArtwork';

export interface TrackTableProps {
  tracks: Track[];
}

export const TrackTable: React.FC<TrackTableProps> = ({ tracks }) => {
  const { t, format } = useTranslation();

  return (
    <div
      className="track-table-container"
      data-testid="track-table-container"
      style={{
        marginTop: '1.5rem',
      }}
    >
      <div
        className="table-header-info"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '0.75rem',
          borderBottom: '2px dashed var(--line, #dfe6e9)',
        }}
      >
        <h3 className="font-marker" style={{ fontSize: '1.25rem', color: 'var(--ink, #2d3436)', margin: 0 }}>
          {format(t.table.listTitle, { count: tracks.length })}
        </h3>
      </div>

      <div className="table-responsive" style={{ maxHeight: '620px', overflowY: 'auto', overflowX: 'auto' }}>
        <table
          className="track-table font-mono"
          aria-label={format(t.table.listTitle, { count: tracks.length })}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.925rem',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px dashed var(--line, #dfe6e9)',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <th scope="col" className="col-index" style={{ width: '48px', padding: '0.75rem 0.5rem', color: '#8a8f92' }}>
                {t.table.colIndex}
              </th>
              <th scope="col" className="col-cover" style={{ width: '52px', padding: '0.75rem 0.5rem', color: '#8a8f92' }}>
                {t.table.colCover}
              </th>
              <th scope="col" className="col-title" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92' }}>
                {t.table.colTitle}
              </th>
              <th scope="col" className="col-artist" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92' }}>
                {t.table.colArtist}
              </th>
              <th scope="col" className="col-album hide-mobile" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92' }}>
                {t.table.colAlbum}
              </th>
              <th
                scope="col"
                className="col-duration hide-mobile"
                style={{ width: '70px', textAlign: 'right', padding: '0.75rem 0.75rem', color: '#8a8f92' }}
              >
                {t.table.colDuration}
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, i) => {
              const artistsText =
                track.artists && track.artists.length > 0 ? track.artists.join(' / ') : t.table.noArtist;
              const albumText = track.album?.trim() ? track.album : t.table.noAlbum;
              const durationText = formatDuration(track.durationMs);

              return (
                <tr
                  key={`${track.id || track.title}-${track.index}-${i}`}
                  className="song-row track-row"
                  style={{
                    borderBottom: '1px solid rgba(45, 52, 54, 0.08)',
                  }}
                >
                  <td className="col-index" style={{ textAlign: 'center', color: '#a0a5a8', padding: '0.65rem 0.5rem' }}>
                    {String(track.index).padStart(2, '0')}
                  </td>
                  <td className="col-cover" style={{ padding: '0.65rem 0.5rem' }}>
                    <TrackArtwork coverUrl={track.coverUrl} title={track.title} size={38} />
                  </td>
                  <td className="col-title" style={{ fontWeight: 700, padding: '0.65rem 0.75rem', color: 'var(--ink, #2d3436)' }}>
                    <span className="track-title-text" title={track.title}>
                      {track.title}
                    </span>
                  </td>
                  <td className="col-artist" style={{ color: '#4b5563', padding: '0.65rem 0.75rem' }} title={artistsText}>
                    {artistsText}
                  </td>
                  <td
                    className="col-album hide-mobile"
                    style={{
                      color: '#6b7280',
                      fontStyle: 'italic',
                      padding: '0.65rem 0.75rem',
                    }}
                    title={albumText}
                  >
                    {albumText}
                  </td>
                  <td
                    className="col-duration hide-mobile"
                    style={{
                      textAlign: 'right',
                      color: '#8a8f92',
                      fontVariantNumeric: 'tabular-nums',
                      padding: '0.65rem 0.75rem',
                    }}
                  >
                    {durationText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
