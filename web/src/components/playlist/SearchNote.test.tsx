import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchNote } from './SearchNote';
import { LanguageProvider } from '../../i18n';
import * as apiClient from '../../api/client';

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
    expect(screen.getByText('QQ 音乐（可批量）')).toBeInTheDocument();
    expect(screen.getByText('网易云音乐（可批量）')).toBeInTheDocument();
    expect(screen.getByText('酷狗音乐（未登录）')).toBeInTheDocument();
    expect(screen.getByText('酷我音乐')).toBeInTheDocument();
    expect(screen.getByText('咪咕音乐')).toBeInTheDocument();

    // Click sample
    const sampleQQ = screen.getByText('QQ音乐批量');
    fireEvent.click(sampleQQ);
    expect(handleSelectSample).toHaveBeenCalledWith('3197635836', 'qqmusic', 'user');

    const sampleKuwo = screen.getByText('酷我音乐示例');
    fireEvent.click(sampleKuwo);
    expect(handleSelectSample).toHaveBeenCalledWith(
      'https://m.kuwo.cn/newh5app/playlist_detail/2311665489',
      'kuwo',
      'playlist',
    );

    const sampleMigu = screen.getByText('咪咕音乐示例');
    fireEvent.click(sampleMigu);
    expect(handleSelectSample).toHaveBeenCalledWith(
      'https://c.migu.cn/0mp9YM',
      'migu',
      'playlist',
    );

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
    expect(screen.getByText(/目前支持 QQ 音乐、网易云音乐、酷狗音乐、汽水音乐、酷我音乐与咪咕音乐公开歌单/)).toBeInTheDocument();

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

    const kugouBadge = screen.getByText('酷狗音乐（已登录）');
    expect(kugouBadge).toBeInTheDocument();
    expect(kugouBadge).toHaveStyle({ backgroundColor: '#bfdbfe' });
    localStorage.clear();
  });

  it('automatically opens KugouAuthModal when URL has ?login=kugou and cleans URL on close', () => {
    window.history.replaceState({}, '', '/?login=kugou');
    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'test-qr-key',
        qrcodeImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

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

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('酷狗音乐 · 扫码解锁')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('kugou-modal-close-btn'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('renders Kugou auth required error with action button and opens login modal', () => {
    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'test-qr-key',
        qrcodeImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="https://m.kugou.com/user?uid=1425711902"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{
            code: 'FORBIDDEN',
            message: 'KuGou user playlists require both token and userid passed via Authorization / X-kugou-* headers from QR login.',
            details: { authRequired: true, platform: 'kugou' },
          }}
          onRetry={vi.fn()}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('酷狗音乐批量导出需要先扫码连接酷狗账号。请点击下方「立即扫码连接」登录后重试。')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: '📱 立即扫码连接' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('酷狗音乐 · 扫码解锁')).toBeInTheDocument();
  });

  it('selects Kugou sample when clicking Kugou sample sticker', () => {
    const handleSelectSample = vi.fn();
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
          onSelectSample={handleSelectSample}
        />
      </LanguageProvider>,
    );

    const kugouSample = screen.getByText('酷狗音乐示例');
    fireEvent.click(kugouSample);

    expect(handleSelectSample).toHaveBeenCalledWith(
      'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
      'kugou',
      'playlist',
    );
  });

  it('renders helpful rate-limit explanation for UPSTREAM_ERROR, promotes retry, and delays feedback button', () => {
    const handleRetry = vi.fn();
    const handleFeedback = vi.fn();

    const { rerender } = render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="https://music.163.com/playlist?id=12345"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{ code: 'UPSTREAM_ERROR', message: 'NetEase anti-bot' }}
          onRetry={handleRetry}
          onFeedback={handleFeedback}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    // 1. First failure: Shows clear message explaining it's not unparseable, but due to platform traffic/rate limit
    expect(screen.getByText(/并非无法解析/)).toBeInTheDocument();
    expect(screen.getByText(/接口正常，建议稍等 3~5 秒后点击「重试」/)).toBeInTheDocument();

    // Notice guides to retry first
    expect(screen.getByText(/上游接口频控或网络抖动通常稍等片刻即可自动恢复/)).toBeInTheDocument();

    // Retry button is prominently labeled "🔄 点击重试"
    const retryBtn = screen.getByRole('button', { name: '🔄 点击重试' });
    expect(retryBtn).toBeInTheDocument();

    // Feedback button is NOT shown on initial failure to prevent premature feedback
    expect(screen.queryByRole('button', { name: '一键反馈' })).not.toBeInTheDocument();

    // 2. User clicks retry
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    // 3. If retry still fails with UPSTREAM_ERROR, re-render with the same error (simulating retry response)
    rerender(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="https://music.163.com/playlist?id=12345"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{ code: 'UPSTREAM_ERROR', message: 'NetEase anti-bot' }}
          onRetry={handleRetry}
          onFeedback={handleFeedback}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    // Feedback button is now unlocked after at least 1 retry attempt
    const feedbackBtn = screen.getByRole('button', { name: '一键反馈' });
    expect(feedbackBtn).toBeInTheDocument();
    expect(screen.getByText(/多次重试仍响应异常/)).toBeInTheDocument();

    // User can now report if it persistently fails
    fireEvent.click(feedbackBtn);
    expect(handleFeedback).toHaveBeenCalledTimes(1);
  });

  it('renders desktop CLI recommendation link for upstream, timeout, rate-limited, and network errors, but not for input errors', () => {
    // 1. Upstream timeout error: should show concise desktop CLI recommendation link to GitHub Releases
    const { rerender } = render(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="https://music.163.com/playlist?id=12345"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{ code: 'UPSTREAM_TIMEOUT', message: 'Timeout' }}
          onRetry={vi.fn()}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText(/不受网络或上游风控影响/)).toBeInTheDocument();
    const cliLink = screen.getByRole('link', { name: /桌面 CLI 独立版 ↗/ });
    expect(cliLink).toBeInTheDocument();
    expect(cliLink).toHaveAttribute('href', 'https://github.com/LengxiQwQ/playlistout/releases/latest');
    expect(cliLink).toHaveAttribute('target', '_blank');

    // 2. Client input error (INVALID_INPUT): should NOT show desktop CLI recommendation
    rerender(
      <LanguageProvider defaultLanguage="zh-CN">
        <SearchNote
          inputUrl="invalid"
          onInputChange={vi.fn()}
          onClear={vi.fn()}
          onParse={vi.fn()}
          isLoading={false}
          error={{ code: 'INVALID_INPUT', message: 'Invalid URL' }}
          onRetry={vi.fn()}
          onSelectSample={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.queryByText(/不受网络或上游风控影响/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /桌面 CLI 独立版/ })).not.toBeInTheDocument();
  });
});
