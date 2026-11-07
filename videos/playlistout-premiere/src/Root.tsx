import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, DURATION, WIDTH, HEIGHT } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PlaylistOutPremiere"
      component={Main}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
