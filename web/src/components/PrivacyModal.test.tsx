import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyModal } from './PrivacyModal';
import type { ClarityConsent } from '../analytics/clarity';

function renderPrivacyModal(options?: {
  isOpen?: boolean;
  consent?: ClarityConsent;
  onClose?: ReturnType<typeof vi.fn>;
  onConsentChange?: ReturnType<typeof vi.fn>;
}) {
  const onClose = options?.onClose ?? vi.fn();
  const onConsentChange = options?.onConsentChange ?? vi.fn();

  const result = render(
    <PrivacyModal
      isOpen={options?.isOpen ?? true}
      onClose={onClose}
      clarityConsent={options?.consent ?? null}
      onClarityConsentChange={onConsentChange}
    />,
  );

  return { ...result, onClose, onConsentChange };
}

describe('PrivacyModal Component (Phase 7)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = renderPrivacyModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with required plain-language privacy statements when isOpen is true', () => {
    renderPrivacyModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('隐私政策与数据说明')).toBeInTheDocument();
    expect(screen.getByText('1. 仅限公开歌单')).toBeInTheDocument();
    expect(screen.getByText('2. 零数据持久化存储')).toBeInTheDocument();
    expect(screen.getByText('3. 浏览器本地安全导出')).toBeInTheDocument();
    expect(screen.getByText('4. 统计、Clarity 与 Cookie 控制')).toBeInTheDocument();
    expect(screen.getByText('5. 托管基础设施与开源')).toBeInTheDocument();
    expect(screen.getByText('当前：尚未选择。')).toBeInTheDocument();
  });

  it('calls onClarityConsentChange for both consent choices', () => {
    const onConsentChange = vi.fn();
    renderPrivacyModal({ onConsentChange });

    fireEvent.click(screen.getByText('允许体验分析'));
    expect(onConsentChange).toHaveBeenCalledWith('granted');

    fireEvent.click(screen.getByText('不使用分析 Cookie'));
    expect(onConsentChange).toHaveBeenCalledWith('denied');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderPrivacyModal({ onClose: handleClose });

    const closeBtn = screen.getByLabelText('关闭隐私说明');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when confirm button is clicked', () => {
    const handleClose = vi.fn();
    renderPrivacyModal({ onClose: handleClose });

    const confirmBtn = screen.getByText('我知道了');
    fireEvent.click(confirmBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    renderPrivacyModal({ onClose: handleClose });

    const backdrop = screen.getByTestId('privacy-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    renderPrivacyModal({ onClose: handleClose });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
