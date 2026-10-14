export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

export function hasForbiddenCredentialQueryParams(url: URL): boolean {
  return (
    url.searchParams.has('token') ||
    url.searchParams.has('auth') ||
    url.searchParams.has('credential') ||
    url.searchParams.has('kugou_token')
  );
}

export function extractClientAuth(request: Request): { token?: string; userid?: string } | undefined {
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  let token =
    (bearerMatch ? bearerMatch[1].trim() : '') ||
    request.headers.get('x-kugou-token')?.trim() ||
    undefined;
  let userid = request.headers.get('x-kugou-userid')?.trim() || undefined;

  // Support combined token:userid format if userid is not separately passed in headers
  if (token && token.includes(':') && !userid) {
    const parts = token.split(':').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (/^\d{5,12}$/.test(parts[0]) && !/^\d{5,12}$/.test(parts[1])) {
        userid = parts[0];
        token = parts[1];
      } else if (/^\d{5,12}$/.test(parts[1]) && !/^\d{5,12}$/.test(parts[0])) {
        token = parts[0];
        userid = parts[1];
      } else {
        token = parts[0];
        userid = parts[1];
      }
    }
  }

  return (token || userid) ? { token, userid } : undefined;
}
