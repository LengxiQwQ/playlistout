import React, { useState } from 'react';
import type { Playlist } from '../api/types';
import { useTranslation } from '../i18n';
import { Sticker } from './ui/Sticker';
import { MarkerButton } from './ui/MarkerButton';
import { KugouAuthModal } from './auth/KugouAuthModal';
import {
  getPlatformConfig,
  getPlatformName,
  getPlatformPlaylistSticker,
  getPlatformViewAction,
  getPlatformPlaylistUrl,
} from '../utils/platform';

export interface PlaylistSummaryProps {
  playlist: Playlist;
  onReset: () => void;
  onReturnToBatch?: () => void;
  onReload?: () => void;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({ playlist, onReset, onReturnToBatch, onReload }) => {
  const { t, format, language } = useTranslation();
  const [coverFailed, setCoverFailed] = useState(false);
  const [isKugouModalOpen, setIsKugouModalOpen] = useState(false);

  const isKugouPreview =
    playlist.platform === 'kugou' &&
    (playlist.retrieval?.mode === 'preview' ||
      (!playlist.retrieval && playlist.tracks.length < playlist.trackCount));
  const retrievalReason = playlist.retrieval?.reason;

  const tracksText = format(t.result.tracksCount, { count: playlist.trackCount });
  const createdDateStr = playlist.createTime
    ? new Date(playlist.createTime * 1000).toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const playCountStr = playlist.playCount
    ? playlist.playCount >= 10000
      ? `${(playlist.playCount / 10000).toFixed(1)}万`
      : playlist.playCount.toLocaleString()
    : null;

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
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
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
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              className="cover-placeholder hand-drawn-border-subtle shadow-cutout-sm"
              aria-label={t.result.noCoverAria}
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
                flexShrink: 0,
              }}
            >
              ♫
            </div>
          )}

          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <Sticker
              as="span"
              color={getPlatformConfig(playlist.platform).color}
              rotateDeg={-2}
              className="font-handwriting"
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                fontSize: '1rem',
                fontFamily: 'var(--font-handwriting, cursive)',
                fontWeight: 700,
                marginBottom: '0.5rem',
                userSelect: 'none',
                lineHeight: 1.2,
              }}
            >
              {getPlatformPlaylistSticker(playlist.platform, language)}
            </Sticker>

            <h2
              className="playlist-title"
              title={playlist.name}
              style={{
                fontFamily: 'var(--font-sans, sans-serif)',
                fontWeight: 800,
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                lineHeight: 1.25,
                color: 'var(--ink, #2d3436)',
                margin: '0.25rem 0',
                wordBreak: 'break-word',
              }}
            >
              {playlist.name}
            </h2>

            <div
              className="playlist-meta-row"
              style={{
                fontFamily: 'var(--font-sans, sans-serif)',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                color: '#636e72',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'nowrap',
                gap: '0.5rem',
                marginTop: '0.35rem',
                whiteSpace: 'nowrap',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {tracksText}
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: 0.55,
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.85rem',
                  lineHeight: 1,
                }}
              >
                ·
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {getPlatformName(playlist.platform, language)}
              </span>
              {playlist.creator && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      opacity: 0.55,
                      userSelect: 'none',
                      flexShrink: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                  >
                    ·
                  </span>
                  <span
                    className="playlist-creator"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      margin: 0,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span>{t.result.creatorPrefix}</span>
                    <strong style={{ color: 'var(--ink, #2d3436)', fontWeight: 600 }}>
                      {playlist.creator}
                    </strong>
                  </span>
                </>
              )}
              {createdDateStr && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      opacity: 0.55,
                      userSelect: 'none',
                      flexShrink: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                  >
                    ·
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {t.result.createdPrefix}
                    {createdDateStr}
                  </span>
                </>
              )}
              {playCountStr && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      opacity: 0.55,
                      userSelect: 'none',
                      flexShrink: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                  >
                    ·
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {playCountStr} {t.result.playCountSuffix}
                  </span>
                </>
              )}
            </div>

            {playlist.tags && playlist.tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  marginTop: '0.5rem',
                  alignItems: 'center',
                }}
              >
                {playlist.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="font-mono"
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(45, 52, 54, 0.06)',
                      border: '1px solid rgba(45, 52, 54, 0.15)',
                      color: '#4b5563',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {playlist.description && (
              <div
                className="font-note"
                style={{
                  marginTop: '0.5rem',
                  fontSize: '1rem',
                  color: '#4b5563',
                  lineHeight: 1.4,
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderLeft: '2.5px solid var(--ink, #2d3436)',
                  borderRadius: '0 4px 4px 0',
                  maxWidth: '650px',
                  wordBreak: 'break-word',
                }}
              >
                “{playlist.description}”
              </div>
            )}
          </div>
        </div>

        {/* Action Stickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          <Sticker
            type="button"
            onClick={() => {
              const url = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);
              if (url && typeof window !== 'undefined') {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
            color="white"
            rotateDeg={-1}
            className="font-handwriting"
            aria-label={getPlatformViewAction(playlist.platform, language)}
            style={{
              padding: '0.42rem 0.95rem',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-handwriting, cursive)',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--ink, #2d3436)',
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: 1.2,
            }}
          >
            {getPlatformViewAction(playlist.platform, language)}
          </Sticker>

          {onReturnToBatch && (
            <Sticker
              type="button"
              color="pink"
              rotateDeg={-1.5}
              onClick={onReturnToBatch}
              className="font-handwriting"
              style={{
                padding: '0.42rem 0.95rem',
                fontSize: '1.05rem',
                fontFamily: 'var(--font-handwriting, cursive)',
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1.2,
                color: 'var(--ink, #2d3436)',
              }}
            >
              ← {t.userPlaylists.returnToCollection}
            </Sticker>
          )}

          <Sticker
            type="button"
            color="yellow"
            rotateDeg={1}
            onClick={onReset}
            className="font-handwriting"
            style={{
              padding: '0.42rem 0.95rem',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-handwriting, cursive)',
              fontWeight: 700,
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            {t.result.parseAnother}
          </Sticker>
        </div>
      </div>

      {/* Kugou Preview Notice Banner */}
      {isKugouPreview && (
        <div
          data-testid="kugou-preview-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: retrievalReason === 'auth_invalid' ? '#fef2f2' : '#eff6ff',
            border: `2px dashed ${retrievalReason === 'auth_invalid' ? '#ef4444' : '#3b82f6'}`,
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto', minWidth: '240px' }}>
            <span style={{ fontSize: '1.25rem' }}>
              {retrievalReason === 'auth_invalid' ? '⚠️' : 'ℹ️'}
            </span>
            <span
              className="font-sans"
              style={{
                fontSize: '0.92rem',
                color: retrievalReason === 'auth_invalid' ? '#991b1b' : '#1e40af',
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {retrievalReason === 'auth_required'
                ? t.result.kugouAuthRequiredNotice
                : retrievalReason === 'auth_invalid'
                ? t.result.kugouAuthInvalidNotice
                : retrievalReason === 'owner_unconfirmed'
                ? t.result.kugouOwnerUnconfirmedNotice
                : retrievalReason === 'owner_mismatch'
                ? t.result.kugouOwnerMismatchNotice
                : retrievalReason === 'upstream_unavailable'
                ? t.result.kugouUpstreamUnavailableNotice
                : format(t.result.kugouPreviewNotice, {
                    previewCount: playlist.tracks.length,
                    totalCount: playlist.trackCount,
                  })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {retrievalReason === 'auth_required' && (
              <MarkerButton
                variant="ink"
                onClick={() => setIsKugouModalOpen(true)}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
              >
                {t.result.kugouConnectBtn}
              </MarkerButton>
            )}

            {retrievalReason === 'auth_invalid' && (
              <MarkerButton
                variant="ink"
                onClick={() => setIsKugouModalOpen(true)}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '0.45rem 1rem' }}
              >
                {t.result.kugouReLoginBtn}
              </MarkerButton>
            )}

            {retrievalReason === 'owner_unconfirmed' && (
              <>
                <MarkerButton
                  variant="paper"
                  onClick={() => onReload?.()}
                  style={{ padding: '0.45rem 0.85rem' }}
                >
                  {t.result.kugouReparseBtn}
                </MarkerButton>
                <MarkerButton
                  variant="ink"
                  onClick={() => setIsKugouModalOpen(true)}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 0.85rem' }}
                >
                  {t.result.kugouSwitchAccountBtn}
                </MarkerButton>
              </>
            )}

            {retrievalReason === 'owner_mismatch' && (
              <MarkerButton
                variant="ink"
                onClick={() => setIsKugouModalOpen(true)}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
              >
                {t.result.kugouSwitchAccountBtn}
              </MarkerButton>
            )}

            {retrievalReason === 'upstream_unavailable' && (
              <MarkerButton
                variant="ink"
                onClick={() => onReload?.()}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
              >
                {t.errors.retry}
              </MarkerButton>
            )}

            {!retrievalReason && (
              <MarkerButton
                variant="ink"
                onClick={() => setIsKugouModalOpen(true)}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
              >
                {format(t.result.kugouUnlockAllBtn, { totalCount: playlist.trackCount })}
              </MarkerButton>
            )}

            {(retrievalReason === 'platform_preview' || retrievalReason === 'identity_unresolved') && (
              <MarkerButton
                variant="paper"
                onClick={() => setIsKugouModalOpen(true)}
                style={{ padding: '0.45rem 0.85rem' }}
              >
                {t.result.kugouSwitchAccountBtn}
              </MarkerButton>
            )}
          </div>
        </div>
      )}

      <KugouAuthModal
        isOpen={isKugouModalOpen}
        onClose={() => setIsKugouModalOpen(false)}
        onSuccess={() => {
          onReload?.();
        }}
      />
    </div>
  );
};
