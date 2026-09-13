import React from 'react';
import { useTranslation } from '../../i18n';

export const Hero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="journal-hero"
      style={{
        paddingTop: '2rem',
        paddingBottom: '1.5rem',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Decorative notebook annotations */}
      <div
        className="font-note hero-doodle-left"
        style={{
          position: 'absolute',
          left: '2rem',
          top: '1.5rem',
          fontSize: '1.75rem',
          color: '#a0a5a8',
          transform: 'rotate(-8deg)',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {t.hero.pasteDoodle}
      </div>

      <div
        className="font-note hero-doodle-right"
        style={{
          position: 'absolute',
          right: '2.5rem',
          top: '2.5rem',
          fontSize: '1.75rem',
          color: '#a0a5a8',
          transform: 'rotate(6deg)',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {t.hero.noLoginDoodle}
      </div>

      <p
        className="font-handwriting"
        style={{
          fontSize: '1.65rem',
          color: '#636e72',
          marginBottom: '0.4rem',
        }}
      >
        {t.hero.subtitle}
      </p>

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
