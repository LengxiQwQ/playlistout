import type { ApiErrorCode } from '../api/types';

/**
 * Maps stable API error codes to helpful, user-friendly Chinese messages.
 */
export function getFriendlyErrorMessage(code?: ApiErrorCode | string, fallbackMessage?: string): string {
  switch (code) {
    case 'INVALID_INPUT':
      if (fallbackMessage && !fallbackMessage.toLowerCase().includes('url') && !fallbackMessage.toLowerCase().includes('parameter')) {
        return fallbackMessage;
      }
      return '输入链接格式不正确或为空，请检查后重试。';
    case 'UNSUPPORTED_URL':
      if (fallbackMessage && fallbackMessage.includes('仅支持')) {
        return fallbackMessage;
      }
      return '目前仅支持 QQ 音乐公开歌单链接（例如 https://y.qq.com/n/ryqq/playlist/xxxxxx）或纯数字 ID。';
    case 'PLAYLIST_NOT_FOUND':
      return '未找到该歌单，可能已被作者删除、设置为私密或当前不可访问。';
    case 'INCOMPLETE_PLAYLIST':
      return '歌单数据获取不完整（QQ 音乐服务器返回数据缺失）。PlaylistOut 遵循严格完整性保障，已中止解析，避免导出不全。';
    case 'UPSTREAM_TIMEOUT':
      return '连接 QQ 音乐服务器超时，请检查网络或稍后重试。';
    case 'UPSTREAM_ERROR':
      return 'QQ 音乐服务响应异常，请稍后重试。';
    case 'METHOD_NOT_ALLOWED':
    case 'FORBIDDEN':
      return '请求被拒绝，请刷新页面后重试。';
    case 'RATE_LIMITED':
      return '请求过于频繁，请稍候再试。';
    case 'INTERNAL_ERROR':

      return '服务器处理歌单时出现异常，请稍后重试。';
    default:
      return fallbackMessage || '解析歌单失败，请稍后重试。';
  }
}

