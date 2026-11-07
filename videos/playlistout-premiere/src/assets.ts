import { staticFile } from 'remotion';

export const ASSETS = {
  logo512: staticFile('brand/logo-512.png'),
  logo128: staticFile('brand/logo-128.png'),
  grain: staticFile('textures/paper-grain.png'),
  creases: staticFile('textures/paper-creases.png'),
  paperPage: staticFile('textures/paper-fibre-page.png'),
  paperTile: staticFile('textures/paper-fibre-tile.png'),
} as const;
