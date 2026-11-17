import type { Track } from '../../models/playlist';

/** Apply the product's default display/export order after all pages are loaded. */
export function reversePlaylistTracks(tracks: Track[]): void {
  tracks.reverse();
  tracks.forEach((track, index) => { track.index = index + 1; });
}
