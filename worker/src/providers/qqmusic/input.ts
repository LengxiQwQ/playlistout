import { ProviderError } from '../../models/playlist';

const MAX_INPUT_LENGTH = 2048;

/**
 * Validates and extracts a QQ Music Playlist ID from a given input string.
 * Supports:
 * - Direct numeric playlist ID (5-18 digits, e.g. "9044196528")
 * - Web URLs: "https://y.qq.com/n/ryqq/playlist/<id>"
 * - Mobile web/share URLs: "https://i.y.qq.com/n2/m/share/details/taoge.html?id=<id>"
 * - Alternate mobile URLs: "https://y.qq.com/n/m/detail/taoge/index.html?id=<id>"
 */
export function extractQQPlaylistId(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new ProviderError('INVALID_INPUT', 'Playlist URL or ID must be a non-empty string.', 400);
  }

  const input = rawInput.trim();

  if (input.length === 0) {
    throw new ProviderError('INVALID_INPUT', 'Playlist URL or ID cannot be empty or whitespace only.', 400);
  }

  if (input.length > MAX_INPUT_LENGTH) {
    throw new ProviderError('INVALID_INPUT', `Input exceeds maximum allowed length of ${MAX_INPUT_LENGTH} characters.`, 400);
  }

  // 1. Check if the input is a direct numeric playlist ID
  if (/^\d{5,18}$/.test(input)) {
    return input;
  }

  // 2. Parse as a URL
  let parsedUrl: URL;
  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input);
    if (hasScheme && !/^https?:\/\//i.test(input)) {
      throw new ProviderError('UNSUPPORTED_URL', `Unsupported URL scheme in "${input}". Only HTTP and HTTPS are supported.`, 400);
    }
    const urlToParse = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    parsedUrl = new URL(urlToParse);
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError('INVALID_INPUT', 'The provided input is not a valid URL or numeric playlist ID.', 400);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowedHost =
    hostname === 'y.qq.com' ||
    hostname.endsWith('.y.qq.com') ||
    hostname === 'music.qq.com' ||
    hostname.endsWith('.music.qq.com');

  if (
    (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
    !isAllowedHost
  ) {
    throw new ProviderError('UNSUPPORTED_URL', `Unsupported music platform host: "${hostname}". Currently only QQ Music is supported.`, 400);
  }

  const pathname = parsedUrl.pathname;

  // Case A: Path contains /playlist/<id>, /taoge/<id>, or /playsquare/<id>
  // Handles:
  // - /n/ryqq/playlist/<id>
  // - /n/ryqq_v2/playlist/<id>
  // - /n/yqq/playlist/<id>.html
  // - /playlist/<id>
  // - /taoge/<id>
  // - /playsquare/<id>
  const pathMatch = pathname.match(/\/(?:playlist|taoge|playsquare)(?:_v\d+)?\/(\d{5,18})/i);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Case B: Query parameters containing playlist ID (e.g. id, disstid, dissid, tid, playlist_id)
  // Handles mobile & WeChat share pages:
  // - /n3/other/pages/details/playlist.html?id=<id>
  // - /n2/m/share/details/taoge.html?id=<id>
  // - /w/taoge.html?id=<id>
  // - /qzone/fcg-bin/... or other legacy paths with query params
  const candidateParams = [
    'id',
    'disstid',
    'dissid',
    'tid',
    'playlist_id',
    'diss_id',
    'playlistid',
  ];

  for (const key of candidateParams) {
    const val = parsedUrl.searchParams.get(key);
    if (val && /^\d{5,18}$/.test(val.trim())) {
      return val.trim();
    }
  }

  // Case C: Check hash for query-like parameters or route paths (e.g. #/playlist?id=... or #/playlist/123)
  if (parsedUrl.hash) {
    const hashContent = parsedUrl.hash.replace(/^#[/?]*/, '');
    const hashParams = new URLSearchParams(hashContent.includes('?') ? hashContent.split('?')[1] : hashContent);
    for (const key of candidateParams) {
      const val = hashParams.get(key);
      if (val && /^\d{5,18}$/.test(val.trim())) {
        return val.trim();
      }
    }
    const hashMatch = parsedUrl.hash.match(/\/(?:playlist|taoge|playsquare)(?:_v\d+)?\/(\d{5,18})/i);
    if (hashMatch) {
      return hashMatch[1];
    }
  }

  throw new ProviderError(
    'INVALID_INPUT',
    'Could not extract a valid QQ Music playlist ID from the provided URL. Expected format: https://y.qq.com/n/ryqq/playlist/<id> or https://y.qq.com/n/ryqq_v2/playlist/<id>',
    400,
  );
}

/**
 * Returns true if the input looks like a QQ Music playlist URL or direct ID.
 */
export function matchesQQMusicInput(rawInput: string): boolean {
  if (!rawInput || typeof rawInput !== 'string') return false;
  const input = rawInput.trim();
  if (input.length === 0 || input.length > MAX_INPUT_LENGTH) return false;
  if (/^\d{5,18}$/.test(input)) return true;

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input);
    if (hasScheme && !/^https?:\/\//i.test(input)) {
      return false;
    }
    const urlToParse = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const parsedUrl = new URL(urlToParse);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    const host = parsedUrl.hostname.toLowerCase();
    return (
      host === 'y.qq.com' ||
      host.endsWith('.y.qq.com') ||
      host === 'music.qq.com' ||
      host.endsWith('.music.qq.com')
    );
  } catch {
    return false;
  }
}
