import React from 'react';

export interface StatusAlertProps {
  type: 'error' | 'info';
  message: string;
  code?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  type,
  message,
  code,
  onRetry,
  title,
  retryLabel = '重试',
}) => {
  const isError = type === 'error';
  const defaultTitle = isError ? 'Oops —' : 'Note —';

  return (
    <div
      className={`status-alert status-alert-${type} hand-drawn-border-alt shadow-cutout-sm`}
      role="alert"
      data-testid={`status-alert-${type}`}
      style={{
        backgroundColor: isError ? 'var(--note-error, #ffebee)' : 'var(--note-blue, #e8f8ff)',
        padding: '1rem 1.25rem',
        marginTop: '1.25rem',
        transform: 'rotate(-0.5deg)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div
            className="font-marker"
            style={{
              fontSize: '1.25rem',
              color: isError ? 'var(--error-ink, #c0392b)' : 'var(--ink, #2d3436)',
              marginBottom: '0.25rem',
            }}
          >
            {title || defaultTitle}
          </div>
          <p
            className="alert-message font-handwriting"
            style={{
              fontSize: '1.2rem',
              color: 'var(--ink, #2d3436)',
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            {message}
          </p>
          {code && (
            <span
              className="alert-code font-mono"
              style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                backgroundColor: 'rgba(45, 52, 54, 0.08)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                marginTop: '0.4rem',
                color: 'var(--ink-light, #636e72)',
              }}
            >
              CODE: {code}
            </span>
          )}
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-retry sticker font-handwriting"
            style={{
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.85rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              alignSelf: 'center',
            }}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
};
