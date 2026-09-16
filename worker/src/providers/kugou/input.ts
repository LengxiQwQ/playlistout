/**
 * Kugou Input Recognition and Target Extraction
 */

export interface KugouTarget {
  type: 'songlist' | 'special';
  id: string;
  originalUrl: string;
}

/**
 * Checks if the given user input matches Kugou Music patterns.
 */
export function matchesKugouInput(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();

  return (
    /kugou\.com/i.test(trimmed) ||
    /t\d?\.kugou\.com/i.test(trimmed) ||
    /gcid_[a-zA-Z0-9]+/i.test(trimmed) ||
    /src_cid=[a-zA-Z0-9]+/i.test(trimmed) ||
    /special\/single\/\d+/i.test(trimmed)
  );
}

/**
 * Resolves short links (e.g. t1.kugou.com/...) safely with manual redirect loop, timeout, protocol, and host validation.
 */
async function resolveKugouShortLink(url: string): Promise<string> {
  try {
    let currentUrl = url;
    const maxHops = 3;
    for (let hop = 0; hop < maxHops; hop++) {
      const parsed = new URL(currentUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return url;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const resp = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
          },
          signal: controller.signal,
        });

        if (resp.status >= 300 && resp.status < 400) {
          const location = resp.headers.get('location');
          if (!location) break;

          const nextUrl = new URL(location, currentUrl);
          if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
            return currentUrl;
          }
          const nextHost = nextUrl.hostname.toLowerCase();
          const isAllowed = nextHost === 'kugou.com' || nextHost.endsWith('.kugou.com');
          if (!isAllowed) {
            return currentUrl;
          }
          currentUrl = nextUrl.toString();
        } else {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    return currentUrl;
  } catch {
    return url;
  }
}

/**
 * Extracts the target playlist type and ID from a Kugou link or raw ID.
 */
export async function extractKugouTarget(input: string): Promise<KugouTarget | null> {
  if (!input) return null;
  let text = input.trim();

  // If input contains a short link, resolve it first
  const shortMatch = text.match(/https?:\/\/t\d?\.kugou\.com\/[a-zA-Z0-9_]+/i);
  if (shortMatch) {
    text = await resolveKugouShortLink(shortMatch[0]);
  }

  // 1. Official curated/special playlist (e.g. https://www.kugou.com/yy/special/single/546903.html)
  const specialMatch = text.match(/special\/single\/(\d+)/i);
  if (specialMatch) {
    return {
      type: 'special',
      id: specialMatch[1],
      originalUrl: text,
    };
  }

  // 2. User created/shared songlist (e.g. gcid_3zr52qfrzaz06a or src_cid=3zr52qfrzaz06a)
  const gcidMatch = text.match(/(?:songlist\/|src_cid=|gid=)?(gcid_[a-zA-Z0-9]+)/i);
  if (gcidMatch) {
    return {
      type: 'songlist',
      id: gcidMatch[1],
      originalUrl: text,
    };
  }

  // 3. Raw 14-character CID without gcid_ prefix (e.g. src_cid=3zr52qfrzaz06a)
  const rawCidMatch = text.match(/src_cid=([a-zA-Z0-9]{10,20})/i);
  if (rawCidMatch) {
    const cid = rawCidMatch[1];
    const id = cid.startsWith('gcid_') ? cid : `gcid_${cid}`;
    return {
      type: 'songlist',
      id,
      originalUrl: text,
    };
  }

  // 4. Fallback: raw ID matching gcid format
  if (/^gcid_[a-zA-Z0-9]+$/i.test(text)) {
    return {
      type: 'songlist',
      id: text,
      originalUrl: text,
    };
  }

  return null;
}
