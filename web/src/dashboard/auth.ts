/**
 * Authentication management for PlaylistOut Maintainer Dashboard
 */

import { API_BASE_URL, REMOTE_API_BASE_URL } from '../api/client';

const TOKEN_STORAGE_KEY = 'playlistout_admin_token';
const REMEMBER_STORAGE_KEY = 'playlistout_admin_remember';

export function getAuthToken(): string | null {
  try {
    const sessionVal = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionVal && sessionVal.trim()) {
      return sessionVal.trim();
    }
    const localVal = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localVal && localVal.trim()) {
      return localVal.trim();
    }
  } catch {
    // Storage access may be blocked in some privacy modes
  }
  return null;
}

export function saveAuthToken(token: string, remember: boolean): void {
  const clean = token.trim();
  try {
    if (remember) {
      localStorage.setItem(TOKEN_STORAGE_KEY, clean);
      localStorage.setItem(REMEMBER_STORAGE_KEY, '1');
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, clean);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }
  } catch {
    // Best-effort storage
  }
}

export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function isRemembered(): boolean {
  try {
    return localStorage.getItem(REMEMBER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  const clean = token.trim();
  if (!clean) return false;

  const tryEndpoints = [
    `${API_BASE_URL}/api/internal/auth/verify`,
    ...(import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL
      ? [`${REMOTE_API_BASE_URL}/api/internal/auth/verify`]
      : []),
  ];

  for (const url of tryEndpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${clean}`,
        },
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          return true;
        }
      } else if (res.status === 401 || res.status === 403) {
        return false;
      }
    } catch {
      // Try next endpoint if local fails
    }
  }

  return false;
}
