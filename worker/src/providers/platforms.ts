/**
 * Single source of truth for all supported music platforms in PlaylistOut.
 */
export const SUPPORTED_PLATFORMS = ['qqmusic', 'netease', 'kugou', 'qishui', 'kuwo'] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export type ResolvePlatformParam = 'auto' | SupportedPlatform;

export function isSupportedPlatform(value: string): value is SupportedPlatform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(value);
}
