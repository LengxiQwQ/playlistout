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
          <span
            className="font-note hero-doodle-right mc-splash"
            aria-hidden="true"
          >
            {t.hero.noLoginDoodle}
          </span>
        </span>
      </h2>
    </section>
  );
};
