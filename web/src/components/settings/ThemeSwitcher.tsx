import React from 'react';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

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

  const icons = {
    auto: '🌓',
    light: '☀️',
    dark: '🌙',
  };

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
        gap: '4px',
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      <span style={{ fontSize: '0.9rem' }} aria-hidden="true">
        {icons[theme]}
      </span>
      <span style={{ color: 'var(--text)' }}>
        {labels[theme]}
      </span>
    </Sticker>
  );
};
