import { ProviderError } from '../../models/playlist';

const MIGU_HOST_REGEX = /(?:(?:[a-zA-Z0-9-]+\.)*migu\.cn)/i;
const ALLOWED_REDIRECT_HOSTS = new Set([
  'c.migu.cn',
  'h5.nf.migu.cn',
  'music.migu.cn',
  'm.music.migu.cn',
  'migu.cn',
]);

function isMiguShortlinkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'c.migu.cn' || host.endsWith('.migu.cn');
}

/**
 * Checks if the given input is a Migu Music input (URL, share text, or short link).
 */
export function matchesMiguInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (MIGU_HOST_REGEX.test(trimmed)) {
    return true;
  }
  if (trimmed.includes('咪咕音乐') || trimmed.toLowerCase().includes('migu')) {
    return true;
  }
  return false;
}

/**
 * Extracts a URL from potentially text-wrapped share snippets.
 * e.g. "分享歌单 | 歌单1 https://c.migu.cn/0mp9YM?ifrom=... （@咪咕音乐）"
 */
export function extractUrlFromText(text: string): string {
  const match = text.match(/https?:\/\/[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()（）\[\]{}]+/i);
  if (match) {
    return match[0].replace(/[.,;:!?，。！？@]+$/, '');
  }
  return text.trim();
}

/**
 * Resolves short links like https://c.migu.cn/0mp9YM safely.
 * Enforces redirect: 'manual', max 3 hops, 10000ms timeout, and strict host verification.
 */
export async function resolveShortLinkIfNeeded(urlOrText: string): Promise<string> {
  const candidateUrl = extractUrlFromText(urlOrText);
  try {
    let currentUrl = candidateUrl;
    const urlToParse = /^https?:\/\//i.test(currentUrl) ? currentUrl : `https://${currentUrl}`;
    const parsed = new URL(urlToParse);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return candidateUrl;
    }
    if (!isMiguShortlinkHost(parsed.hostname)) {
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
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
          const isAllowed =
            ALLOWED_REDIRECT_HOSTS.has(targetHost) ||
            Array.from(ALLOWED_REDIRECT_HOSTS).some((h) => targetHost.endsWith(`.${h}`));

          if (!isAllowed) {
            throw new ProviderError(
              'FORBIDDEN',
              `Short link redirected to unauthorized domain: ${targetHost}`,
              403,
            );
          }

          currentUrl = resolvedLocation;
          if (
            targetParsed.searchParams.has('id') ||
            targetParsed.searchParams.has('playlistId') ||
            targetParsed.searchParams.has('playlist_id') ||
            targetParsed.searchParams.has('musicListId')
          ) {
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
 * Extracts Migu Playlist ID from URLs, share text, or raw numeric IDs.
 */
export async function extractMiguPlaylistId(input: string): Promise<string> {
  if (!input || typeof input !== 'string') {
    throw new ProviderError('INVALID_INPUT', 'Playlist input cannot be empty.', 400);
  }

  const trimmed = input.trim();

  // 1. Pure numeric ID (4-20 digits)
  if (/^\d{4,20}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Direct query / path match on URL string before network if already present
  // e.g. ?id=236858196, playlist/236858196, playlistId=236858196
  const directMatch = trimmed.match(/(?:[?&](?:id|playlistId|playlist_id|musicListId)=|\/playlist\/)(\d{4,20})/i);
  if (directMatch) {
    return directMatch[1];
  }

  // 3. Resolve short link (e.g. c.migu.cn/0mp9YM)
  const resolvedUrl = await resolveShortLinkIfNeeded(trimmed);
  const resolvedMatch = resolvedUrl.match(/(?:[?&](?:id|playlistId|playlist_id|musicListId)=|\/playlist\/)(\d{4,20})/i);
  if (resolvedMatch) {
    return resolvedMatch[1];
  }

  // Fallback regex match for any 5-20 digit sequence in a migu.cn URL
  if (MIGU_HOST_REGEX.test(resolvedUrl)) {
    const fallbackMatch = resolvedUrl.match(/\b\d{5,20}\b/);
    if (fallbackMatch) {
      return fallbackMatch[0];
    }
  }

  throw new ProviderError(
    'INVALID_INPUT',
    'Could not extract a valid Migu Music playlist ID from the provided input.',
    400,
  );
}
