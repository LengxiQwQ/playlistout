import { describe, it, expect } from 'vitest';
import { qqMusicProvider } from '../src/providers/qqmusic';

// Real-source validation timeout is set to 30s per test to allow real network round-trips
describe('Real Public QQ Music Playlist Live Validation', { timeout: 30000 }, () => {
  it('validates small public playlist (ID: 9547521556)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/9547521556');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9547521556');
    expect(playlist.name).toBe('中文歌曲2');
    expect(playlist.trackCount).toBeGreaterThanOrEqual(38);
    expect(playlist.tracks).toHaveLength(playlist.trackCount);

    // Verify order and sequential index
    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title).toBeTruthy();
      expect(Array.isArray(track.artists)).toBe(true);
      expect(track.artists.length).toBeGreaterThan(0);
    });

    // Check multi-artist presence
    const multiArtistSongs = playlist.tracks.filter((t) => t.artists.length > 1);
    expect(multiArtistSongs.length).toBeGreaterThan(0);
  });

  it('validates medium public playlist (ID: 8079931214 - Jay Chou)', async () => {
    const playlist = await qqMusicProvider.parse('8079931214');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('8079931214');
    expect(playlist.name).toBe('周杰伦');
    expect(playlist.trackCount).toBe(172);
    expect(playlist.tracks).toHaveLength(172);

    // First track verification
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[0].title).toBeTruthy();
    expect(playlist.tracks[0].artists).toEqual(['周杰伦']);

    // Last track verification
    const last = playlist.tracks[171];
    expect(last.index).toBe(172);
    expect(last.title).toBeTruthy();
  });

  it('validates Unicode & multi-artist public playlist (ID: 7684752768 - Japan & Korea)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/7684752768');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('7684752768');
    expect(playlist.name).toBe('日韩歌曲');
    expect(playlist.trackCount).toBeGreaterThanOrEqual(215);

    // Check Unicode characters in track titles and artists
    const koreanOrJapaneseTracks = playlist.tracks.filter(
      (t) =>
        /[\uac00-\ud7af\u3040-\u30ff]/.test(t.title) ||
        t.artists.some((a) => /[\uac00-\ud7af\u3040-\u30ff]/.test(a)),
    );
    expect(koreanOrJapaneseTracks.length).toBeGreaterThan(0);
  });

  it('validates large public playlist (ID: 9044196528 - Folk & Pop, 636 songs)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/9044196528');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9044196528');
    expect(playlist.name).toBe('中文民谣、流行');
    expect(playlist.creator).toBe('琴心月满');
    expect(playlist.trackCount).toBe(636);
    expect(playlist.tracks).toHaveLength(636);

    // First track spot-check
    expect(playlist.tracks[0].title).toBe('何物');
    expect(playlist.tracks[0].artists).toEqual(['Lancelot_兰斯洛']);
    expect(playlist.tracks[0].album).toBe('何物');
    expect(playlist.tracks[0].durationMs).toBe(210000);

    // Last track index check
    expect(playlist.tracks[635].index).toBe(636);
  });

  it('validates 1000-song large playlist (ID: 4177812546)', async () => {
    const playlist = await qqMusicProvider.parse('4177812546');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('4177812546');
    expect(playlist.name).toBe('中文歌曲');
    expect(playlist.trackCount).toBe(1000);
    expect(playlist.tracks).toHaveLength(1000);
    expect(playlist.tracks[999].index).toBe(1000);
  });

  it('validates >1000 multi-page live public playlist (ID: 7729596131, 1245 songs)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/7729596131');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('7729596131');
    expect(playlist.name).toBe('耳机里的秘密 | 宝藏女声集合站');
    expect(playlist.creator).toBe('腾讯音乐人');
    expect(playlist.trackCount).toBe(1245);
    expect(playlist.tracks).toHaveLength(1245);

    // Verify continuous 1-based ordering across page boundary (page 1: 1..1000, page 2: 1001..1245)
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[0].title).toBeTruthy();
    expect(playlist.tracks[999].index).toBe(1000);
    expect(playlist.tracks[999].title).toBeTruthy();
    expect(playlist.tracks[1000].index).toBe(1001);
    expect(playlist.tracks[1000].title).toBeTruthy();
    expect(playlist.tracks[1244].index).toBe(1245);
    expect(playlist.tracks[1244].title).toBeTruthy();

    // Verify all tracks have valid non-empty titles and sequential indices
    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
    });
  });

  it('fails with PLAYLIST_NOT_FOUND on non-existent playlist ID', async () => {
    await expect(qqMusicProvider.parse('999999999999999')).rejects.toThrowError();
  });
});
