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
          borderBottom: '2px dashed var(--line)',
          gap: '0.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text)',
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
            backgroundColor: showMoreMobile ? 'var(--status-pay-bg)' : 'var(--status-free-bg)',
            color: showMoreMobile ? 'var(--status-pay-text)' : 'var(--status-free-text)',
            border: `1.5px solid ${showMoreMobile ? 'var(--status-pay-border)' : 'var(--status-free-border)'}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '1.5px 1.5px 0 var(--shadow-color)',
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
                borderBottom: '2px dashed var(--line)',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-surface)',
                zIndex: 10,
              }}
            >
              <th scope="col" className="col-index" style={{ width: 'var(--index-width)', minWidth: 'var(--index-width)', padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)', textAlign: 'center' }}>
                {t.table.colIndex}
              </th>
              <th scope="col" className="col-cover" style={{ width: '52px', padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colCover}
              </th>
              <th scope="col" className="col-title" style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colTitle}
              </th>
              <th scope="col" className="col-artist" style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colArtist}
              </th>
              <th scope="col" className="col-album hide-mobile" style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}>
                {t.table.colAlbum}
              </th>
              <th
                scope="col"
                className="col-vip"
                style={{ width: '64px', textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {t.table.colVip}
              </th>
              <th
                scope="col"
                className="col-status"
                style={{ width: '95px', textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {t.table.colStatus}
              </th>
              <th
                scope="col"
                className="col-duration hide-mobile"
                style={{ width: '70px', textAlign: 'right', padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {t.table.colDuration}
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, i) => {
              const artistsText = track.artist?.trim() ? track.artist : t.table.noArtist;
              const albumText = track.album?.trim() ? track.album : t.table.noAlbum;
              const durationText = formatDuration(track.durationMs);
              const isUnplayable = track.status === 'unplayable' || (track.isAvailable === false && track.status !== 'geo_blocked');
              const isGreyedOut = isUnplayable;
              const isVipTrack = Boolean(track.isVip || track.status === 'vip');

              // Derive status display (only flags unplayable or paid, overseas-only restrictions are treated as normal)
              let statusLabel = track.status === 'unknown' ? t.search.statusUnknown : t.table.statusPlayable;
              let statusBg = track.status === 'unknown' ? 'var(--status-unknown-bg)' : 'var(--status-normal-bg)';
              let statusColor = track.status === 'unknown' ? 'var(--status-unknown-text)' : 'var(--status-normal-text)';
              let statusBorder = track.status === 'unknown' ? 'var(--status-unknown-border)' : 'var(--status-normal-border)';

              if (isUnplayable) {
                statusLabel = t.table.statusUnplayable;
                statusBg = 'var(--status-error-bg)';
                statusColor = 'var(--status-error-text)';
                statusBorder = 'var(--status-error-border)';
              } else if (track.status === 'paid') {
                statusLabel = t.table.statusPaid;
                statusBg = 'var(--status-vip-bg)';
                statusColor = 'var(--status-vip-text)';
                statusBorder = 'var(--status-vip-border)';
              }

              return (
                <tr
                  key={`${track.id || track.title}-${track.index}-${i}`}
                  className={`song-row track-row ${i < 12 ? 'song-row-reveal' : ''} ${isGreyedOut ? 'track-greyed-out' : ''}`}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    opacity: isGreyedOut ? 0.65 : 1,
                    backgroundColor: isGreyedOut ? 'var(--bg-sunken)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                    ...(i < 12 ? { ['--i' as any]: i } : {}),
                  }}
                >
                  <td className="col-index" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem', width: 'var(--index-width)', whiteSpace: 'nowrap' }}>
                    {formatTrackIndex(track.index)}
                  </td>
                  <td className="col-cover" style={{ padding: '0.65rem 0.5rem' }}>
                    <TrackArtwork coverUrl={track.coverUrl} title={track.title} size={38} />
                  </td>
                  <td className="col-title" style={{ padding: '0.65rem 0.75rem', color: isGreyedOut ? 'var(--text-faint)' : 'var(--text)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <span
                        className="track-title-text"
                        title={track.title}
                        style={{
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          display: 'inline-block',
                          fontFamily: 'var(--font-sans, sans-serif)',
                          color: isGreyedOut ? 'var(--text-faint)' : 'inherit',
                        }}
                      >
                        {track.title}
                      </span>
                      {track.isOriginalSound ? (
                        <span
                          className="track-badge-original-sound"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--tint-sky-bg-soft)',
                            color: 'var(--accent-sky)',
                            border: '1px solid var(--accent-sky)',
                            display: 'inline-block',
                            lineHeight: '1.2',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.table.typeOriginalSound}
                        </span>
                      ) : track.statusText === '视频' ? (
                        <span
                          className="track-badge-video"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--status-pay-bg)',
                            color: 'var(--status-pay-text)',
                            border: '1px solid var(--status-pay-border)',
                            display: 'inline-block',
                            lineHeight: '1.2',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.table.typeVideo}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className="col-artist"
                    style={{ color: isGreyedOut ? 'var(--text-faint)' : 'var(--text)', padding: '0.65rem 0.75rem', fontSize: '0.925rem', fontFamily: 'var(--font-sans, sans-serif)' }}
                    title={artistsText}
                  >
                    {artistsText}
                  </td>
                  <td
                    className="col-album hide-mobile"
                    style={{
                      color: isGreyedOut ? 'var(--text-faint)' : 'var(--text-muted)',
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
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          backgroundColor: 'var(--status-pay-bg)',
                          color: 'var(--status-pay-text)',
                          border: '1px solid var(--status-pay-border)',
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
                        padding: '0.15rem 0.55rem',
                        borderRadius: '999px',
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
                      color: 'var(--text-faint)',
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
