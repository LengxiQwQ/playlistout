import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame, staticFile} from 'remotion';
import {renderScene} from './scene';
export const PlaylistOutFullFilm:React.FC=()=>{
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor:'#F8F3E8'}}>
    <div style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{__html:renderScene(frame).replace(/^<\?xml[^>]*\?>/,'')}} />
    <Audio src={staticFile('audio/playlistout-new-original-mix.wav')} />
  </AbsoluteFill>;
};
