import { Hono } from 'hono';
import {
  createKugouQrCode,
  checkKugouQrCode,
  fetchKugouUserPlaylists,
  fetchKugouUserProfile,
} from '../providers/kugou';
import { ProviderError } from '../models/playlist';
import { handleKugouLoginStream } from './kugouStream';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { extractClientAuth } from '../security/client-auth';
import type { Env } from '../env';

export const kugouAuthRoutes = new Hono<{ Bindings: Env }>();

// GET /api/kugou/login/qr
kugouAuthRoutes.all('/kugou/login/qr', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  try {
    const qrSession = await createKugouQrCode();
    return new Response(JSON.stringify({ success: true, data: qrSession }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...responseHeaders },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: err instanceof Error ? err.message : 'Failed to generate Kugou QR code',
        },
      }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }
});

// GET /api/kugou/login/check
kugouAuthRoutes.all('/kugou/login/check', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const qrcode = url.searchParams.get('qrcode');
  if (!qrcode) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing required query parameter: qrcode' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }

  try {
    const statusResult = await checkKugouQrCode(qrcode);
    return new Response(JSON.stringify({ success: true, data: statusResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...responseHeaders },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: err instanceof Error ? err.message : 'Failed to check Kugou QR status',
        },
      }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }
});

// GET /api/kugou/login/stream
kugouAuthRoutes.all('/kugou/login/stream', (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  return handleKugouLoginStream(request, responseHeaders);
});

// GET /api/kugou/auth/status
kugouAuthRoutes.all('/kugou/auth/status', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const auth = extractClientAuth(request);
  const token = auth?.token;
  const userid = auth?.userid;

  if (!token || !userid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing Authorization Bearer token or X-Kugou-Userid header.',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }

  try {
    await fetchKugouUserPlaylists(token, userid);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: 'valid',
          userid,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  } catch (err: unknown) {
    if (
      err instanceof ProviderError &&
      (err.code === 'FORBIDDEN' || (err.details as any)?.authInvalid)
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'invalid',
            message: 'Kugou session expired or rejected by upstream service.',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Kugou upstream service temporarily unavailable. Could not verify session status.',
        },
      }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }
});

// GET /api/kugou/profile
kugouAuthRoutes.all('/kugou/profile', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const auth = extractClientAuth(request);
  const token = auth?.token;
  const userid = auth?.userid;

  if (!token || !userid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing Authorization Bearer token or X-Kugou-Userid header.',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }

  try {
    const profile = await fetchKugouUserProfile(token, userid);
    return new Response(
      JSON.stringify({ success: true, data: profile }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...responseHeaders } },
    );
  } catch (err: unknown) {
    if (
      err instanceof ProviderError &&
      (err.code === 'FORBIDDEN' || (err.details as any)?.authInvalid)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Kugou session expired or rejected by upstream service.' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...responseHeaders } },
      );
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Kugou user profile is temporarily unavailable.',
        },
      }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...responseHeaders } },
    );
  }
});
