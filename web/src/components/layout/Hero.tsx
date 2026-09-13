import React from 'react';
import { useTranslation } from '../../i18n';

export const Hero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="journal-hero">
      {/* Decorative notebook software slogan: Paste. Parse. Export. */}
      <div className="font-handwriting hero-doodle-left" aria-hidden="true">
        <span>♪ {t.hero.tagline}</span>
      </div>

      {/* Main Headline Title */}
      <h2 className="font-marker hero-title">
        {t.hero.titlePrefix}
        <span className="scribble-line">{t.hero.titleHighlight}</span>
      </h2>

      {/* Right Decorative Doodle: Minecraft-style Title Screen Splash */}
      <div
        className="mc-splash hero-doodle-right"
        title="Minecraft Splash!"
        aria-hidden="true"
      >
        {t.hero.noLoginDoodle}
      </div>
    </section>
  );
};
