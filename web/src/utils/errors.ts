import type { ApiErrorCode } from '../api/types';

/**
 * Maps stable API error codes to helpful, user-friendly Chinese messages.
 */
export function getFriendlyErrorMessage(code?: ApiErrorCode | string, fallbackMessage?: string): string {
  switch (code) {
    case 'INVALID_INPUT':
      if (
        fallbackMessage &&
        fallbackMessage.toLowerCase().includes('kugou') &&
        (fallbackMessage.toLowerCase().includes('authorization') ||
          fallbackMessage.toLowerCase().includes('token') ||
          fallbackMessage.includes('扫码'))
      ) {
        return '酷狗音乐批量导出需要先扫码连接酷狗账号。请点击下方「立即扫码连接」登录后重试。';
      }
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
      return '歌单数据获取不完整。Playlist Out 遵循严格完整性保障，已中止解析，避免导出不全。';
    case 'UPSTREAM_TIMEOUT':
      return '连接音乐平台服务器超时（通常因网络抖动或当前解析并发较多引起，并非无法解析）。建议稍候点击「重试」再试一次。';
    case 'UPSTREAM_ERROR':
      return '音乐平台服务响应异常（通常因当前解析人数较多或平台访问过于频繁引起，并非无法解析）。接口正常，建议稍等 3~5 秒后点击「重试」再试一次。';
    case 'METHOD_NOT_ALLOWED':
      return '请求被拒绝，请刷新页面后重试。';
    case 'FORBIDDEN':
      if (fallbackMessage && fallbackMessage.toLowerCase().includes('kugou')) {
        return '酷狗音乐批量导出需要先扫码连接酷狗账号。请点击下方「立即扫码连接」登录后重试。';
      }
      return '请求被拒绝，请刷新页面后重试。';
    case 'RATE_LIMITED':
      return '请求过于频繁，请稍候再试。';
    case 'INTERNAL_ERROR':

      return '服务器处理歌单时出现异常，请稍后重试。';
    default:
      return fallbackMessage || '解析歌单失败，请稍后重试。';
  }
}

