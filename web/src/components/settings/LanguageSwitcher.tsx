import React from 'react';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

const GlobeIcon: React.FC = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const LanguageSwitcher: React.FC = () => {
  const { language, toggleLanguage } = useTranslation();

  return (
    <Sticker
      type="button"
      color="blue"
      rotateDeg={-1}
      onClick={toggleLanguage}
      className="header-lang-btn"
      aria-label="Toggle language / 切换语言"
      title={language === 'zh-CN' ? 'Switch to English' : '切换为中文'}
      style={{
        padding: '0.42rem 0.85rem',
        fontSize: '1.05rem',
        fontFamily: 'var(--font-handwriting, cursive)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      <GlobeIcon />
      <span style={{ color: 'var(--text)' }}>
        {language === 'zh-CN' ? '中' : 'EN'}
      </span>
    </Sticker>
  );
};
