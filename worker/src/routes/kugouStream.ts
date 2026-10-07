import { checkKugouQrCode } from '../providers/kugou/auth';

/**
 * SSE endpoint: GET /api/kugou/login/stream?qrcode=<key>
 *
 * Kugou offers no server-to-server callback, so the Worker polls Kugou inside one
 * long-lived response and pushes status transitions to the browser:
 *   event: status   data: { status: 'waiting' | 'scanned', message }
 *   event: success  data: { token, userid }
 *   event: expired  data: { message }
 *   event: failed   data: { message }
 *   event: retry    data: {}   (time to reconnect; subrequest budget reached)
 *
 * Free plan caps each request at 50 subrequests. At a 2.5s polling interval the
 * connection is closed after ~95s (~38 upstream polls) and the EventSource client
 * automatically reconnects, resetting the budget.
 */

const POLL_INTERVAL_MS = 2500;
const MAX_CONNECTION_MS = 95_000;
const QRCODE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function sseFrame(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function handleKugouLoginStream(
  request: Request,
  responseHeaders: Record<string, string>,
): Response {
  const url = new URL(request.url);
  const qrcode = url.searchParams.get('qrcode') || '';

  if (!QRCODE_PATTERN.test(qrcode)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing or invalid qrcode parameter.' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
    );
  }

  const encoder = { write: (event: string, data: unknown) => sseFrame(event, data) };
  let settled = false;
  let waitTimer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        if (!settled) controller.enqueue(encoder.write(event, data));
      };
      const close = () => {
        if (settled) return;
        settled = true;
        if (waitTimer) clearTimeout(waitTimer);
        controller.close();
      };

      const startedAt = Date.now();
      let lastStatus = '';

      try {
        for (;;) {
          const result = await checkKugouQrCode(qrcode);

          if (result.status === 'success') {
            enqueue('success', { token: result.token, userid: result.userid });
            close();
            return;
          }
          if (result.status === 'expired' || result.status === 'failed') {
            enqueue(result.status, { message: result.message });
            close();
            return;
          }
          if (result.status !== lastStatus) {
            lastStatus = result.status;
            enqueue('status', { status: result.status, message: result.message });
          }

          if (Date.now() - startedAt >= MAX_CONNECTION_MS) {
            enqueue('retry', {});
            close();
            return;
          }

          await new Promise<void>((resolve) => {
            waitTimer = setTimeout(resolve, POLL_INTERVAL_MS);
          });
        }
      } catch (err) {
        enqueue('failed', {
          message: err instanceof Error ? err.message : 'Kugou upstream check failed.',
        });
        close();
      }
    },
    cancel() {
      settled = true;
      if (waitTimer) clearTimeout(waitTimer);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...responseHeaders,
    },
  });
}
