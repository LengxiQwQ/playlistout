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

/**
 * Strict exact-match allowlist for POST /api/event and preflight OPTIONS /api/event.
 * Wildcards, hostname suffix matching (*.lengxiqwq.com), and arbitrary localhost ports
 * are strictly prohibited to prevent unauthorized subdomains from polluting analytics.
 *
 * NOTE: Origin validation is a browser trust boundary, NOT cryptographic authentication.
 * Non-browser clients (e.g. curl) can forge the Origin header.
 */
export const EVENT_ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://playlistout.com',
  'https://www.playlistout.com',
  'https://playlistout.lengxiqwq.com',
  'https://lengxiqwq.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export function isEventOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return EVENT_ALLOWED_ORIGINS.has(origin);
}

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

export function isPublicEndpoint(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname === '/api/health' ||
    pathname === '/api/stats' ||
    pathname === '/api/playlist' ||
    pathname === '/api/user/playlists' ||
    pathname === '/api/v1/resolve' ||
    pathname === '/api/v1/playlist' ||
    pathname === '/api/v1/user/playlists' ||
    pathname === '/api/v1/stats' ||
    pathname === '/api/v1/health'
  );
}

export function getCorsHeaders(request: Request, pathname?: string): Record<string, string> {
  const path = pathname ?? (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return '';
    }
  })();

  if (isPublicEndpoint(path)) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Accept, Authorization, X-Kugou-Userid, X-Kugou-Token, X-Sample-Request',
      'Access-Control-Max-Age': '86400',
    };
  }

  // Strictly no browser CORS for internal stats endpoint (R6 Requirement 19 & 46)
  if (path === '/api/internal/stats') {
    return {
      Vary: 'Origin',
    };
  }

  // Internal feedback endpoint: token-protected, used by local dashboard (file:// origin = "null")
  if (path === '/api/internal/feedback') {
    const origin = request.headers.get('Origin');
    return {
      Vary: 'Origin',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }

  if (path === '/api/event' || path === '/api/feedback') {
    const origin = request.headers.get('Origin');
    const headers: Record<string, string> = {
      Vary: 'Origin',
    };

    if (origin && isEventOriginAllowed(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept';
      headers['Access-Control-Max-Age'] = '86400';
    }

    return headers;
  }

  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] =
      'Content-Type, Accept, Authorization, X-Kugou-Userid, X-Kugou-Token, X-Sample-Request';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

export function handleOptions(request: Request, pathname?: string): Response {
  const path = pathname ?? (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return '';
    }
  })();

  // Strictly reject browser preflight on internal stats endpoint (R6)
  if (path === '/api/internal/stats') {
    return new Response(null, {
      status: 403,
      headers: { Vary: 'Origin' },
    });
  }

  // Internal feedback endpoint: allow preflight (token-protected, local dashboard use)
  if (path === '/api/internal/feedback') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, path),
    });
  }

  if (isPublicEndpoint(path)) {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, path),
    });
  }

  if (path === '/api/event' || path === '/api/feedback') {
    const origin = request.headers.get('Origin');
    if (!origin || !isEventOriginAllowed(origin)) {
      return new Response(null, {
        status: 403,
        headers: { Vary: 'Origin' },
      });
    }
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, path),
    });
  }

  const origin = request.headers.get('Origin');
  if (origin && !isOriginAllowed(origin)) {
    return new Response(null, {
      status: 403,
      headers: { Vary: 'Origin' },
    });
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, path),
  });
}

