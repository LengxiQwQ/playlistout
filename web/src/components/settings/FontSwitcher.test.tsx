import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontSwitcher } from './FontSwitcher';
import { LanguageProvider } from '../../i18n';

describe('FontSwitcher Component', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.body.dataset.fontPreset;
  });

  it('renders font picker button and caption', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>
    );

    expect(screen.getByText('字体抽屉 ✎')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /毛笔手账/i });
    expect(button).toBeInTheDocument();
    expect(document.body.dataset.fontPreset).toBe('zhnote');
  });

  it('opens font dropdown menu on click and lists all Chinese presets', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>
    );

    const button = screen.getByRole('button', { name: /毛笔手账/i });
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('快乐手绘 (萌趣)')).toBeInTheDocument();
    expect(screen.getByText('洒脱行书 (行草)')).toBeInTheDocument();
    expect(screen.getByText('随性写意 (行书)')).toBeInTheDocument();
    expect(screen.getByText('萌趣黄油 (手绘)')).toBeInTheDocument();
    expect(screen.getByText('原稿经典')).toBeInTheDocument();
  });

  it('switches font preset to zh_kuaile and updates body dataset and localStorage', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>
    );

    const button = screen.getByRole('button', { name: /毛笔手账/i });
    fireEvent.click(button);

    const kuaileOption = screen.getByText('快乐手绘 (萌趣)');
    fireEvent.click(kuaileOption);

    expect(document.body.dataset.fontPreset).toBe('zh_kuaile');
    expect(localStorage.getItem('playlistout-font-preset-zh')).toBe('zh_kuaile');
    expect(screen.getByText(/02 · 快乐手绘/)).toBeInTheDocument();
  });

  it('switches font preset to zh_zhimang and persists', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>
    );

    const button = screen.getByRole('button', { name: /毛笔手账/i });
    fireEvent.click(button);

    const zhimangOption = screen.getByText('洒脱行书 (行草)');
    fireEvent.click(zhimangOption);

    expect(document.body.dataset.fontPreset).toBe('zh_zhimang');
    expect(localStorage.getItem('playlistout-font-preset-zh')).toBe('zh_zhimang');
  });

  it('closes dropdown when Escape key is pressed', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <FontSwitcher />
      </LanguageProvider>
    );

    const button = screen.getByRole('button', { name: /毛笔手账/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
