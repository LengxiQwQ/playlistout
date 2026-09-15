import React, { useState, useRef } from 'react';
import type { UserPlaylistsData, UserPlaylistSummary } from '../../api/types';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';
import { Sticker } from '../ui/Sticker';
import { MarkerButton } from '../ui/MarkerButton';
import {
  type BatchExportFormat,
  type BatchFetchProgress,
  fetchMultiplePlaylists,
  exportToMultiSheetExcel,
  exportToZip,
} from '../../utils/batchExport';

export interface UserPlaylistsPaperProps {
  userData: UserPlaylistsData;
  onReset: () => void;
  onSelectSinglePlaylist: (playlistId: string) => void;
  hasSinglePlaylistCollision?: boolean;
}

export const UserPlaylistsPaper: React.FC<UserPlaylistsPaperProps> = ({
  userData,
  onReset,
  onSelectSinglePlaylist,
  hasSinglePlaylistCollision = false,
}) => {
  const { t, format: formatString } = useTranslation();

  // Selected playlist IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    userData.playlists.map((p) => p.id),
  );

  // Selected batch format
  const [batchFormat, setBatchFormat] = useState<BatchExportFormat>('multi_sheet_xlsx');

  // Export progress & state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<BatchFetchProgress | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Abort controller for batch operations
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const totalTracks = userData.playlists.reduce((acc, p) => acc + p.trackCount, 0);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === userData.playlists.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(userData.playlists.map((p) => p.id));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setProgress(null);
    showToast('已取消批量导出');
  };

  const handleStartBatchExport = async () => {
    const targets = userData.playlists.filter((p) => selectedIds.includes(p.id));
    if (targets.length === 0) {
      showToast('请至少选择一个歌单');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExporting(true);

    try {
      const { successfulPlaylists, failedCount } = await fetchMultiplePlaylists(
        targets,
        (p) => setProgress(p),
        controller.signal,
      );

      if (successfulPlaylists.length === 0) {
        showToast('批量导出失败，未能成功获取歌单详情');
        return;
      }

      if (batchFormat === 'multi_sheet_xlsx') {
        exportToMultiSheetExcel(successfulPlaylists, userData.nickname);
      } else {
        await exportToZip(successfulPlaylists, userData.nickname, batchFormat);
      }

      if (failedCount > 0) {
        showToast(formatString(t.userPlaylists.exportPartialFail, { count: failedCount }));
      } else {
        showToast(t.userPlaylists.exportSuccess);
      }
    } catch (err) {
      console.error('Batch export failed:', err);
      showToast('批量导出过程中出现异常，请重试');
    } finally {
      setIsExporting(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div>
      {/* Transitional journal hint */}
      <div
        className="font-note"
        style={{
          maxWidth: 'var(--search-note-width, 820px)',
          margin: '0 auto calc(var(--ruled-line-height, 38px) * 1.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '1.65rem',
          color: '#8a8f92',
          height: 'var(--ruled-line-height, 38px)',
          lineHeight: 'var(--ruled-line-height, 38px)',
        }}
      >
        <span>{t.result.doneParsingHint}</span>
      </div>

      <section
        id="user-playlists"
        className="result-paper-section"
        style={{
          maxWidth: 'var(--result-paper-width, 1050px)',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Decorative yellow sparkle */}
        <div
          style={{
            position: 'absolute',
            right: '-2rem',
            top: '-2.5rem',
            color: '#eab308',
            fontSize: '4rem',
            userSelect: 'none',
            zIndex: 15,
          }}
          aria-hidden="true"
        >
          ✦
        </div>

        {/* Decorative Tape (stuck on the corner) */}
        <div style={{ position: 'absolute', top: '-1rem', left: '-2.5rem', zIndex: 20 }}>
          <Tape
            color="pink"
            rotateDeg={-12}
            style={{
              width: '10.5rem',
              height: '2.5rem',
            }}
          />
        </div>

        <Paper
          color="white"
          borderVariant="default"
          shadow="paper"
          className="result-paper-card"
          interactive={false}
          style={{ padding: '2.5rem' }}
        >
          {/* Header Area */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '1.5rem',
              borderBottom: '2px dashed var(--line, #dfe6e9)',
              paddingBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Sticker color="yellow" rotateDeg={-1} style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}>
                  {t.userPlaylists.collectionSticker}
                </Sticker>
                <span className="font-mono" style={{ fontSize: '0.9rem', color: '#636e72' }}>
                  QQ: {userData.userId}
                </span>
              </div>

              <h2
                className="font-handwriting"
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: 'var(--ink, #2d3436)',
                  margin: '0.25rem 0',
                }}
              >
                {formatString(t.userPlaylists.binderTitle, { nickname: userData.nickname })}
              </h2>

              <div
                className="font-note"
                style={{
                  fontSize: '1.25rem',
                  color: '#636e72',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginTop: '0.25rem',
                }}
              >
                <span>{formatString(t.userPlaylists.totalPlaylistsCount, { count: userData.playlists.length })}</span>
                <span>·</span>
                <span>{formatString(t.userPlaylists.totalTracksCount, { count: totalTracks })}</span>
              </div>
            </div>

            <MarkerButton variant="paper" onClick={onReset} style={{ fontSize: '0.95rem' }}>
              ✎ {t.result.parseAnother}
            </MarkerButton>
          </div>

          {/* Collision banner: if input also matched a single playlist */}
          {hasSinglePlaylistCollision && (
            <div
              style={{
                backgroundColor: '#fef9c3',
                border: '1.5px dashed #ca8a04',
                padding: '0.75rem 1.25rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.95rem', color: '#854d0e' }}>
                💡 {t.userPlaylists.switchSingleHint}
              </span>
              <button
                type="button"
                onClick={() => onSelectSinglePlaylist(userData.userId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d4ed8',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {t.userPlaylists.switchToSingle}
              </button>
            </div>
          )}

          {/* Batch Export Control Panel (Sticky Note Style) */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #2d3436',
              boxShadow: '3px 3px 0 #2d3436',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <span
                className="font-handwriting"
                style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink, #2d3436)' }}
              >
                {t.userPlaylists.batchExportTitle}
              </span>
            </div>

            {/* Format Selection Stickers */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.65rem',
                marginBottom: '1.25rem',
              }}
            >
              {[
                { id: 'multi_sheet_xlsx', label: t.userPlaylists.formatMultiSheet, color: 'green' },
                { id: 'xlsx', label: t.userPlaylists.formatZipXlsx, color: 'yellow' },
                { id: 'csv', label: t.userPlaylists.formatZipCsv, color: 'pink' },
                { id: 'txt', label: t.userPlaylists.formatZipTxt, color: 'white' },
                { id: 'json', label: t.userPlaylists.formatZipJson, color: 'blue' },
              ].map((fmt) => {
                const isSelected = batchFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setBatchFormat(fmt.id as BatchExportFormat)}
                    disabled={isExporting}
                    style={{
                      border: isSelected ? '2px solid #2d3436' : '1.5px dashed #94a3b8',
                      backgroundColor: isSelected ? '#fed7aa' : '#ffffff',
                      boxShadow: isSelected ? '2px 2px 0 #2d3436' : 'none',
                      borderRadius: '4px',
                      padding: '0.45rem 0.85rem',
                      cursor: isExporting ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 700 : 500,
                      transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected ? '✓ ' : ''}
                    {fmt.label}
                  </button>
                );
              })}
            </div>

            {/* Action Row & Progress */}
            {isExporting && progress ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px dashed #2d3436',
                  padding: '1rem',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-handwriting" style={{ fontSize: '1.1rem', color: '#16a34a' }}>
                    {formatString(t.userPlaylists.exportingProgress, {
                      current: progress.current,
                      total: progress.total,
                      name: progress.currentPlaylistName,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelExport}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      textDecoration: 'underline',
                    }}
                  >
                    取消
                  </button>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((progress.current / progress.total) * 100)}%`,
                      height: '100%',
                      backgroundColor: '#22c55e',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <MarkerButton
                  variant="ink"
                  onClick={handleStartBatchExport}
                  disabled={selectedIds.length === 0}
                  style={{ padding: '0.65rem 1.5rem', fontSize: '1.05rem' }}
                >
                  {formatString(t.userPlaylists.batchExportBtn, { count: selectedIds.length })}
                </MarkerButton>
              </div>
            )}
          </div>

          {/* Playlist Rows Catalog */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3
                className="font-handwriting"
                style={{
                  fontSize: '1.5rem',
                  color: 'var(--ink, #2d3436)',
                  margin: 0,
                }}
              >
                {formatString(t.userPlaylists.listHeaderTitle, { count: userData.playlists.length })}
              </h3>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'underline',
                }}
              >
                {selectedIds.length === userData.playlists.length
                  ? t.userPlaylists.deselectAll
                  : formatString(t.userPlaylists.selectAll, { count: userData.playlists.length })}
              </button>
            </div>

            {userData.playlists.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>{t.userPlaylists.noPlaylists}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {userData.playlists.map((playlist: UserPlaylistSummary) => {
                  const isChecked = selectedIds.includes(playlist.id);
                  return (
                    <div
                      key={playlist.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.25rem',
                        border: '1.5px solid #2d3436',
                        boxShadow: isChecked ? '3px 3px 0 #2d3436' : '1px 1px 0 rgba(45,52,54,0.1)',
                        backgroundColor: isChecked ? '#ffffff' : '#f8fafc',
                        borderRadius: '6px',
                        gap: '1rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Checkbox + Cover + Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(playlist.id)}
                          aria-label={`选择歌单 ${playlist.name}`}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#16a34a',
                          }}
                        />

                        {playlist.coverUrl ? (
                          <img
                            src={playlist.coverUrl}
                            alt=""
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '4px',
                              objectFit: 'cover',
                              border: '1px solid #cbd5e1',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '4px',
                              backgroundColor: '#fef08a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              flexShrink: 0,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            🎵
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '1.05rem',
                              color: 'var(--ink, #2d3436)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {playlist.name}
                          </div>
                          <div
                            className="font-note"
                            style={{
                              fontSize: '1.05rem',
                              color: '#64748b',
                              display: 'flex',
                              gap: '0.75rem',
                              marginTop: '0.15rem',
                            }}
                          >
                            <span>{playlist.trackCount} 首</span>
                            {playlist.listenNum !== undefined && playlist.listenNum > 0 && (
                              <span>· 试听 {playlist.listenNum.toLocaleString()} 次</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => onSelectSinglePlaylist(playlist.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            border: '1px solid #94a3b8',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {t.userPlaylists.viewTracks} ↗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Paper>
      </section>

      {/* Floating Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            fontSize: '0.95rem',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
