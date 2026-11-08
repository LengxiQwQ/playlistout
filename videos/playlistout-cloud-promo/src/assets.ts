import { staticFile } from 'remotion';

export const ASSETS = {
  logo512: staticFile('brand/logo-512.png'),
  logo128: staticFile('brand/logo-128.png'),
  grain: staticFile('textures/paper-grain.png'),
  creases: staticFile('textures/paper-creases.png'),
  fibrePage: staticFile('textures/paper-fibre-page.png'),
  fibreTile: staticFile('textures/paper-fibre-tile.png'),
  soundtrack: staticFile('audio/soundtrack.wav'),
  musicOnly: staticFile('audio/music-only.wav'),
  sfxOnly: staticFile('audio/sfx-only.wav'),
};
