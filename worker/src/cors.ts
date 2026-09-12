const ALLOWED_ORIGINS = [
  'https://playlistout.com',
  'https://www.playlistout.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
