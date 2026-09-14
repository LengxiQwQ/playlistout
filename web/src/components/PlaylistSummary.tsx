import React, { useState } from 'react';
import type { Playlist } from '../api/types';
import { useTranslation } from '../i18n';
import { Sticker } from './ui/Sticker';

export interface PlaylistSummaryProps {
  playlist: Playlist;
  onReset: () => void;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({ playlist, onReset }) => {
  const { t, format } = useTranslation();
  const [coverFailed, setCoverFailed] = useState(false);

  const tracksText = format(t.result.tracksCount, { count: playlist.trackCount });

  return (
    <div
      className="playlist-summary-header"
      data-testid="playlist-summary"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        paddingBottom: '1.5rem',
        borderBottom: '2px dashed var(--line, #dfe6e9)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
          {/* Playlist Cover Art */}
          {playlist.coverUrl && !coverFailed ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.name}
              className="playlist-cover hand-drawn-border-subtle shadow-cutout-sm"
              loading="lazy"
              onError={() => setCoverFailed(true)}
              style={{
                width: '88px',
                height: '88px',
                minWidth: '88px',
                objectFit: 'cover',
                borderRadius: '6px',
                transform: 'rotate(-1.5deg)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              className="cover-placeholder hand-drawn-border-subtle shadow-cutout-sm"
              aria-label={t.result.noCoverAria}
              style={{
                width: '88px',
                height: '88px',
                minWidth: '88px',
                backgroundColor: 'var(--highlight-yellow, #ffeaa7)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2.5rem',
                borderRadius: '6px',
                transform: 'rotate(-1.5deg)',
                userSelect: 'none',
                flexShrink: 0,
              }}
            >
              ♫
            </div>
          )}

          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <span
              className="sticker font-handwriting"
              style={{
                display: 'inline-block',
                backgroundColor: '#fbcfe8',
                padding: '0.25rem 0.75rem',
                fontSize: '1rem',
                fontFamily: 'var(--font-handwriting, cursive)',
                fontWeight: 700,
                transform: 'rotate(-2deg)',
                marginBottom: '0.5rem',
                userSelect: 'none',
                lineHeight: 1.2,
              }}
            >
              {t.result.parsedPlaylistSticker}
            </span>

            <h2
              className="playlist-title"
              title={playlist.name}
              style={{
                fontFamily: 'var(--font-sans, sans-serif)',
                fontWeight: 800,
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                lineHeight: 1.25,
                color: 'var(--ink, #2d3436)',
                margin: '0.25rem 0',
                wordBreak: 'break-word',
              }}
            >
              {playlist.name}
            </h2>

            <div
              className="playlist-meta-row"
              style={{
                fontFamily: 'var(--font-sans, sans-serif)',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                color: '#636e72',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'nowrap',
                gap: '0.5rem',
                marginTop: '0.35rem',
                whiteSpace: 'nowrap',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {tracksText}
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: 0.55,
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.85rem',
                  lineHeight: 1,
                }}
              >
                ·
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {t.search.platformQQ}
              </span>
              {playlist.creator && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      opacity: 0.55,
                      userSelect: 'none',
                      flexShrink: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                  >
                    ·
                  </span>
                  <span
                    className="playlist-creator"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      margin: 0,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span>{t.result.creatorPrefix}</span>
                    <strong style={{ color: 'var(--ink, #2d3436)', fontWeight: 600 }}>
                      {playlist.creator}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Stickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          <Sticker
            as="a"
            href={`https://y.qq.com/n/ryqq/playlist/${playlist.id}`}
            target="_blank"
            rel="noopener noreferrer"
            color="white"
            rotateDeg={-1}
            className="font-handwriting"
            style={{
              padding: '0.42rem 0.95rem',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-handwriting, cursive)',
              fontWeight: 700,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: 1.2,
            }}
          >
            {t.result.viewOnQQ}
          </Sticker>

          <Sticker
            type="button"
            color="yellow"
            rotateDeg={1}
            onClick={onReset}
            className="font-handwriting"
            style={{
              padding: '0.42rem 0.95rem',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-handwriting, cursive)',
              fontWeight: 700,
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            {t.result.parseAnother}
          </Sticker>
        </div>
      </div>
    </div>
  );
};
