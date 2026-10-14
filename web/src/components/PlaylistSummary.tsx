import React, { useState, useMemo } from 'react';
import type { Playlist } from '../api/types';
import { useTranslation } from '../i18n';
import { Sticker } from './ui/Sticker';
import { KugouAuthModal } from './auth/KugouAuthModal';
import { hasKugouAuth } from '../utils/kugouAuth';
import {
  getPlatformConfig,
  getPlatformName,
  getPlatformPlaylistSticker,
  getPlatformViewAction,
  getPlatformPlaylistUrl,
} from '../utils/platform';
import { QishuiChannelBanner } from './playlist/QishuiChannelBanner';
import { KugouPreviewBanner } from './playlist/KugouPreviewBanner';

export interface PlaylistSummaryProps {
  playlist: Playlist;
  onReset: () => void;
  onReturnToBatch?: () => void;
  onReload?: () => void;
  onSwitchChannel?: (channel: 'qishui' | 'douyin') => void;
  isSwitchingChannel?: boolean;
  onViewAllUserPlaylists?: () => void;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({
  playlist,
  onReset,
  onReturnToBatch,
  onReload,
  onSwitchChannel,
  isSwitchingChannel,
  onViewAllUserPlaylists,
}) => {
  const { t, format, language } = useTranslation();
  const [coverFailed, setCoverFailed] = useState(false);
  const [isKugouModalOpen, setIsKugouModalOpen] = useState(false);
  const isLoggedIn = hasKugouAuth();

  const { mainDescription, platformNotice } = useMemo(() => {
    if (!playlist.description) return { mainDescription: null, platformNotice: null };
    const noticeIdx = playlist.description.indexOf('[平台限制提示]');
    if (noticeIdx === -1) {
      return { mainDescription: playlist.description.trim() || null, platformNotice: null };
    }
    const main = playlist.description.slice(0, noticeIdx).trim();
    const notice = playlist.description.slice(noticeIdx).trim();
    return {
      mainDescription: main || null,
      platformNotice: notice || null,
    };
  }, [playlist.description]);

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
      <div className="playlist-summary-main">
        <div className="playlist-summary-info">
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
              color={playlist.channel === 'douyin' ? 'pink' : getPlatformConfig(playlist.platform).color}
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
              {playlist.platform === 'qishui'
                ? playlist.channel === 'douyin'
                  ? (language === 'zh-CN' ? '汽水音乐 · 包含视频原声' : 'Soda Music · Video Sounds')
                  : (language === 'zh-CN' ? '汽水音乐 · 官方歌曲' : 'Soda Music · Official')
                : getPlatformPlaylistSticker(playlist.platform, language)}
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
                overflowWrap: 'break-word',
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
                flexWrap: 'wrap',
                gap: '0.25rem 0.5rem',
                marginTop: '0.35rem',
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

            {mainDescription && (
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
                “{mainDescription}”
              </div>
            )}

            {platformNotice && !isLoggedIn && (
              <div
                className="font-sans"
                data-testid="kugou-platform-limit-notice"
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.88rem',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  color: '#92400e',
                  backgroundColor: 'rgba(254, 243, 199, 0.9)',
                  border: '1px solid #fcd34d',
                  borderRadius: '4px',
                  padding: '0.4rem 0.75rem',
                  maxWidth: '650px',
                  lineHeight: 1.45,
                  fontWeight: 500,
                  wordBreak: 'break-word',
                }}
              >
                {platformNotice}
              </div>
            )}
          </div>
        </div>

        {/* Action Stickers & Channel Switcher Column */}
        <div className="playlist-summary-actions">
          <div className="playlist-summary-actions-row">
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

            {playlist.platform === 'kugou' && isLoggedIn && onViewAllUserPlaylists && !onReturnToBatch && (
              <Sticker
                type="button"
                color="blue"
                rotateDeg={1.5}
                onClick={onViewAllUserPlaylists}
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
                📂 {t.result.kugouViewAllPlaylistsBtn}
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
      </div>

      {/* Qishui / Douyin Channel Sticky Note Banner */}
      <QishuiChannelBanner
        playlist={playlist}
        isSwitchingChannel={isSwitchingChannel}
        onSwitchChannel={onSwitchChannel}
      />

      {/* Kugou Preview Notice Banner */}
      <KugouPreviewBanner
        playlist={playlist}
        isLoggedIn={isLoggedIn}
        onReload={onReload}
        onOpenModal={() => setIsKugouModalOpen(true)}
      />

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
