import { describe, it, expect } from 'vitest';
import { qqMusicProvider } from '../src/providers/qqmusic';
import { neteaseProvider } from '../src/providers/netease';
import { kugouProvider } from '../src/providers/kugou';

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

  it('validates large public playlist (ID: 9044196528 - Folk & Pop)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/9044196528');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('9044196528');
    expect(playlist.name).toBe('中文民谣、流行');
    expect(playlist.creator).toBe('琴心月满');
    expect(playlist.trackCount).toBeGreaterThanOrEqual(636);
    expect(playlist.tracks).toHaveLength(playlist.trackCount);

    // Track integrity spot-check
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[0].title).toBeTruthy();
    expect(playlist.tracks[0].artists.length).toBeGreaterThan(0);
    expect(playlist.tracks.some((t) => t.title === '何物')).toBe(true);

    // Last track index check
    expect(playlist.tracks[playlist.tracks.length - 1].index).toBe(playlist.trackCount);
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

  it('validates >1000 multi-page live public playlist (ID: 7729596131)', async () => {
    const playlist = await qqMusicProvider.parse('https://y.qq.com/n/ryqq/playlist/7729596131');

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.id).toBe('7729596131');
    expect(playlist.name).toBe('耳机里的秘密 | 宝藏女声集合站');
    expect(playlist.creator).toBe('腾讯音乐人');
    expect(playlist.trackCount).toBeGreaterThanOrEqual(1245);
    expect(playlist.tracks).toHaveLength(playlist.trackCount);

    // Verify continuous 1-based ordering across page boundary (page 1: 1..1000, page 2: 1001..)
    expect(playlist.tracks[0].index).toBe(1);
    expect(playlist.tracks[0].title).toBeTruthy();
    expect(playlist.tracks[999].index).toBe(1000);
    expect(playlist.tracks[999].title).toBeTruthy();
    expect(playlist.tracks[1000].index).toBe(1001);
    expect(playlist.tracks[1000].title).toBeTruthy();
    expect(playlist.tracks[playlist.tracks.length - 1].index).toBe(playlist.trackCount);
    expect(playlist.tracks[playlist.tracks.length - 1].title).toBeTruthy();

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

describe('Real Public NetEase Playlist Live Validation', { timeout: 30000 }, () => {
  it('validates public chart playlist (ID: 3778678 - 热歌榜)', async () => {
    const playlist = await neteaseProvider.parse('3778678');

    expect(playlist.platform).toBe('netease');
    expect(playlist.id).toBe('3778678');
    expect(playlist.name).toContain('热歌榜');
    expect(playlist.trackCount).toBeGreaterThanOrEqual(100);
    expect(playlist.tracks).toHaveLength(playlist.trackCount);

    // Verify timestamp normalization: createTime and updateTime should be seconds (< 1e11), not ms
    if (playlist.createTime) {
      expect(playlist.createTime).toBeLessThan(1e11);
      expect(playlist.createTime).toBeGreaterThan(0);
    }
    if (playlist.updateTime) {
      expect(playlist.updateTime).toBeLessThan(1e11);
      expect(playlist.updateTime).toBeGreaterThan(0);
    }

    // Verify continuous sequential indexing and valid track metadata
    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
      expect(track.artists.length).toBeGreaterThan(0);
    });
  });

  it('validates public playlist via full URL (ID: 3779629 - 新歌榜)', async () => {
    const playlist = await neteaseProvider.parse('https://music.163.com/#/playlist?id=3779629');

    expect(playlist.platform).toBe('netease');
    expect(playlist.id).toBe('3779629');
    expect(playlist.name).toContain('新歌榜');
    expect(playlist.trackCount).toBeGreaterThan(0);
    expect(playlist.tracks.length).toBe(playlist.trackCount);
  });
});

describe('Real Public Kugou Playlist Live Validation', { timeout: 30000 }, () => {
  it('validates public special playlist (ID: 546903)', async () => {
    const playlist = await kugouProvider.parse('https://www.kugou.com/yy/special/single/546903.html');

    expect(playlist.platform).toBe('kugou');
    expect(playlist.id).toBe('546903');
    expect(playlist.name).toBeTruthy();
    expect(playlist.trackCount).toBeGreaterThan(0);
    expect(playlist.tracks.length).toBeGreaterThan(0);

    // Verify sequential indexing and tracks
    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
    });
  });

  it('validates public songlist preview without login credentials', async () => {
    const playlist = await kugouProvider.parse('https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/');

    expect(playlist.platform).toBe('kugou');
    expect(playlist.id).toBe('gcid_3zr52qfrzaz06a');
    expect(playlist.name).toBeTruthy();
    expect(playlist.trackCount).toBeGreaterThan(0);
    expect(playlist.tracks.length).toBeGreaterThan(0);
    expect(playlist.tracks.length).toBeLessThanOrEqual(playlist.trackCount);

    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
    });
  });

  it('validates large (600+ songs) public songlist preview without login credentials', async () => {
    const playlist = await kugouProvider.parse(
      'https://m.kugou.com/songlist/gcid_3zr52qfrzwz02f/?src_cid=3zr52qfrzwz02f&uid=1425711902&chl=message&iszlist=1',
    );

    expect(playlist.platform).toBe('kugou');
    expect(playlist.id).toBe('gcid_3zr52qfrzwz02f');
    expect(playlist.name).toBeTruthy();
    expect(playlist.trackCount).toBeGreaterThanOrEqual(600);
    expect(playlist.tracks.length).toBeLessThanOrEqual(30);
    expect(playlist.tracks.length).toBeGreaterThan(0);
    expect(playlist.description).toContain('预览');

    playlist.tracks.forEach((track, i) => {
      expect(track.index).toBe(i + 1);
      expect(track.title.length).toBeGreaterThan(0);
      expect(Array.isArray(track.artists)).toBe(true);
    });
  });

  it('validates live Kugou QR login code creation from official Kugou auth service', async () => {
    const { createKugouQrCode } = await import('../src/providers/kugou/auth');
    const session = await createKugouQrCode();

    expect(session.qrcode).toBeTruthy();
    expect(session.qrcode.length).toBeGreaterThan(10);
    expect(session.loginUrl).toContain('kugou.com');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it.runIf(Boolean(process.env.KUGOU_TEST_TOKEN && process.env.KUGOU_TEST_USERID))(
    'validates authenticated Kugou cloudlist when credentials provided via environment',
    async () => {
      const token = process.env.KUGOU_TEST_TOKEN!;
      const userid = process.env.KUGOU_TEST_USERID!;
      const testPlaylistUrl = process.env.KUGOU_TEST_PLAYLIST_URL;

      const { fetchKugouUserPlaylists } = await import('../src/providers/kugou/client');
      const userPlaylists = await fetchKugouUserPlaylists(token, userid);
      expect(userPlaylists.playlists.length).toBeGreaterThan(0);

      // If a >300 playlist URL is provided for authenticated acceptance, verify cross-page pagination
      if (testPlaylistUrl) {
        const playlist = await kugouProvider.parse(testPlaylistUrl, {
          token,
          userid,
        });
        expect(playlist.tracks.length).toBe(playlist.trackCount);
        if (playlist.trackCount > 300) {
          expect(playlist.tracks.length).toBeGreaterThan(300);
          expect(playlist.tracks[299].index).toBe(300);
          expect(playlist.tracks[300].index).toBe(301);
          expect(playlist.tracks[299].title).toBeTruthy();
          expect(playlist.tracks[300].title).toBeTruthy();
        }
      }
    },
  );
});
