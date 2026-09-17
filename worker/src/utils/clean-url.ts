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
