import React, { useId, useState } from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';
import { MarkerButton } from '../ui/MarkerButton';
import {
  createSoundiizMigration,
  SOUNDIIZ_MAX_TRACKS,
} from '../../services/migration/soundiiz';

interface MigrationPanelProps {
  playlist: Playlist | null;
}

type ServiceId = 'soundiiz' | 'tunemymusic' | 'freeyourmusic';

interface MigrationService {
  id: ServiceId;
  name: string;
  url: string;
  supportsOneClick: boolean;
  helpKey: 'soundiizHelp' | 'tuneMyMusicHelp' | 'freeYourMusicHelp';
}

const SERVICES: MigrationService[] = [
  {
    id: 'soundiiz',
    name: 'Soundiiz',
    url: 'https://soundiiz.com/',
    supportsOneClick: true,
    helpKey: 'soundiizHelp',
  },
  {
    id: 'tunemymusic',
    name: 'TuneMyMusic',
    url: 'https://www.tunemymusic.com/',
    supportsOneClick: false,
    helpKey: 'tuneMyMusicHelp',
  },
  {
    id: 'freeyourmusic',
    name: 'FreeYourMusic',
    url: 'https://freeyourmusic.com/',
    supportsOneClick: false,
    helpKey: 'freeYourMusicHelp',
  },
];

interface HelpTooltipProps {
  label: string;
  text: string;
}

const SYSTEM_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

const HelpTooltip: React.FC<HelpTooltipProps> = ({ label, text }) => {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '1.65rem',
          height: '1.65rem',
          borderRadius: '999px',
          border: '1.5px dashed rgba(45, 52, 54, 0.45)',
          background: 'rgba(255,255,255,0.72)',
          color: 'var(--ink, #2d3436)',
          fontFamily: SYSTEM_FONT,
          fontWeight: 700,
          cursor: 'help',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ?
      </button>

      {open ? (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(100% + 0.55rem)',
            zIndex: 30,
            width: 'min(22rem, 78vw)',
            padding: '0.7rem 0.8rem',
            borderRadius: '10px',
            border: '1px solid rgba(45, 52, 54, 0.2)',
            background: 'var(--paper, #fdfbf7)',
            boxShadow: '0 8px 24px rgba(45, 52, 54, 0.14)',
            color: '#4b5356',
            fontFamily: SYSTEM_FONT,
            fontSize: '0.92rem',
            lineHeight: 1.5,
            textAlign: 'left',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </div>
      ) : null}
    </span>
  );
};

export const MigrationPanel: React.FC<MigrationPanelProps> = ({ playlist }) => {
  const { t, format: formatString } = useTranslation();
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadedCount = playlist?.tracks.length ?? 0;
  const totalCount = playlist?.trackCount ?? 0;
  const isPartial = Boolean(playlist && loadedCount < totalCount);
  const isOverLimit = loadedCount > SOUNDIIZ_MAX_TRACKS;
  const oneClickUnavailable = !playlist || loadedCount === 0 || isOverLimit;

  const openWebsite = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSoundiizOneClick = async () => {
    if (!playlist || oneClickUnavailable || isPreparing) return;

    setErrorMessage(null);
    setIsPreparing(true);

    // Open synchronously from the click so browsers do not block the final handoff.
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
      // No destination is preselected: Soundiiz receives the tracklist first,
      // then the user chooses the destination service there.
      const result = await createSoundiizMigration(playlist, null);

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
      console.error('Failed to create Soundiiz migration:', error);
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div
      data-testid="migration-panel"
      style={{
        paddingTop: '1.25rem',
        paddingBottom: '1.25rem',
        borderTop: '1px dashed rgba(45, 52, 54, 0.18)',
      }}
    >
      <div style={{ marginBottom: '0.7rem' }}>
        <div
          className="font-handwriting"
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink, #2d3436)',
          }}
        >
          {t.migration.title}
        </div>
        <div
          className="font-note"
          style={{
            marginTop: '0.15rem',
            fontSize: '0.95rem',
            color: '#7a8184',
            lineHeight: 1.45,
          }}
        >
          {t.migration.subtitle}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '0.55rem',
        }}
      >
        {SERVICES.map((service, index) => (
          <div
            key={service.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem 0.85rem',
              padding: '0.55rem 0.65rem',
              border: '1px dashed rgba(45, 52, 54, 0.2)',
              borderRadius: '10px',
              background: index % 2 === 0 ? 'rgba(255,255,255,0.38)' : 'transparent',
            }}
          >
            <div
              style={{
                minWidth: '8rem',
                fontFamily: SYSTEM_FONT,
                fontSize: '1.02rem',
                fontWeight: 700,
                color: 'var(--ink, #2d3436)',
              }}
            >
              {service.name}
              {service.supportsOneClick ? (
                <span
                  style={{
                    marginLeft: '0.45rem',
                    fontFamily: SYSTEM_FONT,
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    color: '#6b7280',
                  }}
                >
                  {t.migration.directBadge}
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.45rem',
              }}
            >
              {service.supportsOneClick ? (
                <MarkerButton
                  type="button"
                  variant="ink"
                  rotateDeg={-0.35}
                  disabled={oneClickUnavailable || isPreparing}
                  onClick={handleSoundiizOneClick}
                  aria-label={t.migration.oneClick}
                  title={
                    isOverLimit
                      ? formatString(t.migration.oneClickDisabledTitle, {
                          count: loadedCount,
                          limit: SOUNDIIZ_MAX_TRACKS,
                        })
                      : t.migration.oneClickTitle
                  }
                  style={{
                    fontSize: '0.92rem',
                    padding: '0.42rem 0.78rem',
                  }}
                >
                  {isPreparing ? t.migration.preparing : t.migration.oneClick}
                </MarkerButton>
              ) : null}

              <MarkerButton
                type="button"
                variant="sticker"
                rotateDeg={0.3}
                onClick={() => openWebsite(service.url)}
                aria-label={formatString(t.migration.visitAria, { service: service.name })}
                style={{
                  fontSize: '0.92rem',
                  padding: '0.4rem 0.72rem',
                  border: '1.5px dashed rgba(45, 52, 54, 0.42)',
                }}
              >
                {t.migration.visit} ↗
              </MarkerButton>

              <HelpTooltip
                label={formatString(t.migration.helpAria, { service: service.name })}
                text={t.migration[service.helpKey]}
              />
            </div>
          </div>
        ))}
      </div>

      {isOverLimit ? (
        <div
          className="font-note"
          role="status"
          style={{
            marginTop: '0.55rem',
            color: '#92400e',
            fontSize: '0.86rem',
            lineHeight: 1.4,
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
            marginTop: '0.55rem',
            color: '#73797c',
            fontSize: '0.86rem',
            lineHeight: 1.4,
          }}
        >
          {formatString(t.migration.partialNotice, {
            loaded: loadedCount,
            total: totalCount,
          })}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="font-note"
          role="alert"
          style={{
            marginTop: '0.55rem',
            fontSize: '0.9rem',
            color: '#b91c1c',
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};
