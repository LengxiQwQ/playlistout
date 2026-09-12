/**
 * Standard Security Headers for Worker API responses.
 * Follows OWASP recommendations.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

/**
 * Attaches security headers to an existing response headers object.
 */
export function applySecurityHeaders(headers: HeadersInit = {}): Record<string, string> {
  const result: Record<string, string> = { ...SECURITY_HEADERS };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key] = value;
    }
  } else if (typeof headers === 'object' && headers !== null) {
    Object.assign(result, headers);
  }

  return result;
}
