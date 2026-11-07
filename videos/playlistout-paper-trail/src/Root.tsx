import React from 'react';
import {Composition} from 'remotion';
import {PaperTrailFilm} from './Film';
import {DURATION_FRAMES, FPS} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PlaylistOutPaperTrail"
      component={PaperTrailFilm}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};
