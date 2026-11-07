import { staticFile } from 'remotion';

export const ASSETS = {
  logo512: staticFile('brand/logo-512.png'),
  logo128: staticFile('brand/logo-128.png'),
  grain: staticFile('textures/paper-grain.png'),
  creases: staticFile('textures/paper-creases.png'),
} as const;
