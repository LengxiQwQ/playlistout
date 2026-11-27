import React from 'react';
import { useTranslation } from '../../i18n';
import { LanguageSwitcher } from '../settings/LanguageSwitcher';
import { ThemeSwitcher } from '../settings/ThemeSwitcher';

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

const DownloadIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    height={size}
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ onBrandClick }) => {
  const { t } = useTranslation();

  return (
    <header
      className="journal-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 'calc(var(--ruled-line-height, 38px) * 2)',
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
          href="https://playlistout.lengxiqwq.com/"
          className="ui-hitbox header-logo-link"
          aria-label="Playlist Out (playlistout.lengxiqwq.com)"
          title="https://playlistout.lengxiqwq.com/"
          onClick={(e) => {
            if (onBrandClick) {
              onBrandClick();
            }
            if (typeof window !== 'undefined') {
              if (window.location.href === 'https://playlistout.lengxiqwq.com/' || window.location.href === 'https://playlistout.lengxiqwq.com') {
                e.preventDefault();
                window.location.reload();
              }
            }
          }}
        >
          <span className="ui-face header-logo-face">
            <img
              src="/logo-128.png"
              srcSet="/logo-128.png 1x, /logo-256.png 2x"
              alt="Playlist Out Logo"
              className="header-logo-img"
              width={52}
              height={52}
            />
          </span>
        </a>

        <a
          href="https://playlistout.lengxiqwq.com/"
          className={`ui-hitbox header-brand-text ${onBrandClick ? 'is-clickable' : ''}`}
          onClick={(e) => {
            if (onBrandClick) {
              onBrandClick();
            }
            if (typeof window !== 'undefined') {
              if (window.location.href === 'https://playlistout.lengxiqwq.com/' || window.location.href === 'https://playlistout.lengxiqwq.com') {
                e.preventDefault();
                window.location.reload();
              }
            }
          }}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          aria-label="Playlist Out"
          title="https://playlistout.lengxiqwq.com/"
        >
          <span
            className="ui-face header-brand-text-face"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
            }}
          >
            <h1 className="font-marker header-brand-title">
              Playlist Out
            </h1>
            <div className="header-brand-tagline font-handwriting">
              {t.header.brandTagline}
            </div>
          </span>
        </a>
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
        {/* Desktop-only: Download Desktop App (GitHub Releases) */}
        <a
          href="https://github.com/LengxiQwQ/playlistout/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-hitbox header-desktop-btn desktop-only"
          aria-label={t.header.desktopBtn}
          title={t.header.desktopBtn}
        >
          <span className="ui-face header-desktop-btn-face">
            <DownloadIcon size={18} />
            <span>{t.header.desktopBtn}</span>
          </span>
        </a>

        {/* Mobile-only: Compact Download Button */}
        <a
          href="https://github.com/LengxiQwQ/playlistout/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-hitbox header-desktop-btn mobile-only"
          aria-label={t.header.downloadBtn}
          title={t.header.downloadBtn}
        >
          <span className="ui-face header-desktop-btn-face">
            <DownloadIcon size={15} />
            <span>{t.header.downloadBtn}</span>
          </span>
        </a>

        {/* Star on GitHub (full label on desktop, compact Star on mobile) */}
        <a
          href="https://github.com/LengxiQwQ/playlistout"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-hitbox header-github-btn"
          aria-label="Star on GitHub"
          title="Star on GitHub"
        >
          <span className="ui-face header-github-btn-face">
            <GitHubIcon size={18} />
            <span className="desktop-only">{t.header.github}</span>
            <span className="mobile-only">Star</span>
          </span>
        </a>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Language Switcher (shown directly on both desktop and mobile) */}
        <LanguageSwitcher />
      </div>
    </header>
  );
};
