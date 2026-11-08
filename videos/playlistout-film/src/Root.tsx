import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './theme';
import { CoverBilibili } from './covers/CoverBilibili';
import { CoverYouTube } from './covers/CoverYouTube';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlaylistOutFilm"
        component={Main}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {/* Bilibili 封面 (4:3 比例，1440x1080 超清手账构图) */}
      <Composition
        id="CoverBilibili"
        component={CoverBilibili}
        durationInFrames={1}
        fps={FPS}
        width={1440}
        height={1080}
      />
      {/* YouTube 封面 (16:9 标准比例，1920x1080 超清宽屏构图) */}
      <Composition
        id="CoverYouTube"
        component={CoverYouTube}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
