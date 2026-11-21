export function ytmusicId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. URL 解析
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (
      host === 'music.youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be'
    ) {
      const listId = url.searchParams.get('list');
      if (listId && isValidPlaylistId(listId)) {
        return listId;
      }
    }
  } catch {
    // 非合法完整 URL，回退文本/正则匹配
  }

  // 2. 正则直接提取 list= 参数（如分享文案或混合文本）
  const listParamMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/i);
  if (listParamMatch && isValidPlaylistId(listParamMatch[1])) {
    return listParamMatch[1];
  }

  // 3. 裸歌单 ID (PL..., RDCLAK..., OLAK..., VL...)
  if (isValidPlaylistId(trimmed)) {
    return trimmed;
  }

  return null;
}

function isValidPlaylistId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  // YouTube 歌单 ID 通常以 PL, RD, OLAK, VL 开头，长度一般 >= 12
  return /^(?:PL|RD|OLAK5uy_|VL)[A-Za-z0-9_-]{10,}$/i.test(id) || /^[A-Za-z0-9_-]{18,}$/i.test(id);
}
