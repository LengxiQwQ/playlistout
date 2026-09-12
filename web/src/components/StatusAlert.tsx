import React from 'react';

interface StatusAlertProps {
  type: 'error' | 'info';
  message: string;
  code?: string;
  onRetry?: () => void;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({ type, message, code, onRetry }) => {
  return (
    <div className={`status-alert status-alert-${type}`} role="alert" data-testid={`status-alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">{type === 'error' ? '⚠️' : 'ℹ️'}</span>
        <div className="alert-text">
          <p className="alert-message">{message}</p>
          {code && <span className="alert-code">错误代码: {code}</span>}
        </div>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-retry">
          重试
        </button>
      )}
    </div>
  );
};
