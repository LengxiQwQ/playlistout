import React from 'react';

export interface StatusAlertProps {
  type: 'error' | 'info';
  message: string;
  code?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
  onFeedback?: () => void;
  feedbackLabel?: string;
  feedbackSubmittedLabel?: string;
  feedbackNotice?: string;
  feedbackSubmitted?: boolean;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  type,
  message,
  code,
  onRetry,
  title,
  retryLabel = '重试',
  onFeedback,
  feedbackLabel = '一键反馈',
  feedbackSubmittedLabel = '已反馈 ✓',
  feedbackNotice,
  feedbackSubmitted = false,
}) => {
  const isError = type === 'error';
  const defaultTitle = isError ? 'Oops —' : 'Note —';
  const hasActions = onRetry || onFeedback;

  return (
    <div
      className={`status-alert status-alert-${type} hand-drawn-border-alt shadow-cutout-sm`}
      role="alert"
      data-testid={`status-alert-${type}`}
      style={{
        backgroundColor: isError ? 'var(--note-error, #ffebee)' : 'var(--note-blue, #e8f8ff)',
        padding: '1.1rem 1.25rem',
        marginTop: '1.25rem',
        ['--rot' as any]: '-0.5deg',
        position: 'relative',
      }}
    >
      {/* Header row: icon + title + code */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem', lineHeight: 1 }} aria-hidden="true">
            {isError ? '⚠️' : 'ℹ️'}
          </span>
          <span
            className="font-marker"
            style={{
              fontSize: '1.2rem',
              color: isError ? 'var(--error-ink, #c0392b)' : 'var(--ink, #2d3436)',
              fontWeight: 700,
            }}
          >
            {title || defaultTitle}
          </span>
        </div>
        {code && (
          <span
            className="alert-code font-mono"
            style={{
              fontSize: '0.7rem',
              backgroundColor: 'rgba(45, 52, 54, 0.08)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              color: 'var(--ink-light, #636e72)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {code}
          </span>
        )}
      </div>

      {/* Message */}
      <p
        className="alert-message font-handwriting"
        style={{
          fontSize: '1.15rem',
          color: 'var(--ink, #2d3436)',
          lineHeight: 1.4,
          margin: '0 0 0.75rem',
          paddingLeft: '2rem',
        }}
      >
        {message}
      </p>

      {/* Bottom action bar */}
      {hasActions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed rgba(45, 52, 54, 0.2)',
            flexWrap: 'wrap',
            paddingLeft: '2rem',
          }}
        >
          {feedbackNotice && (
            <p
              className="font-handwriting"
              style={{
                fontSize: '0.82rem',
                color: 'var(--ink-light, #636e72)',
                margin: 0,
                lineHeight: 1.4,
                flex: '1 1 200px',
                maxWidth: '60%',
              }}
            >
              {feedbackNotice}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, marginLeft: 'auto' }}>
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
          </div>
        </div>
      )}
    </div>
  );
};
