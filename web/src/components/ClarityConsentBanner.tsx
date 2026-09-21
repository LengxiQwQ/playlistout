import React from 'react';
import { createPortal } from 'react-dom';
import type { ClarityConsent } from '../analytics/clarity';
import { isCanonicalClarityHost } from '../analytics/clarity';
import { useTranslation } from '../i18n';

export interface ClarityConsentBannerProps {
  consent: ClarityConsent;
  onConsentChange: (consent: Exclude<ClarityConsent, null>) => void;
  onOpenPrivacy: () => void;
}

export const ClarityConsentBanner: React.FC<ClarityConsentBannerProps> = ({
  consent,
  onConsentChange,
  onOpenPrivacy,
}) => {
  const { t } = useTranslation();

  if (consent !== null || typeof window === 'undefined' || !isCanonicalClarityHost(window.location.hostname)) {
    return null;
  }

  const banner = (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label={t.privacy.consentBannerTitle}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '1rem',
        transform: 'translateX(-50%) rotate(-0.2deg)',
        width: 'min(92vw, 760px)',
        zIndex: 1200,
        backgroundColor: 'var(--paper, #fdfbf7)',
        border: '2px solid var(--ink, #2d3436)',
        boxShadow: '5px 5px 0 rgba(45, 52, 54, 0.22)',
        borderRadius: '8px',
        padding: '1rem 1.15rem',
      }}
    >
      <div className="font-marker" style={{ fontSize: '1.08rem', marginBottom: '0.35rem' }}>
        {t.privacy.consentBannerTitle}
      </div>
      <p className="font-sans" style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {t.privacy.consentBannerContent}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.85rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onConsentChange('denied')}
          className="font-mono"
          style={{
            border: '1.5px solid #64748b',
            background: '#ffffff',
            borderRadius: '6px',
            padding: '0.48rem 0.78rem',
            cursor: 'pointer',
          }}
        >
          {t.privacy.consentDecline}
        </button>
        <button
          type="button"
          onClick={() => onConsentChange('granted')}
          className="font-mono"
          style={{
            border: '1.5px solid var(--ink, #2d3436)',
            background: 'var(--ink, #2d3436)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.48rem 0.78rem',
            cursor: 'pointer',
          }}
        >
          {t.privacy.consentAllow}
        </button>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="font-mono"
          style={{
            border: 'none',
            background: 'transparent',
            textDecoration: 'underline',
            cursor: 'pointer',
            color: '#475569',
            padding: '0.48rem 0.25rem',
          }}
        >
          {t.privacy.consentLearnMore}
        </button>
      </div>
    </aside>
  );

  return typeof document !== 'undefined' ? createPortal(banner, document.body) : banner;
};
