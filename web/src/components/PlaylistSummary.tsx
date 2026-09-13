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
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
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
              }}
            />
          ) : (
            <div
              className="cover-placeholder hand-drawn-border-subtle shadow-cutout-sm"
              aria-label="无封面"
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
              }}
            >
              ♫
            </div>
          )}

          <div>
            <span
              className="sticker font-mono"
              style={{
                display: 'inline-block',
                backgroundColor: '#fbcfe8',
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                fontWeight: 700,
                transform: 'rotate(-2deg)',
                marginBottom: '0.5rem',
              }}
            >
              {t.result.parsedPlaylistSticker}
            </span>

            <h2
              className="playlist-title font-marker"
              title={playlist.name}
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                lineHeight: 1.2,
                color: 'var(--ink, #2d3436)',
                margin: '0.25rem 0',
              }}
            >
              {playlist.name}
            </h2>

            <div
              className="font-note"
              style={{
                fontSize: '1.4rem',
                color: '#636e72',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <span>{tracksText}</span>
              <span>·</span>
              <span>{t.search.platformQQ}</span>
              {playlist.creator && (
                <>
                  <span>·</span>
                  <span className="playlist-creator">
                    {t.result.creatorPrefix}
                    <strong style={{ color: 'var(--ink, #2d3436)' }}>{playlist.creator}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Stickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          <a
            href={`https://y.qq.com/n/ryqq/playlist/${playlist.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sticker font-handwriting"
            style={{
              backgroundColor: '#ffffff',
              padding: '0.4rem 0.85rem',
              fontSize: '1.15rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              transform: 'rotate(-1deg)',
            }}
          >
            {t.result.viewOnQQ}
          </a>

          <Sticker
            type="button"
            color="yellow"
            rotateDeg={1}
            onClick={onReset}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '1.15rem',
              fontFamily: 'var(--font-handwriting, cursive)',
              fontWeight: 700,
            }}
          >
            {t.result.parseAnother}
          </Sticker>
        </div>
      </div>
    </div>
  );
};
