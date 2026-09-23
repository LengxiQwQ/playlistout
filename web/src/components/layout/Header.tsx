import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { FontSwitcher } from '../settings/FontSwitcher';
import { LanguageSwitcher } from '../settings/LanguageSwitcher';
import { MobileSettingsDrawer } from '../settings/MobileSettingsDrawer';

export interface HeaderProps {
  onBrandClick?: () => void;
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

export const Header: React.FC<HeaderProps> = ({ onBrandClick }) => {
  const { t } = useTranslation();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <header
      className="journal-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 'calc(var(--ruled-line-height, 38px) * 2)',
        paddingTop: 0,
        paddingBottom: 0,
        position: 'relative',
        zIndex: 60,
      }}
    >
      {/* Brand area: separate icon link and brand text */}
      <div
        className="header-brand-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <a
          href="https://playlistout.lengxiqwq.com"
          className="header-logo-link"
          aria-label={t.header.brandTitle}
          title={t.header.brandTitle}
        >
          <img
            src="/logo-128.png"
            srcSet="/logo-128.png 1x, /logo-256.png 2x"
            alt={t.header.brandTitle}
            className="header-logo-img"
            width={52}
            height={52}
          />
        </a>

        <div
          onClick={onBrandClick}
          className={onBrandClick ? 'header-brand-text' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            cursor: onBrandClick ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          <h1 className="font-marker header-brand-title">
            {t.header.brandTitle}
          </h1>
          <div className="header-brand-tagline font-handwriting">
            {t.header.brandTagline}
          </div>
        </div>
      </div>

      {/* Settings & Links */}
      <div
        className="header-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        {/* Desktop-only: Star on GitHub */}
        <a
          href="https://github.com/LengxiQwQ/playlistout"
          target="_blank"
          rel="noopener noreferrer"
          className="header-github-btn desktop-only"
          aria-label="Star on GitHub"
          title="Star on GitHub"
        >
          <GitHubIcon size={20} />
          <span>{t.header.github}</span>
        </a>

        {/* Desktop-only: Font Switcher Dropdown */}
        <div className="desktop-only">
          <FontSwitcher />
        </div>

        {/* Always visible: Language Switcher */}
        <LanguageSwitcher />

        {/* Mobile-only: Hand-drawn Settings Drawer Button */}
        <button
          type="button"
          className="sticker font-handwriting header-drawer-btn mobile-only"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label={t.header.mobileDrawerTitle}
          title={t.header.mobileDrawerTitle}
        >
          <span className="drawer-btn-icon" aria-hidden="true">✎</span>
          <span>{t.header.mobileMenu}</span>
        </button>

        {/* Mobile Drawer Modal */}
        <MobileSettingsDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
        />
      </div>
    </header>
  );
};
