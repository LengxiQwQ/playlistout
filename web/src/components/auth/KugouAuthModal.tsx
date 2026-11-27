import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n';
import { Tape } from '../ui/Tape';
import { MarkerButton } from '../ui/MarkerButton';
import { Sticker } from '../ui/Sticker';
import {
  fetchKugouQrCode,
  checkKugouQrCode,
  fetchKugouProfile,
  streamKugouQrStatus,
  type KugouQrSession,
  type KugouUserProfile,
} from '../../api/client';
import {
  setKugouAuth,
  getKugouAuth,
  clearKugouAuth,
  getStoredKugouProfile,
  setStoredKugouProfile,
  checkKugouSession,
  type KugouAuthState,
} from '../../utils/kugouAuth';
import { KugouApiCredentials } from './KugouApiCredentials';
import { KugouProfileCard } from './KugouProfileCard';
import { KugouQrCodeBox } from './KugouQrCodeBox';

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
  const [profile, setProfile] = useState<KugouUserProfile | null>(() => getStoredKugouProfile());
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const pollTimerRef = useRef<any>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const pendingSuccessRef = useRef<boolean>(false);

  const handleModalClose = () => {
    const shouldNotifySuccess = pendingSuccessRef.current;
    pendingSuccessRef.current = false;
    onClose();
    if (shouldNotifySuccess) {
      onSuccess?.();
    }
  };

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
      pendingSuccessRef.current = false;
      const existing = getKugouAuth();
      if (existing) {
        runValidation();
      } else {
        setAuthState('none');
        loadQrCode();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleModalClose();
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

  // Load a lightweight account profile only after the login session is validated.
  useEffect(() => {
    let cancelled = false;

    if (!isOpen || authState !== 'valid') {
      if (!isOpen && !getKugouAuth()) {
        setProfile(null);
        setProfileLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    const auth = getKugouAuth();
    if (!auth) {
      setProfile(null);
      setStoredKugouProfile(null);
      setProfileLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Use cached profile immediately so avatar is ready on frame 0
    const cached = getStoredKugouProfile();
    if (cached) {
      setProfile(cached);
    } else {
      setProfileLoading(true);
    }

    fetchKugouProfile(auth.token, auth.userid)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setProfile(res.data);
          setStoredKugouProfile(res.data);
        } else if (!cached) {
          setProfile(null);
        }
      })
      .catch(() => {
        if (!cancelled && !cached) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, authState]);

  // QR login status transport: SSE first (one long-lived request, server pushes
  // transitions), automatically falling back to 2s client polling if the stream
  // cannot connect. The connection is NOT rebuilt on waiting->scanned transitions.
  useEffect(() => {
    if (
      !isOpen ||
      !qrSession?.qrcode ||
      authState === 'valid'
    ) {
      return;
    }

    let cancelled = false;
    let transport: 'sse' | 'polling' = 'sse';
    let closeStream: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let sseErrorCount = 0;
    let sseReceived = false;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const applySuccess = (tokenValue: string, useridValue: string) => {
      setKugouAuth(tokenValue, useridValue);
      setAuthState('valid');
      setStatus('success');
      pendingSuccessRef.current = true;
    };

    const isLocallyExpired = () =>
      Boolean(qrSession.expiresAt && Date.now() > qrSession.expiresAt);

    const runPoll = async () => {
      if (isLocallyExpired()) {
        setStatus('expired');
        stopPolling();
        return;
      }
      try {
        const res = await checkKugouQrCode(qrSession.qrcode);
        if (cancelled) return;
        if (res.success && res.data) {
          consecutiveErrorsRef.current = 0;
          const nextStatus = res.data.status;
          setStatus(nextStatus);
          if (nextStatus === 'success' && res.data.token && res.data.userid) {
            stopPolling();
            applySuccess(res.data.token, res.data.userid);
          } else if (nextStatus === 'expired') {
            stopPolling();
          }
        } else {
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= 3) {
            setStatus('failed');
            setErrorMessage('登录状态检查失败，请检查网络');
            stopPolling();
          }
        }
      } catch {
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 3) {
          setStatus('failed');
          setErrorMessage('登录状态检查遇到网络异常，请重试');
          stopPolling();
        }
      }
    };

    const startPollingFallback = () => {
      if (cancelled || transport === 'polling') return;
      transport = 'polling';
      pollTimer = setInterval(runPoll, 2000);
    };

    // Environments without EventSource (older webviews, test hosts): poll directly.
    if (typeof EventSource === 'undefined') {
      startPollingFallback();
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    closeStream = streamKugouQrStatus(qrSession.qrcode, {
      onStatus: (data) => {
        sseReceived = true;
        sseErrorCount = 0;
        consecutiveErrorsRef.current = 0;
        if (isLocallyExpired()) {
          if (closeStream) closeStream();
          setStatus('expired');
          return;
        }
        if (data.status === 'waiting' || data.status === 'scanned') {
          setStatus(data.status);
        }
      },
      onSuccess: (data) => {
        applySuccess(data.token, data.userid);
      },
      onTerminal: (data, kind) => {
        if (kind === 'expired') {
          setErrorMessage(data.message || null);
          setStatus('expired');
        } else {
          setErrorMessage(data.message || '登录检查异常，请重试');
          setStatus('failed');
        }
      },
      onConnectionError: () => {
        // EventSource also errors briefly during the scheduled 95s reconnect, so
        // only fall back when we never received any event and errors persist.
        sseErrorCount++;
        if (!sseReceived && sseErrorCount >= 2) {
          if (closeStream) closeStream();
          startPollingFallback();
        }
      },
    });

    return () => {
      cancelled = true;
      if (closeStream) closeStream();
      stopPolling();
    };
  }, [isOpen, qrSession?.qrcode, authState]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-backdrop"
      onClick={handleModalClose}
      data-testid="kugou-auth-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-backdrop)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 9999,
        overflowY: 'auto',
        animation: 'modalBackdropFadeIn 0.18s ease-out forwards',
      }}
    >
      <div
        className="modal-container hand-drawn-border paper-shadow"
        data-clarity-mask="true"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kugou-auth-title"
        style={{
          backgroundColor: 'var(--bg-page)',
          maxWidth: '460px',
          width: '100%',
          position: 'relative',
          margin: 'auto',
          padding: '2.25rem 2rem 2rem 2rem',
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

        {/* Top-Right "✕" Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          aria-label="关闭"
          data-testid="kugou-modal-close-btn"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            width: '2.1rem',
            height: '2.1rem',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            lineHeight: 1,
            color: 'var(--text-faint)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            zIndex: 30,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.backgroundColor = 'var(--code-bg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'var(--text-faint)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>

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
            color: 'var(--text-faint)',
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
              backgroundColor: 'var(--bg-sunken)',
              borderRadius: '8px',
              border: '2px dashed var(--line-strong)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div className="font-sans" style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '1rem' }}>
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
              backgroundColor: 'var(--tint-lemon-bg-soft)',
              borderRadius: '8px',
              border: '2px dashed var(--status-pay-border)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--accent-peach)' }}>⚠️</div>
            <div
              className="font-sans"
              style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--status-pay-text)', marginBottom: '0.5rem' }}
            >
              暂时无法验证酷狗登录状态
            </div>
            <p className="font-sans" style={{ fontSize: '0.85rem', color: 'var(--status-pay-text)', marginBottom: '1rem' }}>
              网络连接可能存在波动或酷狗接口暂时不可达。本地保存的凭据已保留。
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <MarkerButton variant="ink" onClick={runValidation}>
                重试验证
              </MarkerButton>
              <MarkerButton
                variant="paper"
                onClick={() => {
                  pendingSuccessRef.current = false;
                  clearKugouAuth();
                  setProfile(null);
                  setProfileLoading(false);
                  setAuthState('none');
                  loadQrCode();
                }}
              >
                重新登录
              </MarkerButton>
              <MarkerButton variant="paper" onClick={handleModalClose}>
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
              backgroundColor: 'var(--tint-sky-bg-soft)',
              borderRadius: '8px',
              border: '2px dashed var(--tint-sky-line)',
              marginBottom: '1.5rem',
            }}
          >
            <KugouProfileCard profile={profile} profileLoading={profileLoading} />

            <p className="font-sans" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              已安全保存本地登录凭证，可直接读取当前账号的完整云歌单。
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                width: '100%',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <MarkerButton
                variant="paper"
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  fontSize: '1.05rem',
                  justifyContent: 'center',
                  color: 'var(--tint-strawberry-fg)',
                }}
                onClick={() => {
                  pendingSuccessRef.current = false;
                  clearKugouAuth();
                  setProfile(null);
                  setProfileLoading(false);
                  setAuthState('none');
                  loadQrCode();
                }}
              >
                {t.search.kugouLogoutBtn}
              </MarkerButton>
            </div>

            {/* Developer / API Credentials Section */}
            <KugouApiCredentials />
          </div>
        )}

        {/* State D: QR Code Scan Flow (none or invalid/expired) */}
        {(authState === 'none' || authState === 'invalid') && (
          <div>
            {authState === 'invalid' && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--status-error-bg)',
                  border: '1px solid var(--status-error-border)',
                  borderRadius: '6px',
                  color: 'var(--status-error-text)',
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
                backgroundColor: 'var(--bg-sunken)',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>1. {t.kugouAuth.step1}</div>
              <div style={{ marginBottom: '0.25rem' }}>2. {t.kugouAuth.step2}</div>
              <div>3. {t.kugouAuth.step3}</div>
            </div>

            {/* QR Code Container */}
            <KugouQrCodeBox
              loading={loading}
              status={status}
              qrSession={qrSession}
              errorMessage={errorMessage}
              onReload={loadQrCode}
            />

            {/* Status Hint */}
            <div
              className="font-handwriting"
              style={{
                fontSize: '1rem',
                color: status === 'scanned' ? 'var(--accent-sky)' : status === 'success' ? 'var(--accent-mint)' : 'var(--text-faint)',
                minHeight: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: 600,
              }}
            >
              {status === 'waiting' && t.kugouAuth.waitingScan}
              {status === 'scanned' && t.kugouAuth.scannedConfirm}
              {status === 'success' && t.kugouAuth.loginSuccess}
            </div>

            {/* Jump to KuGou App button (desktop, tablet & mobile) */}
            {qrSession?.loginUrl && (status === 'waiting' || status === 'scanned') && (
              <div style={{ marginBottom: '1.25rem' }}>
                <a
                  href={qrSession.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="kugou-jump-app-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: '300px',
                    padding: '0.6rem 1rem',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-on-accent)',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 2px 4px color-mix(in srgb, var(--hue-sky) 25%, transparent)',
                    transition: 'all 0.15s ease',
                    margin: '0 auto',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--tint-sky-fg)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }}
                >
                  {t.kugouAuth.jumpToAppBtn}
                </a>
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--text-faint)',
                    marginTop: '0.45rem',
                    lineHeight: 1.4,
                    padding: '0 0.5rem',
                  }}
                >
                  {t.kugouAuth.jumpToAppTip}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Note */}
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-faint)',
            lineHeight: 1.35,
            borderTop: '1px dashed var(--line)',
            paddingTop: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {t.kugouAuth.privacyTip}
        </div>

        {/* Bottom Close Button (only when not in valid connected state) */}
        {authState !== 'valid' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MarkerButton
              variant="paper"
              onClick={handleModalClose}
            >
              {t.kugouAuth.cancel}
            </MarkerButton>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
