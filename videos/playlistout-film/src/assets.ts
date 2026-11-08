import { staticFile } from 'remotion';

export const ASSETS = {
  logo512: staticFile('brand/logo-512.png'),
  logo128: staticFile('brand/logo-128.png'),
  grain: staticFile('textures/paper-grain.png'),
  creases: staticFile('textures/paper-creases.png'),
  fibrePage: staticFile('textures/paper-fibre-page.png'),
  fibreTile: staticFile('textures/paper-fibre-tile.png'),
  soundtrack: staticFile('audio/soundtrack.wav'),
  platforms: {
    qq: staticFile('images/platforms/qq.jpg'),
    netease: staticFile('images/platforms/netease.jpg'),
    kugou: staticFile('images/platforms/kugou.jpg'),
    kuwo: staticFile('images/platforms/kuwo.jpg'),
    qishui: staticFile('images/platforms/qishui.jpg'),
    migu: staticFile('images/platforms/migu.jpg'),
  },
  covers: {
    folkSong: staticFile('covers/folk_song_geyuqing.jpg'),
    folkPlaylist: staticFile('covers/folk_playlist_cover.jpg'),
    animePlaylist: staticFile('covers/anime_playlist_cover.jpg'),
    englishPlaylist: staticFile('covers/english_playlist_cover.jpg'),
  },
};
