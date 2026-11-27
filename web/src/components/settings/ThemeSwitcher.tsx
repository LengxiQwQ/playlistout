import React from 'react';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

const ThemeIcon: React.FC<{ mode: 'auto' | 'light' | 'dark' }> = ({ mode }) => {
  if (mode === 'light') {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    );
  }
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 8l4-4M12 13l6-6M12 18l5-5" />
    </svg>
  );
};

export const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language } = useTranslation();

  const isZh = language === 'zh-CN';

  const labels = {
    auto: isZh ? '自动' : 'Auto',
    dark: isZh ? '深色' : 'Dark',
    light: isZh ? '浅色' : 'Light',
  };

  const ariaLabel = isZh
    ? `外观模式：${labels[theme]}，点击切换`
    : `Theme: ${labels[theme]}, click to toggle`;

  return (
    <Sticker
      type="button"
      color="yellow"
      rotateDeg={1}
      onClick={toggleTheme}
      className="header-theme-btn"
      aria-label={ariaLabel}
      title={ariaLabel}
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
      <ThemeIcon mode={theme} />
      <span className="header-theme-label" style={{ color: 'var(--text)' }}>
        {labels[theme]}
      </span>
    </Sticker>
  );
};
