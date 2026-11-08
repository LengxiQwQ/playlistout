import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './theme';

export const Root: React.FC = () => {
  return (
    <Composition
      id="PlaylistOutPromo"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
