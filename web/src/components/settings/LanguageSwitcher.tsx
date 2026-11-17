import React from 'react';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

export const LanguageSwitcher: React.FC = () => {
  const { language, toggleLanguage } = useTranslation();

  return (
    <Sticker
      type="button"
      color="white"
      rotateDeg={-1}
      onClick={toggleLanguage}
      aria-label="Toggle language / 切换语言"
      style={{
        padding: '0.42rem 0.85rem',
        fontSize: '1.05rem',
        fontFamily: 'var(--font-handwriting, cursive)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      <span style={{ color: language === 'zh-CN' ? 'var(--ink)' : '#b8a79c' }}>中</span>
      <span style={{ color: '#b8a79c' }}>/</span>
      <span style={{ color: language === 'en-US' ? 'var(--ink)' : '#b8a79c' }}>EN</span>
    </Sticker>
  );
};
