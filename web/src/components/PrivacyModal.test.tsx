import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyModal } from './PrivacyModal';

describe('PrivacyModal Component (Phase 7)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<PrivacyModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with required plain-language privacy statements when isOpen is true', () => {
    render(<PrivacyModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('隐私政策与数据说明')).toBeInTheDocument();
    expect(screen.getByText('1. 仅限公开歌单')).toBeInTheDocument();
    expect(screen.getByText('2. 零数据持久化存储')).toBeInTheDocument();
    expect(screen.getByText('3. 浏览器本地安全导出')).toBeInTheDocument();
    expect(screen.getByText('4. 匿名聚合统计')).toBeInTheDocument();
    expect(screen.getByText('5. 托管基础设施与开源')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('关闭隐私说明');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when confirm button is clicked', () => {
    const handleClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={handleClose} />);

    const confirmBtn = screen.getByText('我知道了');
    fireEvent.click(confirmBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={handleClose} />);

    const backdrop = screen.getByTestId('privacy-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
