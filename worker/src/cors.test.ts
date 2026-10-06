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
});
