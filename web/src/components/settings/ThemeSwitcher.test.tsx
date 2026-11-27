import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';

describe('ThemeSwitcher Component', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('renders theme switcher in Chinese and toggles theme on click', () => {
    render(
      <ThemeProvider defaultTheme="auto">
        <LanguageProvider defaultLanguage="zh-CN">
          <ThemeSwitcher />
        </LanguageProvider>
      </ThemeProvider>
    );

    const btn = screen.getByRole('button', { name: /外观模式：自动/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('自动');

    // Click to cycle to dark
    fireEvent.click(btn);
    expect(btn).toHaveTextContent('深色');
    expect(btn).toHaveAttribute('aria-label', expect.stringContaining('深色'));

    // Click to cycle to light
    fireEvent.click(btn);
    expect(btn).toHaveTextContent('浅色');
    expect(btn).toHaveAttribute('aria-label', expect.stringContaining('浅色'));
  });

  it('renders theme switcher in English', () => {
    render(
      <ThemeProvider defaultTheme="auto">
        <LanguageProvider defaultLanguage="en-US">
          <ThemeSwitcher />
        </LanguageProvider>
      </ThemeProvider>
    );

    const btn = screen.getByRole('button', { name: /Theme: Auto/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Auto');
  });
});
