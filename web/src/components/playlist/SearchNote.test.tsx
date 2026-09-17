import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchNote } from './SearchNote';
import { LanguageProvider } from '../../i18n';

describe('SearchNote Component (Phase 4)', () => {
  it('renders input, parse button, samples, and platform indicators', () => {
    const handleInputChange = vi.fn();
    const handleParse = vi.fn();
    const handleClear = vi.fn();
    const handleSelectSample = vi.fn();

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="https://y.qq.com/n/ryqq/playlist/9044196528"
          onInputChange={handleInputChange}
          onClear={handleClear}
          onParse={handleParse}
          isLoading={false}
          error={null}
          onRetry={vi.fn()}
          onSelectSample={handleSelectSample}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('在这里粘贴歌单链接 ↓')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '解析' })).toBeEnabled();
    expect(screen.getByText('跨平台公开歌单解析')).toBeInTheDocument();
    expect(screen.getByText('QQ 音乐')).toBeInTheDocument();
    expect(screen.getByText('网易云音乐')).toBeInTheDocument();
    expect(screen.getByText('酷狗音乐（未登录）')).toBeInTheDocument();

    // Click sample
    const sampleQQ = screen.getByText('QQ音乐批量');
    fireEvent.click(sampleQQ);
    expect(handleSelectSample).toHaveBeenCalledWith('3197635836', 'qqmusic', 'user');

    // Click parse
    const parseBtn = screen.getByRole('button', { name: '解析' });
    fireEvent.click(parseBtn);
    expect(handleParse).toHaveBeenCalled();
  });

  it('renders loading note when isLoading is true', () => {
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl=""
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={true}
          error={null}
          onRetry={vi.fn()}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByText(/正在/)).toBeInTheDocument();
  });

  it('renders error paper note and allows retry when error is provided', () => {
    const handleRetry = vi.fn();
    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="invalid-link"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{ code: 'UNSUPPORTED_URL', message: 'Unsupported' }}
          onRetry={handleRetry}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('status-alert-error')).toBeInTheDocument();
    expect(screen.getByText(/目前支持 QQ 音乐、网易云音乐、酷狗音乐与汽水音乐公开歌单/)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: '重试' });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalled();
  });

  it('renders Kugou logged in status when authenticated', () => {
    localStorage.setItem('kugou_token', 'test_token');
    localStorage.setItem('kugou_userid', 'test_uid');

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl=""
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={null}
          onRetry={vi.fn()}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('酷狗音乐（已登录）')).toBeInTheDocument();
    localStorage.clear();
  });
});
