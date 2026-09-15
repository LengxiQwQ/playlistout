export type InputKind = 'single_playlist_url' | 'user_profile_url' | 'numeric' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INVALID_INPUT' | 'UNSUPPORTED_URL';
  kind?: InputKind;
  extractedUin?: string;
}

/**
 * Extracts uin from a user profile URL if present.
 */
export function extractUinFromProfileUrl(input: string): string | null {
  try {
    const urlToParse = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const parsed = new URL(urlToParse);
    if (parsed.hostname.includes('y.qq.com')) {
      const uin = parsed.searchParams.get('uin') || parsed.searchParams.get('hostuin');
      if (uin && /^\d{4,15}$/.test(uin.trim())) {
        return uin.trim();
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
 * - Public QQ Music playlist URLs
 * - QQ Music user profile URLs (e.g. https://y.qq.com/portal/profile.html?uin=...)
 * - Numeric IDs (can be single playlist ID or QQ number for batch export)
 */
export function validatePlaylistInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      error: '请输入歌单链接、歌单 ID 或 QQ 号。',
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
  if (/music\.163\.com|kugou\.com|kuwo\.cn|migu\.cn|spotify\.com|apple\.com/i.test(trimmed)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_URL',
      error: '当前版本仅支持 QQ 音乐公开歌单。',
    };
  }

  // 1. Check if it's a numeric ID (5-18 digits or QQ number 4-15 digits)
  if (/^\d{4,18}$/.test(trimmed)) {
    return {
      valid: true,
      kind: 'numeric',
      extractedUin: /^\d{4,15}$/.test(trimmed) ? trimmed : undefined,
    };
  }

  // 2. Check if it's a QQ Music URL
  const isQQUrl = /y\.qq\.com/i.test(trimmed);
  if (!isQQUrl) {
    return {
      valid: false,
      code: 'UNSUPPORTED_URL',
      error: '请输入有效的 QQ 音乐歌单链接、QQ 号或个人主页链接。',
    };
  }

  // 3. Check for profile URL
  const profileUin = extractUinFromProfileUrl(trimmed);
  if (profileUin) {
    return {
      valid: true,
      kind: 'user_profile_url',
      extractedUin: profileUin,
    };
  }

  return {
    valid: true,
    kind: 'single_playlist_url',
  };
}
