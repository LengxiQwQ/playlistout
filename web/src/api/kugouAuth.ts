import type { ApiResponse } from './types';
import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';

export interface KugouQrSession {
  qrcode: string;
  qrcodeImg: string;
  loginUrl: string;
  expiresAt: number;
}

export interface KugouQrStatusResult {
  status: 'waiting' | 'scanned' | 'success' | 'expired' | 'failed';
  token?: string;
  userid?: string;
  message?: string;
}

export interface KugouUserProfile {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  signature?: string;
}

export interface KugouSessionValidationResult {
  status: 'valid' | 'invalid';
  userid?: string;
  message?: string;
}

/**
 * Requests a new Kugou QR code session from Worker backend.
 */
export async function fetchKugouQrCode(): Promise<ApiResponse<KugouQrSession>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/login/qr`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/login/qr`, {
        headers: { Accept: 'application/json' },
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '获取酷狗登录二维码失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/login/qr`, {
          headers: { Accept: 'application/json' },
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '获取酷狗登录二维码失败',
      },
    };
  }
}

/**
 * Checks status of Kugou QR code session.
 */
export async function checkKugouQrCode(qrcode: string): Promise<ApiResponse<KugouQrStatusResult>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(
        `${REMOTE_API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '检测酷狗登录状态失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(
          `${REMOTE_API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`,
          { headers: { Accept: 'application/json' } },
        );
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '检测酷狗登录状态失败',
      },
    };
  }
}

/**
 * Validates whether existing Kugou credentials are still active and accepted by upstream service.
 * Follows zero-trust: passes credentials strictly via headers (Authorization: Bearer + X-Kugou-Userid).
 */
export async function validateKugouAuth(
  token: string,
  userid: string,
): Promise<ApiResponse<KugouSessionValidationResult>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Kugou-Userid': userid,
  };
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/auth/status`, {
      headers,
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/auth/status`, {
        headers,
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '验证酷狗登录状态失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/auth/status`, {
          headers,
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '验证酷狗登录状态失败',
      },
    };
  }
}

export async function fetchKugouProfile(
  token: string,
  userid: string,
): Promise<ApiResponse<KugouUserProfile>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Kugou-Userid': userid,
  };

  const requestProfile = async (baseUrl: string): Promise<ApiResponse<KugouUserProfile> | null> => {
    const response = await fetch(`${baseUrl}/api/kugou/profile`, { headers });
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    }
    return null;
  };

  try {
    const local = await requestProfile(API_BASE_URL);
    if (local) return local;

    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallback = await requestProfile(REMOTE_API_BASE_URL);
      if (fallback) return fallback;
    }

    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '读取酷狗账号资料失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallback = await requestProfile(REMOTE_API_BASE_URL);
        if (fallback) return fallback;
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '读取酷狗账号资料失败',
      },
    };
  }
}

export interface KugouStreamHandlers {
  onStatus: (data: { status: string; message?: string }) => void;
  onSuccess: (data: { token: string; userid: string }) => void;
  onTerminal: (data: { message?: string }, kind: 'expired' | 'failed') => void;
  onConnectionError: () => void;
}

/**
 * Subscribes to the Kugou QR login SSE stream. Returns a close function.
 * The browser EventSource reconnects automatically when the server closes the
 * connection at its subrequest-budget boundary (the server sends `retry` first).
 */
export function streamKugouQrStatus(qrcode: string, handlers: KugouStreamHandlers): () => void {
  const base = API_BASE_URL || REMOTE_API_BASE_URL;

  if (typeof EventSource === 'undefined') {
    handlers.onConnectionError();
    return () => {};
  }

  const es = new EventSource(
    `${base}/api/kugou/login/stream?qrcode=${encodeURIComponent(qrcode)}`,
  );

  const parseData = (event: MessageEvent): any => {
    try {
      return JSON.parse(event.data);
    } catch {
      return {};
    }
  };

  es.addEventListener('status', (event) => {
    handlers.onStatus(parseData(event as MessageEvent));
  });
  es.addEventListener('success', (event) => {
    handlers.onSuccess(parseData(event as MessageEvent));
    es.close();
  });
  ['expired', 'failed'].forEach((eventName) => {
    es.addEventListener(eventName, (event) => {
      handlers.onTerminal(
        parseData(event as MessageEvent),
        eventName as 'expired' | 'failed',
      );
      es.close();
    });
  });
  es.addEventListener('retry', () => {
    // No action: EventSource reconnects on the imminent close.
  });
  es.onerror = () => {
    handlers.onConnectionError();
  };

  return () => es.close();
}
