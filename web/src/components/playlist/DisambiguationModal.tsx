import React from 'react';
import { PaperModal } from '../ui/PaperModal';
import { Sticker } from '../ui/Sticker';
import { useTranslation } from '../../i18n';
import type { Playlist, UserPlaylistsData } from '../../api/types';

export interface DisambiguationItem {
  id: string;
  platform: 'qqmusic' | 'netease';
  type: 'playlist' | 'user';
  title: string;
  subtitle?: string;
  count?: number;
  coverUrl?: string;
  data: Playlist | UserPlaylistsData;
}

export interface DisambiguationModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  candidates: DisambiguationItem[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onSelectUserPlaylists: (userData: UserPlaylistsData) => void;
}

const CandidateArtwork: React.FC<{
  coverUrl?: string;
  isPlaylist: boolean;
  title: string;
}> = ({ coverUrl, isPlaylist, title }) => {
  const [hasError, setHasError] = React.useState(false);
  const safeCoverUrl = coverUrl ? coverUrl.replace(/^http:\/\//i, 'https://') : undefined;

  return (
    <div
      style={{
        width: '52px',
        height: '52px',
        borderRadius: isPlaylist ? '6px' : '50%',
        overflow: 'hidden',
        flexShrink: 0,
        border: '1.5px solid var(--ink, #2d3436)',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
      }}
    >
      {safeCoverUrl && !hasError ? (
        <img
          src={safeCoverUrl}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span>{isPlaylist ? '🎵' : '👤'}</span>
      )}
    </div>
  );
};

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  isOpen,
  onClose,
  queryId,
  candidates,
  onSelectPlaylist,
  onSelectUserPlaylists,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const qqCandidates = candidates.filter((c) => c.platform === 'qqmusic');
  const neteaseCandidates = candidates.filter((c) => c.platform === 'netease');

  const renderCandidateCard = (item: DisambiguationItem, idx: number) => {
    const isPlaylist = item.type === 'playlist';
    const isQQ = item.platform === 'qqmusic';
    const accentColor = isQQ ? '#059669' : '#e11d48';
    const accentBg = isQQ ? '#f0fdf4' : '#fff1f2';

    return (
      <div
        key={`${item.platform}-${item.type}-${item.id}-${idx}`}
        onClick={() => {
          if (isPlaylist) {
            onSelectPlaylist(item.data as Playlist);
          } else {
            onSelectUserPlaylists(item.data as UserPlaylistsData);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isPlaylist) {
              onSelectPlaylist(item.data as Playlist);
            } else {
              onSelectUserPlaylists(item.data as UserPlaylistsData);
            }
          }
        }}
        data-testid={`disambiguation-card-${item.platform}-${item.type}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.75rem 1rem',
          backgroundColor: accentBg,
          border: `2px solid ${accentColor}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          marginBottom: '0.65rem',
          textAlign: 'left',
          width: '100%',
          boxSizing: 'border-box',
        }}
        className="disambiguation-card hand-drawn-border-subtle shadow-cutout-sm hover:scale-[1.01]"
      >
        {/* Cover / Avatar */}
        <CandidateArtwork
          coverUrl={item.coverUrl}
          isPlaylist={isPlaylist}
          title={item.title}
        />

        {/* Content Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                backgroundColor: isQQ ? '#bbf7d0' : '#fecaca',
                color: 'var(--ink, #2d3436)',
                border: '1px solid var(--ink, #2d3436)',
              }}
            >
              {isPlaylist ? `📑 ${t.disambiguation.typePlaylist}` : `👤 ${t.disambiguation.typeUser}`}
            </span>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '1.02rem',
                color: 'var(--ink, #2d3436)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={item.title}
            >
              {item.title}
            </span>
          </div>

          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--ink-secondary, #636e72)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.subtitle || ''}
            {item.count !== undefined && (
              <span>
                {item.subtitle ? ' · ' : ''}
                {item.count}{' '}
                {isPlaylist ? t.disambiguation.trackCountSuffix : t.disambiguation.playlistCountSuffix}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          tabIndex={-1}
          style={{
            flexShrink: 0,
            padding: '0.35rem 0.75rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            borderRadius: '6px',
            border: '1.5px solid var(--ink, #2d3436)',
            backgroundColor: '#ffffff',
            color: 'var(--ink, #2d3436)',
            cursor: 'pointer',
            pointerEvents: 'none',
          }}
          className="shadow-cutout-sm"
        >
          {isPlaylist ? t.disambiguation.selectPlaylistAction : t.disambiguation.selectUserAction} →
        </button>
      </div>
    );
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '0.45rem 1.25rem',
          fontSize: '0.95rem',
          border: '1.5px solid var(--ink, #2d3436)',
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          color: 'var(--ink, #2d3436)',
          cursor: 'pointer',
        }}
        className="font-marker shadow-cutout-sm hover:bg-neutral-100"
      >
        {t.disambiguation.cancel}
      </button>
    </div>
  );

  return (
    <PaperModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.disambiguation.modalTitle}
      footer={footer}
      testId="disambiguation-modal"
    >
      <div data-clarity-mask="true" style={{ position: 'relative', minWidth: '320px', maxWidth: '580px', width: '100%' }}>
        {/* Top prompt */}
        <p
          style={{
            margin: '0 0 1.25rem 0',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            color: 'var(--ink, #2d3436)',
          }}
        >
          {t.disambiguation.description.replace('{id}', queryId)}
        </p>

        {/* QQ Music Group */}
        {qqCandidates.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.65rem',
              }}
            >
              <Sticker
                color="green"
                rotateDeg={-0.8}
                as="span"
                style={{ padding: '0.25rem 0.85rem', display: 'inline-block', fontWeight: 600 }}
              >
                {t.disambiguation.platformQQ}
              </Sticker>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  borderBottom: '1px dashed var(--ink-secondary, #b2bec3)',
                }}
              />
            </div>
            {qqCandidates.map(renderCandidateCard)}
          </div>
        )}

        {/* NetEase Cloud Music Group */}
        {neteaseCandidates.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.65rem',
              }}
            >
              <Sticker
                color="red"
                rotateDeg={0.8}
                as="span"
                style={{ padding: '0.25rem 0.85rem', display: 'inline-block', fontWeight: 600 }}
              >
                {t.disambiguation.platformNetease}
              </Sticker>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  borderBottom: '1px dashed var(--ink-secondary, #b2bec3)',
                }}
              />
            </div>
            {neteaseCandidates.map(renderCandidateCard)}
          </div>
        )}
      </div>
    </PaperModal>
  );
};
