export const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://playlistout.com',
  'https://www.playlistout.com',
  'https://playlistout.lengxiqwq.com',
  'https://lengxiqwq.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const protocol = url.protocol;

    if (protocol === 'https:') {
      if (
        hostname === 'playlistout.com' ||
        hostname.endsWith('.playlistout.com') ||
        hostname === 'lengxiqwq.com' ||
        hostname.endsWith('.lengxiqwq.com') ||
        hostname === 'lengxiqwq.github.io'
      ) {
        return true;
      }
    }

    if ((protocol === 'http:' || protocol === 'https:') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] =
      'Content-Type, Accept, Authorization, X-Kugou-Userid, X-Kugou-Token';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

export function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin');
  if (origin && !isOriginAllowed(origin)) {
    return new Response(null, {
      status: 403,
      headers: { Vary: 'Origin' },
    });
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

