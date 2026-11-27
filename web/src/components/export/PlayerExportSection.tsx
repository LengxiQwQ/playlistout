import React from 'react';
import type { Playlist } from '../../api/types';
import { exportPlaylist } from '../../utils/export';
import { recordExportFormats } from '../../api/client';
import { trackClarityEvent, setClarityTag } from '../../analytics/clarity';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

export interface PlayerExportSectionProps {
  playlist: Playlist | null;
  onExportSuccess: (filename: string) => void;
  onExportError: (msg?: string) => void;
}

export const PlayerExportSection: React.FC<PlayerExportSectionProps> = ({
  playlist,
  onExportSuccess,
  onExportError,
}) => {
  const { t } = useTranslation();
  const incompatible = !!playlist && ['spotify', 'applemusic', 'ytmusic'].includes(playlist.platform);
  const isDisabled = !playlist || playlist.tracks.length === 0;
  const playerDisabled = isDisabled || incompatible;

  const handleExport = (formatId: string) => {
    if (!playlist || isDisabled || (incompatible && formatId !== 'json')) return;
    try {
      const { filename } = exportPlaylist(playlist, formatId);
      setClarityTag('export_format', 'json');
      trackClarityEvent('playlist_export');
      // Record analytics
      recordExportFormats(['json'], playlist.tracks.length, playlist.platform || 'qqmusic');
      onExportSuccess(filename);
    } catch (err) {
      console.error(`Failed to export format ${formatId}:`, err);
      onExportError();
    }
  };

  return (
    <div
      className="player-export-section"
      data-testid="player-export-section"
      style={{
        padding: '1.35rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--tint-strawberry-bg-soft) 0%, var(--tint-mint-bg-soft) 100%)',
        border: '1.75px dashed var(--line-strong)',
        boxShadow: 'inset 0 1px 0 var(--gloss), var(--shadow-sticker)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.65rem',
        }}
      >
        <div>
          <div
            className="font-handwriting"
            style={{
              fontSize: '1.45rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🎵</span> {t.export.playerExportTitle}
          </div>
          <div
            style={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              color: 'var(--text-faint)',
            }}
          >
            {incompatible ? t.search.incompatiblePlayerFormat : t.export.playerExportSubtitle}
          </div>
        </div>

        <a
          href="#ecosystem"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('ecosystem');
            if (el) {
              const prefersReduced =
                typeof window !== 'undefined' &&
                window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
              if (window.history && window.history.pushState) {
                window.history.pushState(null, '', '#ecosystem');
              } else {
                window.location.hash = '#ecosystem';
              }
            }
          }}
          className="font-handwriting"
          style={{
            fontSize: '1.05rem',
            color: 'var(--accent-sky)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 700,
            padding: '0.25rem 0.65rem',
            backgroundColor: 'var(--tint-sky-bg-soft)',
            borderRadius: '6px',
            border: '1.5px dashed var(--accent-sky)',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
          }}
        >
          {t.export.viewEcosystemGuide} ↘
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* LX Music (洛雪音乐) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.05rem 1.15rem',
            backgroundColor: 'var(--tint-taro-bg-soft)',
            borderRadius: '10px',
            border: '1.5px solid var(--tint-taro-line)',
            borderTop: '4px solid var(--accent-taro)',
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
              }}
            >
              洛雪音乐
            </span>
            <Sticker
              type="button"
              color="purple"
              rotateDeg={-1}
              disabled={playerDisabled}
              onClick={() => handleExport('lx-music')}
              className="font-mono"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: playerDisabled ? 'not-allowed' : 'pointer',
                opacity: playerDisabled ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
              aria-label={t.export.lxMusicButton}
            >
              导出歌单 ↓
            </Sticker>
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-faint)',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed var(--line)',
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {t.export.lxMusicDesc}
          </div>
        </div>

        {/* Listen 1 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.05rem 1.15rem',
            backgroundColor: 'var(--tint-mint-bg-soft)',
            borderRadius: '10px',
            border: '1.5px solid var(--tint-mint-line)',
            borderTop: '4px solid var(--accent-mint)',
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
              }}
            >
              Listen 1
            </span>
            <Sticker
              type="button"
              color="green"
              rotateDeg={1}
              disabled={playerDisabled}
              onClick={() => handleExport('listen1')}
              className="font-mono"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: playerDisabled ? 'not-allowed' : 'pointer',
                opacity: playerDisabled ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
              aria-label={t.export.listen1Button}
            >
              导出备份 ↓
            </Sticker>
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-faint)',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed var(--line)',
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {t.export.listen1Desc}
          </div>
        </div>

        {/* MusicFree */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.05rem 1.15rem',
            backgroundColor: 'var(--tint-lemon-bg-soft)',
            borderRadius: '10px',
            border: '1.5px solid var(--tint-lemon-line)',
            borderTop: '4px solid var(--accent-lemon)',
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
              }}
            >
              MusicFree
            </span>
            <Sticker
              type="button"
              color="yellow"
              rotateDeg={-1}
              disabled={isDisabled}
              onClick={() => handleExport('json')}
              className="font-mono"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
              aria-label={t.export.musicFreeButton}
            >
              标准 JSON ↓
            </Sticker>
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-faint)',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed var(--line)',
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {t.export.musicFreeDesc}
          </div>
        </div>
      </div>
    </div>
  );
};
