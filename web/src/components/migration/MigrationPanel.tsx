import React, { useState } from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';
import { trackClarityEvent, setClarityTag } from '../../analytics/clarity';
import { MarkerButton } from '../ui/MarkerButton';
import {
  createSoundiizMigration,
  SOUNDIIZ_MAX_TRACKS,
  type SoundiizDestination,
} from '../../services/migration/soundiiz';

interface MigrationPanelProps {
  playlist: Playlist | null;
}

const DESTINATIONS: Array<{
  id: SoundiizDestination;
  key: 'spotify' | 'appleMusic' | 'youtubeMusic' | 'deezer' | 'tidal' | 'other';
}> = [
  { id: 'spotify', key: 'spotify' },
  { id: 'apple', key: 'appleMusic' },
  { id: 'youtube', key: 'youtubeMusic' },
  { id: 'deezer', key: 'deezer' },
  { id: 'tidal', key: 'tidal' },
  { id: null, key: 'other' },
];

export const MigrationPanel: React.FC<MigrationPanelProps> = ({ playlist }) => {
  const { t, format: formatString } = useTranslation();
  const [loadingDestination, setLoadingDestination] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadedCount = playlist?.tracks.length ?? 0;
  const totalCount = playlist?.trackCount ?? 0;
  const isPartial = Boolean(playlist && loadedCount < totalCount);
  const isOverLimit = loadedCount > SOUNDIIZ_MAX_TRACKS;
  const unavailable = !playlist || loadedCount === 0 || isOverLimit;

  const handleMigrate = async (destination: SoundiizDestination, label: string) => {
    if (!playlist || unavailable || loadingDestination) return;

    setErrorMessage(null);
    const loadingKey = destination || 'other';
    setLoadingDestination(loadingKey);

    // Open synchronously from the user's click so browsers do not block the final handoff.
    const targetWindow = window.open('about:blank', '_blank');
    if (targetWindow) {
      try {
        targetWindow.opener = null;
        targetWindow.document.title = t.migration.preparing;
        targetWindow.document.body.textContent = t.migration.preparing;
      } catch {
        // Cross-browser best effort only.
      }
    }

    try {
      setClarityTag('migration_provider', 'soundiiz');
      setClarityTag('migration_destination', loadingKey);
      trackClarityEvent('playlist_migration');

      const result = await createSoundiizMigration(playlist, destination);

      if (targetWindow && !targetWindow.closed) {
        targetWindow.location.replace(result.shareUrl);
      } else {
        window.open(result.shareUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if (targetWindow && !targetWindow.closed) {
        targetWindow.close();
      }

      if (error instanceof Error && error.message === 'INVALID_MIGRATION_URL') {
        setErrorMessage(t.migration.invalidLink);
      } else {
        setErrorMessage(t.migration.failed);
      }
      console.error(`Failed to create Soundiiz migration for ${label}:`, error);
    } finally {
      setLoadingDestination(null);
    }
  };

  return (
    <div
      data-testid="migration-panel"
      style={{
        paddingTop: '1.15rem',
        borderTop: '1px dashed rgba(45, 52, 54, 0.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 19rem' }}>
          <div
            className="font-handwriting"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--ink, #2d3436)',
              marginBottom: '0.25rem',
            }}
          >
            {t.migration.title}
          </div>
          <div
            className="font-note"
            style={{
              fontSize: '1.05rem',
              color: '#636e72',
              lineHeight: 1.55,
              maxWidth: '48rem',
            }}
          >
            {t.migration.subtitle}
          </div>
        </div>

        <div
          className="font-mono"
          style={{
            fontSize: '0.76rem',
            color: '#8a8f92',
            whiteSpace: 'nowrap',
            paddingTop: '0.25rem',
          }}
        >
          {t.migration.poweredBy}
        </div>
      </div>

      {isOverLimit ? (
        <div
          className="font-note"
          role="status"
          style={{
            marginTop: '0.8rem',
            padding: '0.65rem 0.8rem',
            border: '1.5px dashed rgba(180, 83, 9, 0.5)',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.08)',
            color: '#92400e',
            lineHeight: 1.45,
          }}
        >
          {formatString(t.migration.trackLimit, {
            count: loadedCount,
            limit: SOUNDIIZ_MAX_TRACKS,
          })}
        </div>
      ) : null}

      {isPartial && !isOverLimit ? (
        <div
          className="font-note"
          role="status"
          style={{
            marginTop: '0.8rem',
            padding: '0.6rem 0.8rem',
            border: '1px dashed rgba(45, 52, 54, 0.28)',
            borderRadius: '10px',
            color: '#636e72',
            lineHeight: 1.45,
          }}
        >
          {formatString(t.migration.partialNotice, {
            loaded: loadedCount,
            total: totalCount,
          })}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          marginTop: '0.95rem',
        }}
      >
        {DESTINATIONS.map((destination, index) => {
          const loadingKey = destination.id || 'other';
          const isLoading = loadingDestination === loadingKey;
          const label = t.migration[destination.key];

          return (
            <MarkerButton
              key={loadingKey}
              type="button"
              variant="sticker"
              rotateDeg={index % 2 === 0 ? -0.5 : 0.5}
              disabled={unavailable || Boolean(loadingDestination)}
              onClick={() => handleMigrate(destination.id, label)}
              aria-label={label}
              style={{
                fontSize: '1rem',
                padding: '0.48rem 0.9rem',
                border: '1.5px dashed rgba(45, 52, 54, 0.45)',
              }}
            >
              {isLoading ? t.migration.preparing : label}
              {!isLoading ? ' ↗' : ''}
            </MarkerButton>
          );
        })}
      </div>

      <div
        className="font-note"
        style={{
          marginTop: '0.8rem',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          color: '#8a8f92',
          maxWidth: '58rem',
        }}
      >
        {t.migration.privacyNotice}
      </div>

      {errorMessage ? (
        <div
          className="font-note"
          role="alert"
          style={{
            marginTop: '0.7rem',
            fontSize: '0.95rem',
            color: '#b91c1c',
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};
