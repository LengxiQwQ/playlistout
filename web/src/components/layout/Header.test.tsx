import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { LanguageProvider } from '../../i18n';

describe('Header Component', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.layoutDemo;
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
    expect(githubLink).not.toHaveClass('desktop-only');

    expect(screen.queryByRole('button', { name: /Pinboard Wall/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Journal Drawer|手账百宝箱/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toggle language/i })).toBeInTheDocument();
  });

  it('renders separate desktop/mobile download links and exposes language switcher & Star directly without a drawer', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <Header />
      </LanguageProvider>
    );

    // Desktop download button: 5 characters "下载桌面版", desktop-only
    const desktopLink = screen.getByRole('link', { name: '下载桌面版' });
    expect(desktopLink).toBeInTheDocument();
    expect(desktopLink).toHaveTextContent('下载桌面版');
    expect(desktopLink).toHaveClass('header-desktop-btn');
    expect(desktopLink).toHaveClass('desktop-only');
    expect(desktopLink).toHaveAttribute('href', 'https://github.com/LengxiQwQ/playlistout/releases/latest');
    expect(desktopLink).toHaveAttribute('target', '_blank');

    // Mobile download button: 2 characters "下载", mobile-only
    const mobileLink = screen.getByRole('link', { name: '下载' });
    expect(mobileLink).toBeInTheDocument();
    expect(mobileLink).toHaveTextContent('下载');
    expect(mobileLink).toHaveClass('header-desktop-btn');
    expect(mobileLink).toHaveClass('mobile-only');
    expect(mobileLink).toHaveAttribute('href', 'https://github.com/LengxiQwQ/playlistout/releases/latest');
    expect(mobileLink).toHaveAttribute('target', '_blank');

    // GitHub Star link and Language switcher are directly accessible (no drawer)
    expect(screen.getByRole('link', { name: /Star on GitHub/i })).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-settings-drawer')).not.toBeInTheDocument();

    const langBtn = screen.getByRole('button', { name: /Toggle language/i });
    fireEvent.click(langBtn);
    expect(document.documentElement.lang).toBe('en-US');
    expect(desktopLink).toHaveTextContent('Download Desktop');
    expect(mobileLink).toHaveTextContent('Download');

    fireEvent.click(langBtn);
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(desktopLink).toHaveTextContent('下载桌面版');
    expect(mobileLink).toHaveTextContent('下载');
  });
});
