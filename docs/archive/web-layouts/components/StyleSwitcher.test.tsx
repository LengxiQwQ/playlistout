import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../i18n';
import { StyleProvider, STYLE_STORAGE_KEY } from './StyleContext';
import { StyleSwitcher } from './StyleSwitcher';

describe('StyleSwitcher Component', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.layoutDemo;
  });

  it('defaults to Corkboard Bento Collage (b) and switches across all 5 styles with persistence', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <StyleProvider>
          <StyleSwitcher />
        </StyleProvider>
      </LanguageProvider>,
    );

    const btn = screen.getByRole('button', { name: /风格: 软木拼贴/ });
    expect(btn).toBeInTheDocument();
    expect(document.documentElement.dataset.layoutDemo).toBe('b');

    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('option', { name: /晴空便签/ }));
    expect(document.documentElement.dataset.layoutDemo).toBe('d');
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('d');

    fireEvent.click(screen.getByRole('button', { name: /风格: 晴空便签/ }));
    fireEvent.click(screen.getByRole('option', { name: /活页手帐/ }));
    expect(document.documentElement.dataset.layoutDemo).toBe('c');
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('c');

    fireEvent.click(screen.getByRole('button', { name: /风格: 活页手帐/ }));
    fireEvent.click(screen.getByRole('option', { name: /旧版手帐/ }));
    expect(document.documentElement.dataset.layoutDemo).toBeUndefined();
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('legacy');
  });

  it('restores saved style from localStorage on mount', () => {
    localStorage.setItem(STYLE_STORAGE_KEY, 'a');

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <StyleProvider>
          <StyleSwitcher />
        </StyleProvider>
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: /风格: 贴纸日记/ })).toBeInTheDocument();
    expect(document.documentElement.dataset.layoutDemo).toBe('a');
  });
});
