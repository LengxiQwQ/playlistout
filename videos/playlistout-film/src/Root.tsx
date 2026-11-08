import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PlaylistOutFilm"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
