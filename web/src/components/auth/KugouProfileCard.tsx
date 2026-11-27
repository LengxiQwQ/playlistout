import React from 'react';
import type { KugouUserProfile } from '../../api/client';
import { useTranslation } from '../../i18n';
import { getKugouAuth } from '../../utils/kugouAuth';

export interface KugouProfileCardProps {
  profile: KugouUserProfile | null;
  profileLoading: boolean;
}

export const KugouProfileCard: React.FC<KugouProfileCardProps> = ({
  profile,
  profileLoading,
}) => {
  const { t } = useTranslation();

  return (
    <div
      data-testid="kugou-profile-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        padding: '0.9rem 1rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--tint-sky-line)',
        borderRadius: '10px',
        textAlign: 'left',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          flex: '0 0 64px',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'var(--tint-sky-bg)',
          color: 'var(--tint-sky-fg)',
          fontSize: '1.55rem',
          fontWeight: 700,
          border: '2px solid var(--tint-sky-line)',
        }}
        aria-label={profile?.nickname || t.kugouAuth.profileFallbackName}
      >
        ♪
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.nickname}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="sync"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: profile?.signature ? '0.3rem' : '0.15rem',
          }}
        >
          <strong
            className="font-sans"
            style={{
              color: 'var(--tint-sky-fg)',
              fontSize: '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '210px',
            }}
            title={profile?.nickname}
          >
            {profileLoading
              ? t.kugouAuth.profileLoading
              : profile?.nickname || t.kugouAuth.profileFallbackName}
          </strong>
        </div>

        {profile?.signature ? (
          <div
            className="font-sans"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              marginBottom: '0.25rem',
              overflowWrap: 'anywhere',
            }}
          >
            {profile.signature}
          </div>
        ) : null}

        <div className="font-sans" style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
          {t.kugouAuth.profileUserIdLabel}：{profile?.userId || getKugouAuth()?.userid || '—'}
        </div>
      </div>
    </div>
  );
};

export default KugouProfileCard;
