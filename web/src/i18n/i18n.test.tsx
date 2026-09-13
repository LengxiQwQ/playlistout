import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useTranslation } from './LanguageContext';
import { LanguageSwitcher } from '../components/settings/LanguageSwitcher';
import { FontSwitcher } from '../components/settings/FontSwitcher';

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
    expect(screen.getByTestId('title-display')).toHaveTextContent('歌单带走。');
    expect(screen.getByTestId('formatted-display')).toHaveTextContent('共 42 首歌曲');
    expect(document.documentElement.lang).toBe('zh-CN');
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
    expect(localStorage.getItem('playlistout-language')).toBe('en-US');

    // Switch back to Chinese
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('lang-display')).toHaveTextContent('zh-CN');
    expect(localStorage.getItem('playlistout-language')).toBe('zh-CN');
  });
});

describe('FontSwitcher Component (Phase 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.removeAttribute('data-font-preset');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders with curated presets and allows selecting a font preset', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: /原稿字体/ });
    expect(button).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Select Patrick Hand (named 经典硬笔 in Chinese)
    const patrickOpt = screen.getByRole('option', { name: /经典硬笔/ });
    fireEvent.click(patrickOpt);

    // Verify preset applied to body and saved in localStorage
    expect(document.body.dataset.fontPreset).toBe('patrick');
    expect(localStorage.getItem('playlistout-font-preset')).toBe('patrick');
  });

  it('switches instantly to built-in presets without network injection', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: /原稿字体/ });
    fireEvent.click(button);

    const originalOpt = screen.getByRole('option', { name: /原稿字体/ });
    fireEvent.click(originalOpt);

    expect(document.body.dataset.fontPreset).toBe('original');
    expect(localStorage.getItem('playlistout-font-preset')).toBe('original');
    // Verify no external link injected for built-in original
    expect(document.getElementById('font-link-original')).toBeNull();
  });

  it('renders pure Chinese font preset names and sample preview in zh-CN', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    // In Chinese, button and sample preview are pure Chinese
    fireEvent.click(screen.getByRole('button', { name: /原稿字体/ }));
    expect(screen.getAllByText('音乐手账').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: /经典硬笔/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /毛笔手账/ })).toBeInTheDocument();
  });

  it('renders pure English font preset names and sample preview in en-US', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <FontSwitcher />
      </LanguageProvider>,
    );

    // In English, the button displays Original Draft
    expect(screen.getByRole('button', { name: /Original Draft/i })).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Original Draft/i }));

    // In English, presets are purely English and sample preview is Music Journal
    expect(screen.getByRole('option', { name: /Chinese Journal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Patrick Hand/i })).toBeInTheDocument();
    expect(screen.getAllByText('Music Journal').length).toBeGreaterThan(0);
  });
});
