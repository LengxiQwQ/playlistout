import React from 'react';
import { Composition } from 'remotion';
import { PlaylistOutStorybook } from './PlaylistOutStorybook';
import { FPS, TOTAL_FRAMES } from './theme/tokens';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlaylistOutStorybook"
        component={PlaylistOutStorybook}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
