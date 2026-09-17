export type InputKind = 'single_playlist_url' | 'user_profile_url' | 'numeric' | 'short_link' | 'unknown';
export type PlatformType = 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'numeric' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INVALID_INPUT' | 'UNSUPPORTED_URL';
  kind?: InputKind;
  platform?: PlatformType;
  extractedUin?: string;
  cleanedInput?: string;
}

/**
 * Cleanly extracts a playlist/profile URL or raw numeric ID from mixed share text.
 * Strips surrounding Chinese/English promotional text, emojis, boundaries, and punctuation.
 * e.g.:
 * - "歌单｜钢琴流行曲999首：轻音乐钢琴曲 https://qishui.douyin.com/s/iXHhKHhY/ @汽水音乐"
 *   -> "https://qishui.douyin.com/s/iXHhKHhY/"
 * - "发现一个很不错的歌单哦《测试大量歌单》... https://m.kugou.com/songlist/...&iszlist=1"
 *   -> "https://m.kugou.com/songlist/...&iszlist=1"
 * - "【推荐】来自网易云音乐的是冷汐呀233 听过2984首歌 https://163cn.tv/bgpHWLfw"
 *   -> "https://163cn.tv/bgpHWLfw"
 * - "分享歌单: 是冷汐呀233喜欢的音乐 https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783"
 *   -> "https://music.163.com/m/playlist?id=2756674066&creatorId=1825474783"
 */
export function extractCleanUrlOrInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();

  // If the input starts with a known non-http/https URI scheme, do not rewrite it
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(?:javascript|data|file|about|mailto):/i.test(trimmed)) {
    return trimmed;
  }

  // 1. Match http:// or https:// URL
  // Stops at whitespace, Chinese characters, fullwidth punctuation, quotes, or bracket boundaries
  const httpMatch = trimmed.match(/https?:\/\/[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()\[\]{}]+/i);
  if (httpMatch) {
    let url = httpMatch[0];
    url = url.replace(/[.,;:!?，。！？@]+$/, '');
    return url;
  }

  // 2. Match known music domain without protocol (e.g. "y.qq.com/n/ryqq/playlist/..." or "163cn.tv/...")
  // Ensure it's not a subdomain like c.y.qq.com or preceded by word characters
  const domainMatch = trimmed.match(
    /(?:^|[^\w.-])((?:(?:y|i\.y)\.qq\.com|(?:y\.)?music\.163\.com|163cn\.tv|(?:m\.|t\d?\.)?kugou\.com|(?:qishui\.|music\.)douyin\.com)[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()\[\]{}]+)/i,
  );
  if (domainMatch && domainMatch[1]) {
    let url = domainMatch[1];
    url = url.replace(/[.,;:!?，。！？@]+$/, '');
    return `https://${url}`;
  }

  // 3. Match pure numeric ID or labeled QQ/UID (e.g. "QQ: 3197635836", "QQ号：3197635836", "3197635836")
  const numMatch = trimmed.match(/(?:qq|uin|uid|账号|用户|歌单)?[:：\s]*(\d{4,20})\b/i);
  if (numMatch && numMatch[1]) {
    if (/^[\D\s]{0,10}\d{4,20}[\D\s]{0,10}$/.test(trimmed)) {
      return numMatch[1];
    }
  }

  return trimmed;
}

/**
 * Extracts user ID or QQ uin from a user profile URL if present.
 */
