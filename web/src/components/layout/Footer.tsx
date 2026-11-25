import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { SponsorButton } from './SponsorButton';
import { AuthorCard } from './AuthorCard';
import { AUTHOR_AVATAR_URL } from '../../constants/author';
import { Reveal } from '../motion/Reveal';
import { useViewportLayout } from '../../hooks/useViewportLayout';

export interface FooterProps {
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  const { t } = useTranslation();
  const [isAuthorOpen, setIsAuthorOpen] = useState(false);
  const authorContainerRef = useRef<HTMLDivElement>(null);
  const isMobileModal = useViewportLayout() === 'b';

  // Preload author avatar immediately so clicking Author pill never flashes white
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = AUTHOR_AVATAR_URL;
    }
  }, []);

  // Close on outside click for the Author pill container (desktop dropup only; mobile uses backdrop onClick)
  useEffect(() => {
    if (!isAuthorOpen || isMobileModal) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (authorContainerRef.current?.contains(target)) return;
      if (target.closest('.author-dropup-card')) return;
      setIsAuthorOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isAuthorOpen, isMobileModal]);

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
          height: 'var(--ruled-line-height, 38px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          margin: 0,
          marginBottom: 'calc(var(--ruled-line-height, 38px) * 1)',
        }}
      >
        <Reveal
          effect="draw-line"
          delay={0}
          className="footer-red-line"
          style={{
            flex: 1,
            height: '2px',
            backgroundColor: 'var(--margin-red, #f4a7b9)',
            opacity: 0.9,
            borderRadius: '2px',
          }}
        />
        <Reveal
          as="span"
          effect="fade-up"
          delay={80}
          className="footer-end-badge font-note"
          style={{
            position: 'relative',
            backgroundColor: 'transparent',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: '0 0.5rem',
            color: 'var(--margin-red, #f4a7b9)',
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
        </Reveal>
        <Reveal
          effect="draw-line"
          delay={0}
          className="footer-red-line"
          style={{
            flex: 1,
            height: '2px',
            backgroundColor: 'var(--margin-red, #f4a7b9)',
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
        <Reveal
          effect="fade-up"
          delay={150}
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
            <span
              className="footer-brand-logo-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                border: '1.5px dashed var(--margin-red, #f4a7b9)',
                borderRadius: '8px',
                backgroundColor: 'var(--paper-white, #fffdf8)',
                boxShadow: '1.5px 2px 0 var(--shadow-ink)',
                transform: 'rotate(-2deg)',
              }}
            >
              <img
                src="/logo-64.png"
                srcSet="/logo-64.png 1x, /logo-128.png 2x"
                alt="Playlist Out Logo"
                width={30}
                height={30}
                style={{
                  width: '1.7rem',
                  height: '1.7rem',
                  objectFit: 'contain',
                  userSelect: 'none',
                  flexShrink: 0,
                  display: 'block',
                }}
              />
            </span>
            <span
              className="font-marker footer-brand-title"
              style={{
                fontSize: '1.65rem',
                lineHeight: 'var(--ruled-line-height, 38px)',
                color: 'var(--ink, #5a4a42)',
              }}
            >
              Playlist Out
            </span>
          </div>
        </Reveal>

        {/* Tagline (Row height: 38px) */}
        <Reveal
          effect="fade-up"
          delay={200}
          className="footer-tagline-row"
          style={{
            minHeight: 'var(--ruled-line-height, 38px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0,
          }}
        >
          <p
            className="font-handwriting footer-tagline-text"
            style={{
              fontSize: '1.3rem',
              color: 'var(--ink-light, #8a7569)',
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            {t.footer.drawnBy}
          </p>
        </Reveal>

        {/* Action Link Pills (height: 76px = 2 rows) */}
        <Reveal
          stagger
          effect="fade-up"
          delay={250}
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
            data-reveal-item=""
            className="ui-hitbox sticker-hitbox font-handwriting footer-pill-link footer-pill-mint"
            style={{
              textDecoration: 'none',
              ['--i' as any]: 0,
            }}
          >
            <span
              className="ui-face sticker sticker-face footer-pill-face"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--ink, #5a4a42)',
                lineHeight: 1.2,
              }}
            >
              <span>{t.footer.githubLink}</span>
              <span style={{ fontSize: '0.85rem' }}>↗</span>
            </span>
          </a>

          <div
            ref={authorContainerRef}
            data-reveal-item=""
            className="author-container"
            style={{ position: 'relative', display: 'inline-block', ['--i' as any]: 1 }}
          >
            <button
              type="button"
              onClick={() => setIsAuthorOpen(!isAuthorOpen)}
              aria-haspopup="dialog"
              aria-expanded={isAuthorOpen}
              aria-label={t.footer.authorLink}
              className={`ui-hitbox sticker-hitbox font-handwriting footer-pill-link footer-pill-lemon ${isAuthorOpen ? 'is-active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <span
                className="ui-face sticker sticker-face footer-pill-face"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.85rem',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: 'var(--ink, #5a4a42)',
                  lineHeight: 1.2,
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
              </span>
            </button>

            <AuthorCard
              isOpen={isAuthorOpen}
              onClose={() => setIsAuthorOpen(false)}
            />
          </div>

          <div data-reveal-item="" style={{ display: 'inline-block', ['--i' as any]: 2 }}>
            <SponsorButton />
          </div>

          <button
            type="button"
            data-reveal-item=""
            onClick={onOpenPrivacy}
            className="ui-hitbox sticker-hitbox font-handwriting footer-pill-link footer-pill-sky"
            style={{
              cursor: 'pointer',
              ['--i' as any]: 3,
            }}
          >
            <span
              className="ui-face sticker sticker-face footer-pill-face"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--ink, #5a4a42)',
                lineHeight: 1.2,
              }}
            >
              {t.footer.privacyLink}
            </span>
          </button>

          <a
            href="https://github.com/LengxiQwQ/playlistout/issues"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal-item=""
            className="ui-hitbox sticker-hitbox font-handwriting footer-pill-link footer-pill-taro"
            style={{
              textDecoration: 'none',
              ['--i' as any]: 4,
            }}
          >
            <span
              className="ui-face sticker sticker-face footer-pill-face"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--ink, #5a4a42)',
                lineHeight: 1.2,
              }}
            >
              <span>{t.footer.issuesLink}</span>
              <span style={{ fontSize: '0.85rem' }}>↗</span>
            </span>
          </a>
        </Reveal>

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
            className="footer-legal-line"
            style={{
              minHeight: 'var(--ruled-line-height, 38px)',
              lineHeight: 1.5,
              fontSize: '0.85rem',
              color: '#a8968b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              width: '100%',
              padding: '0.3rem 0.5rem',
              gap: '0.25rem',
            }}
          >
            <span>{t.footer.copyrightPrefix}</span>
            <a
              href="https://github.com/LengxiQwQ"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-license-link"
            >
              LengxiQwQ
            </a>
            <span>{t.footer.licensePrefix}</span>
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
            className="footer-disclaimer-line"
            style={{
              minHeight: 'var(--ruled-line-height, 38px)',
              lineHeight: 1.5,
              fontSize: '0.8rem',
              color: '#b8a79c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.3rem 0.5rem',
            }}
          >
            {t.footer.disclaimer}
          </div>
        </div>
      </div>
    </footer>
  );
};
