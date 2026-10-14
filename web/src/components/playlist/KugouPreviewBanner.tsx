import React from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';
import { MarkerButton } from '../ui/MarkerButton';

export interface KugouPreviewBannerProps {
  playlist: Playlist;
  isLoggedIn: boolean;
  onReload?: () => void;
  onOpenModal: () => void;
}

export const KugouPreviewBanner: React.FC<KugouPreviewBannerProps> = ({
  playlist,
  isLoggedIn,
  onReload,
  onOpenModal,
}) => {
  const { t, format } = useTranslation();

  const isKugouPreview =
    playlist.platform === 'kugou' &&
    (playlist.retrieval?.mode === 'preview' ||
      (!playlist.retrieval && playlist.tracks.length < playlist.trackCount));

  if (!isKugouPreview) return null;

  const retrievalReason = playlist.retrieval?.reason;

  return (
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
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
            ? format(t.result.kugouOwnerMismatchNotice, {
                previewCount: playlist.tracks.length,
                totalCount: playlist.trackCount,
              })
            : retrievalReason === 'identity_unresolved'
            ? format(t.result.kugouIdentityUnresolvedNotice, {
                previewCount: playlist.tracks.length,
                totalCount: playlist.trackCount,
              })
            : retrievalReason === 'upstream_unavailable'
            ? t.result.kugouUpstreamUnavailableNotice
            : isLoggedIn
            ? format(t.result.kugouLoggedInPreviewNotice, {
                previewCount: playlist.tracks.length,
                totalCount: playlist.trackCount,
              })
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
            onClick={onOpenModal}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
          >
            {t.result.kugouConnectBtn}
          </MarkerButton>
        )}

        {retrievalReason === 'auth_invalid' && (
          <MarkerButton
            variant="ink"
            onClick={onOpenModal}
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
              onClick={onOpenModal}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 0.85rem' }}
            >
              {t.result.kugouSwitchAccountBtn}
            </MarkerButton>
          </>
        )}

        {retrievalReason === 'owner_mismatch' && (
          <MarkerButton
            variant="ink"
            onClick={onOpenModal}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
          >
            {t.result.kugouSwitchAccountBtn}
          </MarkerButton>
        )}

        {retrievalReason === 'identity_unresolved' && (
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
              onClick={onOpenModal}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 0.85rem' }}
            >
              {t.result.kugouSwitchAccountBtn}
            </MarkerButton>
          </>
        )}

        {retrievalReason === 'upstream_unavailable' && (
          <>
            <MarkerButton
              variant="paper"
              onClick={() => onReload?.()}
              style={{ padding: '0.45rem 0.85rem' }}
            >
              {t.errors.retry}
            </MarkerButton>
            <MarkerButton
              variant="ink"
              onClick={onOpenModal}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 0.85rem' }}
            >
              {t.result.kugouReLoginBtn}
            </MarkerButton>
          </>
        )}

        {!retrievalReason && !isLoggedIn && (
          <MarkerButton
            variant="ink"
            onClick={onOpenModal}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem 1rem' }}
          >
            {format(t.result.kugouUnlockAllBtn, { totalCount: playlist.trackCount })}
          </MarkerButton>
        )}

        {retrievalReason === 'platform_preview' && (
          <>
            {onReload && (
              <MarkerButton
                variant="paper"
                onClick={() => onReload?.()}
                style={{ padding: '0.45rem 0.85rem' }}
              >
                {t.result.kugouReparseBtn}
              </MarkerButton>
            )}
            <MarkerButton
              variant={isLoggedIn ? 'paper' : 'ink'}
              onClick={onOpenModal}
              style={{
                backgroundColor: isLoggedIn ? undefined : '#2563eb',
                color: isLoggedIn ? undefined : '#ffffff',
                padding: '0.45rem 0.85rem',
              }}
            >
              {isLoggedIn ? t.result.kugouSwitchAccountBtn : t.result.kugouConnectBtn}
            </MarkerButton>
          </>
        )}
      </div>
    </div>
  );
};

export default KugouPreviewBanner;
