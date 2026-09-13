import React from 'react';
import { useTranslation } from '../../i18n';
import { FontSwitcher } from '../settings/FontSwitcher';
import { LanguageSwitcher } from '../settings/LanguageSwitcher';

export interface HeaderProps {
  onBrandClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBrandClick }) => {
  const { t } = useTranslation();

  return (
    <header
      className="journal-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        position: 'relative',
        zIndex: 60,
      }}
    >
      {/* Brand area */}
      <div
        onClick={onBrandClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          cursor: onBrandClick ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        <div
          className="hand-drawn-border"
          style={{
            width: '3rem',
            height: '3rem',
            backgroundColor: 'var(--highlight-yellow, #ffeaa7)',
            transform: 'rotate(-6deg)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.65rem',
            boxShadow: 'var(--sticker-shadow, 3px 3px 0 #2d3436)',
          }}
          aria-hidden="true"
        >
          ♫
        </div>
        <div>
          <h1
            className="font-marker"
            style={{
              fontSize: '2rem',
              lineHeight: 1.1,
              textDecoration: 'underline',
              textDecorationStyle: 'wavy',
              textDecorationColor: 'var(--margin-red, #ff8a80)',
              textUnderlineOffset: '4px',
              color: 'var(--ink, #2d3436)',
              margin: 0,
            }}
          >
            PlaylistOut
          </h1>
          <div
            className="font-handwriting"
            style={{
              fontSize: '1.1rem',
              color: '#636e72',
              marginTop: '-0.2rem',
            }}
          >
            {t.header.brandTagline}
          </div>
        </div>
      </div>

      {/* Settings & Links */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontFamily: 'var(--font-handwriting, cursive)',
          fontSize: '1.25rem',
        }}
      >
        <FontSwitcher />
        <LanguageSwitcher />

        <a
          href="https://github.com/LengxiQwQ/playlistout"
          target="_blank"
          rel="noopener noreferrer"
          className="header-github-link font-handwriting"
          aria-label="GitHub Repository"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            textDecoration: 'none',
            color: 'var(--ink, #2d3436)',
            fontWeight: 700,
            fontSize: '1.25rem',
            padding: '0.35rem 0.6rem',
            transition: 'transform 0.15s ease',
          }}
        >
          {t.header.github}
        </a>
      </div>
    </header>
  );
};
