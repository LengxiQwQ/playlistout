import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useTranslation } from './LanguageContext';
import { LanguageSwitcher } from '../components/settings/LanguageSwitcher';
import { StyleSwitcher } from '../components/settings/StyleSwitcher';
import { StyleProvider } from '../components/settings/StyleContext';

const TestConsumer: React.FC = () => {
  const { t, language, format } = useTranslation();
  return (
    <div>
      <span data-testid="lang-display">{language}</span>
      <span data-testid="title-display">{t.hero.titleHighlight}</span>
      <span data-testid="formatted-display">{format(t.result.tracksCount, { count: 42 })}</span>
      <LanguageSwitcher />
    </div>
  );
};

describe('i18n and Language Switching (Phase 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides default zh-CN dictionary and updates document lang attribute', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang-display')).toHaveTextContent('zh-CN');
    expect(screen.getByTestId('title-display')).toHaveTextContent('歌单带走');
    expect(screen.getByTestId('formatted-display')).toHaveTextContent('共 42 首歌曲');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.title).toBe('把你的歌单带走 - 在线歌单导出工具');
  });

  it('switches between languages and persists choice in localStorage', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <TestConsumer />
      </LanguageProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle language/i });
    fireEvent.click(toggleBtn);

    // Switched to English
    expect(screen.getByTestId('lang-display')).toHaveTextContent('en-US');
    expect(screen.getByTestId('title-display')).toHaveTextContent('playlist out.');
    expect(screen.getByTestId('formatted-display')).toHaveTextContent('42 tracks');
    expect(document.documentElement.lang).toBe('en-US');
    expect(document.title).toBe('Playlist Out - Paste. Parse. Export.');
    expect(localStorage.getItem('playlistout-language')).toBe('en-US');

    // Switch back to Chinese
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('lang-display')).toHaveTextContent('zh-CN');
    expect(document.title).toBe('把你的歌单带走 - 在线歌单导出工具');
    expect(localStorage.getItem('playlistout-language')).toBe('zh-CN');
  });
});

describe('StyleSwitcher i18n Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.layoutDemo;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to 贴纸日记 (a) in zh-CN and renders all 5 Chinese style options', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <StyleProvider>
          <StyleSwitcher />
        </StyleProvider>
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: /贴纸日记/ });
    expect(button).toBeInTheDocument();
    expect(document.documentElement.dataset.layoutDemo).toBe('a');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: /贴纸日记/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /晴空便签/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /软木拼贴/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /活页手帐/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /旧版手帐/ })).toBeInTheDocument();
  });

  it('renders pure English style names in en-US and persists switched style', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <StyleProvider>
          <StyleSwitcher />
        </StyleProvider>
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: /Sticker Diary/i });
    fireEvent.click(button);

    const legacyOpt = screen.getByRole('option', { name: /Legacy Journal/i });
    fireEvent.click(legacyOpt);

    expect(document.documentElement.dataset.layoutDemo).toBeUndefined();
    expect(localStorage.getItem('playlistout-journal-style')).toBe('legacy');
  });
});
