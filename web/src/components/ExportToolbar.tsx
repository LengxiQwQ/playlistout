import React, { useState } from 'react';
import type { Playlist } from '../api/types';
import { exportPlaylist } from '../utils/export';
import { formatTracksForClipboard, copyToClipboard, type ClipboardMode } from '../utils/clipboard';
import { recordExportEvent, recordClipboardEvent } from '../api/client';
import { useTranslation } from '../i18n';
import { Sticker } from './ui/Sticker';
import { MarkerButton } from './ui/MarkerButton';

export interface ExportToolbarProps {
  playlist: Playlist | null;
}

export type ExportFormat = 'txt' | 'csv' | 'xlsx' | 'json';

const HandDrawnCheck: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = '#15803d',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{
      display: 'block',
      transform: 'rotate(-4deg)',
    }}
  >
    <path d="M4 12.5l5.2 5.5L20 6" />
  </svg>
);

const FORMAT_CONFIG: {
  id: ExportFormat;
  label: string;
  color: 'yellow' | 'pink' | 'green' | 'blue';
  rotateDeg: number;
}[] = [
  { id: 'xlsx', label: 'Excel (.xlsx)', color: 'green', rotateDeg: -1 },
  { id: 'csv', label: 'CSV', color: 'pink', rotateDeg: 1 },
  { id: 'txt', label: 'TXT', color: 'yellow', rotateDeg: -2 },
  { id: 'json', label: 'JSON', color: 'blue', rotateDeg: 2 },
];

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ playlist }) => {
  const { t, format: formatString } = useTranslation();
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['xlsx']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const isDisabled = !playlist || playlist.tracks.length === 0;

  const toggleFormat = (format: ExportFormat) => {
    if (isDisabled) return;
    setSelectedFormats((prev) => {
      if (prev.includes(format)) {
        return prev.filter((f) => f !== format);
      } else {
        return [...prev, format];
      }
    });
  };

  const handleBatchExport = () => {
    if (!playlist || selectedFormats.length === 0) {
      if (selectedFormats.length === 0) {
        showToast(t.export.selectFormatHint);
      }
      return;
    }

    const exportedFiles: string[] = [];
    const exportedFormatsLabels: string[] = [];

    for (const fmt of selectedFormats) {
      try {
        const { filename } = exportPlaylist(playlist, fmt);
        exportedFiles.push(filename);
        exportedFormatsLabels.push(fmt.toUpperCase());
        recordExportEvent(fmt, playlist.tracks.length, playlist.platform || 'qqmusic');
      } catch (err) {
        console.error(`Failed to export format ${fmt}:`, err);
      }
    }

    if (exportedFiles.length === 0) {
      showToast(t.export.toastExportFailed);
    } else if (exportedFiles.length === 1) {
      showToast(formatString(t.export.toastExportSuccess, { filename: exportedFiles[0] }));
    } else {
      showToast(
        formatString(t.export.toastExportMultipleSuccess, {
          count: exportedFiles.length,
          formats: exportedFormatsLabels.join(', '),
        }),
      );
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
      recordClipboardEvent(mode, playlist.tracks.length, playlist.platform || 'qqmusic');
    } else {
      showToast(t.export.toastCopyFailed);
    }
  };

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
              {FORMAT_CONFIG.map((item) => {
                const isSelected = selectedFormats.includes(item.id);
                return (
                  <Sticker
                    key={item.id}
                    type="button"
                    color={item.color}
                    rotateDeg={item.rotateDeg}
                    disabled={isDisabled}
                    onClick={() => toggleFormat(item.id)}
                    aria-pressed={isSelected}
                    className={`font-mono format-toggle-sticker ${isSelected ? 'active' : ''}`}
                    style={{
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.92rem',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      outline: isSelected ? '2px solid var(--ink, #2d3436)' : undefined,
                      boxShadow: isSelected
                        ? 'var(--cutout-shadow, 3px 3px 0 0 #2d3436)'
                        : '0 1px 3px rgba(0, 0, 0, 0.06)',
                      opacity: isDisabled ? 0.6 : isSelected ? 1 : 0.75,
                      transition: 'all 0.15s ease',
                    }}
                    aria-label={item.label}
                  >
                    <span
                      className="hand-drawn-checkbox"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '4px',
                        border: isSelected
                          ? '2px solid var(--ink, #2d3436)'
                          : '1.5px dashed rgba(45, 52, 54, 0.45)',
                        backgroundColor: isSelected
                          ? '#ffffff'
                          : 'rgba(255, 255, 255, 0.45)',
                        boxShadow: isSelected ? '1px 1px 0 rgba(45, 52, 54, 0.25)' : 'none',
                        flexShrink: 0,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {isSelected ? <HandDrawnCheck size={14} color="#15803d" /> : null}
                    </span>
                    <span>{item.label}</span>
                  </Sticker>
                );
              })}
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
              disabled={isDisabled || selectedFormats.length === 0}
              onClick={handleBatchExport}
              style={{
                fontSize: '1.25rem',
                padding: '0.75rem 1.85rem',
                opacity: isDisabled || selectedFormats.length === 0 ? 0.6 : 1,
                cursor: isDisabled || selectedFormats.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {selectedFormats.length > 1
                ? `${t.export.exportAction.replace('↓', '').trim()} (${selectedFormats.length}) ↓`
                : t.export.exportAction}
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
