import React from 'react';
import {Composition} from 'remotion';
import {PlaylistOutFullFilm} from './video';
import {DURATION,FPS,HEIGHT,WIDTH} from './scene';
export const Root:React.FC=()=> <Composition id="PlaylistOutFull104" component={PlaylistOutFullFilm} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT}/>;
