export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INVALID_INPUT' | 'UNSUPPORTED_URL';
}

/**
 * Validates user input client-side before sending an API request.
 * Fails fast with friendly UX messages for common user errors.
 */
export function validatePlaylistInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      error: '请输入歌单链接或歌单 ID。',
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
      error: '当前 MVP 版本仅支持 QQ 音乐公开歌单。',
    };
  }

  // Check if it's a valid numeric ID or QQ Music playlist URL
  const isNumeric = /^\d+$/.test(trimmed);
  const isQQUrl = /y\.qq\.com/i.test(trimmed);

  if (!isNumeric && !isQQUrl) {
    return {
      valid: false,
      code: 'UNSUPPORTED_URL',
      error: '请输入有效的 QQ 音乐歌单链接（例如：https://y.qq.com/n/ryqq/playlist/xxxxxx）或纯数字歌单 ID。',
    };
  }

  return { valid: true };
}
