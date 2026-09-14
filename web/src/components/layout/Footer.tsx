import React from 'react';
import { useTranslation } from '../../i18n';

export interface FooterProps {
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  const { t } = useTranslation();

  return (
    <footer
      className="journal-footer"
      style={{
        marginTop: '3rem',
        paddingBottom: '0.5rem',
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Red margin divider line indicating end of page */}
      <div
        className="footer-page-boundary"
        role="separator"
        aria-label="End of page"
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.75rem',
        }}
      >
        <div
          className="footer-red-line"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'var(--margin-red, #ff8a80)',
            opacity: 0.85,
            borderRadius: '2px',
          }}
        />
        <span
          className="footer-end-badge font-note"
          style={{
            position: 'relative',
            backgroundColor: 'var(--paper, #f6f1e5)',
            padding: '0 1.15rem',
            color: 'var(--margin-red, #ff8a80)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          ✦ END OF PAGE ✦
        </span>
      </div>

      <div
        className="footer-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          width: '100%',
          maxWidth: 'var(--search-note-width, 980px)',
          margin: '0 auto',
        }}
      >
        {/* Brand & Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <div
              className="hand-drawn-border-subtle"
              style={{
                width: '2.1rem',
                height: '2.1rem',
                backgroundColor: 'var(--highlight-yellow, #ffeaa7)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.2rem',
                borderRadius: '5px',
                transform: 'rotate(-4deg)',
                userSelect: 'none',
                boxShadow: '2px 2px 0 #2d3436',
              }}
              aria-hidden="true"
            >
              ♫
            </div>
            <span
              className="font-marker"
              style={{
                fontSize: '1.6rem',
                lineHeight: 1,
                color: 'var(--ink, #2d3436)',
              }}
            >
              PlaylistOut
            </span>
          </div>

          <p
            className="font-handwriting"
            style={{
              fontSize: '1.25rem',
              color: 'var(--ink-light, #636e72)',
              margin: '0.15rem 0 0',
              lineHeight: 1.3,
            }}
          >
            {t.footer.drawnBy}
          </p>
        </div>

        {/* Action Link Pills */}
        <div
          className="footer-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="https://github.com/LengxiQwQ/playlistout"
            target="_blank"
            rel="noopener noreferrer"
            className="sticker font-handwriting footer-pill-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            <span>{t.footer.githubLink}</span>
            <span style={{ fontSize: '0.85rem' }}>↗</span>
          </a>

          <a
            href="https://github.com/LengxiQwQ/playlistout/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="sticker font-handwriting footer-pill-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            <span>{t.footer.licenseLink}</span>
            <span style={{ fontSize: '0.85rem' }}>↗</span>
          </a>

          <button
            type="button"
            onClick={onOpenPrivacy}
            className="sticker font-handwriting footer-pill-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--ink, #2d3436)',
              borderRadius: '6px',
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            {t.footer.privacyLink}
          </button>

          <a
            href="https://github.com/LengxiQwQ/playlistout/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="sticker font-handwriting footer-pill-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            <span>{t.footer.releasesLink}</span>
            <span style={{ fontSize: '0.85rem' }}>↗</span>
          </a>

          <a
            href="https://github.com/LengxiQwQ/playlistout/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="sticker font-handwriting footer-pill-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--ink, #2d3436)',
              borderRadius: '6px',
              lineHeight: 1.2,
            }}
          >
            <span>{t.footer.issuesLink}</span>
            <span style={{ fontSize: '0.85rem' }}>↗</span>
          </a>
        </div>

        {/* Copyright & Legal Information (Clean Sans-Serif, High Readability) */}
        <div
          className="footer-legal"
          style={{
            fontFamily: 'var(--font-sans, sans-serif)',
            fontSize: '0.85rem',
            color: '#8a8f92',
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          <div>{t.footer.copyright}</div>
          <div style={{ fontSize: '0.8rem', color: '#a0a5a8' }}>
            {t.footer.disclaimer}
          </div>
        </div>
      </div>
    </footer>
  );
};
