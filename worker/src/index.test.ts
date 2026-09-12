import { describe, it, expect } from 'vitest';
import worker from './index';

interface HealthResponseBody {
  status: string;
  service: string;
  version: string;
  phase: string;
}

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

describe('Worker Endpoints', () => {
  it('responds with ok to /health', async () => {
    const request = new Request('https://api.playlistout.com/health');
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthResponseBody;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('playlistout-api');
    expect(body.phase).toBe('P1-QQMusic-Provider-Core');
  });

  it('responds with ok to /api/health with CORS header', async () => {
    const request = new Request('https://api.playlistout.com/api/health', {
      headers: { Origin: 'https://playlistout.com' },
    });
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.com');
  });

  it('returns 400 when /api/playlist is missing url parameter', async () => {
    const request = new Request('https://api.playlistout.com/api/playlist');
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when /api/playlist is queried with unsupported music platform', async () => {
    const request = new Request('https://api.playlistout.com/api/playlist?url=https://music.163.com/playlist?id=123');
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNSUPPORTED_URL');
  });

  it('strictly blocks /proxy attempts with 403 Forbidden', async () => {
    const request = new Request('https://api.playlistout.com/proxy?url=https://example.com');
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for unknown routes', async () => {
    const request = new Request('https://api.playlistout.com/unknown');
    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(404);
  });
});
