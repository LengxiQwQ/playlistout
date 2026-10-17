import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopCliSection } from './DesktopCliSection';
import { LanguageProvider } from '../../i18n';
import * as clipboardUtils from '../../utils/clipboard';

describe('DesktopCliSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders practical 3-step usage guide and single download button in Chinese', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <DesktopCliSection />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 2, name: /PlaylistOut 本地解析版/i })).toBeInTheDocument();
    expect(screen.getByText(/下载解压即可在电脑本地直接运行/i)).toBeInTheDocument();

    expect(screen.getByText(/① 下载程序/i)).toBeInTheDocument();
    expect(screen.getByText(/② 直接运行/i)).toBeInTheDocument();
    expect(screen.getByText(/③ 获取文件/i)).toBeInTheDocument();

    const downloadLink = screen.getByRole('link', { name: /前往 GitHub Releases 下载/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute(
      'href',
      'https://github.com/LengxiQwQ/playlistout/releases/latest',
    );
  });

  it('renders in English correctly', () => {
    render(
      <LanguageProvider defaultLanguage="en-US">
        <DesktopCliSection />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 2, name: /PlaylistOut Local CLI/i })).toBeInTheDocument();
    expect(screen.getByText(/① Download Release/i)).toBeInTheDocument();
    expect(screen.getByText(/② Run & Parse/i)).toBeInTheDocument();
    expect(screen.getByText(/③ Get Export Files/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download from GitHub Releases/i })).toBeInTheDocument();
  });

  it('copies terminal snippet command when copy button is clicked', async () => {
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <DesktopCliSection />
      </LanguageProvider>,
    );

    const copyBtn = screen.getByRole('button', { name: /复制终端命令/i });
    fireEvent.click(copyBtn);

    expect(copySpy).toHaveBeenCalledWith('./PlaylistOut "<url>"');
    expect(await screen.findByText('✓ 已复制')).toBeInTheDocument();
  });
});
