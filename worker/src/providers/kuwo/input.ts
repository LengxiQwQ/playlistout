import { ProviderError } from '../../models/playlist';

/**
 * Checks if the input matches any known Kuwo Music playlist URL pattern or domain.
 */
export function matchesKuwoInput(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();

  // 1. Matches Kuwo Web / H5 playlist URL
  if (/(?:(?:[a-zA-Z0-9-]+\.)*kuwo\.cn)\/(?:newh5app\/)?(?:playlist_detail\/|playlist\/|playListInfo\?)/i.test(trimmed)) {
    return true;
  }

  // 2. Matches general Kuwo domain
  if (/(?:[a-zA-Z0-9-]+\.)*kuwo\.cn/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Extracts Kuwo Playlist ID (pid) from URLs, share text, or raw IDs.
 */
export function extractKuwoPlaylistId(input: string): string {
  if (!input) {
    throw new ProviderError('INVALID_INPUT', 'Playlist input cannot be empty.', 400);
  }

  const trimmed = input.trim();

  // 1. Direct path / query match: playlist_detail/12345 or pid=12345
  const directMatch = trimmed.match(/(?:playlist_detail\/|[?&](?:pid|playlistId|id)=)(\d{4,20})/i);
  if (directMatch) {
    return directMatch[1];
  }

  // 2. Pure numeric ID (4-20 digits)
  if (/^\d{4,20}$/.test(trimmed)) {
    return trimmed;
  }

  // 3. Fallback any number sequence in Kuwo URLs
  if (/(?:[a-zA-Z0-9-]+\.)*kuwo\.cn/i.test(trimmed)) {
    const fallbackMatch = trimmed.match(/\b\d{5,20}\b/);
    if (fallbackMatch) {
      return fallbackMatch[0];
    }
  }

  throw new ProviderError(
    'INVALID_INPUT',
    'Could not extract a valid Kuwo playlist ID from the provided input.',
    400,
  );
}
