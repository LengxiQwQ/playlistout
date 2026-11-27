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
  onSwitchChannel?: (channel: 'qishui' | 'douyin') => void;
  isReloading?: boolean;
  onViewAllUserPlaylists?: () => void;
}

export const ResultPaper: React.FC<ResultPaperProps> = ({
  playlist,
  onReset,
  onReturnToBatch,
  onReload,
  onSwitchChannel,
  isReloading,
  onViewAllUserPlaylists,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      {/* Transitional journal hint or Back button */}
      <div
        className="font-note result-transition-hint"
        style={{
          maxWidth: 'var(--search-note-width)',
          margin: '0 auto calc(var(--ruled-line-height, 38px) * 1.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: onReturnToBatch ? 'flex-start' : 'center',
          gap: '0.65rem',
          fontSize: '1.65rem',
          color: 'var(--text-faint)',
          height: 'var(--ruled-line-height, 38px)',
          lineHeight: 'var(--ruled-line-height, 38px)',
        }}
      >
        {onReturnToBatch ? (
          <button
            type="button"
            onClick={onReturnToBatch}
            className="ui-hitbox result-return-btn"
            style={{ cursor: 'pointer' }}
          >
            <span
              className="ui-face result-return-btn-face"
              style={{
                backgroundColor: 'var(--tint-strawberry-bg-soft)',
                border: '1.75px solid var(--line-ink)',
                borderRadius: '999px',
                boxShadow: '2px 2px 0 var(--shadow-color)',
                padding: '0.2rem 0.9rem',
                color: 'var(--text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontFamily: 'inherit',
                fontSize: '1.25rem',
                lineHeight: 1.3,
                fontWeight: 700,
              }}
            >
              <span aria-hidden="true">←</span>
              <span>{t.userPlaylists.returnToCollection}</span>
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
          maxWidth: 'var(--result-paper-width)',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Decorative 4-pointed star on top right (Act 1: 1 decoration) */}
        <div
          className="result-doodle result-star-reveal"
          style={{
            position: 'absolute',
            right: '1rem',
            top: '-2rem',
            color: 'var(--paper-lemon)',
            fontSize: '2.5rem',
            userSelect: 'none',
            zIndex: 15,
            ['--rot' as any]: '12deg',
          }}
          aria-hidden="true"
        >
          ✦
        </div>

        {/* Decorative green washi tape — pinned to the paper edge, clear of the cover art */}
        <div
          className="result-corner-tape"
          style={{
            position: 'absolute',
            top: '-0.7rem',
            left: '1.1rem',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Tape
            color="green"
            rotateDeg={-5}
            className="result-tape-reveal"
            style={{
              width: '6.5rem',
              height: '1.55rem',
              ['--rot' as any]: '-5deg',
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
                backgroundColor: 'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
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
                  backgroundColor: 'var(--bg-surface)',
                  border: '2px dashed var(--accent-strawberry)',
                  borderRadius: '14px',
                  boxShadow: 'var(--shadow-sticker)',
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    border: '2.5px solid var(--accent-strawberry)',
                    borderTopColor: 'var(--accent-strawberry)',
                    borderRadius: '50%',
                  }}
                />
                <span
                  className="font-note"
                  style={{
                    fontSize: '1.35rem',
                    color: 'var(--tint-strawberry-fg)',
                    fontWeight: 700,
                  }}
                >
                  {t.result.reloadingHint}
                </span>
              </div>
            </div>
          )}
          <div data-clarity-mask="true">
            <PlaylistSummary
              playlist={playlist}
              onReset={onReset}
              onReturnToBatch={onReturnToBatch}
              onReload={onReload}
              onSwitchChannel={onSwitchChannel}
              isSwitchingChannel={isReloading}
              onViewAllUserPlaylists={onViewAllUserPlaylists}
            />
            <TrackTable key={playlist.id} tracks={playlist.tracks} />
          </div>
          <ExportToolbar playlist={playlist} />
        </Paper>
      </section>
    </div>
  );
};
