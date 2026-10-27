import React from 'react';

export interface StatusAlertProps {
  type: 'error' | 'info';
  message: string;
  code?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
  onAction?: () => void;
  actionLabel?: string;
  onFeedback?: () => void;
  feedbackLabel?: string;
  feedbackSubmittedLabel?: string;
  feedbackNotice?: string;
  feedbackSubmitted?: boolean;
  desktopCliHint?: {
    prefix: string;
    linkText: string;
    suffix: string;
    url?: string;
  };
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  type,
  message,
  onRetry,
  onAction,
  actionLabel,
  onFeedback,
  feedbackLabel = '一键反馈',
  feedbackSubmittedLabel = '已反馈 ✓',
  feedbackNotice,
  feedbackSubmitted = false,
  retryLabel = '重试',
  desktopCliHint,
}) => {
  const isError = type === 'error';
  const hasActions = onRetry || onFeedback || Boolean(onAction && actionLabel);

  return (
    <div
      className={`status-alert status-alert-${type} hand-drawn-border-alt shadow-cutout-sm`}
      role="alert"
      data-testid={`status-alert-${type}`}
      style={{
        backgroundColor: isError ? 'var(--note-error, #ffebee)' : 'var(--note-blue, #e8f8ff)',
        padding: '1rem 1.25rem',
        marginTop: '1.25rem',
        ['--rot' as any]: '-0.5deg',
        position: 'relative',
      }}
    >
      {/* Row 1: icon + message */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem', lineHeight: 1.4, flexShrink: 0 }} aria-hidden="true">
          {isError ? '⚠️' : 'ℹ️'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="alert-message font-handwriting"
            style={{
              fontSize: '1.15rem',
              color: 'var(--ink, #2d3436)',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {message}
          </p>

          {desktopCliHint && (
            <div
              className="alert-cli-hint font-handwriting"
              style={{
                marginTop: '0.5rem',
                fontSize: '0.95rem',
                color: 'var(--ink-light, #636e72)',
                lineHeight: 1.4,
              }}
            >
              {desktopCliHint.prefix}
              <a
                href={desktopCliHint.url || 'https://github.com/LengxiQwQ/playlistout/releases/latest'}
                target="_blank"
                rel="noopener noreferrer"
                className="alert-cli-link"
                style={{
                  color: 'var(--ink, #2d3436)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                }}
              >
                {desktopCliHint.linkText}
              </a>
              {desktopCliHint.suffix}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      {hasActions && (
        <div
          style={{
            paddingTop: '0.75rem',
            marginTop: '0.75rem',
            borderTop: '1px dashed rgba(45, 52, 54, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.5rem 0.75rem',
          }}
        >
          {feedbackNotice && (
            <span
              className="font-handwriting"
              style={{
                flex: '1 1 0',
                minWidth: 0,
                fontSize: '0.82rem',
                color: 'var(--ink-light, #636e72)',
                lineHeight: 1.5,
              }}
            >
              {feedbackNotice}
            </span>
          )}
          <span style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
            {onAction && actionLabel && (
              <button
                type="button"
                onClick={onAction}
                className="btn-action sticker font-handwriting"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '0.35rem 1rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border: 'none',
                }}
              >
                {actionLabel}
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-retry sticker font-handwriting"
                style={{
                  backgroundColor: '#ffffff',
                  padding: '0.35rem 1rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {retryLabel}
              </button>
            )}
            {onFeedback && (
              <button
                type="button"
                onClick={onFeedback}
                disabled={feedbackSubmitted}
                className="btn-feedback sticker font-handwriting"
                style={{
                  backgroundColor: feedbackSubmitted ? '#d4edda' : '#e8f5e9',
                  padding: '0.35rem 1rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: feedbackSubmitted ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: feedbackSubmitted ? 0.85 : 1,
                  border: '1px solid #81c784',
                  color: '#2e7d32',
                }}
              >
                {feedbackSubmitted ? feedbackSubmittedLabel : feedbackLabel}
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
