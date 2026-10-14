import React from 'react';
import type { KugouQrSession } from '../../api/client';
import { useTranslation } from '../../i18n';
import { MarkerButton } from '../ui/MarkerButton';

export interface KugouQrCodeBoxProps {
  loading: boolean;
  status: 'waiting' | 'scanned' | 'success' | 'expired' | 'failed';
  qrSession: KugouQrSession | null;
  errorMessage: string | null;
  onReload: () => void;
}

export const KugouQrCodeBox: React.FC<KugouQrCodeBoxProps> = ({
  loading,
  status,
  qrSession,
  errorMessage,
  onReload,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1rem auto',
        width: '210px',
        height: '210px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '2px solid #2563eb',
        position: 'relative',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏳</div>
          <div>生成中...</div>
        </div>
      ) : status === 'expired' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '1rem',
          }}
          onClick={onReload}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
          <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t.kugouAuth.loginExpired}
          </div>
          <MarkerButton variant="paper" onClick={onReload}>
            {t.kugouAuth.refreshQr}
          </MarkerButton>
        </div>
      ) : status === 'scanned' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
          <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.95rem' }}>
            {t.kugouAuth.scannedConfirm}
          </div>
        </div>
      ) : status === 'success' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', color: '#16a34a', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>
            {t.kugouAuth.loginSuccess}
          </div>
        </div>
      ) : qrSession?.qrcodeImg ? (
        <img
          src={qrSession.qrcodeImg}
          alt="Kugou Login QR Code"
          style={{ width: '190px', height: '190px', objectFit: 'contain' }}
        />
      ) : (
        <div style={{ color: '#ef4444', padding: '1rem', fontSize: '0.85rem' }}>
          {errorMessage || '无法载入二维码'}
          <div style={{ marginTop: '0.75rem' }}>
            <MarkerButton variant="paper" onClick={onReload}>
              {t.kugouAuth.refreshQr}
            </MarkerButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default KugouQrCodeBox;
