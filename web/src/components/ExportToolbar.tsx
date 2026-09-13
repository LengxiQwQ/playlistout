import React, { useState } from 'react';
import type { Playlist } from '../api/types';
import { exportPlaylist } from '../utils/export';
import { formatTracksForClipboard, copyToClipboard, type ClipboardMode } from '../utils/clipboard';
import { useTranslation } from '../i18n';
import { Sticker } from './ui/Sticker';
import { MarkerButton } from './ui/MarkerButton';

export interface ExportToolbarProps {
  playlist: Playlist | null;
}

export type ExportFormat = 'txt' | 'csv' | 'xlsx' | 'json';

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ playlist }) => {
  const { t, format: formatString } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleExport = (format: ExportFormat) => {
    if (!playlist) return;
    try {
      setSelectedFormat(format);
      const { filename } = exportPlaylist(playlist, format);
      showToast(formatString(t.export.toastExportSuccess, { filename }));
    } catch {
      showToast(t.export.toastExportFailed);
    }
  };

  const handleCopy = async (mode: ClipboardMode, label: string) => {
    if (!playlist) return;
    const text = formatTracksForClipboard(playlist, mode);
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast(
        formatString(t.export.toastCopySuccess, {
          count: playlist.tracks.length,
          mode: label,
        }),
      );
    } else {
      showToast(t.export.toastCopyFailed);
    }
  };

  const isDisabled = !playlist || playlist.tracks.length === 0;

  return (
    <div
      className="export-toolbar-container"
      data-testid="export-toolbar"
      style={{
        marginTop: '2rem',
        paddingTop: '1.75rem',
        borderTop: '2px dashed var(--line, #dfe6e9)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Main Export Section */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}
        >
          <div>
            <div
              className="font-handwriting"
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '0.6rem',
                color: 'var(--ink, #2d3436)',
              }}
            >
              {t.export.pickFormat}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <Sticker
                type="button"
                color="yellow"
                rotateDeg={-2}
                disabled={isDisabled}
                onClick={() => handleExport('txt')}
                className={`font-mono ${selectedFormat === 'txt' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.9rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  outline: selectedFormat === 'txt' ? '2px solid var(--ink)' : undefined,
                }}
                aria-label="TXT"
              >
                TXT
              </Sticker>

              <Sticker
                type="button"
                color="pink"
                rotateDeg={1}
                disabled={isDisabled}
                onClick={() => handleExport('csv')}
                className={`font-mono ${selectedFormat === 'csv' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.9rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  outline: selectedFormat === 'csv' ? '2px solid var(--ink)' : undefined,
                }}
                aria-label="CSV"
              >
                CSV
              </Sticker>

              <Sticker
                type="button"
                color="green"
                rotateDeg={-1}
                disabled={isDisabled}
                onClick={() => handleExport('xlsx')}
                className={`font-mono ${selectedFormat === 'xlsx' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.9rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  outline: selectedFormat === 'xlsx' ? '2px solid var(--ink)' : undefined,
                }}
                aria-label="Excel (.xlsx)"
              >
                Excel (.xlsx)
              </Sticker>

              <Sticker
                type="button"
                color="blue"
                rotateDeg={2}
                disabled={isDisabled}
                onClick={() => handleExport('json')}
                className={`font-mono ${selectedFormat === 'json' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.9rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  outline: selectedFormat === 'json' ? '2px solid var(--ink)' : undefined,
                }}
                aria-label="JSON"
              >
                JSON
              </Sticker>
            </div>
          </div>

          {/* Big Export Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              className="font-note hidden-on-mobile"
              style={{ fontSize: '1.45rem', color: '#8a8f92', transform: 'rotate(-2deg)' }}
            >
              {t.export.takeListWithYou}
            </span>
            <MarkerButton
              type="button"
              variant="ink"
              rotateDeg={-1}
              disabled={isDisabled}
              onClick={() => handleExport(selectedFormat)}
              style={{
                fontSize: '1.25rem',
                padding: '0.75rem 1.85rem',
              }}
            >
              {t.export.exportAction}
            </MarkerButton>
          </div>
        </div>

        {/* Clipboard Copy Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.85rem',
            paddingTop: '1rem',
            borderTop: '1px dashed rgba(45, 52, 54, 0.15)',
          }}
        >
          <div className="font-handwriting" style={{ fontSize: '1.25rem', color: '#636e72', fontWeight: 600 }}>
            {t.export.quickCopyTitle}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Sticker
              type="button"
              color="white"
              rotateDeg={-0.5}
              disabled={isDisabled}
              onClick={() => handleCopy('title', t.export.copyTitleOnly)}
              className="font-handwriting"
              style={{ padding: '0.35rem 0.75rem', fontSize: '1.05rem', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {t.export.copyTitleOnly}
            </Sticker>

            <Sticker
              type="button"
              color="white"
              rotateDeg={1}
              disabled={isDisabled}
              onClick={() => handleCopy('title-artist', t.export.copyTitleArtist)}
              className="font-handwriting"
              style={{ padding: '0.35rem 0.75rem', fontSize: '1.05rem', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {t.export.copyTitleArtist}
            </Sticker>

            <Sticker
              type="button"
              color="white"
              rotateDeg={-1}
              disabled={isDisabled}
              onClick={() => handleCopy('title-artist-album', t.export.copyTitleArtistAlbum)}
              className="font-handwriting"
              style={{ padding: '0.35rem 0.75rem', fontSize: '1.05rem', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {t.export.copyTitleArtistAlbum}
            </Sticker>
          </div>
        </div>
      </div>

      {/* Journal Paper Toast Feedback */}
      {toastMessage && (
        <div
          className="export-toast sticker font-handwriting"
          role="status"
          aria-live="polite"
          data-testid="export-toast"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            color: 'var(--ink, #2d3436)',
            padding: '0.65rem 1.5rem',
            borderRadius: '9999px',
            fontSize: '1.25rem',
            fontWeight: 700,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'toastSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: 'var(--cutout-shadow, 6px 6px 0 0 #2d3436)',
            border: '2.5px solid var(--ink, #2d3436)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#16a34a' }}>✓</span> {toastMessage}
        </div>
      )}
    </div>
  );
};
