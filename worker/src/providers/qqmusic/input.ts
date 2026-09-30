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

export function extractUrlFromText(text: string): string {
  const match = text.match(/https?:\/\/[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()\[\]{}]+/i);
  if (match) {
    return match[0].replace(/[.,;:!?，。！？@]+$/, '');
  }
  return text.trim();
}

/**
 * Checks whether the input is a QQ Music mobile share short link.
 * e.g. https://c6.y.qq.com/base/fcgi-bin/u?__=AquwZhhuBYZI
 */
export function isQQShortLink(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  return (
    /(?:(?:[a-zA-Z0-9-]+\.)*y\.qq\.com|music\.qq\.com)/i.test(trimmed) &&
    /(?:fcgi-bin\/u|\b__=)/i.test(trimmed)
  );
}

/**
 * Resolves short links like https://c6.y.qq.com/base/fcgi-bin/u?__=xxxx safely.
 * Enforces redirect: 'manual', max 3 hops, 10000ms timeout, and strict host verification.
 */
export async function resolveQQShortLinkIfNeeded(urlOrText: string): Promise<string> {
  const candidateUrl = extractUrlFromText(urlOrText);
  try {
    let currentUrl = candidateUrl;
    const urlToParse = /^https?:\/\//i.test(currentUrl) ? currentUrl : `https://${currentUrl}`;
    const parsed = new URL(urlToParse);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return candidateUrl;
    }
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      host === 'y.qq.com' ||
      host.endsWith('.y.qq.com') ||
      host === 'music.qq.com' ||
      host.endsWith('.music.qq.com');

    if (!isAllowedHost) {
      return candidateUrl;
    }
    if (!/(?:fcgi-bin\/u|\b__=)/i.test(parsed.pathname + parsed.search)) {
      return candidateUrl;
    }

    currentUrl = urlToParse;
    const maxHops = 3;
    for (let hop = 0; hop < maxHops; hop++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const resp = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
          },
          redirect: 'manual',
          signal: controller.signal,
        });

        if (resp.status >= 300 && resp.status < 400) {
          const location = resp.headers.get('location');
          if (!location) break;

          const resolvedLocation = new URL(location, currentUrl).toString();
          const targetParsed = new URL(resolvedLocation);

          if (targetParsed.protocol !== 'http:' && targetParsed.protocol !== 'https:') {
            throw new ProviderError(
              'FORBIDDEN',
              `Short link redirect to non-HTTP protocol ${targetParsed.protocol} is strictly prohibited.`,
              403,
            );
          }

          const targetHost = targetParsed.hostname.toLowerCase();
          const isTargetAllowed =
            targetHost === 'y.qq.com' ||
            targetHost.endsWith('.y.qq.com') ||
            targetHost === 'music.qq.com' ||
            targetHost.endsWith('.music.qq.com') ||
            targetHost === 'qq.com' ||
            targetHost.endsWith('.qq.com');

          if (!isTargetAllowed) {
            throw new ProviderError(
              'FORBIDDEN',
              `Short link redirect to unauthorized host ${targetHost} is strictly prohibited.`,
              403,
            );
          }

          currentUrl = resolvedLocation;
          if (!/(?:fcgi-bin\/u|\b__=)/i.test(targetParsed.pathname + targetParsed.search)) {
            return currentUrl;
          }
        } else {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    return currentUrl;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    return candidateUrl;
  }
}

/**
 * Asynchronously extracts a QQ Music Playlist ID, resolving short links if necessary.
 */
export async function extractQQPlaylistIdAsync(rawInput: string): Promise<string> {
  const resolved = await resolveQQShortLinkIfNeeded(rawInput);
  return extractQQPlaylistId(resolved);
}

/**
 * Returns true if the input looks like a QQ Music playlist URL or direct ID.
 */
export function matchesQQMusicInput(rawInput: string): boolean {
  if (!rawInput || typeof rawInput !== 'string') return false;
  const input = rawInput.trim();
  if (input.length === 0 || input.length > MAX_INPUT_LENGTH) return false;
  if (/^\d{5,18}$/.test(input)) return true;

  const qqDomainPattern = /(?:(?:[a-zA-Z0-9-]+\.)*y\.qq\.com|music\.qq\.com)/i;
  if (qqDomainPattern.test(input)) {
    return true;
  }

  try {
    const cleanUrl = extractUrlFromText(input);
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleanUrl);
    if (hasScheme && !/^https?:\/\//i.test(cleanUrl)) {
      return false;
    }
    const urlToParse = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
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
