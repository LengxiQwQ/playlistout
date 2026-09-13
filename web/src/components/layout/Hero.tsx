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
        paddingTop: '2.5rem',
        paddingBottom: '2rem',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        className="font-note hero-doodle-right mc-splash"
        style={{
          position: 'absolute',
          right: '2.5rem',
          top: '0.75rem',
          fontSize: '1.55rem',
          color: '#d97706',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {t.hero.noLoginDoodle}
      </div>

      <h2
        className="font-marker"
        style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
          lineHeight: 1.15,
          color: 'var(--ink, #2d3436)',
          margin: 0,
        }}
      >
        {t.hero.titlePrefix}
        <span className="scribble-line">{t.hero.titleHighlight}</span>
      </h2>
    </section>
  );
};
