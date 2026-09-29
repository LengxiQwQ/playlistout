import { ProviderError } from '../../models/playlist';

const QISHUI_HOST_REGEX = /(?:qishui\.douyin\.com|music\.douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com)/i;
const ALLOWED_REDIRECT_HOSTS = new Set([
  'qishui.douyin.com',
  'music.douyin.com',
  'qishui.com',
  'douyin.com',
  'snssdk.com',
]);

function isQishuiShortlinkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'qishui.douyin.com' ||
    host.endsWith('.qishui.douyin.com') ||
    host === 'music.douyin.com' ||
    host.endsWith('.music.douyin.com') ||
    host === 'qishui.com' ||
    host.endsWith('.qishui.com')
  );
}

/**
 * Checks if the given input is a Qishui (Soda) music input (URL, share text, or short link).
 */
export function matchesQishuiInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (QISHUI_HOST_REGEX.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Extracts a URL from potentially text-wrapped share snippets.
 * e.g. "「冷汐OωO在抖音收藏的音乐」https://qishui.douyin.com/s/iXHhmCAW/ 复制链接，打开【汽水音乐】直接收听！"
 */
export function extractUrlFromText(text: string): string {
  const match = text.match(/https?:\/\/[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()\[\]{}]+/i);
  if (match) {
    return match[0].replace(/[.,;:!?，。！？@]+$/, '');
  }
  return text.trim();
}

/**
 * Resolves short links like https://qishui.douyin.com/s/iXHhmCAW/ or https://qishui.com/s/xxxx safely.
 * Enforces redirect: 'manual', max 3 hops, 5000ms timeout, and strict host verification.
 */
export async function resolveShortLinkIfNeeded(urlOrText: string): Promise<string> {
  const candidateUrl = extractUrlFromText(urlOrText);
  try {
    let currentUrl = candidateUrl;
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return candidateUrl;
    }
    if (!isQishuiShortlinkHost(parsed.hostname)) {
      return candidateUrl;
    }
    // Only resolve if it matches the /s/ shortlink pattern
    if (!parsed.pathname.includes('/s/')) {
      return candidateUrl;
    }

    const maxHops = 3;
    for (let hop = 0; hop < maxHops; hop++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
          // If we reached a target with playlist_id, playlistId, or id, we can return early
          if (
            targetParsed.searchParams.has('playlist_id') ||
            targetParsed.searchParams.has('playlistId') ||
            targetParsed.searchParams.has('id')
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
 * Extracts the 19-digit playlist ID from URL or input string.
 */
export async function extractQishuiPlaylistId(input: string): Promise<string> {
  if (!input || typeof input !== 'string') {
    throw new ProviderError('INVALID_INPUT', 'Playlist input cannot be empty.', 400);
  }

  const trimmed = input.trim();

  // 1. Direct pure numeric ID (19 digits typical for Qishui, or 4-20 digits)
  if (/^\d{4,20}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Direct regex match on URL parameter without network if already present
  // Matches ?playlist_id=..., &playlist_id=..., ?playlistId=..., ?id=..., /playlist/<id>, /share/playlist/<id>
  const directMatch = trimmed.match(/(?:[?&](?:playlist_id|playlistId|id)=|\/(?:share\/)?playlist\/)(\d{4,20})/i);
  if (directMatch) {
    return directMatch[1];
  }

  // 3. Resolve short link or extract from text
  const resolvedUrl = await resolveShortLinkIfNeeded(trimmed);
  const resolvedMatch = resolvedUrl.match(/(?:[?&](?:playlist_id|playlistId|id)=|\/(?:share\/)?playlist\/)(\d{4,20})/i);
  if (resolvedMatch) {
    return resolvedMatch[1];
  }

  // Fallback regex match for any long numeric ID in resolved string
  const anyIdMatch = resolvedUrl.match(/\b\d{16,20}\b/);
  if (anyIdMatch) {
    return anyIdMatch[0];
  }

  throw new ProviderError(
    'INVALID_INPUT',
    'Could not extract a valid Qishui (Soda Music) playlist ID from input.',
    400,
  );
}
