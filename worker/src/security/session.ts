/**
 * Lightweight Stateless Client Session Attestation
 *
 * Web clients fetch an ephemeral token on load via GET /api/session/token.
 * The token format is: v1.<timestamp>.<hmacHex>
 * Valid for 15 minutes.
 * Prevents raw curl/python scripts from masquerading as official web front.
 */

const SESSION_SALT = 'playlistout_session_attestation_2026';

export async function generateSessionToken(secret: string = ''): Promise<string> {
  const now = Date.now();
  const raw = `v1:${now}:${secret || SESSION_SALT}`;
  const data = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  return `v1.${now}.${hashHex}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
  secret: string = '',
  maxAgeMs = 15 * 60 * 1000,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;

  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  // Reject tokens older than maxAgeMs or more than 60s in the future (clock skew tolerance)
  if (now - timestamp > maxAgeMs || timestamp - now > 60000) {
    return false;
  }

  const raw = `v1:${timestamp}:${secret || SESSION_SALT}`;
  const data = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const expectedHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  return parts[2] === expectedHash;
}
