/**
 * Kugou Authentication Utilities
 * Manages user token and userid in browser localStorage.
 * Aligns with zero-database / privacy-first principles (stored exclusively on client).
 */

export interface KugouAuthData {
  token: string;
  userid: string;
}

export const KUGOU_TOKEN_KEY = 'kugou_token';
export const KUGOU_USERID_KEY = 'kugou_userid';

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
      window.dispatchEvent(new CustomEvent('playlistout:kugou-auth-changed'));
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
      window.dispatchEvent(new CustomEvent('playlistout:kugou-auth-changed'));
    }
  } catch {
    // localStorage security restrictions
  }
}

export function hasKugouAuth(): boolean {
  return getKugouAuth() !== null;
}
