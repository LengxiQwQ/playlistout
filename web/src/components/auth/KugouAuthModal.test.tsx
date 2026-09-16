import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KugouAuthModal } from './KugouAuthModal';
import * as apiClient from '../../api/client';
import * as kugouAuthUtil from '../../utils/kugouAuth';

describe('KugouAuthModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<KugouAuthModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog and fetches QR code when opened', async () => {
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
    expect(handleClose).toHaveBeenCalled();

    const backdrop = screen.getByTestId('kugou-auth-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('shows logged in status and allows logout if user already has credentials', async () => {
    vi.spyOn(kugouAuthUtil, 'getKugouAuth').mockReturnValue({
      token: 'mock_token',
      userid: 'mock_uid',
    });

    render(<KugouAuthModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('酷狗已登录')).toBeInTheDocument();
    expect(screen.getByText('退出')).toBeInTheDocument();
  });
});
