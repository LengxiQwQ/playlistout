/**
 * Kugou Authentication Utilities & State Machine
 * Manages user token and userid in browser localStorage.
 * Aligns with zero-database / privacy-first principles (stored exclusively on client).
 */

import { validateKugouAuth } from '../api/client';

export type KugouAuthState = 'none' | 'checking' | 'valid' | 'invalid' | 'unknown';

export interface KugouAuthData {
  token: string;
  userid: string;
}

export const KUGOU_TOKEN_KEY = 'kugou_token';
export const KUGOU_USERID_KEY = 'kugou_userid';

let currentAuthState: KugouAuthState = 'none';

export function getKugouAuth(): KugouAuthData | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const token = window.localStorage.getItem(KUGOU_TOKEN_KEY);
    const userid = window.localStorage.getItem(KUGOU_USERID_KEY);
    if (token && userid) {
      return { token, userid };
    }
  } catch {
    // localStorage security restrictions
  }
  return null;
}

export function setKugouAuth(token: string, userid: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KUGOU_TOKEN_KEY, token);
      window.localStorage.setItem(KUGOU_USERID_KEY, userid);
      currentAuthState = 'valid';
      window.dispatchEvent(
        new CustomEvent('playlistout:kugou-auth-changed', {
          detail: { state: 'valid', auth: { token, userid } },
        }),
      );
    }
  } catch {
    // localStorage security restrictions
  }
}

export function clearKugouAuth(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(KUGOU_TOKEN_KEY);
      window.localStorage.removeItem(KUGOU_USERID_KEY);
      currentAuthState = 'none';
      window.dispatchEvent(
        new CustomEvent('playlistout:kugou-auth-changed', {
          detail: { state: 'none', auth: null },
        }),
      );
    }
  } catch {
    // localStorage security restrictions
  }
}

export function hasKugouAuth(): boolean {
  return getKugouAuth() !== null;
}

export function getKugouAuthState(): KugouAuthState {
  if (!hasKugouAuth()) {
    currentAuthState = 'none';
    return 'none';
  }
  return currentAuthState === 'none' ? 'checking' : currentAuthState;
}

export function setKugouAuthState(state: KugouAuthState): void {
  currentAuthState = state;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('playlistout:kugou-auth-changed', {
        detail: { state, auth: getKugouAuth() },
      }),
    );
  }
}

/**
 * Validates the currently stored Kugou credentials with backend API.
 * Guarantees:
 * - If valid: authState = 'valid'
 * - If explicitly rejected / expired: clearKugouAuth(), authState = 'invalid'
 * - If network / upstream error: PRESERVES credentials! authState = 'unknown'
 */
export async function checkKugouSession(): Promise<KugouAuthState> {
  const auth = getKugouAuth();
  if (!auth) {
    currentAuthState = 'none';
    setKugouAuthState('none');
    return 'none';
  }

  currentAuthState = 'checking';
  setKugouAuthState('checking');

  try {
    const res = await validateKugouAuth(auth.token, auth.userid);
    if (res.success && res.data?.status === 'valid') {
      currentAuthState = 'valid';
      setKugouAuthState('valid');
      return 'valid';
    }

    if (res.success && res.data?.status === 'invalid') {
      // Explicit invalidation from upstream: clear credentials
      clearKugouAuth();
      currentAuthState = 'invalid';
      setKugouAuthState('invalid');
      return 'invalid';
    }

    // Backend returned 502 / network error / could not verify: DO NOT CLEAR CREDENTIALS
    currentAuthState = 'unknown';
    setKugouAuthState('unknown');
    return 'unknown';
  } catch {
    // Network failure: DO NOT CLEAR CREDENTIALS
    currentAuthState = 'unknown';
    setKugouAuthState('unknown');
    return 'unknown';
  }
}
