import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { SponsorButton } from './SponsorButton';
import { AuthorCard } from './AuthorCard';

export interface FooterProps {
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  const { t } = useTranslation();
  const [isAuthorOpen, setIsAuthorOpen] = useState(false);
  const authorContainerRef = useRef<HTMLDivElement>(null);

  // Close on outside click for the Author pill container
  useEffect(() => {
    if (!isAuthorOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (authorContainerRef.current && !authorContainerRef.current.contains(e.target as Node)) {
        setIsAuthorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAuthorOpen]);

  return (
    <footer
      className="journal-footer"
      style={{
        width: '100%',
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginTop: 0,
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
          height: 'calc(var(--ruled-line-height, 38px) * 2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          margin: 0,
          marginBottom: 'calc(var(--ruled-line-height, 38px) * 1)',
        }}
      >
        <div
          className="footer-red-line"
          style={{
            flex: 1,
            height: '2px',
            backgroundColor: 'var(--margin-red, #ff8a80)',
            opacity: 0.9,
            borderRadius: '2px',
          }}
        />
        <span
          className="footer-end-badge font-note"
          style={{
            position: 'relative',
            backgroundColor: 'transparent',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: '0 0.5rem',
            color: 'var(--margin-red, #ff8a80)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          ✦ END OF PAGE ✦
        </span>
        <div
          className="footer-red-line"
          style={{
            flex: 1,
            height: '2px',
            backgroundColor: 'var(--margin-red, #ff8a80)',
            opacity: 0.9,
            borderRadius: '2px',
          }}
        />
      </div>

      <div
        className="footer-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 'var(--search-note-width, 980px)',
          margin: '0 auto',
          padding: 0,
        }}
      >
        {/* Brand PlaylistOut (Row height: 38px) */}
        <div
          style={{
            height: 'var(--ruled-line-height, 38px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <img
              src="/logo-64.png"
              srcSet="/logo-64.png 1x, /logo-128.png 2x"
              alt="PlaylistOut Logo"
              width={30}
              height={30}
              style={{
                width: '1.85rem',
                height: '1.85rem',
                objectFit: 'contain',
                userSelect: 'none',
                flexShrink: 0,
              }}
            />
            <span
              className="font-marker"
              style={{
                fontSize: '1.65rem',
                lineHeight: 'var(--ruled-line-height, 38px)',
                color: 'var(--ink, #2d3436)',
              }}
            >
              PlaylistOut
            </span>
            {t.footer.brandChineseName && (
              <span
                className="font-note"
                style={{
                  fontSize: '1.15rem',
                  color: 'var(--ink-light, #636e72)',
                  fontWeight: 600,
                  marginLeft: '0.45rem',
                }}
              >
                · {t.footer.brandChineseName}
              </span>
            )}
          </div>
        </div>

        {/* Tagline (Row height: 38px) */}
        <div
          style={{
            height: 'var(--ruled-line-height, 38px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0,
          }}
        >
          <p
            className="font-handwriting"
            style={{
              fontSize: '1.3rem',
              color: 'var(--ink-light, #636e72)',
              lineHeight: 'var(--ruled-line-height, 38px)',
              margin: 0,
            }}
          >
            {t.footer.drawnBy}
          </p>
        </div>

        {/* Action Link Pills (height: 76px = 2 rows) */}
        <div
          className="footer-nav"
          style={{
            minHeight: 'calc(var(--ruled-line-height, 38px) * 2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.9rem',
            flexWrap: 'wrap',
            margin: 0,
            padding: 0,
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

          <div
            ref={authorContainerRef}
            className="author-container"
            style={{ position: 'relative', display: 'inline-block' }}
          >
            <button
              type="button"
              onClick={() => setIsAuthorOpen(!isAuthorOpen)}
              aria-haspopup="dialog"
              aria-expanded={isAuthorOpen}
              aria-label={t.footer.authorCardTitle}
              className={`sticker font-handwriting footer-pill-link ${isAuthorOpen ? 'is-active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: isAuthorOpen ? 'var(--highlight-yellow, #ffeaa7)' : '#ffffff',
                padding: '0.35rem 0.85rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--ink, #2d3436)',
                borderRadius: '6px',
                cursor: 'pointer',
                lineHeight: 1.2,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t.footer.authorLink}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  marginLeft: '0.1rem',
                  transform: isAuthorOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                ▲
              </span>
            </button>

            <AuthorCard
              isOpen={isAuthorOpen}
              onClose={() => setIsAuthorOpen(false)}
            />
          </div>

          <SponsorButton />

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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: 0,
            padding: 0,
          }}
        >
          <div
            style={{
              height: 'var(--ruled-line-height, 38px)',
              lineHeight: 'var(--ruled-line-height, 38px)',
              fontSize: '0.85rem',
              color: '#8a8f92',
            }}
          >
            <span>{t.footer.copyrightPrefix}</span>
            <a
              href={t.footer.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-license-link"
            >
              {t.footer.licenseText}
            </a>
          </div>
          <div
            style={{
              height: 'var(--ruled-line-height, 38px)',
              lineHeight: 'var(--ruled-line-height, 38px)',
              fontSize: '0.8rem',
              color: '#a0a5a8',
            }}
          >
            {t.footer.disclaimer}
          </div>
        </div>
      </div>
    </footer>
  );
};
