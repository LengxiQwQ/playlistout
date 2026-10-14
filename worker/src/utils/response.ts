import { getCorsHeaders } from '../cors';
import { applySecurityHeaders } from '../security/headers';

export function getStandardResponseHeaders(request: Request, pathname?: string): Record<string, string> {
  const path = pathname ?? new URL(request.url).pathname;
  const corsHeaders = getCorsHeaders(request, path);
  return applySecurityHeaders(corsHeaders);
}

export function methodNotAllowed(
  request: Request,
  allowedMethods: string[],
  responseHeaders: Record<string, string>,
  customMessage?: string,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message:
          customMessage ||
          `HTTP method ${request.method} is not allowed on this endpoint. Use ${allowedMethods.join(', ')}.`,
      },
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: `${allowedMethods.join(', ')}, OPTIONS`,
        ...responseHeaders,
      },
    },
  );
}
