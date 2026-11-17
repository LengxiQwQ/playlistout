import type { TextExtractor } from '../international/http';

export function appleTokenPayload(token: string): { iss?: string; exp?: number } {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return {}; }
}

/** Scan bounded windows, preserving split JWTs without retaining the JS bundle. */
export function createAppleTokenExtractor(): TextExtractor {
  let tail = '';
  return (chunk, done) => {
    const text = tail + chunk + (done ? ' ' : '');
    // Require a terminator: a signature split across network chunks is not a
    // complete token. The 4096-char carry exceeds current public JWT sizes.
    const pattern = /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}(?=["'`;\s])/g;
    for (const match of text.matchAll(pattern)) {
      if (match[0].length > 4096) continue;
      const p = appleTokenPayload(match[0]);
      if (p.iss === 'AMPWebPlay' && Number.isFinite(p.exp) && p.exp! * 1000 > Date.now() + 60_000) return match[0];
    }
    tail = text.slice(-4096);
    return undefined;
  };
}
