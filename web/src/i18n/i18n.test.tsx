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

  it('renders with Chinese curated presets and defaults to 毛笔手账 in zh-CN', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    // In Chinese, default is 毛笔手账
    const button = screen.getByRole('button', { name: /毛笔手账/ });
    expect(button).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Select 快乐手绘
    const kuaileOpt = screen.getByRole('option', { name: /快乐手绘/ });
    fireEvent.click(kuaileOpt);

    // Verify preset applied to body and saved in localStorage
    expect(document.body.dataset.fontPreset).toBe('zh_kuaile');
    expect(localStorage.getItem('playlistout-font-preset-zh')).toBe('zh_kuaile');
  });

  it('switches to built-in presets without network injection', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: /毛笔手账/ });
    fireEvent.click(button);

    const origOpt = screen.getByRole('option', { name: /原稿经典/ });
    fireEvent.click(origOpt);

    expect(document.body.dataset.fontPreset).toBe('original');
    expect(localStorage.getItem('playlistout-font-preset-zh')).toBe('original');
  });

  it('renders pure Chinese font preset names and sample preview in zh-CN', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>,
    );

    // In Chinese, button and sample preview are pure Chinese
    fireEvent.click(screen.getByRole('button', { name: /毛笔手账/ }));
    expect(screen.getAllByText('音乐手账').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: /毛笔手账/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /快乐手绘/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /洒脱行书/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /随性写意/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /萌趣黄油/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /原稿经典/ })).toBeInTheDocument();
  });

  it('renders pure English font preset names and defaults to Original Journal in en-US', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <FontSwitcher />
      </LanguageProvider>,
    );

    // In English, the button displays Original Journal
    expect(screen.getByRole('button', { name: /Original Journal/i })).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Original Journal/i }));

    // In English, presets are purely English and sample preview is Music Journal
    expect(screen.getByRole('option', { name: /Patrick Hand/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Kalam Notes/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Schoolbell/i })).toBeInTheDocument();
    expect(screen.getAllByText('Music Journal').length).toBeGreaterThan(0);
  });
});
