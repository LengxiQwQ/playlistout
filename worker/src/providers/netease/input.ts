import { ProviderError } from '../../models/playlist';

const SHORTLINK_HOST = '163cn.tv';
const NETEASE_HOST_REGEX = /(?:music\.163\.com|y\.music\.163\.com|163cn\.tv)/i;

/**
 * Checks if the given input is a NetEase music input (URL, share text, or short link).
 */
export function matchesNeteaseInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (NETEASE_HOST_REGEX.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Extracts a URL from potentially text-wrapped share snippets.
 * e.g. "分享冷汐呀233创建的歌单「...」: http://music.163.com/playlist/2756674066/1825474783/ (来自@网易云音乐)"
 */
export function extractUrlFromText(text: string): string {
  const match = text.match(/https?:\/\/[^\s)）]+[^\s)）.,!?，。！？]/i);
  return match ? match[0] : text.trim();
}

/**
 * Resolves short links like https://163cn.tv/xxxx if present.
 */
export async function resolveShortLinkIfNeeded(urlOrText: string): Promise<string> {
  const candidateUrl = extractUrlFromText(urlOrText);
  try {
    const parsed = new URL(candidateUrl);
    if (parsed.hostname === SHORTLINK_HOST || parsed.hostname.endsWith(`.${SHORTLINK_HOST}`)) {
      const resp = await fetch(candidateUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });
      return resp.url;
    }
  } catch {
    // If not a valid URL or fetch fails, return original
  }
  return candidateUrl;
}

/**
 * Extracts playlist ID from a NetEase playlist URL, share text, or ID string.
 */
export async function extractNeteasePlaylistId(input: string): Promise<string> {
  if (!input || typeof input !== 'string') {
    throw new ProviderError('INVALID_INPUT', 'Input must be a non-empty string.', 400);
  }

  const trimmed = input.trim();

  // 1. Pure numeric ID (4-18 digits)
  if (/^\d{4,18}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Resolve shortlink if needed
  const resolved = await resolveShortLinkIfNeeded(trimmed);

  // 3. Match from query params or path in resolved URL
  // e.g. ?id=2756674066 or /playlist/2756674066 or /playlist?id=2756674066
  try {
    const cleanUrl = resolved.replace(/#\//, ''); // Handle hash routing like #/playlist?id=...
    const parsed = new URL(cleanUrl);

    const idFromQuery = parsed.searchParams.get('id');
    if (idFromQuery && /^\d{4,18}$/.test(idFromQuery)) {
      return idFromQuery;
    }

    const pathMatch = parsed.pathname.match(/\/playlist\/(\d{4,18})/);
    if (pathMatch) {
      return pathMatch[1];
    }
  } catch {
    // Fallback regex over string directly
  }

  const directMatch = resolved.match(/(?:[?&]id=|\/playlist\/|\/playlist\?id=)(\d{4,18})/i);
  if (directMatch) {
    return directMatch[1];
  }

  throw new ProviderError(
    'INVALID_INPUT',
    `Could not extract a valid NetEase playlist ID from input: "${input}".`,
    400,
  );
}

/**
 * Extracts user UID from a NetEase profile URL, shortlink, or user ID string.
 */
export async function extractNeteaseUserId(input: string): Promise<string | null> {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (/^\d{4,18}$/.test(trimmed)) {
    return trimmed;
  }

  const resolved = await resolveShortLinkIfNeeded(trimmed);

  try {
    const cleanUrl = resolved.replace(/#\//, '');
    const parsed = new URL(cleanUrl);

    // Profile URLs usually have /user or /user/home and ?id=...
    if (parsed.pathname.includes('/user') || parsed.searchParams.has('id')) {
      const id = parsed.searchParams.get('id');
      if (id && /^\d{4,18}$/.test(id)) {
        return id;
      }
    }

    const match = parsed.pathname.match(/\/user\/(?:home\/)?(\d{4,18})/);
    if (match) {
      return match[1];
    }
  } catch {
    // Ignore URL parse errors
  }

  const match = resolved.match(/(?:user(?:\/home)?\?id=|[?&]id=)(\d{4,18})/i);
  return match ? match[1] : null;
}
