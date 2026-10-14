import type { Env } from './env';

/**
 * Constant-time comparison for token verification using SHA-256 digests.
 * Prevents timing side-channel leaks and never exposes token details.
 */
export async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const hashA = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(a)));
  const hashB = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(b)));
  if (hashA.length !== hashB.length) return false;
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

/**
 * Verifies maintainer authorization against configured secrets (INSIGHTS_ADMIN_TOKEN or DASHBOARD_PASSWORD).
 */
export async function verifyMaintainerAuth(providedToken: string, env: Env): Promise<boolean> {
  const cleanToken = providedToken.trim();
  if (!cleanToken) return false;
  const configuredSecrets = [env.DASHBOARD_PASSWORD?.trim(), env.INSIGHTS_ADMIN_TOKEN?.trim()].filter(
    (s): s is string => Boolean(s),
  );
  if (configuredSecrets.length === 0) return false;
  for (const secret of configuredSecrets) {
    if (await constantTimeCompare(cleanToken, secret)) {
      return true;
    }
  }
  return false;
}
