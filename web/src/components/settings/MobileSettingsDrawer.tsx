import React from 'react';
import { PaperModal } from '../ui/PaperModal';
import { useTranslation } from '../../i18n';
import { JOURNAL_STYLES, useJournalStyle } from './StyleContext';

export interface MobileSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const GitHubIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    height={size}
    width={size}
    viewBox="2 2 44 44"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M29.344 30.477c2.404-.5 4.585-1.366 6.28-2.638C38.52 25.668 40 22.314 40 19c0-2.324-.881-4.494-2.407-6.332c-.85-1.024 1.636-8.667-.573-7.638c-2.21 1.03-5.45 3.308-7.147 2.805A20.7 20.7 0 0 0 24 7c-1.8 0-3.532.223-5.147.634C16.505 8.232 14.259 6 12 5.03c-2.26-.97-1.026 6.934-1.697 7.765C8.84 14.605 8 16.73 8 19c0 3.314 1.79 6.668 4.686 8.84c1.93 1.446 4.348 2.368 7.054 2.822m0 0q-1.738 1.913-1.738 3.632v8.717m11.343-12.534q1.646 2.16 1.646 3.88v8.654M6 31.216q1.349.165 2 1.24c.652 1.074 3.074 5.062 5.825 5.062h4.177" />
  </svg>
);

export const MobileSettingsDrawer: React.FC<MobileSettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const { styleId, setStyleId } = useJournalStyle();

  return (
    <PaperModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.header.mobileDrawerTitle}
      testId="mobile-settings-drawer"
      footer={
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="sticker font-handwriting"
            style={{
              backgroundColor: '#ffffff',
              padding: '0.45rem 1.25rem',
              fontSize: '1.1rem',
              cursor: 'pointer',
              border: '2px solid var(--ink-line)',
              borderRadius: '8px',
            }}
          >
            {t.header.mobileClose}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Journal Page Styles */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span
              className="font-marker"
              style={{
                fontSize: '1.25rem',
                color: 'var(--ink, #5a4a42)',
              }}
            >
              🎨 {t.header.mobileDrawerStyleTitle}
            </span>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.15rem',
              color: '#8a7569',
              marginBottom: '0.9rem',
              lineHeight: 1.2,
            }}
          >
            {t.header.mobileDrawerStyleDesc}
          </div>

          <div className="mobile-font-grid mobile-style-grid">
            {JOURNAL_STYLES.map((opt) => {
              const isSelected = opt.id === styleId;
              const name = t.styles[opt.nameKey];
              const desc = t.styles[opt.descKey];

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStyleId(opt.id)}
                  className={`mobile-font-card mobile-style-card sticker ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                  style={{ fontFamily: 'inherit' }}
                >
                  <div className="mobile-font-card-header">
                    <span className="mobile-font-index font-mono">{opt.index}</span>
                    <span className="mobile-font-name">{name}</span>
                    {isSelected && (
                      <span className="mobile-font-check" aria-label="Selected">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mobile-style-meta">
                    <span className="mobile-style-desc">{desc}</span>
                    <span className="style-option-swatches" aria-hidden="true">
                      {opt.swatches.map((hex, idx) => (
                        <span key={idx} className="style-swatch-dot" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Display Language */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span
              className="font-marker"
              style={{
                fontSize: '1.25rem',
                color: 'var(--ink, #5a4a42)',
              }}
            >
              🌐 {t.header.mobileDrawerLangTitle}
            </span>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.15rem',
              color: '#8a7569',
              marginBottom: '0.9rem',
              lineHeight: 1.2,
            }}
          >
            {t.header.mobileDrawerLangDesc}
          </div>

          <div className="mobile-lang-grid">
            <button
              type="button"
              onClick={() => setLanguage('zh-CN')}
              className={`mobile-lang-card sticker ${language === 'zh-CN' ? 'active' : ''}`}
              aria-pressed={language === 'zh-CN'}
            >
              <div className="mobile-lang-card-header">
                <span className="mobile-lang-code font-mono">ZH</span>
                {language === 'zh-CN' && (
                  <span className="mobile-lang-check" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <div className="mobile-lang-name font-handwriting">
                简体中文
              </div>
              <div className="mobile-lang-sub font-note">
                Chinese
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLanguage('en-US')}
              className={`mobile-lang-card sticker ${language === 'en-US' ? 'active' : ''}`}
              aria-pressed={language === 'en-US'}
            >
              <div className="mobile-lang-card-header">
                <span className="mobile-lang-code font-mono">EN</span>
                {language === 'en-US' && (
                  <span className="mobile-lang-check" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <div className="mobile-lang-name font-handwriting">
                English
              </div>
              <div className="mobile-lang-sub font-note">
                英文
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: Support & Links */}
        <div>
          <div
            className="font-marker"
            style={{
              fontSize: '1.25rem',
              color: 'var(--ink, #5a4a42)',
              marginBottom: '0.75rem',
            }}
          >
            ⭐ {t.header.mobileDrawerLinksTitle}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a
              href="https://github.com/LengxiQwQ/playlistout"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-drawer-link-card sticker font-handwriting"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--note-yellow, #fff4c7)',
                textDecoration: 'none',
                color: 'var(--ink, #5a4a42)',
                borderRadius: '8px',
                border: '2px solid var(--ink-line)',
                fontSize: '1.15rem',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GitHubIcon size={22} />
                <span>{t.header.github}</span>
              </div>
              <span style={{ fontSize: '1rem' }}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </PaperModal>
  );
};