export function extractUinFromProfileUrl(input: string): string | null {
  try {
    const urlToParse = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const cleanUrl = urlToParse.replace(/#\//, '');
    const parsed = new URL(cleanUrl);

    // QQ Music profile
    if (parsed.hostname.includes('y.qq.com')) {
      const uin = parsed.searchParams.get('uin') || parsed.searchParams.get('hostuin');
      if (uin && /^\d{4,15}$/.test(uin.trim())) {
        return uin.trim();
      }
    }

    // NetEase Music profile
    if (parsed.hostname.includes('music.163.com')) {
      if (parsed.pathname.includes('/user') || parsed.searchParams.has('id')) {
        const uid = parsed.searchParams.get('id');
        if (uid && /^\d{4,18}$/.test(uid.trim())) {
          return uid.trim();
        }
      }
      const match = parsed.pathname.match(/\/user\/(?:home\/)?(\d{4,18})/);
      if (match) {
        return match[1];
      }
    }

    // Kugou Music profile or share link with uid
    if (parsed.hostname.includes('kugou.com')) {
      const uid = parsed.searchParams.get('uid') || parsed.searchParams.get('userid');
      if (uid && /^\d{4,18}$/.test(uid.trim())) {
        return uid.trim();
      }
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Validates user input client-side before sending an API request.
 * Supports:
 * - Public QQ Music, NetEase Cloud Music, KuGou Music & Qishui Music playlist URLs
 * - QQ Music & NetEase user profile URLs (e.g. https://y.qq.com/portal/profile.html?uin=... or https://music.163.com/user/home?id=...)
 * - 163cn.tv & qishui.douyin.com shortlinks
 * - Numeric IDs (can be single playlist ID or user ID for batch export)
 */
export function validatePlaylistInput(input: string): ValidationResult {
  const cleaned = extractCleanUrlOrInput(input);
  const trimmed = cleaned.trim();
  if (!trimmed) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      error: '请输入歌单链接、歌单 ID 或 QQ号/网易云UID。',
    };
  }

  if (trimmed.length > 2048) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      error: '输入内容过长，请检查后重试。',
    };
  }

  // Check if user submitted a link from other music platforms
  if (/kuwo\.cn|migu\.cn|spotify\.com|apple\.com/i.test(trimmed)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_URL',
      error: '当前版本支持 QQ 音乐、网易云音乐、酷狗音乐与汽水音乐公开歌单。',
    };
  }

  // 1. Check if it's a numeric ID (4-20 digits)
  if (/^\d{4,20}$/.test(trimmed)) {
    return {
      valid: true,
      kind: 'numeric',
      platform: 'numeric',
      extractedUin: trimmed,
      cleanedInput: trimmed,
    };
  }

  // 2. NetEase short link (163cn.tv)
  if (/163cn\.tv/i.test(trimmed)) {
    return {
      valid: true,
      kind: 'short_link',
      platform: 'netease',
      cleanedInput: trimmed,
    };
  }

  // 3. Kugou short link (t.kugou.com or t1.kugou.com)
  if (/t\d?\.kugou\.com/i.test(trimmed)) {
    return {
      valid: true,
      kind: 'short_link',
      platform: 'kugou',
      cleanedInput: trimmed,
    };
  }

  // 4. Kugou raw gcid ID (e.g. gcid_3zr52qfrzaz06a)
  if (/^gcid_[a-zA-Z0-9]+$/i.test(trimmed)) {
    return {
      valid: true,
      kind: 'single_playlist_url',
      platform: 'kugou',
      cleanedInput: trimmed,
    };
  }

  // 5. Kugou Music URL
  const isKugouUrl = /kugou\.com/i.test(trimmed);
  if (isKugouUrl) {
    const kugouUid = extractUinFromProfileUrl(trimmed);
    if (kugouUid && (trimmed.includes('/user') || trimmed.includes('/profile') || trimmed.includes('/home'))) {
      return {
        valid: true,
        kind: 'user_profile_url',
        platform: 'kugou',
        extractedUin: kugouUid,
        cleanedInput: trimmed,
      };
    }
    return {
      valid: true,
      kind: 'single_playlist_url',
      platform: 'kugou',
      cleanedInput: trimmed,
    };
  }

  // 6. NetEase Music URL
  const isNeteaseUrl = /(?:music\.163\.com|y\.music\.163\.com)/i.test(trimmed);
  if (isNeteaseUrl) {
    const neteaseUid = extractUinFromProfileUrl(trimmed);
    if (neteaseUid && (trimmed.includes('/user') || trimmed.includes('user/home'))) {
      return {
        valid: true,
        kind: 'user_profile_url',
        platform: 'netease',
        extractedUin: neteaseUid,
        cleanedInput: trimmed,
      };
    }
    return {
      valid: true,
      kind: 'single_playlist_url',
      platform: 'netease',
      cleanedInput: trimmed,
    };
  }

  // 7. QQ Music URL
  const isQQUrl = /y\.qq\.com/i.test(trimmed);
  if (isQQUrl) {
    const profileUin = extractUinFromProfileUrl(trimmed);
    if (profileUin) {
      return {
        valid: true,
        kind: 'user_profile_url',
        platform: 'qqmusic',
        extractedUin: profileUin,
        cleanedInput: trimmed,
      };
    }
    return {
      valid: true,
      kind: 'single_playlist_url',
      platform: 'qqmusic',
      cleanedInput: trimmed,
    };
  }

  // 8. Qishui short link (qishui.douyin.com/s/...)
  if (/qishui\.douyin\.com\/s\//i.test(trimmed)) {
    return {
      valid: true,
      kind: 'short_link',
      platform: 'qishui',
      cleanedInput: trimmed,
    };
  }

  // 9. Qishui / Douyin Music URL
  const isQishuiUrl = /(?:qishui\.douyin\.com|music\.douyin\.com)/i.test(trimmed);
  if (isQishuiUrl) {
    return {
      valid: true,
      kind: 'single_playlist_url',
      platform: 'qishui',
      cleanedInput: trimmed,
    };
  }

  // Not recognized
  return {
    valid: false,
    code: 'UNSUPPORTED_URL',
    error: '请输入有效的 QQ 音乐、网易云音乐、酷狗音乐或汽水音乐歌单链接、用户主页链接或数字 ID。',
  };
}
