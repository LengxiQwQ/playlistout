export type InputKind = 'single_playlist_url' | 'user_profile_url' | 'numeric' | 'short_link' | 'unknown';
export type PlatformType = 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | 'migu' | 'numeric' | 'unknown';

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

  // 2. Match known music domain without protocol (e.g. "y.qq.com/n/ryqq/playlist/...", "c6.y.qq.com/...", "i2.y.qq.com/...", "163cn.tv/...", "www.qishui.com/...")
  const domainMatch = trimmed.match(
    /(?:^|[^\w.-])((?:(?:(?:[a-zA-Z0-9-]+\.)*y|music)\.qq\.com|(?:y\.)?music\.163\.com|163cn\.tv|(?:m\.|t\d?\.)?kugou\.com|(?:qishui\.|music\.)douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com|(?:[a-zA-Z0-9-]+\.)*kuwo\.cn|(?:c\.|music\.|m\.music\.|h5\.nf\.)?migu\.cn)[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef"'<>`()\[\]{}]+)/i,
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
    const cleanUrl = urlToParse.replace(/#\/?/, '/');
    const parsed = new URL(cleanUrl);

    // QQ Music profile
    if (parsed.hostname.includes('y.qq.com') || parsed.hostname.includes('music.qq.com')) {
      const isPlaylist =
        parsed.pathname.includes('/playlist') ||
        parsed.pathname.includes('/taoge') ||
        parsed.pathname.includes('/playsquare') ||
        parsed.searchParams.has('disstid') ||
        parsed.searchParams.has('dissid') ||
        parsed.searchParams.has('tid') ||
        (parsed.searchParams.has('id') && !parsed.pathname.includes('/profile'));

      const isProfilePath =
        parsed.pathname.includes('/profile') ||
        parsed.pathname.includes('/portal/profile');

      if (isProfilePath || !isPlaylist) {
        const uin = parsed.searchParams.get('uin') || parsed.searchParams.get('hostuin');
        if (uin && /^\d{4,15}$/.test(uin.trim())) {
          return uin.trim();
        }
      }
    }

    // NetEase Music profile
    if (parsed.hostname.includes('music.163.com')) {
      const isPlaylist = parsed.pathname.includes('/playlist') || parsed.pathname.includes('/song');
      if (!isPlaylist && (parsed.pathname.includes('/user') || parsed.pathname.includes('/m/user') || parsed.pathname.includes('/home') || input.includes('/user'))) {
        const id = parsed.searchParams.get('id') || (input.match(/(?:[?&#]id=)(\d{4,18})/i) || [])[1];
        if (id && /^\d{4,18}$/.test(id.trim())) {
          return id.trim();
        }
        const match = parsed.pathname.match(/\/user\/(?:home\/)?(\d{4,18})/);
        if (match) {
          return match[1];
        }
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

export interface ValidationRule {
  platform: PlatformType;
  kind: InputKind;
  match: (input: string) => boolean;
  extractUin?: (input: string) => string | null;
}

export const VALIDATION_RULES: ValidationRule[] = [
  // 1. Check if it's a numeric ID (4-20 digits)
  {
    platform: 'numeric',
    kind: 'numeric',
    match: (input) => /^\d{4,20}$/.test(input),
    extractUin: (input) => input,
  },
  // 2. QQ Music short link (e.g. c6.y.qq.com/base/fcgi-bin/u?__=...)
  {
    platform: 'qqmusic',
    kind: 'short_link',
    match: (input) => /(?:(?:[a-zA-Z0-9-]+\.)*y\.qq\.com|music\.qq\.com)\/.*(?:fcgi-bin\/u|\b__=)/i.test(input),
  },
  // 3. NetEase short link (163cn.tv)
  {
    platform: 'netease',
    kind: 'short_link',
    match: (input) => /163cn\.tv/i.test(input),
  },
  // 4. Kugou short link (t.kugou.com or t1.kugou.com)
  {
    platform: 'kugou',
    kind: 'short_link',
    match: (input) => /t\d?\.kugou\.com/i.test(input),
  },
  // 5. Kugou raw gcid ID (e.g. gcid_3zr52qfrzaz06a)
  {
    platform: 'kugou',
    kind: 'single_playlist_url',
    match: (input) => /^gcid_[a-zA-Z0-9]+$/i.test(input),
  },
  // 6. Kugou Music user profile URL
  {
    platform: 'kugou',
    kind: 'user_profile_url',
    match: (input) => {
      if (!/kugou\.com/i.test(input)) return false;
      const uid = extractUinFromProfileUrl(input);
      return Boolean(uid && (input.includes('/user') || input.includes('/profile') || input.includes('/home')));
    },
    extractUin: (input) => extractUinFromProfileUrl(input),
  },
  // 7. Kugou Music URL
  {
    platform: 'kugou',
    kind: 'single_playlist_url',
    match: (input) => /kugou\.com/i.test(input),
  },
  // 8. NetEase Music user profile URL
  {
    platform: 'netease',
    kind: 'user_profile_url',
    match: (input) => {
      if (!/(?:music\.163\.com|y\.music\.163\.com)/i.test(input)) return false;
      const uid = extractUinFromProfileUrl(input);
      return Boolean(uid && (input.includes('/user') || input.includes('user/home') || input.includes('#/user') || input.includes('#/home')));
    },
    extractUin: (input) => extractUinFromProfileUrl(input),
  },
  // 9. NetEase Music URL
  {
    platform: 'netease',
    kind: 'single_playlist_url',
    match: (input) => /(?:music\.163\.com|y\.music\.163\.com)/i.test(input),
  },
  // 10. QQ Music user profile URL
  {
    platform: 'qqmusic',
    kind: 'user_profile_url',
    match: (input) => {
      if (!/(?:(?:[a-zA-Z0-9-]+\.)*y\.qq\.com|music\.qq\.com)/i.test(input)) return false;
      const uid = extractUinFromProfileUrl(input);
      return Boolean(uid);
    },
    extractUin: (input) => extractUinFromProfileUrl(input),
  },
  // 11. QQ Music URL
  {
    platform: 'qqmusic',
    kind: 'single_playlist_url',
    match: (input) => /(?:(?:[a-zA-Z0-9-]+\.)*y\.qq\.com|music\.qq\.com)/i.test(input),
  },
  // 12. Qishui short link (qishui.douyin.com/s/... or qishui.com/s/...)
  {
    platform: 'qishui',
    kind: 'short_link',
    match: (input) => /(?:qishui\.douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com)\/s\//i.test(input),
  },
  // 13. Qishui / Douyin Music URL
  {
    platform: 'qishui',
    kind: 'single_playlist_url',
    match: (input) => /(?:qishui\.douyin\.com|music\.douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com)/i.test(input),
  },
  // 14. Kuwo Music URL
  {
    platform: 'kuwo',
    kind: 'single_playlist_url',
    match: (input) => /(?:[a-zA-Z0-9-]+\.)*kuwo\.cn/i.test(input),
  },
  // 15. Migu Music short link (c.migu.cn)
  {
    platform: 'migu',
    kind: 'short_link',
    match: (input) => /(?:^|[^a-zA-Z0-9])c\.migu\.cn/i.test(input),
  },
  // 16. Migu Music URL
  {
    platform: 'migu',
    kind: 'single_playlist_url',
    match: (input) => /(?:[a-zA-Z0-9-]+\.)*migu\.cn/i.test(input),
  },
];

/**
 * Validates user input client-side before sending an API request.
 * Supports:
 * - Public QQ Music, NetEase Cloud Music, KuGou Music, Qishui Music & Kuwo Music playlist URLs
 * - QQ Music & NetEase user profile URLs
 * - 163cn.tv, qishui.douyin.com, t.kugou.com shortlinks
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
  if (/spotify\.com|apple\.com|tidal\.com/i.test(trimmed)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_URL',
      error: '当前版本支持 QQ 音乐、网易云音乐、酷狗音乐、汽水音乐、酷我音乐与咪咕音乐公开歌单。',
    };
  }

  for (const rule of VALIDATION_RULES) {
    if (rule.match(trimmed)) {
      const extractedUin = rule.extractUin ? rule.extractUin(trimmed) || undefined : undefined;
      return {
        valid: true,
        kind: rule.kind,
        platform: rule.platform,
        extractedUin,
        cleanedInput: trimmed,
      };
    }
  }

  // Not recognized
  return {
    valid: false,
    code: 'UNSUPPORTED_URL',
    error: '请输入有效的 QQ 音乐、网易云音乐、酷狗音乐、汽水音乐、酷我音乐或咪咕音乐歌单链接、用户主页链接或数字 ID。',
  };
}
