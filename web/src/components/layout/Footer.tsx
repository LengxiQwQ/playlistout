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
        marginTop: '6rem',
        paddingBottom: '2.5rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        className="font-note"
        style={{
          fontSize: '1.75rem',
          color: '#636e72',
          transform: 'rotate(-1deg)',
        }}
      >
        {t.footer.drawnBy}
      </div>

      <div
        className="font-handwriting"
        style={{
          fontSize: '1.15rem',
          color: '#8a8f92',
          marginTop: '0.4rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span>{t.footer.copyright}</span>
        <span>·</span>
        <a
          href="https://github.com/LengxiQwQ/playlistout"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          {t.footer.githubLink}
        </a>
        <span>·</span>
        <button
          type="button"
          onClick={onOpenPrivacy}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'none',
          }}
        >
          {t.footer.privacyLink}
        </button>
      </div>
    </footer>
  );
};
