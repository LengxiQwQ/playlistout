import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n';
import {
  AUTHOR_NAME,
  AUTHOR_GITHUB_HANDLE,
  AUTHOR_GITHUB_URL,
  AUTHOR_EMAIL,
  AUTHOR_QQ,
} from '../../constants/author';
import { Tape } from '../ui/Tape';

export interface AuthorCardProps {
  isOpen: boolean;
  onClose: () => void;
}

const GitHubIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const MailIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const QqIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6.048 3.323c.022.277-.13.523-.338.55-.21.026-.397-.176-.419-.453s.13-.523.338-.55c.21-.026.397.176.42.453Zm2.265-.24c-.603-.146-.894.256-.936.333-.027.048-.008.117.037.15.045.035.092.025.119-.003.361-.39.751-.172.829-.129l.011.007c.053.024.147.028.193-.098.023-.063.017-.11-.006-.142-.016-.023-.089-.08-.247-.118" />
    <path d="M11.727 6.719c0-.022.01-.375.01-.557 0-3.07-1.45-6.156-5.015-6.156S1.708 3.092 1.708 6.162c0 .182.01.535.01.557l-.72 1.795a26 26 0 0 0-.534 1.508c-.68 2.187-.46 3.093-.292 3.113.36.044 1.401-1.647 1.401-1.647 0 .979.504 2.256 1.594 3.179-.408.126-.907.319-1.228.556-.29.213-.253.43-.201.518.228.386 3.92.246 4.985.126 1.065.12 4.756.26 4.984-.126.052-.088.088-.305-.2-.518-.322-.237-.822-.43-1.23-.557 1.09-.922 1.594-2.2 1.594-3.178 0 0 1.041 1.69 1.401 1.647.168-.02.388-.926-.292-3.113a26 26 0 0 0-.534-1.508l-.72-1.795ZM9.773 5.53a.1.1 0 0 1-.009.096c-.109.159-1.554.943-3.033.943h-.017c-1.48 0-2.925-.784-3.034-.943a.1.1 0 0 1-.018-.055q0-.022.01-.04c.13-.287 1.43-.606 3.042-.606h.017c1.611 0 2.912.319 3.042.605m-4.32-.989c-.483.022-.896-.529-.922-1.229s.344-1.286.828-1.308c.483-.022.896.529.922 1.23.027.7-.344 1.286-.827 1.307Zm2.538 0c-.484-.022-.854-.607-.828-1.308.027-.7.44-1.25.923-1.23.483.023.853.608.827 1.309-.026.7-.439 1.251-.922 1.23ZM2.928 8.99q.32.063.639.117v2.336s1.104.222 2.21.068V9.363q.49.027.937.023h.017c1.117.013 2.474-.136 3.786-.396.097.622.151 1.386.097 2.284-.146 2.45-1.6 3.99-3.846 4.012h-.091c-2.245-.023-3.7-1.562-3.846-4.011-.054-.9 0-1.663.097-2.285" />
  </svg>
);

