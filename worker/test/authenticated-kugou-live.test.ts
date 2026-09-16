import { describe, it, expect } from 'vitest';
import { kugouProvider } from '../src/providers/kugou';
import { fetchKugouUserPlaylists } from '../src/providers/kugou/client';

/**
 * Tier 2: Authenticated Kugou Live Acceptance Test
 *
 * Requirements:
 * - Triggered explicitly via GitHub Actions input or RUN_KUGOU_AUTHENTICATED_ACCEPTANCE=true
 * - Requires GitHub Secrets: KUGOU_TEST_TOKEN, KUGOU_TEST_USERID, KUGOU_TEST_PLAYLIST_URL
 * - If invoked without these credentials, it FAILS with clear instructions rather than silently skipping.
 */
describe('Tier 2: Authenticated Kugou Live Acceptance', { timeout: 60000 }, () => {
  it('validates authenticated Kugou cloudlist >300 cross-page pagination with real credentials', async () => {
    const token = process.env.KUGOU_TEST_TOKEN;
    const userid = process.env.KUGOU_TEST_USERID;
    const testPlaylistUrl = process.env.KUGOU_TEST_PLAYLIST_URL;

    if (!token || !userid || !testPlaylistUrl) {
      throw new Error(
        'Tier 2 Authenticated Kugou Live Acceptance requires credentials!\n' +
        'Missing environment variables:\n' +
        (!token ? '  - KUGOU_TEST_TOKEN\n' : '') +
        (!userid ? '  - KUGOU_TEST_USERID\n' : '') +
        (!testPlaylistUrl ? '  - KUGOU_TEST_PLAYLIST_URL\n' : '') +
        'Please configure these in GitHub Repository Settings -> Secrets and variables -> Actions, ' +
        'or set them locally before running this test.'
      );
    }

    // 1. Verify user playlists access
    const userPlaylists = await fetchKugouUserPlaylists(token, userid);
    expect(userPlaylists.playlists.length).toBeGreaterThan(0);

    // 2. Parse target playlist with authentication
    const playlist = await kugouProvider.parse(testPlaylistUrl, {
      token,
      userid,
    });

    // 3. Verify retrieval mode and track integrity
    expect(playlist.platform).toBe('kugou');
    expect(playlist.retrieval?.mode).toBe('full');
    expect(playlist.trackCount).toBeGreaterThan(300);
    expect(playlist.tracks.length).toBe(playlist.trackCount);
    expect(playlist.tracks.length).toBeGreaterThan(300);

    // 4. Mandatory cross-page verification: boundary transition (page 1: 300 -> page 2: 301)
    expect(playlist.tracks[299].index).toBe(300);
    expect(playlist.tracks[299].title).toBeTruthy();
    expect(playlist.tracks[300].index).toBe(301);
    expect(playlist.tracks[300].title).toBeTruthy();

    // First and last tracks
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[0].title).toBeTruthy();
    expect(playlist.tracks[playlist.tracks.length - 1].index).toBe(playlist.trackCount);
    expect(playlist.tracks[playlist.tracks.length - 1].title).toBeTruthy();

    // 5. Verify all tracks have valid continuous indices and non-empty titles
    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
    });
  });
});
