import { describe, expect, it } from 'vitest';
import { getCorsHeaders, handleOptions } from './cors';

describe('maintainer analytics snapshot CORS boundary', () => {
  it('does not expose the snapshot endpoint to browser CORS', () => {
    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/internal/analytics/v2/snapshot',
      { headers: { Origin: 'http://127.0.0.1:4178' } },
    );
    const headers = getCorsHeaders(request, '/api/internal/analytics/v2/snapshot');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers.Vary).toBe('Origin');
  });

  it('rejects browser preflight for the snapshot endpoint', () => {
    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/internal/analytics/v2/snapshot',
      {
        method: 'OPTIONS',
        headers: { Origin: 'http://127.0.0.1:4178' },
      },
    );
    const response = handleOptions(request, '/api/internal/analytics/v2/snapshot');
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('allows trusted production and local origins for the web maintainer dashboard', () => {
    const trustedOrigins = ['https://playlistout.lengxiqwq.com', 'http://localhost:5173'];
    for (const origin of trustedOrigins) {
      const getReq = new Request(
        'https://playlistout-api.lengxiqwq.com/api/internal/analytics/v2/snapshot',
        { headers: { Origin: origin } },
      );
      const headers = getCorsHeaders(getReq, '/api/internal/analytics/v2/snapshot');
      expect(headers['Access-Control-Allow-Origin']).toBe(origin);
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');

      const optReq = new Request(
        'https://playlistout-api.lengxiqwq.com/api/internal/analytics/v2/snapshot',
        { method: 'OPTIONS', headers: { Origin: origin } },
      );
      const optRes = handleOptions(optReq, '/api/internal/analytics/v2/snapshot');
      expect(optRes.status).toBe(204);
      expect(optRes.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
  });
});
