import React from 'react';
import { Composition } from 'remotion';
import { PromoFilm } from './PromoFilm';
import { FPS, TOTAL_FRAMES } from './utils/motion';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlaylistOutPromo"
        component={PromoFilm}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
