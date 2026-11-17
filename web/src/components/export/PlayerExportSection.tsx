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
  const isDisabled = !playlist || playlist.tracks.length === 0;

  const handleExport = (formatId: string) => {
    if (!playlist || isDisabled) return;
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
        background: 'linear-gradient(135deg, rgba(255, 248, 250, 0.85) 0%, rgba(245, 252, 248, 0.85) 100%)',
        border: '1.75px dashed rgba(110, 90, 80, 0.32)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 2px 3px 0 rgba(150, 112, 92, 0.12)',
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
              color: 'var(--ink, #5a4a42)',
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
              color: '#8a7569',
            }}
          >
            {t.export.playerExportSubtitle}
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
            color: '#6a82d4',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 700,
            padding: '0.25rem 0.65rem',
            backgroundColor: 'rgba(106, 130, 212, 0.08)',
            borderRadius: '6px',
            border: '1.5px dashed #9db3ee',
            transition: 'all 0.15s ease',
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
            backgroundColor: '#faf7ff',
            borderRadius: '10px',
            border: '1.5px solid rgba(139, 108, 196, 0.28)',
            borderTop: '4px solid #c6aef7',
            boxShadow: '2px 3px 0 rgba(150, 112, 92, 0.12)',
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
                color: 'var(--ink, #5a4a42)',
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
              disabled={isDisabled}
              onClick={() => handleExport('lx-music')}
              className="font-mono"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
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
              color: '#8a7569',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed rgba(90, 74, 66, 0.12)',
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
            backgroundColor: '#f4fbf7',
            borderRadius: '10px',
            border: '1.5px solid rgba(79, 174, 138, 0.28)',
            borderTop: '4px solid #8bd9b8',
            boxShadow: '2px 3px 0 rgba(150, 112, 92, 0.12)',
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
                color: 'var(--ink, #5a4a42)',
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
              disabled={isDisabled}
              onClick={() => handleExport('listen1')}
              className="font-mono"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
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
              color: '#8a7569',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed rgba(90, 74, 66, 0.12)',
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
            backgroundColor: '#fffdf2',
            borderRadius: '10px',
            border: '1.5px solid rgba(227, 178, 60, 0.32)',
            borderTop: '4px solid #f7d774',
            boxShadow: '2px 3px 0 rgba(150, 112, 92, 0.12)',
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
                color: 'var(--ink, #5a4a42)',
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
              color: '#8a7569',
              lineHeight: 1.5,
              paddingTop: '0.6rem',
              borderTop: '1px dashed rgba(90, 74, 66, 0.12)',
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