export const AuthorCard: React.FC<AuthorCardProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [emailCopied, setEmailCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [qqCopied, setQqCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  const emailTimeoutRef = useRef<number | null>(null);
  const qqTimeoutRef = useRef<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (emailTimeoutRef.current) window.clearTimeout(emailTimeoutRef.current);
      if (qqTimeoutRef.current) window.clearTimeout(qqTimeoutRef.current);
    };
  }, []);

  const copyToClipboard = async (text: string, type: 'email' | 'qq') => {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      } else {
        // Fallback for environments where Clipboard API is unavailable
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      success = false;
    }

    if (type === 'email') {
      if (emailTimeoutRef.current) window.clearTimeout(emailTimeoutRef.current);
      setEmailCopied(success ? 'copied' : 'failed');
      emailTimeoutRef.current = window.setTimeout(() => {
        setEmailCopied('idle');
      }, 1800);
    } else {
      if (qqTimeoutRef.current) window.clearTimeout(qqTimeoutRef.current);
      setQqCopied(success ? 'copied' : 'failed');
      qqTimeoutRef.current = window.setTimeout(() => {
        setQqCopied('idle');
      }, 1800);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={t.footer.authorCardTitle}
      className="author-dropup-card shadow-cutout"
      style={{ position: 'absolute' }}
    >
      {/* Decorative Washi Tape */}
      <Tape
        color="pink"
        rotateDeg={-6}
        width="4.5rem"
        height="1.1rem"
        style={{
          position: 'absolute',
          top: '-0.55rem',
          left: '1.2rem',
          zIndex: 10,
          opacity: 0.9,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.2rem',
          paddingBottom: '0.35rem',
          borderBottom: '1.5px dashed rgba(45, 52, 54, 0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.45rem',
          }}
        >
          <span
            className="font-marker"
            style={{
              fontSize: '1.2rem',
              color: 'var(--ink, #2d3436)',
              lineHeight: 1.2,
            }}
          >
            {t.footer.authorCardTitle}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '0.9rem',
              color: 'var(--ink-light, #636e72)',
              fontWeight: 600,
            }}
          >
            {AUTHOR_NAME}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.footer.closeCard}
          className="font-mono"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-light, #636e72)',
            cursor: 'pointer',
            padding: '0.1rem 0.35rem',
            fontSize: '1rem',
            lineHeight: 1,
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <p
        className="font-handwriting"
        style={{
          fontSize: '0.95rem',
          color: 'var(--ink-light, #636e72)',
          margin: '0 0 0.75rem 0',
          lineHeight: 1.25,
        }}
      >
        {t.footer.authorCardSubtitle}
      </p>

      {/* Contact Details List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {/* GitHub */}
        <div className="author-contact-row">
          <a
            href={AUTHOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`${AUTHOR_NAME} (${AUTHOR_GITHUB_HANDLE})`}
            aria-label={`${AUTHOR_NAME} GitHub (${AUTHOR_GITHUB_HANDLE})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              minWidth: 0,
              flex: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <GitHubIcon size={16} />
            <span
              className="font-mono"
              style={{
                fontSize: '0.95rem',
                color: 'var(--ink, #2d3436)',
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              {AUTHOR_GITHUB_HANDLE}
            </span>
          </a>

          <a
            href={AUTHOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`${AUTHOR_NAME} GitHub`}
            aria-label={`${t.footer.openText} GitHub`}
            className="author-copy-btn font-handwriting"
            style={{ textDecoration: 'none' }}
          >
            {t.footer.openText}
          </a>
        </div>

        {/* Email Contact */}
        <div className="author-contact-row">
          <div
            onClick={() => copyToClipboard(AUTHOR_EMAIL, 'email')}
            title={`${t.footer.copyText} Email`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              minWidth: 0,
              flex: 1,
            }}
          >
            <MailIcon size={16} />
            <span
              className="font-mono"
              style={{
                fontSize: '0.88rem',
                color: 'var(--ink, #2d3436)',
                userSelect: 'all',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {AUTHOR_EMAIL}
            </span>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(AUTHOR_EMAIL, 'email')}
            aria-label={`${t.footer.authorEmailLabel} ${
              emailCopied === 'copied'
                ? t.footer.copiedText
                : emailCopied === 'failed'
                ? t.footer.copyFailed
                : t.footer.copyText
            }`}
            className={`author-copy-btn font-handwriting ${
              emailCopied === 'copied' ? 'is-copied' : emailCopied === 'failed' ? 'is-failed' : ''
            }`}
          >
            {emailCopied === 'copied'
              ? t.footer.copiedText
              : emailCopied === 'failed'
              ? t.footer.copyFailed
              : t.footer.copyText}
          </button>
        </div>

        {/* QQ Contact */}
        <div className="author-contact-row">
          <div
            onClick={() => copyToClipboard(AUTHOR_QQ, 'qq')}
            title={`${t.footer.copyText} QQ`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              minWidth: 0,
              flex: 1,
            }}
          >
            <QqIcon size={16} />
            <span
              className="font-mono"
              style={{
                fontSize: '0.92rem',
                color: 'var(--ink, #2d3436)',
                userSelect: 'all',
                fontWeight: 600,
              }}
            >
              {AUTHOR_QQ}
            </span>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(AUTHOR_QQ, 'qq')}
            aria-label={`${t.footer.authorQqLabel} ${
              qqCopied === 'copied'
                ? t.footer.copiedText
                : qqCopied === 'failed'
                ? t.footer.copyFailed
                : t.footer.copyText
            }`}
            className={`author-copy-btn font-handwriting ${
              qqCopied === 'copied' ? 'is-copied' : qqCopied === 'failed' ? 'is-failed' : ''
            }`}
          >
            {qqCopied === 'copied'
              ? t.footer.copiedText
              : qqCopied === 'failed'
              ? t.footer.copyFailed
              : t.footer.copyText}
          </button>
        </div>
      </div>
    </div>
  );
};
