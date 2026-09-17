import React, { useState } from 'react';
import type { Track } from '../api/types';
import { formatDuration } from '../utils/format';
import { useTranslation } from '../i18n';
import { TrackArtwork } from './playlist/TrackArtwork';

export interface TrackTableProps {
  tracks: Track[];
}

export const TrackTable: React.FC<TrackTableProps> = ({ tracks }) => {
  const { t, format } = useTranslation();
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  // Dynamic index padding and column width based on playlist total tracks count (supports up to 4+ digits)
  const totalTracks = tracks.length;
  const indexDigits = Math.max(2, String(totalTracks).length);
  const indexColWidth = `${Math.max(28, 28 + (indexDigits - 2) * 8)}px`;
  const formatTrackIndex = (index: number) => String(index).padStart(indexDigits, '0');

  return (
    <div
      className={`track-table-container ${showMoreMobile ? 'is-expanded-mobile' : 'is-compact-mobile'}`}
      data-testid="track-table-container"
      style={{
        marginTop: '1.5rem',
        ['--index-width' as any]: indexColWidth,
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
          gap: '0.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--ink, #2d3436)',
            margin: 0,
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          {format(t.table.listTitle, { count: tracks.length })}
        </h3>

        {/* Mobile Compact / Detailed View Toggle Button */}
        <button
          type="button"
          onClick={() => setShowMoreMobile(!showMoreMobile)}
          className="table-view-toggle mobile-only font-handwriting"
          style={{
            padding: '0.22rem 0.65rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: '4px',
            backgroundColor: showMoreMobile ? '#fef3c7' : '#f0fdf4',
            color: showMoreMobile ? '#92400e' : '#166534',
            border: `1.5px solid ${showMoreMobile ? '#f59e0b' : '#22c55e'}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '1.5px 1.5px 0 rgba(45, 52, 54, 0.2)',
          }}
          aria-label={showMoreMobile ? t.table.showLess : t.table.showMore}
        >
          <span>{showMoreMobile ? '−' : '+'}</span>
          <span>{showMoreMobile ? t.table.showLess : t.table.showMore}</span>
        </button>
      </div>

      <div className="table-responsive" style={{ maxHeight: '620px', overflowY: 'auto', overflowX: 'auto' }}>
        <table
          className="track-table"
          aria-label={format(t.table.listTitle, { count: tracks.length })}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.925rem',
            fontFamily: 'var(--font-sans, sans-serif)',
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
              <th scope="col" className="col-index" style={{ width: 'var(--index-width, 48px)', minWidth: 'var(--index-width, 48px)', padding: '0.75rem 0.5rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)', textAlign: 'center' }}>
                {t.table.colIndex}
              </th>
              <th scope="col" className="col-cover" style={{ width: '52px', padding: '0.75rem 0.5rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colCover}
              </th>
              <th scope="col" className="col-title" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colTitle}
              </th>
              <th scope="col" className="col-artist" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colArtist}
              </th>
              <th scope="col" className="col-album hide-mobile" style={{ padding: '0.75rem 0.75rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colAlbum}
              </th>
              <th
                scope="col"
                className="col-vip"
                style={{ width: '64px', textAlign: 'center', padding: '0.75rem 0.5rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {t.table.colVip}
              </th>
              <th
                scope="col"
                className="col-status"
                style={{ width: '95px', textAlign: 'center', padding: '0.75rem 0.5rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {t.table.colStatus}
              </th>
              <th
                scope="col"
                className="col-duration hide-mobile"
                style={{ width: '70px', textAlign: 'right', padding: '0.75rem 0.75rem', color: '#8a8f92', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
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
              const isUnplayable = track.status === 'unplayable' || (track.isAvailable === false && track.status !== 'geo_blocked');
              const isGreyedOut = isUnplayable;
              const isVipTrack = Boolean(track.isVip || track.status === 'vip');

              // Derive status display (only flags unplayable or paid, overseas-only restrictions are treated as normal)
              let statusLabel = t.table.statusPlayable;
              let statusBg = '#f0fdf4';
              let statusColor = '#166534';
              let statusBorder = '#bbf7d0';

              if (isUnplayable) {
                statusLabel = t.table.statusUnplayable;
                statusBg = '#fef2f2';
                statusColor = '#991b1b';
                statusBorder = '#fecaca';
              } else if (track.status === 'paid') {
                statusLabel = t.table.statusPaid;
                statusBg = '#f3e8ff';
                statusColor = '#6b21a8';
                statusBorder = '#d8b4fe';
              }

              return (
                <tr
                  key={`${track.id || track.title}-${track.index}-${i}`}
                  className={`song-row track-row ${isGreyedOut ? 'track-greyed-out' : ''}`}
                  style={{
                    borderBottom: '1px solid rgba(45, 52, 54, 0.08)',
                    opacity: isGreyedOut ? 0.65 : 1,
                    backgroundColor: isGreyedOut ? 'rgba(243, 244, 246, 0.4)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td className="col-index" style={{ textAlign: 'center', color: '#a0a5a8', padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem', width: 'var(--index-width, 48px)', whiteSpace: 'nowrap' }}>
                    {formatTrackIndex(track.index)}
                  </td>
                  <td className="col-cover" style={{ padding: '0.65rem 0.5rem' }}>
                    <TrackArtwork coverUrl={track.coverUrl} title={track.title} size={38} />
                  </td>
                  <td className="col-title" style={{ padding: '0.65rem 0.75rem', color: isGreyedOut ? '#6b7280' : 'var(--ink, #2d3436)' }}>
                    <span
                      className="track-title-text"
                      title={track.title}
                      style={{
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        display: 'inline-block',
                        fontFamily: 'var(--font-sans, sans-serif)',
                        color: isGreyedOut ? '#6b7280' : 'inherit',
                      }}
                    >
                      {track.title}
                    </span>
                  </td>
                  <td
                    className="col-artist"
                    style={{ color: isGreyedOut ? '#9ca3af' : '#4b5563', padding: '0.65rem 0.75rem', fontSize: '0.925rem', fontFamily: 'var(--font-sans, sans-serif)' }}
                    title={artistsText}
                  >
                    {artistsText}
                  </td>
                  <td
                    className="col-album hide-mobile"
                    style={{
                      color: isGreyedOut ? '#9ca3af' : '#6b7280',
                      padding: '0.65rem 0.75rem',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-sans, sans-serif)',
                    }}
                    title={albumText}
                  >
                    {albumText}
                  </td>
                  <td
                    className="col-vip"
                    style={{
                      textAlign: 'center',
                      padding: '0.65rem 0.5rem',
                    }}
                  >
                    {isVipTrack ? (
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fcd34d',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        VIP
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="col-status"
                    style={{
                      textAlign: 'center',
                      padding: '0.65rem 0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: `1px solid ${statusBorder}`,
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td
                    className="col-duration hide-mobile"
                    style={{
                      textAlign: 'right',
                      color: '#8a8f92',
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.85rem',
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
