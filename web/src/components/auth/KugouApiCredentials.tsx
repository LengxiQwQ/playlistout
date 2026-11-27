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
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '6px',
        border: '1px solid var(--tint-sky-line)',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--tint-sky-fg)',
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
          backgroundColor: 'var(--bg-sunken)',
          padding: '0.35rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid var(--line)',
        }}
      >
        <span
          style={{
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}
          title={currentAuth.token}
        >
          Token: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{currentAuth.token.slice(0, 10)}...</span>
        </span>
        <button
          type="button"
          data-testid="copy-kugou-token-btn"
          onClick={() => handleCopy('token', currentAuth.token)}
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            border: '1px solid var(--line)',
            backgroundColor: copiedKey === 'token' ? 'var(--tint-mint-bg)' : 'var(--bg-surface)',
            color: copiedKey === 'token' ? 'var(--tint-mint-fg)' : 'var(--text)',
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
          backgroundColor: 'var(--bg-sunken)',
          padding: '0.35rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid var(--line)',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>
          User ID: <strong style={{ color: 'var(--text)' }}>{currentAuth.userid}</strong>
        </span>
        <button
          type="button"
          data-testid="copy-kugou-userid-btn"
          onClick={() => handleCopy('userid', currentAuth.userid)}
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            border: '1px solid var(--line)',
            backgroundColor: copiedKey === 'userid' ? 'var(--tint-mint-bg)' : 'var(--bg-surface)',
            color: copiedKey === 'userid' ? 'var(--tint-mint-fg)' : 'var(--text)',
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
