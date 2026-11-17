import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { getKugouAuth } from '../../utils/kugouAuth';

export const KugouApiCredentials: React.FC = () => {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<'token' | 'userid' | null>(null);

  const currentAuth = getKugouAuth();
  if (!currentAuth) return null;

  const handleCopy = async (key: 'token' | 'userid', text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div
      data-testid="kugou-api-credentials"
      style={{
        marginTop: '1.25rem',
        padding: '0.85rem 1rem',
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #d4defc',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#4a5c9e',
          marginBottom: '0.6rem',
        }}
      >
        {t.kugouAuth.apiCredentialsTitle}
      </div>

      {/* Token row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          marginBottom: '0.45rem',
          backgroundColor: '#fffaf3',
          padding: '0.35rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid #f0e6dc',
        }}
      >
        <span
          style={{
            color: '#7a665b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}
          title={currentAuth.token}
        >
          Token: <span style={{ fontFamily: 'monospace', color: '#4a3b34' }}>{currentAuth.token.slice(0, 10)}...</span>
        </span>
        <button
          type="button"
          data-testid="copy-kugou-token-btn"
          onClick={() => handleCopy('token', currentAuth.token)}
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            border: '1px solid #e6d8cc',
            backgroundColor: copiedKey === 'token' ? '#dcf5ea' : '#ffffff',
            color: copiedKey === 'token' ? '#34775e' : '#4a3b34',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {copiedKey === 'token' ? t.kugouAuth.copied : t.kugouAuth.copyToken}
        </button>
      </div>

      {/* User ID row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          marginBottom: 0,
          backgroundColor: '#fffaf3',
          padding: '0.35rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid #f0e6dc',
        }}
      >
        <span style={{ color: '#7a665b' }}>
          User ID: <strong style={{ color: '#4a3b34' }}>{currentAuth.userid}</strong>
        </span>
        <button
          type="button"
          data-testid="copy-kugou-userid-btn"
          onClick={() => handleCopy('userid', currentAuth.userid)}
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            border: '1px solid #e6d8cc',
            backgroundColor: copiedKey === 'userid' ? '#dcf5ea' : '#ffffff',
            color: copiedKey === 'userid' ? '#34775e' : '#4a3b34',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {copiedKey === 'userid' ? t.kugouAuth.copied : t.kugouAuth.copyUserId}
        </button>
      </div>
    </div>
  );
};

export default KugouApiCredentials;
