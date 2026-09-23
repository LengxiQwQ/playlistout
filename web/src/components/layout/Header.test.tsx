import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { LanguageProvider } from '../../i18n';

describe('Header Component', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (document.body.dataset as any).fontPreset;
  });

  it('renders brand title and tagline with font-handwriting in Chinese', () => {
    const handleBrandClick = vi.fn();
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <Header onBrandClick={handleBrandClick} />
      </LanguageProvider>
    );

    const title = screen.getByRole('heading', { level: 1, name: 'Playlist Out' });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-marker');

    const tagline = screen.getByText('粘贴 · 解析 · 导出');
    expect(tagline).toBeInTheDocument();
    expect(tagline).toHaveClass('header-brand-tagline');
    expect(tagline).toHaveClass('font-handwriting');

    fireEvent.click(title);
    expect(handleBrandClick).toHaveBeenCalled();
  });

  it('renders brand tagline with font-handwriting in English', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <Header />
      </LanguageProvider>
    );

    const title = screen.getByRole('heading', { level: 1, name: 'Playlist Out' });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-marker');

    const tagline = screen.getByText('Paste. Parse. Export.');
    expect(tagline).toBeInTheDocument();
    expect(tagline).toHaveClass('header-brand-tagline');
    expect(tagline).toHaveClass('font-handwriting');
  });

  it('renders logo link, github star button, and switchers', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <Header />
      </LanguageProvider>
    );

    const logoImg = screen.getByAltText('Playlist Out Logo');
    expect(logoImg).toBeInTheDocument();

    const githubLink = screen.getByRole('link', { name: /Star on GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/LengxiQwQ/playlistout');

    expect(screen.getByRole('button', { name: /Original Journal/i })).toBeInTheDocument();

    const drawerBtn = screen.getByRole('button', { name: /Journal Drawer/i });
    expect(drawerBtn).toBeInTheDocument();
    expect(drawerBtn).toHaveClass('mobile-only');
  });

  it('opens mobile drawer when mobile drawer button is clicked and allows font switching', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <Header />
      </LanguageProvider>
    );

    const drawerBtn = screen.getByRole('button', { name: /手账百宝箱/i });
    fireEvent.click(drawerBtn);

    expect(screen.getByTestId('mobile-settings-drawer')).toBeInTheDocument();
    expect(screen.getByText('🎨 手账字体风格')).toBeInTheDocument();

    // Click 快乐手绘
    const kuaileCard = screen.getByRole('button', { name: /快乐手绘/i });
    fireEvent.click(kuaileCard);

    expect(document.body.dataset.fontPreset).toBe('zh_kuaile');
    expect(localStorage.getItem('playlistout-font-preset-zh')).toBe('zh_kuaile');

    // Close button
    const closeBtn = screen.getByRole('button', { name: /关闭对话框/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('mobile-settings-drawer')).not.toBeInTheDocument();
  });
});
