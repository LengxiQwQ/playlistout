import React from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';
import { PlaylistSummary } from '../PlaylistSummary';
import { TrackTable } from '../TrackTable';
import { ExportToolbar } from '../ExportToolbar';

export interface ResultPaperProps {
  playlist: Playlist;
  onReset: () => void;
  onReturnToBatch?: () => void;
  onReload?: () => void;
  isReloading?: boolean;
}

export const ResultPaper: React.FC<ResultPaperProps> = ({
  playlist,
  onReset,
  onReturnToBatch,
  onReload,
  isReloading,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      {/* Transitional journal hint or Back button */}
      <div
        className="font-note"
        style={{
          maxWidth: 'var(--search-note-width, 820px)',
          margin: '0 auto calc(var(--ruled-line-height, 38px) * 1.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: onReturnToBatch ? 'flex-start' : 'center',
          gap: '0.65rem',
          fontSize: '1.65rem',
          color: '#8a8f92',
          height: 'var(--ruled-line-height, 38px)',
          lineHeight: 'var(--ruled-line-height, 38px)',
        }}
      >
        {onReturnToBatch ? (
          <button
            type="button"
            onClick={onReturnToBatch}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
              fontSize: '1.45rem',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#475569')}
          >
            <span style={{ fontSize: '1.2em' }}>🔙</span> 
            <span style={{ textDecoration: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: '4px' }}>
              {t.userPlaylists.returnToCollection}
            </span>
          </button>
        ) : (
          <span>{t.result.doneParsingHint}</span>
        )}
      </div>

      <section
        id="result"
        className="result-paper-section"
        style={{
          maxWidth: 'var(--result-paper-width, 1050px)',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Decorative doodle on top right */}
        <div
          className="result-doodle"
          style={{
            position: 'absolute',
            right: '1rem',
            top: '-2rem',
            color: '#a0a5a8',
            fontSize: '3rem',
            userSelect: 'none',
            zIndex: 15,
          }}
          aria-hidden="true"
        >
          ⌇
        </div>

        {/* Decorative green washi tape */}
        <div style={{ position: 'absolute', top: '2rem', left: '-1rem', zIndex: 20 }}>
          <Tape
            color="green"
            rotateDeg={-6}
            style={{
              width: '8rem',
              height: '1.85rem',
            }}
          />
        </div>

        <Paper
          color="white"
          borderVariant="default"
          shadow="paper"
          className="result-paper-card"
          interactive={false}
          style={{ padding: '2.5rem', position: 'relative' }}
        >
          {isReloading && (
            <div
              className="reloading-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                borderRadius: 'inherit',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '6rem',
                pointerEvents: 'all',
                transition: 'opacity 0.25s ease',
              }}
              aria-live="polite"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '1rem 1.75rem',
                  backgroundColor: '#ffffff',
                  border: '1.5px dashed #2563eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.12)',
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    border: '2.5px solid #dbeafe',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                  }}
                />
                <span
                  className="font-note"
                  style={{
                    fontSize: '1.35rem',
                    color: '#1e3a8a',
                    fontWeight: 600,
                  }}
                >
                  {t.result.reloadingHint}
                </span>
              </div>
            </div>
          )}
          <PlaylistSummary
            playlist={playlist}
            onReset={onReset}
            onReturnToBatch={onReturnToBatch}
            onReload={onReload}
          />
          <TrackTable tracks={playlist.tracks} />
          <ExportToolbar playlist={playlist} />
        </Paper>
      </section>
    </div>
  );
};
