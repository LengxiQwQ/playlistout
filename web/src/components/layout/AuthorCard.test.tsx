import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthorCard } from './AuthorCard';
import {
  AUTHOR_NAME,
  AUTHOR_GITHUB_HANDLE,
  AUTHOR_GITHUB_URL,
  AUTHOR_EMAIL,
  AUTHOR_QQ,
} from '../../constants/author';

describe('AuthorCard Component', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AuthorCard isOpen={false} onClose={onCloseMock} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders author info correctly when isOpen is true', () => {
    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(AUTHOR_NAME)).toBeInTheDocument();
    expect(screen.getByText(AUTHOR_EMAIL)).toBeInTheDocument();
    expect(screen.getByText(AUTHOR_QQ)).toBeInTheDocument();

    const githubLink = screen.getByRole('link', { name: new RegExp(AUTHOR_NAME, 'i') });
    expect(githubLink).toHaveAttribute('href', AUTHOR_GITHUB_URL);
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(AUTHOR_GITHUB_HANDLE)).toBeInTheDocument();
  });

  it('closes when clicking close button', () => {
    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);
    const closeBtn = screen.getByRole('button', { name: /关闭便签|close note/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('closes when pressing Escape key', () => {
    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking outside the card', () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <AuthorCard isOpen={true} onClose={onCloseMock} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('copies Email to clipboard via copy button and updates button status', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    const emailCopyBtn = screen.getByRole('button', { name: /Email (复制|Copy)/i });
    fireEvent.click(emailCopyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(AUTHOR_EMAIL);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Email (✓ 已复制|✓ Copied)/i })).toBeInTheDocument();
    });
  });

  it('copies Email to clipboard when clicking email text directly', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    const emailText = screen.getByText(AUTHOR_EMAIL);
    fireEvent.click(emailText);

    expect(writeTextMock).toHaveBeenCalledWith(AUTHOR_EMAIL);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Email (✓ 已复制|✓ Copied)/i })).toBeInTheDocument();
    });
  });

  it('copies QQ to clipboard via copy button and updates button status', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    const qqCopyBtn = screen.getByRole('button', { name: /QQ (复制|Copy)/i });
    fireEvent.click(qqCopyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(AUTHOR_QQ);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /QQ (✓ 已复制|✓ Copied)/i })).toBeInTheDocument();
    });
  });

  it('copies QQ to clipboard when clicking QQ text directly', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    const qqText = screen.getByText(AUTHOR_QQ);
    fireEvent.click(qqText);

    expect(writeTextMock).toHaveBeenCalledWith(AUTHOR_QQ);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /QQ (✓ 已复制|✓ Copied)/i })).toBeInTheDocument();
    });
  });

  it('handles clipboard failure gracefully', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AuthorCard isOpen={true} onClose={onCloseMock} />);

    const emailCopyBtn = screen.getByRole('button', { name: /Email (复制|Copy)/i });
    fireEvent.click(emailCopyBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Email (复制失败|Failed)/i })).toBeInTheDocument();
    });
  });
});
