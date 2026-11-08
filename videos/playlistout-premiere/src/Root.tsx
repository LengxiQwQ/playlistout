import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { ScaleLab } from './scenes/ScaleLab';
import { V4Main } from './v4/V4Main';
import { FPS, DURATION, WIDTH, HEIGHT } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlaylistOutPremiere"
        component={Main}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ScaleLab"
        component={ScaleLab}
        durationInFrames={180}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PlaylistOutV4"
        component={V4Main}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
