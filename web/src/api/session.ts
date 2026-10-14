import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';

let cachedSessionToken: string | null = null;
let sessionTokenExpiry: number = 0;
let sessionTokenPromise: Promise<string | null> | null = null;

/**
 * Retrieves or refreshes an ephemeral client session attestation token.
 * Attached as X-PlaylistOut-Session header to distinguish legitimate web browser
 * sessions from raw direct API scraping tools for dual-track rate limiting.
 */
export async function getWebSessionToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedSessionToken && now < sessionTokenExpiry) {
    return cachedSessionToken;
  }
  if (sessionTokenPromise) {
    return sessionTokenPromise;
  }

  sessionTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session/token`, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json();
        if (body.success && body.data?.token) {
          cachedSessionToken = body.data.token;
          sessionTokenExpiry = Date.now() + 13 * 60 * 1000;
          return cachedSessionToken;
        }
      }
      if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/session/token`, {
          headers: { Accept: 'application/json' },
        });
        if (fallbackRes.ok && fallbackRes.headers.get('content-type')?.includes('application/json')) {
          const body = await fallbackRes.json();
          if (body.success && body.data?.token) {
            cachedSessionToken = body.data.token;
            sessionTokenExpiry = Date.now() + 13 * 60 * 1000;
            return cachedSessionToken;
          }
        }
      }
    } catch {
      // Best-effort attestation: browser Origin and Referer serve as secondary attestation
    } finally {
      sessionTokenPromise = null;
    }
    return null;
  })();

  return sessionTokenPromise;
}

export function resetSessionToken(): void {
  cachedSessionToken = null;
  sessionTokenExpiry = 0;
  sessionTokenPromise = null;
}
