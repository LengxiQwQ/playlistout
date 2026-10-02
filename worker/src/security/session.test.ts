import { describe, it, expect } from 'vitest';
import { generateSessionToken, verifySessionToken } from './session';

describe('Session Attestation (Stateless HMAC Token)', () => {
  it('generates a valid session token that passes verification', async () => {
    const token = await generateSessionToken('test-secret');
    expect(token).toMatch(/^v1\.\d+\.[a-f0-9]{32}$/);
    const isValid = await verifySessionToken(token, 'test-secret');
    expect(isValid).toBe(true);
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await generateSessionToken('secret-A');
    const isValid = await verifySessionToken(token, 'secret-B');
    expect(isValid).toBe(false);
  });

  it('rejects expired tokens', async () => {
    // Manually construct token with timestamp from 30 minutes ago
    const oldTime = Date.now() - 30 * 60 * 1000;
    const raw = `v1:${oldTime}:test-secret`;
    const data = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);

    const oldToken = `v1.${oldTime}.${hashHex}`;
    const isValid = await verifySessionToken(oldToken, 'test-secret', 15 * 60 * 1000);
    expect(isValid).toBe(false);
  });

  it('rejects malformed tokens', async () => {
    expect(await verifySessionToken('')).toBe(false);
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken('invalid.token')).toBe(false);
    expect(await verifySessionToken('v2.1234.abcd')).toBe(false);
    expect(await verifySessionToken('v1.notanumber.abcd')).toBe(false);
  });
});
