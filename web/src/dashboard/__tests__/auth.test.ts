import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAuthToken, saveAuthToken, clearAuthToken, isRemembered, verifyAuthToken } from '../auth';

describe('Dashboard Auth Unit Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves token to sessionStorage when remember is false', () => {
    saveAuthToken('secret_token_123', false);
    expect(getAuthToken()).toBe('secret_token_123');
    expect(sessionStorage.getItem('playlistout_admin_token')).toBe('secret_token_123');
    expect(localStorage.getItem('playlistout_admin_token')).toBeNull();
    expect(isRemembered()).toBe(false);
  });

  it('saves token to localStorage when remember is true', () => {
    saveAuthToken('persistent_token_456', true);
    expect(getAuthToken()).toBe('persistent_token_456');
    expect(localStorage.getItem('playlistout_admin_token')).toBe('persistent_token_456');
    expect(sessionStorage.getItem('playlistout_admin_token')).toBeNull();
    expect(isRemembered()).toBe(true);
  });

  it('clears token from all storages on logout', () => {
    saveAuthToken('temp_token', true);
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('playlistout_admin_token')).toBeNull();
    expect(sessionStorage.getItem('playlistout_admin_token')).toBeNull();
    expect(isRemembered()).toBe(false);
  });

  it('verifyAuthToken returns true on 200 success response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const ok = await verifyAuthToken('valid_admin_token');
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/internal/auth/verify'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid_admin_token',
        }),
      }),
    );
  });

  it('verifyAuthToken returns false on 401 unauthorized response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const ok = await verifyAuthToken('invalid_token');
    expect(ok).toBe(false);
  });
});
