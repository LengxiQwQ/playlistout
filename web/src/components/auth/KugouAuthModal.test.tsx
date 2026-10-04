import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { KugouAuthModal } from './KugouAuthModal';
import * as apiClient from '../../api/client';
import * as kugouAuthUtil from '../../utils/kugouAuth';

describe('KugouAuthModal Component State Machine & UX Loop', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    kugouAuthUtil.clearKugouAuth();
    vi.spyOn(apiClient, 'fetchKugouProfile').mockResolvedValue({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: 'profile unavailable' },
    });
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

    const handleClose = vi.fn();

    render(<KugouAuthModal isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('kugou-auth-valid')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('kugou-profile-card')).toBeInTheDocument();
      expect(screen.getByText('酷狗账号')).toBeInTheDocument();
    });
    expect(screen.queryByText('✓ 已登录')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '使用当前登录状态重新解析' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '完成' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument();
    expect(screen.getByTestId('kugou-modal-close-btn')).toBeInTheDocument();

    // Clicking top-right "✕" close button calls onClose
    fireEvent.click(screen.getByTestId('kugou-modal-close-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows avatar, nickname, signature and user id when profile is available', async () => {
    kugouAuthUtil.setKugouAuth('profile_token', '1425711902');

    vi.spyOn(apiClient, 'validateKugouAuth').mockResolvedValue({
      success: true,
      data: { status: 'valid', userid: '1425711902' },
    });
    vi.mocked(apiClient.fetchKugouProfile).mockResolvedValue({
      success: true,
      data: {
        userId: '1425711902',
        nickname: '冷汐OωO',
        avatarUrl: 'https://c1.kgimg.com/v2/kugouicon/avatar.jpg',
        signature: '音乐会跟着我走',
      },
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    const card = await screen.findByTestId('kugou-profile-card');
    expect(card).toHaveTextContent('冷汐OωO');
    expect(card).not.toHaveTextContent('已登录');
    expect(card).toHaveTextContent('音乐会跟着我走');
    expect(card).toHaveTextContent('用户 ID：1425711902');

    const avatar = screen.getByAltText('冷汐OωO');
    expect(avatar).toHaveAttribute(
      'src',
      'https://c1.kgimg.com/v2/kugouicon/avatar.jpg',
    );
    expect(apiClient.fetchKugouProfile).toHaveBeenCalledWith(
      'profile_token',
      '1425711902',
    );
  });

  it('keeps the modal open after QR login, shows the profile, and refreshes only after user closes it', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(apiClient, 'fetchKugouQrCode').mockResolvedValue({
        success: true,
        data: {
          qrcode: 'login-qr-key',
          qrcodeImg: 'data:image/png;base64,login_qr',
          loginUrl: 'https://h5.kugou.com/test',
          expiresAt: Date.now() + 300000,
        },
      });
      vi.spyOn(apiClient, 'checkKugouQrCode').mockResolvedValue({
        success: true,
        data: {
          status: 'success',
          token: 'fresh_login_token',
          userid: '1425711902',
        },
      });
      vi.mocked(apiClient.fetchKugouProfile).mockResolvedValue({
        success: true,
        data: {
          userId: '1425711902',
          nickname: '扫码后的冷汐',
          avatarUrl: 'https://c1.kgimg.com/v2/kugouicon/fresh-avatar.jpg',
          signature: '扫码成功后直接看到我',
        },
      });

      const handleClose = vi.fn();
      const handleSuccess = vi.fn();
      render(
        <KugouAuthModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />,
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByAltText('Kugou Login QR Code')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const card = screen.getByTestId('kugou-profile-card');
      expect(card).toHaveTextContent('扫码后的冷汐');
      expect(card).toHaveTextContent('扫码成功后直接看到我');
      expect(card).not.toHaveTextContent('已登录');
      expect(screen.getByAltText('扫码后的冷汐')).toHaveAttribute(
        'src',
        'https://c1.kgimg.com/v2/kugouicon/fresh-avatar.jpg',
      );

      expect(handleClose).not.toHaveBeenCalled();
      expect(handleSuccess).not.toHaveBeenCalled();
      expect(kugouAuthUtil.getKugouAuth()).toEqual({
        token: 'fresh_login_token',
        userid: '1425711902',
      });

      fireEvent.click(screen.getByTestId('kugou-modal-close-btn'));
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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

    const credentials = screen.getByTestId('kugou-api-credentials');
    expect(credentials).toHaveTextContent('1425711902');
    expect(credentials).toHaveTextContent('test_token');
    const copyButtons = Array.from(credentials.querySelectorAll('button'));
    expect(copyButtons.map((button) => button.getAttribute('data-testid'))).toEqual([
      'copy-kugou-token-btn',
      'copy-kugou-userid-btn',
    ]);
    expect(screen.queryByTestId('copy-kugou-plugin-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('copy-kugou-curl-btn')).not.toBeInTheDocument();

    // Copy Token first
    const copyTokenBtn = screen.getByTestId('copy-kugou-token-btn');
    fireEvent.click(copyTokenBtn);
    expect(writeTextMock).toHaveBeenCalledWith('test_token_1234567890abcdef');

    // Copy User ID second
    const copyUserIdBtn = screen.getByTestId('copy-kugou-userid-btn');
    fireEvent.click(copyUserIdBtn);
    expect(writeTextMock).toHaveBeenCalledWith('1425711902');
  });
});
