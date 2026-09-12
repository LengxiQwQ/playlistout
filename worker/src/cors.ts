export const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://playlistout.com',
  'https://www.playlistout.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

export function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
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

