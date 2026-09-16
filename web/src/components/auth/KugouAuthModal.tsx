import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { Tape } from '../ui/Tape';
import { MarkerButton } from '../ui/MarkerButton';
import { Sticker } from '../ui/Sticker';
import {
  fetchKugouQrCode,
  checkKugouQrCode,
  type KugouQrSession,
} from '../../api/client';
import {
  setKugouAuth,
  getKugouAuth,
  clearKugouAuth,
  checkKugouSession,
  type KugouAuthState,
} from '../../utils/kugouAuth';

export interface KugouAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const KugouAuthModal: React.FC<KugouAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [qrSession, setQrSession] = useState<KugouQrSession | null>(null);
  const [status, setStatus] = useState<'waiting' | 'scanned' | 'success' | 'expired' | 'failed'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authState, setAuthState] = useState<KugouAuthState>('none');

  const pollTimerRef = useRef<any>(null);
  const consecutiveErrorsRef = useRef<number>(0);

  const loadQrCode = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatus('waiting');
    consecutiveErrorsRef.current = 0;
    try {
      const res = await fetchKugouQrCode();
      if (res.success) {
        setQrSession(res.data);
      } else {
        setErrorMessage(res.error.message || '获取二维码失败');
        setStatus('failed');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '获取二维码失败');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setAuthState('checking');
    const resState = await checkKugouSession();
    setAuthState(resState);
    if (resState === 'invalid' || resState === 'none') {
      loadQrCode();
    }
  };

  // Sync login status and validate session on open
  useEffect(() => {
    if (isOpen) {
      const existing = getKugouAuth();
      if (existing) {
        runValidation();
      } else {
        setAuthState('none');
        loadQrCode();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
  }, [isOpen]);

  // Polling logic when qrSession is active and user is not validated
  useEffect(() => {
    if (
      !isOpen ||
      !qrSession?.qrcode ||
      authState === 'valid' ||
      status === 'success' ||
      status === 'expired'
    ) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      // Proactive client-side expiration check against expiresAt
      if (qrSession.expiresAt && Date.now() > qrSession.expiresAt) {
        setStatus('expired');
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }

      try {
        const res = await checkKugouQrCode(qrSession.qrcode);
        if (res.success && res.data) {
          consecutiveErrorsRef.current = 0;
          const nextStatus = res.data.status;
          setStatus(nextStatus);

          if (nextStatus === 'success' && res.data.token && res.data.userid) {
            setKugouAuth(res.data.token, res.data.userid);
            setAuthState('valid');
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            onSuccess?.();
            setTimeout(() => {
              onClose();
            }, 800);
          } else if (nextStatus === 'expired') {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
        } else {
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= 3) {
            setStatus('failed');
            setErrorMessage('登录状态检查失败，请检查网络');
          }
        }
      } catch {
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 3) {
          setStatus('failed');
          setErrorMessage('登录状态检查遇到网络异常，请重试');
        }
      }
    };

    pollTimerRef.current = setInterval(poll, 2000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isOpen, qrSession?.qrcode, status, authState]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="kugou-auth-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(45, 52, 54, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 1000,
        animation: 'modalBackdropFadeIn 0.18s ease-out forwards',
      }}
    >
      <div
        className="modal-container hand-drawn-border paper-shadow"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kugou-auth-title"
        style={{
          backgroundColor: 'var(--paper, #fdfbf7)',
          maxWidth: '460px',
          width: '100%',
          position: 'relative',
          padding: '2rem',
          borderRadius: '4px',
          textAlign: 'center',
        }}
      >
        <Tape
          color="cyan"
          rotateDeg={-2}
          width="120px"
          style={{
            position: 'absolute',
            top: '-0.85rem',
            left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            zIndex: 10,
          }}
        />

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <Sticker color="blue" rotateDeg={-1.5}>
            {t.kugouAuth.modalTitle}
          </Sticker>
        </div>

        <p
          id="kugou-auth-title"
          className="font-sans"
          style={{
            fontSize: '0.92rem',
            color: '#636e72',
            marginBottom: '1.25rem',
            lineHeight: 1.4,
          }}
        >
          {t.kugouAuth.modalSubtitle}
        </p>

        {/* State A: Checking session */}
        {authState === 'checking' && (
          <div
            data-testid="kugou-auth-checking"
            style={{
              padding: '2rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '2px dashed #94a3b8',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div className="font-sans" style={{ fontWeight: 600, color: '#334155', fontSize: '1rem' }}>
              正在验证登录状态...
            </div>
          </div>
        )}

        {/* State B: Unknown / Network error (Retains token, allows retry) */}
        {authState === 'unknown' && (
          <div
            data-testid="kugou-auth-unknown"
            style={{
              padding: '1.5rem',
              backgroundColor: '#fffbeb',
              borderRadius: '8px',
              border: '2px dashed #f59e0b',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#d97706' }}>⚠️</div>
            <div
              className="font-sans"
              style={{ fontWeight: 700, fontSize: '1.05rem', color: '#b45309', marginBottom: '0.5rem' }}
            >
              暂时无法验证酷狗登录状态
            </div>
            <p className="font-sans" style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '1rem' }}>
              网络连接可能存在波动或酷狗接口暂时不可达。本地保存的凭据已保留。
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <MarkerButton variant="ink" onClick={runValidation}>
                重试验证
              </MarkerButton>
              <MarkerButton
                variant="paper"
                onClick={() => {
                  clearKugouAuth();
                  setAuthState('none');
                  loadQrCode();
                }}
              >
                重新登录
              </MarkerButton>
              <MarkerButton variant="paper" onClick={onClose}>
                关闭
              </MarkerButton>
            </div>
          </div>
        )}

        {/* State C: Valid - PlaylistOut Connected */}
        {authState === 'valid' && (
          <div
            data-testid="kugou-auth-valid"
            style={{
              padding: '1.5rem',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '2px dashed #93c5fd',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: '#2563eb' }}>✓</div>
            <div
              className="font-sans"
              style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1d4ed8', marginBottom: '0.5rem' }}
            >
              PlaylistOut 已连接酷狗账号
            </div>
            <p className="font-sans" style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '1.25rem' }}>
              已安全保存本地登录凭证，可直接读取当前账号的完整云歌单。
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <MarkerButton
                variant="ink"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
              >
                使用当前登录状态重新解析
              </MarkerButton>
              <MarkerButton
                variant="paper"
                onClick={() => {
                  clearKugouAuth();
                  setAuthState('none');
                  loadQrCode();
                }}
              >
                {t.search.kugouLogoutBtn}
              </MarkerButton>
              <MarkerButton variant="paper" onClick={onClose}>
                完成
              </MarkerButton>
            </div>
          </div>
        )}

        {/* State D: QR Code Scan Flow (none or invalid/expired) */}
        {(authState === 'none' || authState === 'invalid') && (
          <div>
            {authState === 'invalid' && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                酷狗登录已过期，请重新登录
              </div>
            )}
            {/* Steps mini list */}
            <div
              style={{
                textAlign: 'left',
                backgroundColor: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: '#475569',
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>1. {t.kugouAuth.step1}</div>
              <div style={{ marginBottom: '0.25rem' }}>2. {t.kugouAuth.step2}</div>
              <div>3. {t.kugouAuth.step3}</div>
            </div>

            {/* QR Code Container */}
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
                  onClick={loadQrCode}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                  <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {t.kugouAuth.loginExpired}
                  </div>
                  <MarkerButton variant="paper" onClick={loadQrCode}>
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
                    <MarkerButton variant="paper" onClick={loadQrCode}>
                      {t.kugouAuth.refreshQr}
                    </MarkerButton>
                  </div>
                </div>
              )}
            </div>

            {/* Status Hint */}
            <div
              className="font-handwriting"
              style={{
                fontSize: '1rem',
                color: status === 'scanned' ? '#2563eb' : status === 'success' ? '#16a34a' : '#64748b',
                minHeight: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: 600,
              }}
            >
              {status === 'waiting' && t.kugouAuth.waitingScan}
              {status === 'scanned' && t.kugouAuth.scannedConfirm}
              {status === 'success' && t.kugouAuth.loginSuccess}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div
          style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            lineHeight: 1.35,
            borderTop: '1px dashed #cbd5e1',
            paddingTop: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {t.kugouAuth.privacyTip}
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MarkerButton
            variant="paper"
            onClick={onClose}
          >
            {t.kugouAuth.cancel}
          </MarkerButton>
        </div>
      </div>
    </div>
  );
};
