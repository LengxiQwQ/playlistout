import React from 'react';
import { useTranslation } from '../../i18n';

export const Hero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="journal-hero"
      style={{
        maxWidth: '1060px',
        margin: '0 auto',
        paddingTop: 0,
        paddingBottom: 'calc(var(--ruled-line-height, 38px) * 1.25)',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Desktop version: original position and size in top right */}
      <div
        className="font-note hero-doodle-right mc-splash desktop-only"
        aria-hidden="true"
      >
        {t.hero.noLoginDoodle}
      </div>

      <h2
        className="font-marker journal-hero-title"
        style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
          lineHeight: 'calc(var(--ruled-line-height, 38px) * 3)',
          color: 'var(--ink, #2d3436)',
          margin: 0,
        }}
      >
        {t.hero.titlePrefix}
        <span className="scribble-line">
          {t.hero.titleHighlight}
          {/* Mobile version: anchored to the top-right of the last character */}
          <span
            className="font-note hero-doodle-mobile mc-splash mobile-only"
            aria-hidden="true"
          >
            {t.hero.noLoginDoodle}
          </span>
        </span>
      </h2>
    </section>
  );
};
