import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KugouAuthModal } from './KugouAuthModal';
import * as apiClient from '../../api/client';
import * as kugouAuthUtil from '../../utils/kugouAuth';

describe('KugouAuthModal Component State Machine & UX Loop', () => {
  beforeEach(() => {
    kugouAuthUtil.clearKugouAuth();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    kugouAuthUtil.clearKugouAuth();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<KugouAuthModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders QR code scan flow when no credentials exist (authState: none)', async () => {
    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'test-qr-key',
        qrcodeImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('酷狗音乐 · 扫码解锁')).toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByAltText('Kugou Login QR Code');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    });
  });

  it('shows checking state when opened with existing credentials', async () => {
    kugouAuthUtil.setKugouAuth('mock_token', 'mock_uid');

    // Return a pending promise so checking state remains visible
    vi.spyOn(apiClient, 'validateKugouAuth').mockReturnValue(new Promise(() => {}));

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('kugou-auth-checking')).toBeInTheDocument();
    expect(screen.getByText('正在验证登录状态...')).toBeInTheDocument();
  });

  it('shows valid state when session validation succeeds', async () => {
    kugouAuthUtil.setKugouAuth('mock_token', 'mock_uid');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: true,
      data: { status: 'valid', userid: 'mock_uid' },
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(<KugouAuthModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />);

    await waitFor(() => {
      expect(screen.getByTestId('kugou-auth-valid')).toBeInTheDocument();
    });

    expect(screen.getByText('PlaylistOut 已连接酷狗账号')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '使用当前登录状态重新解析' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '完成' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument();
    expect(screen.getByTestId('kugou-modal-close-btn')).toBeInTheDocument();

    // Clicking top-right "✕" close button calls onClose
    fireEvent.click(screen.getByTestId('kugou-modal-close-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clicking "使用当前登录状态重新解析" triggers onSuccess and onClose
    fireEvent.click(screen.getByRole('button', { name: '使用当前登录状态重新解析' }));
    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('shows unknown state when validation encounters network error and retains credentials', async () => {
    kugouAuthUtil.setKugouAuth('mock_token', 'mock_uid');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: '502 Bad Gateway' },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('kugou-auth-unknown')).toBeInTheDocument();
    });

    expect(screen.getByText('暂时无法验证酷狗登录状态')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试验证' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新登录' })).toBeInTheDocument();

    // Credentials must NOT be wiped on network error!
    expect(kugouAuthUtil.getKugouAuth()).toEqual({
      token: 'mock_token',
      userid: 'mock_uid',
    });
  });

  it('shows invalid state, clears credentials and loads QR code when token is expired', async () => {
    kugouAuthUtil.setKugouAuth('mock_token', 'mock_uid');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: true,
      data: { status: 'invalid', message: 'Token expired' },
    });

    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'fresh-qr-key',
        qrcodeImg: 'data:image/png;base64,fresh_qr_base64',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('酷狗登录已过期，请重新登录')).toBeInTheDocument();
    });

    // Invalid token should be removed
    expect(kugouAuthUtil.getKugouAuth()).toBeNull();

    // QR code is loaded for re-login
    await waitFor(() => {
      const img = screen.getByAltText('Kugou Login QR Code');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,fresh_qr_base64');
    });
  });

  it('clears credentials and switches to QR code when user clicks logout', async () => {
    kugouAuthUtil.setKugouAuth('mock_token', 'mock_uid');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: true,
      data: { status: 'valid', userid: 'mock_uid' },
    });

    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'fresh-qr-key',
        qrcodeImg: 'data:image/png;base64,fresh_qr',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('kugou-auth-valid')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: '退出' });
    fireEvent.click(logoutBtn);

    // Credentials should be cleared
    expect(kugouAuthUtil.getKugouAuth()).toBeNull();

    // Should switch to QR code
    await waitFor(() => {
      expect(screen.getByAltText('Kugou Login QR Code')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking backdrop or cancel button', async () => {
    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'test-qr-key',
        qrcodeImg: 'data:image/png;base64,test',
        loginUrl: 'https://h5.kugou.com/test',
        expiresAt: Date.now() + 300000,
      },
    });

    const handleClose = vi.fn();
    render(<KugouAuthModal isOpen={true} onClose={handleClose} />);

    const cancelBtn = screen.getByText('取消');
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('kugou-auth-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('renders jump to KuGou App button with loginUrl and mobile tips', async () => {
    vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
      success: true,
      data: {
        qrcode: 'test-qr-key',
        qrcodeImg: 'data:image/png;base64,test',
        loginUrl: 'https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=test-qr-key',
        expiresAt: Date.now() + 300000,
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const jumpBtn = screen.getByTestId('kugou-jump-app-btn');
      expect(jumpBtn).toBeInTheDocument();
      expect(jumpBtn).toHaveAttribute(
        'href',
        'https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=test-qr-key',
      );
      expect(jumpBtn).toHaveAttribute('target', '_blank');
      expect(screen.getByText(/手机\/平板无法扫码/)).toBeInTheDocument();
    });
  });

  it('renders developer API credentials card in valid state and allows copying credentials', async () => {
    kugouAuthUtil.setKugouAuth('test_token_1234567890abcdef', '1425711902');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: true,
      data: { status: 'valid', userid: '1425711902' },
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('kugou-api-credentials')).toBeInTheDocument();
    });

    expect(screen.getByText('1425711902')).toBeInTheDocument();
    expect(screen.getByText(/test_token/)).toBeInTheDocument();

    // Copy User ID
    const copyUserIdBtn = screen.getByTestId('copy-kugou-userid-btn');
    fireEvent.click(copyUserIdBtn);
    expect(writeTextMock).toHaveBeenCalledWith('1425711902');

    // Copy Token
    const copyTokenBtn = screen.getByTestId('copy-kugou-token-btn');
    fireEvent.click(copyTokenBtn);
    expect(writeTextMock).toHaveBeenCalledWith('test_token_1234567890abcdef');

    // Copy cURL command
    const copyCurlBtn = screen.getByTestId('copy-kugou-curl-btn');
    fireEvent.click(copyCurlBtn);
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('curl -s "https://playlistout-api.lengxiqwq.com/api/v1/user/playlists?platform=kugou"'),
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('Bearer test_token_1234567890abcdef'),
    );
  });
});
